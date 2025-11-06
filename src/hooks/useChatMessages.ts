import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
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

    // Conversation ID kontrolü - kritik!
    if (!conversationId) {
      console.error('❌ sendMessage: conversationId eksik, mesaj gönderilemedi:', {
        messageText: messageText.substring(0, 50),
        hasImages: selectedImages.length > 0,
        hasFiles: selectedFiles.length > 0
      });
      return;
    }

    console.log('📤 Mesaj backend\'e gönderiliyor:', { messageText, conversationId, isResearchMode });
    
    // currentConversation kontrolü - eğer conversation seçili değilse seç
    if (!currentConversation || currentConversation.id !== conversationId) {
      console.log('⚠️ currentConversation farklı veya undefined, conversation seçiliyor...');
      try {
        await selectConversation(conversationId);
        console.log('✅ Conversation seçildi:', conversationId);
      } catch (selectError) {
        console.error('❌ Conversation seçilirken hata:', selectError);
        // Devam et, belki conversation zaten var
      }
    }
        
    setIsLoading(true);
    
    // tempUserMessageId'yi try bloğunun dışına taşı (catch bloğunda kullanılabilmesi için)
    const tempUserMessageId = `temp-${Date.now()}`;
    
    try {
      // Mesajı hazırla (boş bırakılabilir, sadece görsel/dosya gönderilebilir)
      const finalMessage = messageText.trim();
      
      // OPTIMISTIC UPDATE: Kullanıcı mesajını hemen ekle (backend'e göndermeden önce)
      // Bu sayede kullanıcı mesajı ekranda hemen görünür
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
                console.error('❌ Resim yükleme detayları:', uploadResponse.message || uploadResponse);
                // Hata olsa bile null döndür, böylece diğer dosyalar yüklenmeye devam eder
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
              
              // Dosya tipini belirle - görsel dosyaları IMAGE olarak gönder
              const mimeType = file.mimeType || 'application/octet-stream';
              const fileName = file.name || '';
              const fileExtension = fileName.toLowerCase().split('.').pop() || '';
              
              // Görsel dosyaları IMAGE olarak gönder
              let attachmentType: 'IMAGE' | 'FILE' | 'AUDIO' | 'VIDEO' = 'FILE';
              if (mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'].includes(fileExtension)) {
                attachmentType = 'IMAGE';
              } else if (mimeType.startsWith('video/')) {
                attachmentType = 'VIDEO';
              } else if (mimeType.startsWith('audio/')) {
                attachmentType = 'AUDIO';
              }
              
              // Backend'e yükle
              const uploadResponse = await backendApiService.uploadAttachment(
                attachmentType,
                base64Data,
                file.name,
                mimeType
              );
              
              if (uploadResponse.success && uploadResponse.data) {
                console.log(`✅ ${attachmentType === 'IMAGE' ? 'Görsel' : 'Dosya'} yüklendi:`, uploadResponse.data.url);
                return {
                  type: attachmentType,
                  url: uploadResponse.data.url,
                  filename: uploadResponse.data.filename,
                  size: uploadResponse.data.size,
                  mimeType: uploadResponse.data.mimeType
                };
              } else {
                console.error('❌ Dosya yükleme hatası:', uploadResponse.error);
                console.error('❌ Dosya yükleme detayları:', uploadResponse.message || uploadResponse);
                // Hata olsa bile null döndür, böylece diğer dosyalar yüklenmeye devam eder
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

      // Streaming endpoint kullan - ChatGPT gibi gerçek zamanlı yazma efekti
      // Eğer streaming endpoint bulunamazsa normal endpoint'e fallback yap
      let streamingAIMessageId: string | null = null;
      let streamingAIMessageText = '';
      let streamingFailed = false;
      
      try {
        await backendApiService.sendMessageStream(
          conversationId,
          finalMessage,
          attachments,
          finalPromptType,
          // onUserMessage
          (userMessage: any) => {
            // Backend'den gelen gerçek userMessage ile optimistic mesajı değiştir
            const backendImages = userMessage.attachments
              ?.filter((att: any) => att.type === 'IMAGE')
              .map((att: any) => att.url) || [];
            
            const backendFiles = userMessage.attachments
              ?.filter((att: any) => att.type === 'FILE' || att.type === 'AUDIO' || att.type === 'VIDEO')
              .map((att: any) => ({
                name: att.filename || '',
                uri: att.url
              })) || [];

            const finalImages = backendImages.length > 0 ? backendImages : (uploadedImageUrls.length > 0 ? uploadedImageUrls : undefined);
            const finalFiles = backendFiles.length > 0 ? backendFiles : (uploadedFileUrls.length > 0 ? uploadedFileUrls.map(url => ({ name: '', uri: url })) : undefined);

            const userChatMessage: ChatMessage = {
              id: userMessage.id,
              text: userMessage.text,
              isUser: true,
              timestamp: new Date(userMessage.timestamp || userMessage.createdAt),
              images: finalImages,
              files: finalFiles
            };
            
            // Optimistic mesajı kaldır ve gerçek mesajı ekle
            removeMessage(conversationId, tempUserMessageId);
            addMessage(conversationId, userChatMessage).catch(err => {
              console.error('❌ Kullanıcı mesajı eklenirken hata:', err);
            });
          },
          // onAIStart
          () => {
            // AI cevabı başladı - placeholder mesaj oluştur
            streamingAIMessageId = `ai-streaming-${Date.now()}`;
            streamingAIMessageText = '';
            const aiPlaceholderMessage: ChatMessage = {
              id: streamingAIMessageId,
              text: '',
              isUser: false,
              timestamp: new Date()
            };
            addMessage(conversationId, aiPlaceholderMessage).catch(err => {
              console.error('❌ AI placeholder mesajı eklenirken hata:', err);
            });
          },
          // onAIChunk - ChatGPT gibi gerçek zamanlı yazma efekti
          (chunk: string, fullContent: string) => {
            streamingAIMessageText = fullContent;
            // Mevcut AI mesajını güncelle
            if (streamingAIMessageId) {
              const updatedAIMessage: ChatMessage = {
                id: streamingAIMessageId,
                text: fullContent,
                isUser: false,
                timestamp: new Date()
              };
              // Mesajı güncelle (remove + add yerine direkt update)
              removeMessage(conversationId, streamingAIMessageId);
              addMessage(conversationId, updatedAIMessage).catch(err => {
                console.error('❌ AI chunk mesajı güncellenirken hata:', err);
              });
            }
          },
          // onAIComplete
          (aiMessage: any) => {
            // AI cevabı tamamlandı - backend'den gelen gerçek mesajı kullan
            if (streamingAIMessageId) {
              removeMessage(conversationId, streamingAIMessageId);
            }
            const aiChatMessage: ChatMessage = {
              id: aiMessage.id,
              text: aiMessage.text,
              isUser: false,
              timestamp: new Date(aiMessage.timestamp || aiMessage.createdAt)
            };
            addMessage(conversationId, aiChatMessage).catch(err => {
              console.error('❌ AI cevabı eklenirken hata:', err);
            });
            streamingAIMessageId = null;
          },
          // onError
          (error: string) => {
            streamingFailed = true;
            
            // Route not found hatası - normal endpoint'e fallback yap
            if (error.includes('not found') || error.includes('404') || error.includes('Route')) {
              console.warn('⚠️ Streaming endpoint bulunamadı, normal endpoint kullanılıyor...');
              // Fallback normal endpoint'e yapılacak (catch bloğunda)
              return;
            }
            
            // Hata durumunda optimistic mesajı ve streaming mesajını kaldır
            if (conversationId) {
              removeMessage(conversationId, tempUserMessageId);
              if (streamingAIMessageId) {
                removeMessage(conversationId, streamingAIMessageId);
              }
            }
            
            // Rate limit hatası kontrolü
            if (error.includes('Çok fazla istek') || 
                error.includes('rate limit') || 
                error.includes('429')) {
              console.error('❌ Rate limit hatası - mesaj gönderilemedi:', error);
              Alert.alert(
                "Çok Fazla İstek",
                error.includes('dakika') ? error : 'Çok fazla istek gönderildi. Lütfen birkaç dakika sonra tekrar deneyin.',
                [{ text: "Tamam" }]
              );
              return;
            }
            
            const errorMessage: ChatMessage = {
              id: Date.now().toString(),
              text: `⚠️ ${error}`,
              isUser: false,
              timestamp: new Date()
            };
            
            console.error('❌ Streaming hatası:', error);
            
            if (conversationId) {
              addMessage(conversationId, errorMessage).catch(err => {
                console.error('❌ Hata mesajı eklenirken hata:', err);
              });
            }
          }
        );
      } catch (streamingError: any) {
        streamingFailed = true;
        console.warn('⚠️ Streaming endpoint hatası, normal endpoint kullanılıyor:', streamingError.message);
      }
      
      // Streaming başarısız olduysa normal endpoint kullan (fallback)
      if (streamingFailed) {
        console.log('📤 Normal endpoint kullanılıyor (streaming fallback)...');
        
        // Streaming mesajını kaldır (eğer oluşturulduysa)
        if (streamingAIMessageId) {
          removeMessage(conversationId, streamingAIMessageId);
        }
        
        // Normal endpoint'i kullan
        const response = await backendApiService.sendMessage(conversationId, finalMessage, attachments, finalPromptType);
        
        console.log('📥 Backend response:', JSON.stringify(response, null, 2));
        
        if (response.success && response.data) {
          const { userMessage, aiMessage } = response.data;
          
          // Backend'den dönen gerçek userMessage ile optimistic mesajı değiştir
          if (userMessage) {
            const backendImages = userMessage.attachments
              ?.filter((att: any) => att.type === 'IMAGE')
              .map((att: any) => att.url) || [];
            
            const backendFiles = userMessage.attachments
              ?.filter((att: any) => att.type === 'FILE' || att.type === 'AUDIO' || att.type === 'VIDEO')
              .map((att: any) => ({
                name: att.filename || '',
                uri: att.url
              })) || [];

            const finalImages = backendImages.length > 0 ? backendImages : (uploadedImageUrls.length > 0 ? uploadedImageUrls : undefined);
            const finalFiles = backendFiles.length > 0 ? backendFiles : (uploadedFileUrls.length > 0 ? uploadedFileUrls.map(url => ({ name: '', uri: url })) : undefined);

            const userChatMessage: ChatMessage = {
              id: userMessage.id,
              text: userMessage.text,
              isUser: true,
              timestamp: new Date(userMessage.timestamp || userMessage.createdAt),
              images: finalImages,
              files: finalFiles
            };
            
            removeMessage(conversationId, tempUserMessageId);
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
          if (conversationId) {
            removeMessage(conversationId, tempUserMessageId);
          }
          
          const errorText = response.error || response.message || 'Bir hata oluştu. Lütfen tekrar deneyin.';
          
          // Rate limit hatası kontrolü
          if (errorText.includes('Çok fazla istek') || 
              errorText.includes('rate limit') || 
              errorText.includes('429') ||
              response.error === 'Çok fazla istek') {
            console.error('❌ Rate limit hatası - mesaj gönderilemedi:', errorText);
            Alert.alert(
              "Çok Fazla İstek",
              errorText.includes('dakika') ? errorText : 'Çok fazla istek gönderildi. Lütfen birkaç dakika sonra tekrar deneyin.',
              [{ text: "Tamam" }]
            );
            return;
          }
          
          const errorMessage: ChatMessage = {
            id: Date.now().toString(),
            text: errorText,
            isUser: false,
            timestamp: new Date()
          };
          
          console.error('❌ Backend mesaj hatası:', errorText);
          
          if (conversationId) {
            try {
              await addMessage(conversationId, errorMessage);
            } catch (addError) {
              console.error('❌ Hata mesajı eklenirken hata:', addError);
            }
          }
        }
      }
    } catch (error: any) {
      // Hata durumunda optimistic mesajı kaldır
      if (conversationId) {
        removeMessage(conversationId, tempUserMessageId);
      }
      
      console.error('💥 Chat hatası:', error);
      
      const errorText = error.message || 'Bağlantı hatası. Lütfen internet bağlantınızı kontrol edin.';
      
      // Rate limit hatası kontrolü - Alert göster ve mesajı chat'e ekleme
      if (errorText.includes('Çok fazla istek') || 
          errorText.includes('rate limit') || 
          errorText.includes('429') ||
          error.code === 'RATE_LIMIT') {
        console.error('❌ Rate limit hatası - mesaj gönderilemedi:', errorText);
        Alert.alert(
          "Çok Fazla İstek",
          "Çok fazla istek gönderildi. Lütfen birkaç dakika sonra tekrar deneyin.",
          [{ text: "Tamam" }]
        );
        return; // Rate limit hatasında mesajı chat'e ekleme
      }
      
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        text: errorText,
        isUser: false,
        timestamp: new Date()
      };
      
      // Conversation ID varsa hata mesajını ekle, yoksa sadece log yap
      if (conversationId) {
        try {
          await addMessage(conversationId, errorMessage);
        } catch (addError) {
          console.error('❌ Hata mesajı eklenirken hata:', addError);
        }
      } else {
        console.error('⚠️ Conversation ID eksik olduğu için hata mesajı eklenemedi:', errorMessage.text);
      }
    } finally {
      setIsLoading(false);
      console.log('🏁 Mesaj işlemi tamamlandı, isLoading false yapıldı');
    }
  }, [currentConversation, addMessage, removeMessage, isLoading, selectConversation]);

  const sendQuickSuggestion = useCallback(async (suggestion: {question: string, promptType: string}): Promise<string | undefined> => {
    try {
      if (!currentConversation) {
        const title = suggestion.question.length > 30 ? suggestion.question.substring(0, 30) + '...' : suggestion.question;
        const conversationId = await createNewConversation(title, suggestion.question);
        
        // Conversation ID kontrolü - kritik!
        if (!conversationId) {
          console.error('❌ sendQuickSuggestion: conversationId oluşturulamadı');
          return undefined;
        }
        
        // Conversation'ı seç ve await et
        await selectConversation(conversationId);
        
        // Mesajı gönder
        await sendMessage(suggestion.question, conversationId, false, [], [], suggestion.promptType);
        return conversationId;
      } else {
        // Mevcut conversation varsa direkt gönder
        await sendMessage(suggestion.question, currentConversation.id, false, [], [], suggestion.promptType);
        return currentConversation.id;
      }
    } catch (error) {
      console.error('❌ Quick suggestion error:', error);
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

