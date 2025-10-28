import { useState, useCallback, useRef } from 'react';
import { Vibration } from 'react-native';
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
  
  // Debounced text update for better performance
  const debouncedTextUpdate = useRef(
    debounce((text: string) => {
      callbacks.onTextUpdate(text);
    }, 50) // 50ms debounce
  ).current;

  const startDictation = useCallback(async () => {
    if (isProcessingRef.current) {
      console.log('Dikte zaten işleniyor...');
      return;
    }

    try {
      // Haptic feedback - başlangıç
      Vibration.vibrate(50); // 50ms kısa titreşim
      
      isProcessingRef.current = true;
      setIsDictating(true);
      callbacks.onStart?.();

      console.log('Dikte başlatılıyor...');

      const success = await speechService.startListening(
        (result: any) => {
          console.log('Dikte sonucu:', result);
          
          // Ara sonuçları da göster (interim results)
          if (result.text) {
            // Debounced text update for better performance
            debouncedTextUpdate(result.text);
            
            if (result.isFinal) {
              // Final sonuç - current message'a ekle ve durdur
              setCurrentMessage(prev => prev + result.text);
              
              // Hızlı temizlik - timeout'u azalttık
              setTimeout(() => {
                speechService.stopListening();
                setIsDictating(false);
                setIsListening(false);
                isProcessingRef.current = false;
                callbacks.onStop?.();
              }, 50); // 100ms -> 50ms
            }
          }
        },
        (error: string) => {
          console.error('Dikte hatası:', error);
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
        setIsDictating(false);
        isProcessingRef.current = false;
        callbacks.onStop?.();
      }
    } catch (error) {
      console.error('Dikte başlatma hatası:', error);
      callbacks.onError('Dikte başlatılamadı');
      setIsDictating(false);
      setIsListening(false);
      isProcessingRef.current = false;
      callbacks.onStop?.();
    }
  }, [callbacks]);

  const stopDictation = useCallback(async () => {
    if (isProcessingRef.current) {
      try {
        // Önce dikte durumunu kapat, processing durumunu aç
        setIsDictating(false);
        setIsListening(false);
        setIsProcessing(true); // Desifre durumunu göster
        isProcessingRef.current = false;
        
        // Sonra speech service'i durdur
        await speechService.stopListening();
        
        // Kısa bir gecikme sonra processing'i kapat (desifre tamamlandı)
        setTimeout(() => {
          // Haptic feedback - tamamlandı
          Vibration.vibrate([100, 50, 100]); // Başarı pattern'i
          setIsProcessing(false);
          callbacks.onStop?.();
        }, 800); // 800ms desifre süresi
        
        console.log('Dikte durduruldu, desifre başladı');
      } catch (error) {
        console.error('Dikte durdurma hatası:', error);
        // Hata durumunda da state'leri temizle
        setIsDictating(false);
        setIsListening(false);
        setIsProcessing(false);
        isProcessingRef.current = false;
        callbacks.onStop?.();
      }
    }
  }, [callbacks]);

  const toggleDictation = useCallback(async () => {
    if (isDictating) {
      stopDictation();
    } else {
      await startDictation();
    }
  }, [isDictating, startDictation, stopDictation]);

  const resetDictation = useCallback(() => {
    setCurrentMessage('');
    setIsDictating(false);
    setIsListening(false);
    isProcessingRef.current = false;
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
