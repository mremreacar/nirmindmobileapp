import { useCallback } from 'react';
import { Alert } from 'react-native';
import type { ChatSelectedFile } from '@/src/types/chat';
import type { ChatConversation } from '@/src/lib/mock/types';

interface UseChatMessagingOptions {
  conversationId?: string;
  currentConversation: ChatConversation | null;
  selectedImages: string[];
  setSelectedImages: React.Dispatch<React.SetStateAction<string[]>>;
  selectedFiles: ChatSelectedFile[];
  setSelectedFiles: React.Dispatch<React.SetStateAction<ChatSelectedFile[]>>;
  inputText: string;
  setInputText: (value: string) => void;
  arastirmaModu: boolean;
  isLoading: boolean;
  sendMessage: (
    messageText: string,
    conversationId: string,
    isResearchMode?: boolean,
    selectedImages?: string[],
    selectedFiles?: ChatSelectedFile[],
    promptType?: string
  ) => Promise<void>;
  closeUploadModal: (shouldFocusInput?: boolean) => void;
  inputClearedRef: React.MutableRefObject<boolean>;
}

interface UseChatMessagingResult {
  handleSendMessage: () => Promise<void>;
  handleSendFilesOnly: () => Promise<void>;
}

export const useChatMessaging = ({
  conversationId,
  currentConversation,
  selectedImages,
  setSelectedImages,
  selectedFiles,
  setSelectedFiles,
  inputText,
  setInputText,
  arastirmaModu,
  isLoading,
  sendMessage,
  closeUploadModal,
  inputClearedRef,
}: UseChatMessagingOptions): UseChatMessagingResult => {
  const resolveConversationId = useCallback(() => {
    return conversationId || currentConversation?.id || null;
  }, [conversationId, currentConversation?.id]);

  const handleSendMessage = useCallback(async () => {
    if (isLoading) {
      console.log('⚠️ Zaten bir mesaj işleniyor, çift gönderim engellendi');
      return;
    }

    const hasContent = inputText.trim() || selectedImages.length > 0 || selectedFiles.length > 0;
    if (!hasContent) {
      console.log('⚠️ Mesaj gönderilemedi: içerik yok', {
        hasText: !!inputText.trim(),
        hasImages: selectedImages.length > 0,
        hasFiles: selectedFiles.length > 0,
      });
      return;
    }

    const targetConversationId = resolveConversationId();
    if (!targetConversationId) {
      console.error('❌ ChatScreen: conversationId eksik, mesaj gönderilemedi', {
        hasPropConversationId: !!conversationId,
        hasCurrentConversation: !!currentConversation,
        hasCurrentConversationId: !!currentConversation?.id,
      });
      Alert.alert('Hata', 'Konuşma bulunamadı. Lütfen tekrar deneyin.', [{ text: 'Tamam' }]);
      return;
    }

    console.log('📤 Kullanıcı mesajı gönderiliyor:', {
      text: inputText,
      images: selectedImages.length,
      files: selectedFiles.length,
      conversationId: targetConversationId,
    });

    const finalMessage = inputText.trim();
    const imagesToSend = [...selectedImages];
    const filesToSend = [...selectedFiles];

    inputClearedRef.current = true;
    console.log('🧹 Input temizleniyor...', { currentInputText: inputText });
    setInputText('');
    setSelectedImages([]);
    setSelectedFiles([]);

    try {
      const promptType = arastirmaModu ? 'RESEARCH' : undefined;
      await sendMessage(finalMessage, targetConversationId, arastirmaModu, imagesToSend, filesToSend, promptType);
      console.log('✅ Kullanıcı mesajı gönderildi, AI cevap bekleniyor...');
      inputClearedRef.current = true;
      setInputText('');
    } catch (error: any) {
      console.error('❌ Mesaj gönderme hatası:', error);
      const errorMessage = error?.message || 'Mesaj gönderilirken bir hata oluştu';

      if (errorMessage.includes('conversationId eksik')) {
        Alert.alert('Hata', 'Konuşma bulunamadı. Lütfen tekrar deneyin.', [{ text: 'Tamam' }]);
      } else {
        Alert.alert('Hata', errorMessage, [{ text: 'Tamam' }]);
      }

      inputClearedRef.current = false;
      setInputText(finalMessage);
      setSelectedImages(imagesToSend);
      setSelectedFiles(filesToSend);
    }
  }, [
    arastirmaModu,
    conversationId,
    currentConversation,
    inputClearedRef,
    inputText,
    isLoading,
    resolveConversationId,
    selectedFiles,
    selectedImages,
    sendMessage,
    setInputText,
    setSelectedFiles,
    setSelectedImages,
  ]);

  const handleSendFilesOnly = useCallback(async () => {
    if (isLoading) {
      console.log('⚠️ Zaten bir mesaj işleniyor, dosyalar gönderilemedi');
      return;
    }

    const targetConversationId = resolveConversationId();
    if (!targetConversationId) {
      console.error('❌ ChatScreen: conversationId eksik, dosyalar gönderilemedi', {
        hasPropConversationId: !!conversationId,
        hasCurrentConversation: !!currentConversation,
        hasCurrentConversationId: !!currentConversation?.id,
      });
      Alert.alert('Hata', 'Konuşma bulunamadı. Lütfen tekrar deneyin.', [{ text: 'Tamam' }]);
      return;
    }

    if (selectedImages.length === 0 && selectedFiles.length === 0) {
      console.log('⚠️ Gönderilecek dosya/resim yok');
      return;
    }

    console.log('📤 Sadece dosyalar backend üzerinden gönderiliyor:', {
      images: selectedImages.length,
      files: selectedFiles.length,
    });

    const imagesToSend = [...selectedImages];
    const filesToSend = [...selectedFiles];

    try {
      const promptType = arastirmaModu ? 'RESEARCH' : undefined;
      await sendMessage('', targetConversationId, arastirmaModu, imagesToSend, filesToSend, promptType);

      setSelectedImages([]);
      setSelectedFiles([]);
      closeUploadModal();

      console.log('✅ Dosyalar gönderildi, AI cevap bekleniyor...');
    } catch (error: any) {
      console.error('❌ Dosya gönderme hatası:', error);
      const errorMessage = error?.message || 'Dosyalar gönderilirken bir hata oluştu';

      if (errorMessage.includes('conversationId eksik')) {
        Alert.alert('Hata', 'Konuşma bulunamadı. Lütfen tekrar deneyin.', [{ text: 'Tamam' }]);
      } else {
        Alert.alert('Hata', errorMessage, [{ text: 'Tamam' }]);
      }

      setSelectedImages(imagesToSend);
      setSelectedFiles(filesToSend);
    }
  }, [
    arastirmaModu,
    closeUploadModal,
    conversationId,
    currentConversation,
    isLoading,
    resolveConversationId,
    selectedFiles,
    selectedImages,
    sendMessage,
    setSelectedFiles,
    setSelectedImages,
  ]);

  return {
    handleSendMessage,
    handleSendFilesOnly,
  };
};


