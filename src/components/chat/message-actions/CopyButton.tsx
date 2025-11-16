import React, { memo, useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, Image, Alert, Platform } from 'react-native';
import { messageStyles } from '@/src/styles/messageStyles';
import { ChatMessage } from '@/src/lib/mock/types';

interface CopyButtonProps {
  text: string;
  message?: ChatMessage;
  isSelected?: boolean;
  showIcon?: boolean;
  onDelete?: (message: ChatMessage) => void;
}

/**
 * Mesaj kopyalama butonu component'i
 * - Normal mod: İkon butonu (mesajın altında)
 * - Seçim modu: "Kopyala" yazılı buton (mesajın altında)
 * - Kopyalama başarılı olduğunda success ikonu gösterir
 */
export const CopyButton = memo<CopyButtonProps>(({ text, message, isSelected = false, showIcon = true, onDelete }) => {
  const [showSuccess, setShowSuccess] = useState(false);

  const performCopy = useCallback(async () => {
    try {
      if (!text.trim()) {
        Alert.alert('Hata', 'Kopyalanacak metin bulunamadı');
        return false;
      }

      // Platform'a göre clipboard kullan
      if (Platform.OS === 'web') {
        // Web için navigator.clipboard
        if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
        } else if (typeof document !== 'undefined') {
          // Fallback: eski yöntem (select + copy)
          const textArea = document.createElement('textarea');
          textArea.value = text;
          textArea.style.position = 'fixed';
          textArea.style.opacity = '0';
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
        } else {
          Alert.alert('Hata', 'Web ortamında kopyalama desteklenmiyor');
          return false;
        }
      } else {
        // Native için expo-clipboard (dynamic import ile güvenli)
        try {
          const ClipboardModule = await import('expo-clipboard');
          const Clipboard = ClipboardModule.default || ClipboardModule;
          if (Clipboard && Clipboard.setStringAsync) {
            await Clipboard.setStringAsync(text);
          } else {
            throw new Error('Clipboard API not available');
          }
        } catch (clipboardError) {
          console.error('❌ Clipboard modülü yüklenemedi:', clipboardError);
          // Fallback: kullanıcıya bilgi ver
          Alert.alert(
            'Kopyalama Özelliği',
            'Kopyalama özelliği için development build gereklidir. Lütfen npx expo run:ios veya npx expo run:android komutunu kullanın.',
            [{ text: 'Tamam' }]
          );
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('❌ Mesaj kopyalama hatası:', error);
      Alert.alert('Hata', 'Kopyalama hatası');
      return false;
    }
  }, [text]);

  const handleCopyMessage = useCallback(async () => {
    // Sadece kopyalama yap, menü gösterme
    const success = await performCopy();
    if (success) {
      // Success ikonunu göster
      setShowSuccess(true);
      // 2 saniye sonra copy.png'ye geri dön
      setTimeout(() => {
        setShowSuccess(false);
      }, 2000);
    }
  }, [performCopy]);

  if (isSelected) {
    // Seçim modu: Büyük "Kopyala" butonu
    return (
      <TouchableOpacity
        style={messageStyles.selectedCopyButton}
        onPress={handleCopyMessage}
        activeOpacity={0.6}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text allowFontScaling={false} style={messageStyles.selectedCopyButtonText}>Kopyala</Text>
      </TouchableOpacity>
    );
  }

  if (!showIcon) {
    return null;
  }

  // Normal mod: İkon butonu
  return (
    <TouchableOpacity
      style={messageStyles.copyButton}
      onPress={handleCopyMessage}
      activeOpacity={0.6}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      {showSuccess ? (
        <View style={messageStyles.successIconContainer}>
          <Text style={messageStyles.successIcon}>✓</Text>
        </View>
      ) : (
        <Image 
          source={require('@/assets/copy.png')} 
          style={messageStyles.copyButtonIcon}
          resizeMode="contain"
        />
      )}
    </TouchableOpacity>
  );
});

CopyButton.displayName = 'CopyButton';



