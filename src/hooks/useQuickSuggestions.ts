import { useState, useMemo, useEffect, useCallback } from 'react';
import BackendApiService from '@/src/services/BackendApiService';

export const useQuickSuggestions = () => {
  const [suggestionCycle, setSuggestionCycle] = useState(0);
  const [showQuickSuggestions, setShowQuickSuggestions] = useState(false);
  const [allSuggestions, setAllSuggestions] = useState<Array<{question: string, promptType: string}>>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  
  const backendApiService = BackendApiService.getInstance();

  // Backend'den önerileri yükle
  useEffect(() => {
    const loadSuggestions = async () => {
      try {
        setIsLoadingSuggestions(true);
        const response = await backendApiService.getQuickSuggestions();
        if (response.success && response.data && Array.isArray(response.data)) {
          // Yeni format: {question, promptType} array'i
          const suggestions = response.data.map((item: any) => {
            if (typeof item === 'string') {
              // Eski format desteği (fallback)
              return { question: item, promptType: 'CHAT' };
            } else if (item && typeof item === 'object') {
              return {
                question: item.question || item.title || String(item),
                promptType: item.promptType || 'CHAT'
              };
            }
            return { question: String(item), promptType: 'CHAT' };
          });
          setAllSuggestions(suggestions);
        } else {
          // Fallback: Eğer backend'den veri gelmezse varsayılan önerileri kullan
          setAllSuggestions([
            { question: "Nireya ekosistemi nedir?", promptType: 'CHAT' },
            { question: "NirMind uygulamasının özellikleri nelerdir?", promptType: 'CHAT' },
            { question: "Nireya markaları hangileridir?", promptType: 'CHAT' },
            { question: "NirMind nasıl kullanılır?", promptType: 'CHAT' },
            { question: "Nireya ekosisteminin amacı nedir?", promptType: 'CHAT' }
          ]);
        }
      } catch (error) {
        console.error('❌ Öneriler yüklenirken hata:', error);
        // Fallback: Hata durumunda varsayılan önerileri kullan
        setAllSuggestions([
          { question: "Nireya ekosistemi nedir?", promptType: 'CHAT' },
          { question: "NirMind uygulamasının özellikleri nelerdir?", promptType: 'CHAT' },
          { question: "Nireya markaları hangileridir?", promptType: 'CHAT' },
          { question: "NirMind nasıl kullanılır?", promptType: 'CHAT' },
          { question: "Nireya ekosisteminin amacı nedir?", promptType: 'CHAT' }
        ]);
      } finally {
        setIsLoadingSuggestions(false);
      }
    };

    loadSuggestions();
  }, [backendApiService]);

  // Her açılışta farklı 5 öneri göster
  const currentSuggestions = useMemo(() => {
    if (allSuggestions.length === 0) {
      return [];
    }
    
    const startIndex = (suggestionCycle * 5) % allSuggestions.length;
    const suggestions = [];
    
    for (let i = 0; i < 5; i++) {
      const index = (startIndex + i) % allSuggestions.length;
      suggestions.push(allSuggestions[index]);
    }
    
    return suggestions;
  }, [suggestionCycle, allSuggestions]);

  const handleOnerilerPress = useCallback(() => {
    setSuggestionCycle(prev => prev + 1);
    setShowQuickSuggestions(true);
  }, []);

  const handleSuggestionSelect = useCallback((suggestion: {question: string, promptType: string}) => {
    setShowQuickSuggestions(false);
    return suggestion;
  }, []);

  return {
    showQuickSuggestions,
    setShowQuickSuggestions,
    currentSuggestions,
    handleOnerilerPress,
    handleSuggestionSelect,
    isLoadingSuggestions
  };
};

