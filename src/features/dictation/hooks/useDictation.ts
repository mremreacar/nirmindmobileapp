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
  const [isProcessing, setIsProcessing] = useState(false); // Yeni state: deşifre durumu
  const [isStopping, setIsStopping] = useState(false); // CRITICAL: Durdurma animasyonu için
  const [hasError, setHasError] = useState(false); // CRITICAL: Hata durumu
  const [errorMessage, setErrorMessage] = useState<string | undefined>(); // CRITICAL: Hata mesajı
  const [audioLevel, setAudioLevel] = useState(0); // CRITICAL: Gerçek zamanlı ses seviyesi (0-1)
  const [duration, setDuration] = useState(0); // CRITICAL: Konuşma süresi (saniye)
  
  const isProcessingRef = useRef(false);
  // Dikte durumunu ref ile takip et (state güncellemesi beklemeden kontrol için)
  const isDictatingRef = useRef(false);
  const isStoppingRef = useRef(false); // Durdurma işlemi devam ediyor mu?
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null); // CRITICAL: Süre takibi için
  const audioLevelIntervalRef = useRef<NodeJS.Timeout | null>(null); // CRITICAL: Ses seviyesi simülasyonu için
  const startTimeRef = useRef<number | null>(null); // CRITICAL: Başlangıç zamanı
  
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
      // CRITICAL: Hata durumunu temizle
      setHasError(false);
      setErrorMessage(undefined);
      
      // Yeni dikte başladığında önceki state'leri temizle
      lastReceivedTextRef.current = ''; // Son alınan text'i reset et
      
      isProcessingRef.current = true;
      isDictatingRef.current = true; // Ref'i güncelle
      isStoppingRef.current = false; // Durdurma işlemi yok
      setIsDictating(true);
      setIsStopping(false);
      setDuration(0);
      setAudioLevel(0);
      
      // CRITICAL: Süre takibini başlat
      startTimeRef.current = Date.now();
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      durationIntervalRef.current = setInterval(() => {
        if (startTimeRef.current) {
          const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
          setDuration(elapsed);
        }
      }, 1000);
      
      // CRITICAL: Ses seviyesi simülasyonu (wave animasyonlarına göre)
      // Gerçek implementasyon için speechService'den alınmalı
      if (audioLevelIntervalRef.current) {
        clearInterval(audioLevelIntervalRef.current);
      }
      audioLevelIntervalRef.current = setInterval(() => {
        // Simüle edilmiş ses seviyesi (0.3 - 0.9 arası rastgele)
        const simulatedLevel = 0.3 + Math.random() * 0.6;
        setAudioLevel(simulatedLevel);
        callbacks.onAudioLevelUpdate?.(simulatedLevel);
      }, 100); // 100ms'de bir güncelle
      
      callbacks.onStart?.();

      console.log('✅ [useDictation] Dikte başlatılıyor...', {
        timestamp: new Date().toISOString()
      });

      const success = await speechService.startListening(
        (result: any) => {
          console.log('Dikte sonucu:', result);
          
          // Sadece final results'ı ekle - interim results'ı ignore et (tekrar eklenmesini önlemek için)
          if (result.text && result.isFinal) {
            const currentText = result.text.trim();
            console.log('📝 Dikte final text alındı:', currentText);
            
            // React Native Voice her seferinde tam metni döndürür
            // Önceki metinle karşılaştır ve sadece yeni kısmı ekle
            const lastText = lastReceivedTextRef.current;
            
            let textToAdd = '';
            
            // Metin değişikliği kontrolü
            const isTextChanged = lastText.length > 0 && !currentText.startsWith(lastText) && currentText !== lastText;
            
            if (lastText === '') {
              // İlk final result - tam metni ekle
              textToAdd = currentText;
              console.log('✅ İlk final result - tam metin:', textToAdd);
            } else if (currentText.length > lastText.length && currentText.startsWith(lastText)) {
              // Yeni kısım eklendi - sadece yeni kısmı ekle
              textToAdd = currentText.substring(lastText.length);
              // Boşluk kontrolü - eğer yeni kısım boşlukla başlıyorsa, onu da ekle
              if (textToAdd && !textToAdd.startsWith(' ') && lastText.endsWith(' ')) {
                // Önceki metin boşlukla bitiyor, yeni kısım boşlukla başlamıyorsa, boşluk ekle
                textToAdd = ' ' + textToAdd;
              }
              console.log('✅ Final result - yeni eklenen kısım:', textToAdd);
            } else if (isTextChanged) {
              // Metin tamamen değişti veya düzeltme yapıldı
              // React Native Voice metni düzelttiğinde (ör: "Test bir" -> "Test 1.02" -> "Test 123")
              // Her seferinde tam metni döndürür, bu yüzden önceki metni input'tan çıkarıp yeni metni eklemeliyiz
              
              console.log('⚠️ Metin değişti/düzeltildi - önceki:', lastText, 'yeni:', currentText);
              
              // Önceki metni input'tan çıkar ve yeni metni ekle
              // replacePrevious=true ile önceki metni çıkar, sonra yeni metni ekle
              textToAdd = currentText;
              // Önceki metin çıkarılacak
            } else {
              // Aynı metin tekrar geldi, ekleme
              console.log('⚠️ Aynı final result tekrar geldi, atlanıyor');
              return;
            }
            
            // Ref'i güncelle
            lastReceivedTextRef.current = currentText;
            
            // Sadece yeni eklenen kısmı mesaj alanına ekle
            if (textToAdd) {
              console.log('📝 Mesaj alanına eklenecek text:', textToAdd);
              
              // Dikte ile eklenen metni terminale yazdır
              console.log('───────────────────────────────────────────────────────');
              console.log('✍️  DİKTE İLE EKLENEN METİN:', textToAdd);
              console.log('📊 Toplam Metin:', currentText);
              if (isTextChanged) {
                // Metin değişti - önceki metin çıkarılacak
              }
              console.log('───────────────────────────────────────────────────────');
              
              // Debounce olmadan direkt ekle (daha hızlı ve güvenilir)
              // Eğer metin değiştiyse, replacePrevious=true ile önceki metni çıkar
              // Direkt input'a yaz (başka bir yerden çağırmaya gerek yok - ikisi birbirine bağlı)
              callbacks.onTextUpdate(textToAdd, isTextChanged);
            } else {
              console.log('⚠️ textToAdd boş, mesaj alanına eklenmiyor');
            }
          } else if (result.text && !result.isFinal) {
            // Interim result - sadece logla, ekleme (tekrar eklenmesini önlemek için)
            console.log('📝 Interim result alındı (eklenmeyecek):', result.text.trim());
          }
        },
        (error: string) => {
          console.error('Dikte hatası:', error);
          // CRITICAL: Hata durumunu set et
          setHasError(true);
          setErrorMessage(error);
          callbacks.onError(error);
          setIsDictating(false);
          setIsListening(false);
          isProcessingRef.current = false;
          
          // CRITICAL: Süre takibini durdur
          if (durationIntervalRef.current) {
            clearInterval(durationIntervalRef.current);
            durationIntervalRef.current = null;
          }
          // CRITICAL: Ses seviyesi simülasyonunu durdur
          if (audioLevelIntervalRef.current) {
            clearInterval(audioLevelIntervalRef.current);
            audioLevelIntervalRef.current = null;
          }
          startTimeRef.current = null;
          setDuration(0);
          setAudioLevel(0);
          
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
        // CRITICAL: Hata durumunu set et
        setHasError(true);
        setErrorMessage('Dikte başlatılamadı. Lütfen tekrar deneyin.');
        isDictatingRef.current = false;
        isStoppingRef.current = false;
        setIsDictating(false);
        isProcessingRef.current = false;
        
        // CRITICAL: Süre takibini durdur
        if (durationIntervalRef.current) {
          clearInterval(durationIntervalRef.current);
          durationIntervalRef.current = null;
        }
        startTimeRef.current = null;
        setDuration(0);
        setAudioLevel(0);
        
        callbacks.onError('Dikte başlatılamadı');
        callbacks.onStop?.();
      }
    } catch (error) {
      console.error('Dikte başlatma hatası:', error);
      // CRITICAL: Hata durumunu set et
      setHasError(true);
      setErrorMessage('Dikte başlatılamadı. Lütfen tekrar deneyin.');
      isDictatingRef.current = false;
      isStoppingRef.current = false;
      callbacks.onError('Dikte başlatılamadı');
      setIsDictating(false);
      setIsListening(false);
      isProcessingRef.current = false;
      
      // CRITICAL: Süre takibini durdur
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
      startTimeRef.current = null;
      setDuration(0);
      setAudioLevel(0);
      
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
        isDictatingRef: isDictatingRef.current
      });
      
      // CRITICAL: Durdurma animasyonu için state set et
      setIsStopping(true);
      
      // Önce state'leri kapat (hemen görünür olsun)
      setIsDictating(false);
      setIsListening(false);
      setIsProcessing(true); // Deşifre durumunu göster
      isProcessingRef.current = false;
      
      // CRITICAL: Süre takibini durdur
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
      startTimeRef.current = null;
      setAudioLevel(0);
      
      // Sonra speech service'i durdur (hata olsa bile devam et)
      console.log('🛑 Speech service durduruluyor...');
      try {
        await speechService.stopListening();
        console.log('✅ Speech service durduruldu');
      } catch (stopError) {
        console.error('❌ Speech service durdurma hatası (devam ediliyor):', stopError);
        // Hata olsa bile devam et - state'leri temizle
      }
      
      // Final result'larda metin zaten direkt input'a yazılıyor
      // Dikte durdurulduğunda ek bir işlem yapmaya gerek yok
      
      // lastReceivedTextRef'i reset et (bir sonraki dikte için)
      lastReceivedTextRef.current = '';
      
      // CRITICAL: Durdurma animasyonu için kısa gecikme
      setTimeout(() => {
        setIsStopping(false);
      }, 300); // 300ms durdurma animasyonu
      
      // Kısa bir gecikme sonra processing'i kapat (deşifre tamamlandı)
      setTimeout(() => {
        // Haptic feedback kaldırıldı - kullanıcı titreşim istemiyor
        setIsProcessing(false);
        isStoppingRef.current = false; // Durdurma işlemi tamamlandı
        callbacks.onStop?.();
        console.log('✅ Dikte tamamen durduruldu ve temizlendi');
      }, 800); // 800ms deşifre süresi
      
      console.log('✅ Dikte durduruldu, deşifre başladı');
    } catch (error) {
      console.error('❌ Dikte durdurma hatası:', error);
      // Hata durumunda da state'leri temizle
      isDictatingRef.current = false;
      isStoppingRef.current = false;
      setIsDictating(false);
      setIsListening(false);
      setIsProcessing(false);
      setIsStopping(false);
      isProcessingRef.current = false;
      lastReceivedTextRef.current = '';
      
      // CRITICAL: Süre takibini durdur
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
      startTimeRef.current = null;
      setDuration(0);
      setAudioLevel(0);
      
      callbacks.onStop?.();
    }
  }, [callbacks, isDictating, isListening]);

  const toggleDictation = useCallback(async () => {
    // toggleDictation çağrıldı

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
    isDictatingRef.current = false;
    isStoppingRef.current = false;
    setIsDictating(false);
    setIsListening(false);
    setIsProcessing(false);
    setIsStopping(false);
    setHasError(false);
    setErrorMessage(undefined);
    isProcessingRef.current = false;
    lastReceivedTextRef.current = ''; // Reset last received text
    
    // CRITICAL: Süre takibini durdur
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    startTimeRef.current = null;
    setDuration(0);
    setAudioLevel(0);
  }, []);

  // CRITICAL: Ses seviyesi güncellemesi (simüle edilmiş - gerçek implementasyon için speechService'den alınmalı)
  // Bu örnekte wave animasyonlarına göre ses seviyesi simüle ediliyor
  const updateAudioLevel = useCallback((level: number) => {
    setAudioLevel(Math.max(0, Math.min(1, level))); // 0-1 arası sınırla
    callbacks.onAudioLevelUpdate?.(level);
  }, [callbacks]);

  const dictationState: DictationState = {
    isListening,
    isDictating,
    isProcessing,
    isStopping, // CRITICAL: Durdurma animasyonu için
    hasError, // CRITICAL: Hata durumu
    errorMessage, // CRITICAL: Hata mesajı
    audioLevel, // CRITICAL: Gerçek zamanlı ses seviyesi
    duration, // CRITICAL: Konuşma süresi
    currentMessage: '', // Artık kullanılmıyor, boş string döndür (interface uyumluluğu için)
  };

  return {
    dictationState,
    startDictation,
    stopDictation,
    toggleDictation,
    resetDictation,
  };
};
