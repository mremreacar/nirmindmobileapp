import { useState, useCallback } from 'react';
import { useChat } from '@/src/lib/context/ChatContext';
import { ChatMessage } from '@/src/lib/mock/types';
import BackendApiService from '../services/BackendApiService';

export const useChatMessages = () => {
  const { 
    currentConversation, 
    addMessage, 
    createNewConversation, 
    selectConversation 
  } = useChat();
  
  const [isLoading, setIsLoading] = useState(false);
  const backendApiService = BackendApiService.getInstance();

  const sendMessage = useCallback(async (
    messageText: string,
    conversationId: string,
    isResearchMode: boolean = false,
    selectedImages: string[] = [],
    selectedFiles: any[] = []
  ) => {
    if (isLoading) {
      console.log('⚠️ Zaten bir mesaj işleniyor, yeni mesaj gönderilemiyor');
      return;
    }

    if (!messageText.trim() && selectedImages.length === 0 && selectedFiles.length === 0) {
      console.log('⚠️ Mesaj gönderilemedi: içerik yok');
      return;
    }

    console.log('📤 Mesaj backend\'e gönderiliyor:', { messageText, conversationId, isResearchMode });
    
    setIsLoading(true);
    
    try {
      const attachments = [];
      if (selectedImages.length > 0) {
        attachments.push(...selectedImages.map(img => ({ 
          type: 'image', 
          url: img,
          filename: `image_${Date.now()}.jpg`
        })));
      }
      if (selectedFiles.length > 0) {
        attachments.push(...selectedFiles.map(file => ({ 
          type: 'file', 
          url: file.uri, 
          filename: file.name,
          size: file.size,
          mimeType: file.mimeType
        })));
      }

      // Araştırma modu için mesajı güncelle
      const finalMessage = isResearchMode 
        ? `"${messageText.trim()}" konusunu araştır ve bulduklarını bana detaylıca yaz. Bu konu hakkında detaylı bilgiler, tarihçe, faydaları, uygulama yöntemleri ve güncel gelişmeleri içeren kapsamlı bir metin hazırla.`
        : messageText.trim() || (attachments.length > 0 ? 'Bu dosyaları analiz et' : '');

      // Backend'e mesajı gönder (backend hem kullanıcı mesajını hem AI cevabını döndürür)
      const response = await backendApiService.sendMessage(conversationId, finalMessage, attachments);
      
      if (response.success && response.data) {
        const { userMessage, aiMessage } = response.data;
        
        // Kullanıcı mesajını ekle
        if (userMessage) {
          const userChatMessage: ChatMessage = {
            id: userMessage.id,
            text: userMessage.text,
            isUser: true,
            timestamp: new Date(userMessage.timestamp || userMessage.createdAt),
            images: selectedImages.length > 0 ? selectedImages : undefined,
            files: selectedFiles.length > 0 ? selectedFiles : undefined
          };
          addMessage(conversationId, userChatMessage);
      }
      
        // AI cevabını ekle
        if (aiMessage) {
          const aiChatMessage: ChatMessage = {
            id: aiMessage.id,
            text: aiMessage.text,
          isUser: false,
            timestamp: new Date(aiMessage.timestamp || aiMessage.createdAt)
        };
          addMessage(conversationId, aiChatMessage);
          console.log('✅ AI cevabı başarıyla eklendi');
        }
      } else {
        const errorMessage: ChatMessage = {
          id: Date.now().toString(),
          text: response.error || 'Bir hata oluştu. Lütfen tekrar deneyin.',
          isUser: false,
          timestamp: new Date()
        };
        addMessage(conversationId, errorMessage);
        console.error('❌ Backend mesaj hatası:', response.error);
      }
    } catch (error: any) {
      console.error('💥 Chat hatası:', error);
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        text: error.message || 'Bağlantı hatası. Lütfen internet bağlantınızı kontrol edin.',
        isUser: false,
        timestamp: new Date()
      };
      addMessage(conversationId, errorMessage);
    } finally {
      setIsLoading(false);
      console.log('🏁 Mesaj işlemi tamamlandı');
    }
  }, [currentConversation, addMessage]);

  const sendQuickSuggestion = useCallback(async (suggestion: string) => {
    try {
      if (!currentConversation) {
        const title = suggestion.length > 30 ? suggestion.substring(0, 30) + '...' : suggestion;
        const conversationId = await createNewConversation(title, suggestion);
        selectConversation(conversationId);
        await sendMessage(suggestion, conversationId, false);
      } else {
        await sendMessage(suggestion, currentConversation.id, false);
      }
    } catch (error) {
      console.error('Quick suggestion error:', error);
    }
  }, [currentConversation, createNewConversation, selectConversation, sendMessage]);

  return {
    isLoading,
    sendMessage,
    sendQuickSuggestion,
    currentConversation
  };
};

