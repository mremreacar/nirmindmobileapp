import { useState, useMemo } from 'react';

export const useQuickSuggestions = () => {
  const [suggestionCycle, setSuggestionCycle] = useState(0);
  const [showQuickSuggestions, setShowQuickSuggestions] = useState(false);

  // Hızlı öneriler listesi - Nireya Ekosistem Markaları
  const allSuggestions = useMemo(() => [
    "Nireya ekosistemi nedir?",
    "NirMind uygulamasının özellikleri nelerdir?",
    "Nireya markaları hangileridir?",
    "NirMind nasıl kullanılır?",
    "Nireya ekosisteminin amacı nedir?",
    "NirMind'de hangi özellikler var?",
    "Nireya markalarının ortak özellikleri neler?",
    "NirMind uygulaması ne işe yarar?",
    "Nireya ekosisteminde hangi hizmetler sunuluyor?",
    "NirMind'in diğer uygulamalardan farkı nedir?",
    "NirMind'de hangi AI özellikleri var?",
    "Nireya ekosisteminin vizyonu nedir?",
    "Nireya markalarının misyonu nedir?",
    "Nireya ekosisteminde hangi teknolojiler kullanılıyor?",
    "NirMind'de AI özellikleri nasıl çalışıyor?",
    "Nireya markalarının değerleri nelerdir?",
    "NirMind'de kullanıcı deneyimi nasıl?",
    "NirPax nedir ve ne işe yarar?",
    "NirMind'in özellikleri nelerdir?",
    "NirPay nasıl çalışır?",
    "Nireya ekosisteminde dijital güvenlik nasıl sağlanıyor?",
    "Nireya ekosisteminde lüks yaşam deneyimi nasıl?"
  ], []);

  // Her açılışta farklı 5 öneri göster
  const currentSuggestions = useMemo(() => {
    const startIndex = (suggestionCycle * 5) % allSuggestions.length;
    const suggestions = [];
    
    for (let i = 0; i < 5; i++) {
      const index = (startIndex + i) % allSuggestions.length;
      suggestions.push(allSuggestions[index]);
    }
    
    return suggestions;
  }, [suggestionCycle, allSuggestions]);

  const handleOnerilerPress = () => {
    setSuggestionCycle(prev => prev + 1);
    setShowQuickSuggestions(true);
  };

  const handleSuggestionSelect = (suggestion: string) => {
    setShowQuickSuggestions(false);
    return suggestion;
  };

  return {
    showQuickSuggestions,
    setShowQuickSuggestions,
    currentSuggestions,
    handleOnerilerPress,
    handleSuggestionSelect
  };
};

