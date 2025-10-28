import { useState, useCallback } from 'react';
import { useChat } from '@/src/lib/context/ChatContext';
import { ChatMessage } from '@/src/lib/mock/types';
import { openaiService, ChatResponse } from '../../services/openaiService';
import { fileService } from '../services/fileService';
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
    // Loading guard - eğer zaten bir mesaj işleniyorsa yeni mesaj gönderme
    if (isLoading) {
      console.log('⚠️ Zaten bir mesaj işleniyor, yeni mesaj gönderilemiyor');
      return;
    }

    // Mesaj metni yoksa ve dosya/resim de yoksa gönderme
    if (!messageText.trim() && selectedImages.length === 0 && selectedFiles.length === 0) {
      console.log('⚠️ Mesaj gönderilemedi:', { 
        hasText: !!messageText.trim(), 
        hasImages: selectedImages.length > 0, 
        hasFiles: selectedFiles.length > 0
      });
      return;
    }

    // Eğer sadece dosya/resim varsa ve metin yoksa, boş mesaj ile gönder
    if (!messageText.trim() && (selectedImages.length > 0 || selectedFiles.length > 0)) {
      console.log('📎 Sadece dosya/resim gönderiliyor, metin yok');
    }

    console.log('📤 Mesaj gönderiliyor:', { messageText, conversationId, isResearchMode });

    // Metin mesajı varsa veya dosya/resim varsa kullanıcı mesajı ekle
    if (messageText.trim() || selectedImages.length > 0 || selectedFiles.length > 0) {
      // Mesaj çift ekleme kontrolü
      const existingMessage = currentConversation?.messages.find(
        msg => msg.text === messageText.trim() && 
               msg.isUser && 
               Math.abs(new Date().getTime() - msg.timestamp.getTime()) < 5000 // 5 saniye içinde
      );
      
      if (existingMessage) {
        console.log('🔄 Aynı mesaj zaten mevcut, kullanıcı mesajı eklenmiyor');
      } else {
        const newMessage: ChatMessage = {
          id: Date.now().toString(),
          text: messageText.trim(),
          isUser: true,
          timestamp: new Date(),
          images: selectedImages.length > 0 ? selectedImages : undefined,
          files: selectedFiles.length > 0 ? selectedFiles : undefined
        };
        addMessage(conversationId, newMessage);
        console.log('✅ Kullanıcı mesajı eklendi');
        
        // Backend'e mesajı gönder
        try {
          const attachments = [];
          if (selectedImages.length > 0) {
            attachments.push(...selectedImages.map(img => ({ type: 'image', url: img })));
          }
          if (selectedFiles.length > 0) {
            attachments.push(...selectedFiles.map(file => ({ type: 'file', url: file.uri, filename: file.name })));
          }
          
          await backendApiService.sendMessage(conversationId, messageText.trim(), attachments);
          console.log('✅ Mesaj backend\'e gönderildi');
        } catch (error) {
          console.error('❌ Backend mesaj gönderme hatası:', error);
        }
      }
    } else {
      console.log('⚠️ Ne metin ne de dosya/resim var, mesaj eklenmiyor');
    }
    
    setIsLoading(true);
    
    try {
      const chatHistory = currentConversation?.messages || [];
      let response: ChatResponse;
      
      // Dosya analizi gerekip gerekmediğini kontrol et
      const hasImages = selectedImages.length > 0;
      const hasFiles = selectedFiles.length > 0;

      if (hasImages) {
        console.log('🖼️ Resim mevcut, OpenAI API ile analiz ediliyor...');
        
        // İlk resmi OpenAI API'ye gönder
        const firstImage = selectedImages[0];
        response = await openaiService.analyzeImage(firstImage, messageText.trim() || "Bu resmi analiz et");
        
        if (response.success) {
          console.log('✅ Resim analizi başarılı:', response.message.substring(0, 50) + '...');
        } else {
          console.log('❌ Resim analizi başarısız:', response.error);
        }
      } else if (hasFiles) {
        console.log('📁 Dosya mevcut, analiz zaten yapıldı, direkt mesaj gönderiliyor...');
        
        // Eğer mesaj metni varsa (analiz sonucu), onu kullan
        if (messageText.trim()) {
          console.log('📝 Analiz sonucu mevcut, direkt gönderiliyor');
          response = {
            message: messageText.trim(),
            success: true
          };
        } else {
          // Eğer analiz sonucu yoksa, basit bir mesaj gönder
          console.log('📝 Analiz sonucu yok, basit mesaj gönderiliyor');
          response = {
            message: 'Dosya/resim gönderildi. Analiz sonucu alınamadı.',
            success: true
          };
        }
      } else if (isResearchMode) {
        const researchPrompt = `"${messageText.trim()}" konusunu araştır ve bulduklarını bana detaylıca yaz. Bu konu hakkında detaylı bilgiler, tarihçe, faydaları, uygulama yöntemleri ve güncel gelişmeleri içeren kapsamlı bir metin hazırla.`;
        console.log('🔍 Araştırma modu aktif:', researchPrompt);
        response = await openaiService.sendMessage(researchPrompt, conversationId);
      } else {
        console.log('💬 Normal mesaj modu');
        response = await openaiService.sendMessage(messageText.trim(), conversationId);
      }
      
      if (response.success && response.message) {
        const aiResponse: ChatMessage = {
          id: (Date.now() + 1).toString(),
          text: response.message,
          isUser: false,
          timestamp: new Date()
        };
        addMessage(conversationId, aiResponse);
        console.log('✅ AI cevabı başarıyla eklendi:', response.message.substring(0, 50) + '...');
      } else {
        const errorMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          text: response.error || 'Bir hata oluştu. Lütfen tekrar deneyin.',
          isUser: false,
          timestamp: new Date()
        };
        addMessage(conversationId, errorMessage);
        console.log('❌ AI cevap hatası:', response.error);
      }
    } catch (error) {
      console.error('💥 Chat hatası:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: 'Bağlantı hatası. Lütfen internet bağlantınızı kontrol edin.',
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

