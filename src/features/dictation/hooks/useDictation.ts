import { useState, useCallback, useRef } from 'react';
import { speechService } from '../../../services/speechService';
import { DictationState, DictationCallbacks, DictationConfig } from '../types';

// Debounce utility for text updates
const debounce = (func: Function, delay: number) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
};

export const useDictation = (callbacks: DictationCallbacks, config?: DictationConfig) => {
  const [isListening, setIsListening] = useState(false);
  const [isDictating, setIsDictating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); // Yeni state: desifre durumu
  const [currentMessage, setCurrentMessage] = useState('');
  const isProcessingRef = useRef(false);
  // Dikte durumunu ref ile takip et (state güncellemesi beklemeden kontrol için)
  const isDictatingRef = useRef(false);
  const isStoppingRef = useRef(false); // Durdurma işlemi devam ediyor mu?
  
  // Son alınan text'i takip et (React Native Voice her seferinde tam metni döndürür)
  const lastReceivedTextRef = useRef('');
  
  // Debounced text update for better performance
  const debouncedTextUpdate = useRef(
    debounce((text: string) => {
      callbacks.onTextUpdate(text);
    }, 50) // 50ms debounce
  ).current;

  const startDictation = useCallback(async () => {
    console.log('🎤 [useDictation] startDictation çağrıldı', {
      isProcessing: isProcessingRef.current,
      isDictating,
      isListening,
      timestamp: new Date().toISOString()
    });

    if (isProcessingRef.current) {
      console.log('⚠️ [useDictation] Dikte zaten işleniyor, başlatma iptal edildi');
      return;
    }

    try {
      // Haptic feedback kaldırıldı - kullanıcı titreşim istemiyor
      
      isProcessingRef.current = true;
      isDictatingRef.current = true; // Ref'i güncelle
      isStoppingRef.current = false; // Durdurma işlemi yok
      setIsDictating(true);
      lastReceivedTextRef.current = ''; // Yeni dikte başladığında reset et
      callbacks.onStart?.();

      console.log('✅ [useDictation] Dikte başlatılıyor...', {
        timestamp: new Date().toISOString()
      });

      const success = await speechService.startListening(
        (result: any) => {
          console.log('Dikte sonucu:', result);
          
          // Ara sonuçları da göster (interim results)
          if (result.text) {
            const currentText = result.text.trim();
            console.log('📝 Dikte text alındı:', currentText, 'isFinal:', result.isFinal);
            
            // React Native Voice her seferinde tam metni döndürür, artımlı değil
            // Bu yüzden sadece yeni eklenen kısmı bulmalıyız
            const lastText = lastReceivedTextRef.current;
            
            let textToAdd = '';
            
            if (result.isFinal) {
              // Final result: Eğer tam metin daha uzunsa, sadece yeni kısmı ekle
              if (lastText === '') {
                // İlk sonuç - tam metni ekle
                textToAdd = currentText;
                console.log('✅ İlk final result - tam metin:', textToAdd);
              } else if (currentText.length > lastText.length && currentText.startsWith(lastText)) {
                // Yeni kısım eklendi
                textToAdd = currentText.substring(lastText.length);
                console.log('✅ Final result - yeni eklenen kısım:', textToAdd);
              } else if (currentText !== lastText) {
                // Metin tamamen değişti (düzeltme yapıldı)
                // Önceki metni sil ve yeni metni ekle
                // Ancak bu durumda önceki metni silmek zor, bu yüzden sadece yeni kısmı ekle
                textToAdd = currentText.replace(lastText, '');
                if (!textToAdd) {
                  textToAdd = currentText; // Eğer replace sonucu boşsa, tamamını kullan
                }
                console.log('✅ Final result - metin değişti, yeni kısım:', textToAdd);
              } else {
                // Aynı metin tekrar geldi, ekleme
                console.log('⚠️ Aynı final result tekrar geldi, atlanıyor');
                return;
              }
              lastReceivedTextRef.current = currentText;
            } else {
              // Interim result: Sadece yeni kısmı ekle
              if (lastText === '') {
                // İlk interim result - tam metni ekle
                textToAdd = currentText;
                console.log('📝 İlk interim result - tam metin:', textToAdd);
                // İlk interim result için de ref'i güncelle (sonraki karşılaştırmalar için)
                lastReceivedTextRef.current = currentText;
              } else if (currentText.length > lastText.length && currentText.startsWith(lastText)) {
                // Yeni kısım eklendi
                textToAdd = currentText.substring(lastText.length);
                console.log('📝 Interim result - yeni eklenen kısım:', textToAdd);
                // Interim result için de ref'i güncelle (artımlı güncelleme için)
                lastReceivedTextRef.current = currentText;
              } else if (currentText !== lastText) {
                // Metin değişti
                textToAdd = currentText.replace(lastText, '');
                if (!textToAdd) {
                  textToAdd = currentText;
                }
                console.log('📝 Interim result - metin değişti, yeni kısım:', textToAdd);
                // Metin değiştiyse ref'i güncelle
                lastReceivedTextRef.current = currentText;
              }
            }
            
            // Sadece yeni eklenen kısmı mesaj alanına ekle
            if (textToAdd) {
              console.log('📝 Mesaj alanına eklenecek text:', textToAdd);
              // Debounce olmadan direkt ekle (daha hızlı ve güvenilir)
              callbacks.onTextUpdate(textToAdd);
              
              // Her sonuç için current message'a ekle (backup - dikte durdurulduğunda kullanılacak)
              setCurrentMessage(prev => prev + textToAdd);
            } else {
              console.log('⚠️ textToAdd boş, mesaj alanına eklenmiyor');
            }
          }
        },
        (error: string) => {
          console.error('Dikte hatası:', error);
          // Hata durumunda titreşim yapma - kullanıcı Alert ile bilgilendirilecek
          callbacks.onError(error);
          setIsDictating(false);
          setIsListening(false);
          isProcessingRef.current = false;
          callbacks.onStop?.();
        },
        {
          language: 'tr-TR',
          continuous: true,
          interimResults: true
        }
      );

      if (success) {
        setIsListening(true);
        console.log('Dikte başarıyla başlatıldı');
      } else {
        console.log('Dikte başlatılamadı');
        isDictatingRef.current = false;
        isStoppingRef.current = false;
        setIsDictating(false);
        isProcessingRef.current = false;
        callbacks.onStop?.();
      }
    } catch (error) {
      console.error('Dikte başlatma hatası:', error);
      isDictatingRef.current = false;
      isStoppingRef.current = false;
      callbacks.onError('Dikte başlatılamadı');
      setIsDictating(false);
      setIsListening(false);
      isProcessingRef.current = false;
      callbacks.onStop?.();
    }
  }, [callbacks]);

  const stopDictation = useCallback(async () => {
    console.log('🛑 [useDictation] stopDictation çağrıldı', {
      isDictating,
      isListening,
      isProcessing: isProcessingRef.current,
      isDictatingRef: isDictatingRef.current,
      isStoppingRef: isStoppingRef.current,
      currentMessageLength: currentMessage.length,
      timestamp: new Date().toISOString()
    });

    // Eğer zaten tamamen durdurulmuşsa, tekrar durdurma
    if (!isDictatingRef.current && !isListening && !isProcessingRef.current && !isDictating) {
      console.log('ℹ️ [useDictation] Dikte zaten durdurulmuş, işlem yapılmıyor');
      return;
    }
    
    // Durdurma işlemi başladı - ref'i set et (her zaman, çünkü kullanıcı durdurmak istiyor)
    const wasStopping = isStoppingRef.current;
    isStoppingRef.current = true;
    isDictatingRef.current = false; // Ref'i hemen false yap
    
    // Eğer zaten durduruluyorsa, sadece speech service'i tekrar durdurmayı dene
    if (wasStopping) {
      console.log('⚠️ [useDictation] Dikte zaten durduruluyor, speech service tekrar durduruluyor...');
      try {
        await speechService.stopListening();
        console.log('✅ Speech service tekrar durduruldu');
      } catch (error) {
        console.error('❌ Speech service tekrar durdurma hatası:', error);
      }
      return;
    }
    
    try {
      console.log('🛑 [useDictation] Dikte durduruluyor...', { 
        isDictating, 
        isListening, 
        isProcessing: isProcessingRef.current,
        isDictatingRef: isDictatingRef.current,
        currentMessageLength: currentMessage.length
      });
      
      // Önce state'leri kapat (hemen görünür olsun)
      setIsDictating(false);
      setIsListening(false);
      setIsProcessing(true); // Desifre durumunu göster
      isProcessingRef.current = false;
      
      // Sonra speech service'i durdur (hata olsa bile devam et)
      console.log('🛑 Speech service durduruluyor...');
      try {
        await speechService.stopListening();
        console.log('✅ Speech service durduruldu');
      } catch (stopError) {
        console.error('❌ Speech service durdurma hatası (devam ediliyor):', stopError);
        // Hata olsa bile devam et - state'leri temizle
      }
      
      // Eğer currentMessage'da text varsa ama input'a yazılmamışsa, yaz
      if (currentMessage && currentMessage.trim()) {
        console.log('📝 Dikte durduruldu, son mesaj input\'a ekleniyor:', currentMessage);
        callbacks.onTextUpdate(currentMessage);
        setCurrentMessage(''); // Ekledikten sonra temizle
      }
      
      // lastReceivedTextRef'i reset et (bir sonraki dikte için)
      lastReceivedTextRef.current = '';
      
      // Kısa bir gecikme sonra processing'i kapat (desifre tamamlandı)
      setTimeout(() => {
        // Haptic feedback kaldırıldı - kullanıcı titreşim istemiyor
        setIsProcessing(false);
        isStoppingRef.current = false; // Durdurma işlemi tamamlandı
        callbacks.onStop?.();
        console.log('✅ Dikte tamamen durduruldu ve temizlendi');
      }, 800); // 800ms desifre süresi
      
      console.log('✅ Dikte durduruldu, desifre başladı');
    } catch (error) {
      console.error('❌ Dikte durdurma hatası:', error);
      // Hata durumunda da state'leri temizle
      isDictatingRef.current = false;
      isStoppingRef.current = false;
      setIsDictating(false);
      setIsListening(false);
      setIsProcessing(false);
      isProcessingRef.current = false;
      lastReceivedTextRef.current = '';
      callbacks.onStop?.();
    }
  }, [callbacks, isDictating, isListening, currentMessage]);

  const toggleDictation = useCallback(async () => {
    console.log('🔄 [useDictation] toggleDictation çağrıldı', {
      isDictating,
      isDictatingRef: isDictatingRef.current,
      isListening,
      isProcessing: isProcessingRef.current,
      isStoppingRef: isStoppingRef.current,
      action: (isDictatingRef.current || isStoppingRef.current || isDictating || isListening) ? 'DURDUR' : 'BAŞLAT',
      timestamp: new Date().toISOString()
    });

    // Ref'e ve state'e göre kontrol et (state güncellemesi beklemeden)
    // Eğer dikte aktifse veya durduruluyorsa, durdur
    if (isDictatingRef.current || isStoppingRef.current || isDictating || isListening) {
      console.log('🛑 [useDictation] Dikte aktif veya durduruluyor, durduruluyor...');
      await stopDictation();
    } else {
      console.log('🎤 [useDictation] Dikte kapalı, başlatılıyor...');
      await startDictation();
    }
  }, [isDictating, isListening, startDictation, stopDictation]);

  const resetDictation = useCallback(() => {
    setCurrentMessage('');
    isDictatingRef.current = false;
    isStoppingRef.current = false;
    setIsDictating(false);
    setIsListening(false);
    isProcessingRef.current = false;
    lastReceivedTextRef.current = ''; // Reset last received text
  }, []);

  const dictationState: DictationState = {
    isListening,
    isDictating,
    isProcessing, // Yeni state'i ekle
    currentMessage,
  };

  return {
    dictationState,
    startDictation,
    stopDictation,
    toggleDictation,
    resetDictation,
  };
};
