import { useCallback, useRef, useState, useEffect } from 'react';
import { Platform, Keyboard } from 'react-native';

// Mobil cihaz kontrolü
const isMobileDevice = Platform.OS === 'ios' || Platform.OS === 'android';

interface AdvancedKeyboardOptions {
  onSend?: () => void;
  onDismiss?: () => void;
  onNavigateMessageHistory?: (direction: 'up' | 'down') => void;
  onCommand?: (command: string) => void;
  enableShortcuts?: boolean;
  enableMessageHistory?: boolean;
  enableCommands?: boolean;
}

interface MessageHistoryItem {
  text: string;
  timestamp: number;
}

export const useAdvancedKeyboard = (options: AdvancedKeyboardOptions = {}) => {
  const {
    onSend,
    onDismiss,
    onNavigateMessageHistory,
    onCommand,
    enableShortcuts = true,
    enableMessageHistory = true,
    enableCommands = true,
  } = options;

  const [messageHistory, setMessageHistory] = useState<MessageHistoryItem[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [currentInputBeforeHistory, setCurrentInputBeforeHistory] = useState('');
  const historyIndexRef = useRef(-1);
  const isNavigatingHistoryRef = useRef(false);

  // Mesaj geçmişine ekle
  const addToHistory = useCallback((text: string) => {
    if (!text.trim() || !enableMessageHistory) return;
    
    setMessageHistory((prev) => {
      // Son mesajla aynıysa ekleme
      if (prev.length > 0 && prev[prev.length - 1].text === text) {
        return prev;
      }
      // Son 50 mesajı tut
      const newHistory = [...prev, { text, timestamp: Date.now() }];
      return newHistory.slice(-50);
    });
    setHistoryIndex(-1);
    historyIndexRef.current = -1;
    isNavigatingHistoryRef.current = false;
  }, [enableMessageHistory]);

  // Mesaj geçmişinde gezinme
  const navigateHistory = useCallback((direction: 'up' | 'down'): string | null => {
    if (!enableMessageHistory || messageHistory.length === 0) {
      return null;
    }

    let newIndex = historyIndexRef.current;

    if (direction === 'up') {
      // İlk kez yukarı gidiyorsa, mevcut input'u kaydet
      if (!isNavigatingHistoryRef.current) {
        setCurrentInputBeforeHistory('');
      }
      isNavigatingHistoryRef.current = true;
      
      if (newIndex === -1) {
        newIndex = messageHistory.length - 1;
      } else if (newIndex > 0) {
        newIndex--;
      }
    } else {
      // Aşağı
      if (newIndex === -1) {
        return null; // Zaten en altta
      }
      
      if (newIndex < messageHistory.length - 1) {
        newIndex++;
      } else {
        // En alta geldi, orijinal input'a dön
        newIndex = -1;
        isNavigatingHistoryRef.current = false;
        return currentInputBeforeHistory || null;
      }
    }

    historyIndexRef.current = newIndex;
    setHistoryIndex(newIndex);
    
    if (newIndex >= 0 && newIndex < messageHistory.length) {
      return messageHistory[newIndex].text;
    }
    
    return null;
  }, [messageHistory, currentInputBeforeHistory, enableMessageHistory]);

  // Klavye kısayolları handler - Mobil için sadeleştirilmiş
  const handleKeyPress = useCallback((key: string, shiftKey?: boolean, metaKey?: boolean, ctrlKey?: boolean) => {
    if (!enableShortcuts) return false;

    // Mobil cihazlarda sadece temel özellikler
    if (isMobileDevice) {
      // Mobilde Escape tuşu genelde yok, ama fiziksel klavye varsa çalışabilir
      if (key === 'Escape') {
        if (onDismiss) {
          onDismiss();
          return true;
        }
      }
      
      // Mobilde ok tuşları genelde yok, bu yüzden mesaj geçmişinde gezinme kaldırıldı
      // Fiziksel klavye varsa çalışabilir ama mobil için optimize edilmedi
      
      return false;
    }

    // Desktop/Tablet için gelişmiş özellikler
    const isMac = Platform.OS === 'ios' || Platform.OS === 'macos';
    const modifierKey = isMac ? metaKey : ctrlKey;

    // Cmd/Ctrl + Enter: Mesaj gönder (sadece desktop/tablet)
    if (modifierKey && key === 'Enter') {
      if (onSend) {
        onSend();
        return true;
      }
    }

    // Escape: Klavyeyi kapat
    if (key === 'Escape') {
      if (onDismiss) {
        onDismiss();
        return true;
      }
    }

    // Arrow Up: Önceki mesaj (sadece fiziksel klavye varsa)
    if (key === 'ArrowUp' && !shiftKey && !modifierKey) {
      if (enableMessageHistory && onNavigateMessageHistory) {
        const text = navigateHistory('up');
        if (text !== null) {
          onNavigateMessageHistory('up');
          return true;
        }
      }
    }

    // Arrow Down: Sonraki mesaj (sadece fiziksel klavye varsa)
    if (key === 'ArrowDown' && !shiftKey && !modifierKey) {
      if (enableMessageHistory && onNavigateMessageHistory) {
        const text = navigateHistory('down');
        if (text !== null) {
          onNavigateMessageHistory('down');
          return true;
        }
      }
    }

    return false;
  }, [enableShortcuts, enableMessageHistory, onSend, onDismiss, onNavigateMessageHistory, navigateHistory]);

  // Hızlı komutlar handler
  const handleCommand = useCallback((text: string): boolean => {
    if (!enableCommands || !text.startsWith('/')) {
      return false;
    }

    const command = text.trim().toLowerCase();
    
    // Sadece "/" ise komut değil, komut yazılıyor
    if (command === '/') {
      return false;
    }
    
    // Komut listesi
    const commands: Record<string, () => void> = {
      '/help': () => {
        if (onCommand) {
          onCommand('help');
        }
      },
      '/clear': () => {
        if (onCommand) {
          onCommand('clear');
        }
      },
      '/reset': () => {
        if (onCommand) {
          onCommand('reset');
        }
      },
    };

    // Komut bulundu mu?
    if (commands[command]) {
      commands[command]();
      return true;
    }

    // Bilinmeyen komut - sadece gerçek bir komut yazıldıysa (sadece "/" değilse)
    if (command.length > 1 && onCommand) {
      onCommand(command);
      return true;
    }
    
    return false;
  }, [enableCommands, onCommand]);

  // Geçmişi sıfırla
  const resetHistory = useCallback(() => {
    setHistoryIndex(-1);
    historyIndexRef.current = -1;
    isNavigatingHistoryRef.current = false;
    setCurrentInputBeforeHistory('');
  }, []);

  // Mevcut input'u kaydet (geçmişe girmeden önce)
  const saveCurrentInput = useCallback((text: string) => {
    if (!isNavigatingHistoryRef.current) {
      setCurrentInputBeforeHistory(text);
    }
  }, []);

  return {
    // Functions
    handleKeyPress,
    handleCommand,
    addToHistory,
    navigateHistory,
    resetHistory,
    saveCurrentInput,
    
    // State
    messageHistory,
    historyIndex,
    isNavigatingHistory: isNavigatingHistoryRef.current,
  };
};

