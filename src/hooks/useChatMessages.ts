import { useState, useCallback } from 'react';
import { useChat } from '@/src/lib/context/ChatContext';
import { ChatMessage } from '@/src/lib/mock/types';
import BackendApiService from '../services/BackendApiService';
import * as FileSystem from 'expo-file-system/legacy';

export const useChatMessages = () => {
  const { 
    currentConversation, 
    addMessage,
    removeMessage,
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
    selectedFiles: any[] = [],
    promptType?: string
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
          // Mesajı hazırla (boş bırakılabilir, sadece görsel/dosya gönderilebilir)
          const finalMessage = messageText.trim();
      
      // OPTIMISTIC UPDATE: Kullanıcı mesajını hemen ekle (backend'e göndermeden önce)
      // Bu sayede kullanıcı mesajı ekranda hemen görünür
      const tempUserMessageId = `temp-${Date.now()}`;
      const optimisticUserMessage: ChatMessage = {
        id: tempUserMessageId,
        text: finalMessage || (selectedImages.length > 0 || selectedFiles.length > 0 ? '' : 'Mesaj gönderiliyor...'),
        isUser: true,
        timestamp: new Date(),
        images: selectedImages.length > 0 ? selectedImages : undefined,
        files: selectedFiles.length > 0 ? selectedFiles : undefined
      };
      
      // Kullanıcı mesajını hemen ekle
      try {
        await addMessage(conversationId, optimisticUserMessage);
        console.log('✅ Kullanıcı mesajı optimistic olarak eklendi');
      } catch (addError) {
        console.error('❌ Optimistic mesaj eklenirken hata:', addError);
        // Devam et, backend'e gönder
      }
      
      // Fotoğrafları ve dosyaları backend'e yükle
      const attachments = [];
      
      // Resimleri yükle
      if (selectedImages.length > 0) {
        console.log('📸 Resimler backend\'e yükleniyor...');
        const imageAttachments = await Promise.all(
          selectedImages.map(async (imageUri) => {
            try {
              // Resmi base64'e çevir
              const base64Data = await FileSystem.readAsStringAsync(imageUri, {
                encoding: FileSystem.EncodingType.Base64,
              });
              
              // MIME type belirle
              const getImageMimeType = (uri: string): string => {
                const extension = uri.toLowerCase().split('.').pop();
                switch (extension) {
                  case 'jpg':
                  case 'jpeg':
                    return 'image/jpeg';
                  case 'png':
                    return 'image/png';
                  case 'gif':
                    return 'image/gif';
                  case 'webp':
                    return 'image/webp';
                  default:
                    return 'image/jpeg';
                }
              };
              
              const mimeType = getImageMimeType(imageUri);
              const filename = `image_${Date.now()}_${Math.random().toString(36).substring(7)}.${mimeType.split('/')[1]}`;
              
              // Backend'e yükle
              const uploadResponse = await backendApiService.uploadAttachment(
                'IMAGE',
                base64Data,
                filename,
                mimeType
              );
              
              if (uploadResponse.success && uploadResponse.data) {
                console.log('✅ Resim yüklendi:', uploadResponse.data.url);
                return {
                  type: 'IMAGE',
                  url: uploadResponse.data.url,
                  filename: uploadResponse.data.filename,
                  size: uploadResponse.data.size,
                  mimeType: uploadResponse.data.mimeType
                };
              } else {
                console.error('❌ Resim yükleme hatası:', uploadResponse.error);
                return null;
              }
            } catch (error) {
              console.error('❌ Resim işleme hatası:', error);
              return null;
            }
          })
        );
        
        // Başarılı yüklemeleri ekle
        attachments.push(...imageAttachments.filter(att => att !== null));
      }
      
      // Dosyaları yükle
      if (selectedFiles.length > 0) {
        console.log('📁 Dosyalar backend\'e yükleniyor...');
        const fileAttachments = await Promise.all(
          selectedFiles.map(async (file) => {
            try {
              // Dosyayı base64'e çevir
              const base64Data = await FileSystem.readAsStringAsync(file.uri, {
                encoding: FileSystem.EncodingType.Base64,
              });
              
              // Backend'e yükle
              const uploadResponse = await backendApiService.uploadAttachment(
                'FILE',
                base64Data,
                file.name,
                file.mimeType || 'application/octet-stream'
              );
              
              if (uploadResponse.success && uploadResponse.data) {
                console.log('✅ Dosya yüklendi:', uploadResponse.data.url);
                return {
                  type: 'FILE',
                  url: uploadResponse.data.url,
                  filename: uploadResponse.data.filename,
                  size: uploadResponse.data.size,
                  mimeType: uploadResponse.data.mimeType
                };
              } else {
                console.error('❌ Dosya yükleme hatası:', uploadResponse.error);
                return null;
              }
            } catch (error) {
              console.error('❌ Dosya işleme hatası:', error);
              return null;
            }
          })
        );
        
        // Başarılı yüklemeleri ekle
        attachments.push(...fileAttachments.filter(att => att !== null));
      }
      
      // Yüklenen attachment URL'lerini kullan
      const uploadedImageUrls = attachments
        .filter(att => att.type === 'IMAGE')
        .map(att => att.url);
      const uploadedFileUrls = attachments
        .filter(att => att.type === 'FILE')
        .map(att => att.url);

      // Araştırma modu aktifse veya promptType gönderilmişse onu kullan
      const finalPromptType = promptType || (isResearchMode ? 'RESEARCH' : undefined);

      console.log('📤 Backend\'e gönderilecek attachment\'lar:', {
        attachmentCount: attachments.length,
        attachments: attachments.map(att => ({
          type: att.type,
          url: att.url ? att.url.substring(0, 100) : 'no url',
          filename: att.filename || 'no filename',
          size: att.size || 0
        }))
      });

      // Backend'e mesajı gönder (backend hem kullanıcı mesajını hem AI cevabını döndürür)
      const response = await backendApiService.sendMessage(conversationId, finalMessage, attachments, finalPromptType);
      
      console.log('📥 Backend response:', JSON.stringify(response, null, 2));
      
      if (response.success && response.data) {
        const { userMessage, aiMessage } = response.data;
        
        // Backend'den dönen gerçek userMessage ile optimistic mesajı değiştir
        if (userMessage) {
          const userChatMessage: ChatMessage = {
            id: userMessage.id,
            text: userMessage.text,
            isUser: true,
            timestamp: new Date(userMessage.timestamp || userMessage.createdAt),
            images: uploadedImageUrls.length > 0 ? uploadedImageUrls : undefined,
            files: uploadedFileUrls.length > 0 ? uploadedFileUrls.map(url => ({ name: '', uri: url })) : undefined
          };
          
          // Optimistic mesajı kaldır ve gerçek mesajı ekle
          // Önce optimistic mesajı kaldır
          removeMessage(conversationId, tempUserMessageId);
          
          // Sonra gerçek mesajı ekle
          try {
            await addMessage(conversationId, userChatMessage);
            console.log('✅ Kullanıcı mesajı backend\'den güncellendi');
          } catch (addError) {
            console.error('❌ Kullanıcı mesajı eklenirken hata:', addError);
          }
        }
        
        // AI cevabını ekle
        if (aiMessage) {
          const aiChatMessage: ChatMessage = {
            id: aiMessage.id,
            text: aiMessage.text,
            isUser: false,
            timestamp: new Date(aiMessage.timestamp || aiMessage.createdAt)
          };
          try {
            await addMessage(conversationId, aiChatMessage);
            console.log('✅ AI cevabı başarıyla eklendi');
          } catch (addError) {
            console.error('❌ AI cevabı eklenirken hata:', addError);
          }
        }
      } else {
        // Hata durumunda optimistic mesajı kaldır
        removeMessage(conversationId, tempUserMessageId);
        
        const errorMessage: ChatMessage = {
          id: Date.now().toString(),
          text: response.error || response.message || 'Bir hata oluştu. Lütfen tekrar deneyin.',
          isUser: false,
          timestamp: new Date()
        };
        try {
          await addMessage(conversationId, errorMessage);
        } catch (addError) {
          console.error('❌ Hata mesajı eklenirken hata:', addError);
        }
        console.error('❌ Backend mesaj hatası:', response.error || response.message || 'Bilinmeyen hata');
      }
    } catch (error: any) {
      // Hata durumunda optimistic mesajı kaldır
      removeMessage(conversationId, tempUserMessageId);
      
      console.error('💥 Chat hatası:', error);
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        text: error.message || 'Bağlantı hatası. Lütfen internet bağlantınızı kontrol edin.',
        isUser: false,
        timestamp: new Date()
      };
      try {
        await addMessage(conversationId, errorMessage);
      } catch (addError) {
        console.error('❌ Hata mesajı eklenirken hata:', addError);
      }
    } finally {
      setIsLoading(false);
      console.log('🏁 Mesaj işlemi tamamlandı, isLoading false yapıldı');
    }
  }, [currentConversation, addMessage, removeMessage, isLoading]);

  const sendQuickSuggestion = useCallback(async (suggestion: {question: string, promptType: string}): Promise<string | undefined> => {
    try {
      if (!currentConversation) {
        const title = suggestion.question.length > 30 ? suggestion.question.substring(0, 30) + '...' : suggestion.question;
        const conversationId = await createNewConversation(title, suggestion.question);
        selectConversation(conversationId);
        await sendMessage(suggestion.question, conversationId, false, [], [], suggestion.promptType);
        return conversationId;
      } else {
        await sendMessage(suggestion.question, currentConversation.id, false, [], [], suggestion.promptType);
        return currentConversation.id;
      }
    } catch (error) {
      console.error('Quick suggestion error:', error);
      return undefined;
    }
  }, [currentConversation, createNewConversation, selectConversation, sendMessage]);

  return {
    isLoading,
    sendMessage,
    sendQuickSuggestion,
    currentConversation
  };
};

