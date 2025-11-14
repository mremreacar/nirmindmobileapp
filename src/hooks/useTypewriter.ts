import { useState, useEffect, useRef } from 'react';

/**
 * Typewriter hook - Metni yavaş yavaş yazarak gösterir
 * @param fullText - Gösterilecek tam metin
 * @param speed - Her karakter arasındaki süre (ms)
 * @param enabled - Animasyon aktif mi?
 * @returns Gösterilecek metin
 */
export const useTypewriter = (
  fullText: string,
  speed: number = 30,
  enabled: boolean = true
): string => {
  const [displayText, setDisplayText] = useState('');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const indexRef = useRef(0);
  const fullTextRef = useRef(fullText);
  const enabledRef = useRef(enabled);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    // Metin değiştiğinde animasyonu güncelle
    // Ama eğer enabled false ise (mesaj tamamlandı), animasyonu sıfırlama - direkt tam metni göster
    if (fullText !== fullTextRef.current) {
      // Eğer animasyon kapalıysa (enabled = false), direkt tam metni göster
      if (!enabledRef.current) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        setDisplayText(fullText);
        indexRef.current = fullText.length;
        fullTextRef.current = fullText;
        return;
      }
      
      // Animasyon açıksa - streaming sırasında
      const currentText = fullTextRef.current;
      const currentDisplay = displayText;
      
      // Eğer yeni text mevcut display text'in devamıysa, animasyonu devam ettir
      if (fullText.startsWith(currentDisplay) && currentDisplay.length > 0) {
        // Yeni text mevcut display text'in devamı - animasyonu sıfırlama
        // index'i mevcut display text uzunluğuna ayarla (yeni karakterler eklenecek)
        indexRef.current = currentDisplay.length;
        fullTextRef.current = fullText;
        // Timeout'u temizleme - animasyon devam edecek
      } else if (fullText.startsWith(currentText)) {
        // Yeni text mevcut text'in devamı ama display henüz güncellenmedi
        // index'i mevcut display uzunluğuna ayarla
        indexRef.current = currentDisplay.length;
        fullTextRef.current = fullText;
      } else {
        // Yeni text farklı veya kısaldı - animasyonu sıfırla
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        indexRef.current = 0;
        setDisplayText('');
        fullTextRef.current = fullText;
      }
    }
  }, [fullText, displayText]);

  useEffect(() => {
    if (!enabledRef.current) {
      // Animasyon kapalıysa, metni direkt göster
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      setDisplayText(fullTextRef.current);
      indexRef.current = fullTextRef.current.length;
      return;
    }

    // Eğer tüm metin gösterildiyse, dur
    if (indexRef.current >= fullTextRef.current.length) {
      if (displayText !== fullTextRef.current) {
        setDisplayText(fullTextRef.current);
      }
      return;
    }

    // Timeout'u temizle
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Yeni karakter ekle
    timeoutRef.current = setTimeout(() => {
      if (indexRef.current < fullTextRef.current.length) {
        const nextChar = fullTextRef.current[indexRef.current];
        if (nextChar) {
          setDisplayText(prev => prev + nextChar);
          indexRef.current += 1;
        }
      }
    }, speed);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [displayText, speed, fullText]);

  return displayText;
};

