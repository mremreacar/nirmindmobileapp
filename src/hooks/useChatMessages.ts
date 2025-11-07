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
    updateMessage,
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
      const errorMessage = 'conversationId eksik, mesaj gönderilemedi';
      console.error('❌ sendMessage: conversationId eksik, mesaj gönderilemedi:', {
        messageText: messageText.substring(0, 50),
        hasImages: selectedImages.length > 0,
        hasFiles: selectedFiles.length > 0
      });
      // Hata fırlat ki ChatScreen bunu yakalayabilsin
      throw new Error(errorMessage);
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
        const imageUploadResults = await Promise.allSettled(
          selectedImages.map(async (imageUri) => {
            // Resmi base64'e çevir
            const base64Data = await FileSystem.readAsStringAsync(imageUri, {
              encoding: FileSystem.EncodingType.Base64,
            });
            
            // Base64 boyutunu kontrol et (50MB limit için ~37MB görsel)
            const base64SizeMB = (base64Data.length * 3) / 4 / 1024 / 1024;
            if (base64SizeMB > 35) {
              throw new Error(`Görsel çok büyük (${base64SizeMB.toFixed(2)}MB). Maksimum boyut: 35MB. Lütfen daha küçük bir görsel seçin.`);
            }
            
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
              const errorMsg = uploadResponse.error || uploadResponse.message || 'Resim yüklenemedi';
              throw new Error(errorMsg);
            }
          })
        );
        
        // Başarılı ve başarısız yüklemeleri ayır
        const successfulImageAttachments: any[] = [];
        const failedUploads: string[] = [];
        
        imageUploadResults.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value) {
            successfulImageAttachments.push(result.value);
          } else {
            const errorMsg = result.status === 'rejected' 
              ? result.reason?.message || 'Bilinmeyen hata'
              : 'Görsel yüklenemedi';
            failedUploads.push(`Görsel ${index + 1}: ${errorMsg}`);
            console.error(`❌ Görsel ${index + 1} yüklenemedi:`, errorMsg);
          }
        });
        
        // Eğer tüm görseller başarısız olduysa hata fırlat
        if (successfulImageAttachments.length === 0 && selectedImages.length > 0) {
          const errorMessage = failedUploads.length > 0 
            ? failedUploads.join('\n')
            : 'Tüm görseller yüklenemedi. Lütfen daha küçük görseller seçin veya tekrar deneyin.';
          throw new Error(errorMessage);
        }
        
        // Eğer bazı görseller başarısız olduysa uyarı ver ama devam et
        if (failedUploads.length > 0) {
          console.warn(`⚠️ ${failedUploads.length} görsel yüklenemedi:`, failedUploads);
        }
        
        // Başarılı yüklemeleri ekle
        attachments.push(...successfulImageAttachments);
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

      // Attachment'lar ve mesaj kontrolü - backend'e göndermeden önce
      if (attachments.length === 0 && !finalMessage.trim()) {
        throw new Error('Mesaj veya görsel/dosya gereklidir. Lütfen bir mesaj yazın veya görsel/dosya seçin.');
      }

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
      let aiStartCalled = false; // onAIStart'ın sadece bir kez çağrılmasını sağla
      
      // Performans takibi ve cleanup için bir obje kullan (scope sorunlarını önlemek için)
      const state = {
        messageStartTime: Date.now(),
        userMessageReceivedTime: null as number | null,
        aiStartTime: null as number | null,
        firstChunkTime: null as number | null,
        aiCompleteTime: null as number | null,
        abortStream: null as (() => void) | null,
        abortFunction: null as (() => void) | null,
      };
      
      // Eski kodlarla uyumluluk için değişkenleri de tanımla
      const messageStartTime = state.messageStartTime;
      let userMessageReceivedTime = state.userMessageReceivedTime;
      let aiStartTime = state.aiStartTime;
      let firstChunkTime = state.firstChunkTime;
      let aiCompleteTime = state.aiCompleteTime;
      let abortStream = state.abortStream;
      let abortFunction = state.abortFunction;
      
      console.log('🚀 Mesaj gonderimi basladi:', {
        conversationId,
        messageLength: finalMessage.length,
        attachmentsCount: attachments.length,
        timestamp: new Date().toISOString(),
        startTime: messageStartTime
      });
      
      try {
        // sendMessageStream artık abort fonksiyonu döndürüyor (Promise döndürüyor, resolve değeri abort fonksiyonu)
        try {
          state.abortFunction = await backendApiService.sendMessageStream(
          conversationId,
          finalMessage,
          attachments,
          finalPromptType,
          // onUserMessage
          (userMessage: any) => {
            userMessageReceivedTime = Date.now();
            const userMessageDuration = userMessageReceivedTime - messageStartTime;
            console.log('✅ Kullanici mesaji alindi:', {
              duration: `${userMessageDuration}ms`,
              durationSeconds: `${(userMessageDuration / 1000).toFixed(2)}s`,
              messageId: userMessage.id,
              timestamp: new Date().toISOString()
            });
            
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
            
            // Optimistic mesajı kaldır ve gerçek mesajı ekle/güncelle
            removeMessage(conversationId, tempUserMessageId);
            // updateMessage kullan - mesaj varsa günceller, yoksa ekler
            updateMessage(conversationId, userChatMessage);
          },
          // onAIStart
          () => {
            // onAIStart sadece bir kez çağrılmalı
            if (aiStartCalled) {
              console.warn('⚠️ onAIStart zaten çağrıldı, tekrar çağrılmıyor');
              return;
            }
            aiStartCalled = true;
            
            aiStartTime = Date.now();
            const aiStartDuration = aiStartTime - messageStartTime;
            const timeToAIStart = userMessageReceivedTime ? (aiStartTime - userMessageReceivedTime) : aiStartDuration;
            
            console.log('🤖 AI cevabi basladi:', {
              totalDuration: `${aiStartDuration}ms`,
              totalDurationSeconds: `${(aiStartDuration / 1000).toFixed(2)}s`,
              timeToAIStart: `${timeToAIStart}ms`,
              timeToAIStartSeconds: `${(timeToAIStart / 1000).toFixed(2)}s`,
              timestamp: new Date().toISOString()
            });
            
            if (timeToAIStart > 5000) {
              console.warn('⚠️ AI cevabi gecikti (>5s):', {
                timeToAIStart: `${timeToAIStart}ms`,
                timeToAIStartSeconds: `${(timeToAIStart / 1000).toFixed(2)}s`
              });
            }
            
            // AI cevabı başladı - placeholder mesaj oluştur (sadece bir kez, aynı ID ile)
            if (!streamingAIMessageId) {
              streamingAIMessageId = `ai-streaming-${Date.now()}`;
              streamingAIMessageText = '';
              const aiPlaceholderMessage: ChatMessage = {
                id: streamingAIMessageId,
                text: '',
                isUser: false,
                timestamp: new Date(),
                isStreaming: true // Streaming başladı
              };
              // updateMessage kullan - mesaj varsa günceller, yoksa ekler
              updateMessage(conversationId, aiPlaceholderMessage);
            }
          },
          // onAIChunk - ChatGPT gibi gerçek zamanlı yazma efekti
          (chunk: string, fullContent: string) => {
            if (!firstChunkTime) {
              firstChunkTime = Date.now();
              const timeToFirstChunk = firstChunkTime - messageStartTime;
              const timeToFirstChunkFromAIStart = aiStartTime ? (firstChunkTime - aiStartTime) : timeToFirstChunk;
              
              console.log('📝 Ilk AI chunk alindi:', {
                totalDuration: `${timeToFirstChunk}ms`,
                totalDurationSeconds: `${(timeToFirstChunk / 1000).toFixed(2)}s`,
                timeFromAIStart: `${timeToFirstChunkFromAIStart}ms`,
                timeFromAIStartSeconds: `${(timeToFirstChunkFromAIStart / 1000).toFixed(2)}s`,
                chunkLength: chunk.length,
                timestamp: new Date().toISOString()
              });
              
              if (timeToFirstChunk > 10000) {
                console.warn('⚠️ Ilk chunk cok gec geldi (>10s):', {
                  timeToFirstChunk: `${timeToFirstChunk}ms`,
                  timeToFirstChunkSeconds: `${(timeToFirstChunk / 1000).toFixed(2)}s`
                });
              }
            }
            
            streamingAIMessageText = fullContent;
            // Mevcut AI mesajını güncelle (updateMessage kullan - duplicate kontrolü yok)
            if (streamingAIMessageId) {
              const updatedAIMessage: ChatMessage = {
                id: streamingAIMessageId,
                text: fullContent,
                isUser: false,
                timestamp: new Date(),
                isStreaming: true // Streaming devam ediyor
              };
              // updateMessage kullan - mesaj varsa günceller, yoksa ekler
              updateMessage(conversationId, updatedAIMessage);
            }
          },
          // onAIComplete
          (aiMessage: any) => {
            aiCompleteTime = Date.now();
            const totalDuration = aiCompleteTime - messageStartTime;
            const aiResponseDuration = aiStartTime ? (aiCompleteTime - aiStartTime) : totalDuration;
            const streamingDuration = firstChunkTime ? (aiCompleteTime - firstChunkTime) : 0;
            
            console.log('✅ AI cevabi tamamlandi:', {
              totalDuration: `${totalDuration}ms`,
              totalDurationSeconds: `${(totalDuration / 1000).toFixed(2)}s`,
              aiResponseDuration: `${aiResponseDuration}ms`,
              aiResponseDurationSeconds: `${(aiResponseDuration / 1000).toFixed(2)}s`,
              streamingDuration: `${streamingDuration}ms`,
              streamingDurationSeconds: `${(streamingDuration / 1000).toFixed(2)}s`,
              responseLength: aiMessage.text?.length || 0,
              messageId: aiMessage.id,
              timestamp: new Date().toISOString(),
              isSlow: totalDuration > 10000 ? '⚠️ YAVAS (>10s)' : totalDuration > 5000 ? '⚠️ ORTA (>5s)' : '✅ Normal'
            });
            
            if (totalDuration > 10000) {
              console.warn('⚠️ AI cevabi cok yavas (>10 saniye):', {
                totalDuration: `${totalDuration}ms`,
                totalDurationSeconds: `${(totalDuration / 1000).toFixed(2)}s`,
                aiResponseDuration: `${aiResponseDuration}ms`,
                streamingDuration: `${streamingDuration}ms`
              });
            }
            
            // AI cevabı tamamlandı - backend'den gelen gerçek mesajı kullan
            // Streaming mesajını kaldır ve gerçek mesajı ekle/güncelle
            if (streamingAIMessageId) {
              removeMessage(conversationId, streamingAIMessageId);
            }
            const aiChatMessage: ChatMessage = {
              id: aiMessage.id,
              text: aiMessage.text,
              isUser: false,
              timestamp: new Date(aiMessage.timestamp || aiMessage.createdAt),
              isStreaming: false // Streaming tamamlandı
            };
            // updateMessage kullan - mesaj varsa günceller, yoksa ekler
            updateMessage(conversationId, aiChatMessage);
            streamingAIMessageId = null;
            
            // Loading state'ini temizle - AI cevabı tamamlandı
            setIsLoading(false);
            console.log('✅ Loading state temizlendi (AI complete)');
          },
          // onError
          (error: string) => {
            streamingFailed = true;
            const errorTime = Date.now();
            const errorDuration = errorTime - messageStartTime;
            
            // Timeout hataları - UI'da gösterilmesin, sadece log'la ve fallback yap
            const isTimeoutError = error.includes('zaman aşımına uğradı') || 
                                   error.includes('timeout') || 
                                   error.includes('Timeout') ||
                                   error.includes('Yanıt alınamadı');
            
            if (isTimeoutError) {
              // Timeout normal bir durum olabilir (uzun AI cevapları için)
              // Log seviyesini düşür, bilgilendirme amaçlı
              console.warn('⚠️ Streaming timeout (bu normal olabilir - uzun AI cevapları için):', {
                error,
                duration: `${errorDuration}ms`,
                durationSeconds: `${(errorDuration / 1000).toFixed(2)}s`,
                userMessageReceived: userMessageReceivedTime !== null,
                aiStarted: aiStartTime !== null,
                firstChunkReceived: firstChunkTime !== null,
                timestamp: new Date().toISOString()
              });
              // Hata durumunda optimistic mesajı ve streaming mesajını kaldır
              if (conversationId) {
                removeMessage(conversationId, tempUserMessageId);
                if (streamingAIMessageId) {
                  removeMessage(conversationId, streamingAIMessageId);
                }
              }
              // Loading state'ini temizleme - fallback işlemi devam edecek
              return; // UI'da gösterme, fallback'e geç
            }
            
            // Route not found hatası - normal endpoint'e fallback yap
            if (error.includes('not found') || error.includes('404') || error.includes('Route')) {
              console.warn('⚠️ Streaming endpoint bulunamadı, normal endpoint kullanılıyor...');
              // Fallback normal endpoint'e yapılacak (catch bloğunda)
              // Loading state'i burada temizleme, fallback işlemi devam edecek
              return;
            }
            
            // Diğer hatalar için error log'u
            console.error('❌ Streaming hatasi:', {
              error: error,
              duration: `${errorDuration}ms`,
              durationSeconds: `${(errorDuration / 1000).toFixed(2)}s`,
              userMessageReceived: userMessageReceivedTime !== null,
              aiStarted: aiStartTime !== null,
              firstChunkReceived: firstChunkTime !== null,
              timestamp: new Date().toISOString()
            });
            
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
              // Loading state'ini temizle - rate limit hatasında fallback yapılmaz
              setIsLoading(false);
              console.log('✅ Loading state temizlendi (rate limit error)');
              Alert.alert(
                "Çok Fazla İstek",
                error.includes('dakika') ? error : 'Çok fazla istek gönderildi. Lütfen birkaç dakika sonra tekrar deneyin.',
                [{ text: "Tamam" }]
              );
              return;
            }
            
            // Diğer hatalar - UI'da göster
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
            
            // Loading state'ini temizle - hata durumunda
            setIsLoading(false);
            console.log('✅ Loading state temizlendi (streaming error)');
          }
        );
        
        // abortFunction'ı kontrol et ve abortStream'e ata
        // abortFunction her zaman olmalı (sendMessageStream her durumda abort fonksiyonu döndürür)
        abortFunction = state.abortFunction;
        if (abortFunction && typeof abortFunction === 'function') {
          abortStream = abortFunction;
          state.abortStream = abortFunction; // state objesine de kaydet
          console.log('✅ abortStream başarıyla atandı');
        } else {
          console.warn('⚠️ abortFunction geçersiz veya fonksiyon değil:', abortFunction);
          // abortFunction yoksa bile devam et (abortStream null kalacak, finally'de kontrol edilecek)
        }
        
        const streamingEndTime = Date.now();
        const streamingTotalDuration = streamingEndTime - messageStartTime;
        
        console.log('✅ Streaming basariyla tamamlandi:', {
          totalDuration: `${streamingTotalDuration}ms`,
          totalDurationSeconds: `${(streamingTotalDuration / 1000).toFixed(2)}s`,
          timestamp: new Date().toISOString()
        });
        
        streamingFailed = false; // Başarılı oldu
        abortStream = null; // Cleanup
        state.abortStream = null; // state objesinde de temizle
        } catch (streamingInitError: any) {
          // sendMessageStream çağrısında hata (örneğin token yok veya abort fonksiyonu alınamadı)
          console.error('❌ sendMessageStream başlatılamadı:', {
            error: streamingInitError?.message || streamingInitError,
            stack: streamingInitError?.stack
          });
          // Hata'yı yukarı fırlat - normal endpoint'e fallback yapılacak
          throw streamingInitError;
        }
      } catch (streamingError: any) {
        streamingFailed = true;
        const errorTime = Date.now();
        const errorDuration = errorTime - messageStartTime;
        
        console.error('❌ Streaming endpoint hatasi, normal endpoint kullaniliyor:', {
          error: streamingError?.message || streamingError,
          duration: `${errorDuration}ms`,
          durationSeconds: `${(errorDuration / 1000).toFixed(2)}s`,
          stack: streamingError?.stack,
          timestamp: new Date().toISOString()
        });
        
        // Cleanup on error - abortStream'in geçerli olduğundan emin ol
        // state objesi üzerinden kontrol et
        if (state && state.abortStream && typeof state.abortStream === 'function') {
          try {
            state.abortStream();
          } catch (abortError) {
            console.error('❌ abortStream çağrılırken hata:', abortError);
          }
          state.abortStream = null;
          abortStream = null; // eski değişkeni de temizle
        } else if (abortStream && typeof abortStream === 'function') {
          // Fallback: eğer state objesi yoksa direkt abortStream'i kullan
          try {
            abortStream();
          } catch (abortError) {
            console.error('❌ abortStream çağrılırken hata:', abortError);
          }
          abortStream = null;
        }
      } finally {
        // Cleanup on component unmount or error
        // Note: This will be handled by the abort function if needed
      }
      
      // Streaming başarısız olduysa normal endpoint kullan (fallback)
      if (streamingFailed) {
        const fallbackStartTime = Date.now();
        console.log('📤 Normal endpoint kullaniliyor (streaming fallback)...', {
          timestamp: new Date().toISOString()
        });
        
        // Streaming mesajını kaldır (eğer oluşturulduysa)
        if (streamingAIMessageId) {
          removeMessage(conversationId, streamingAIMessageId);
        }
        
        // Normal endpoint'i kullan
        const response = await backendApiService.sendMessage(conversationId, finalMessage, attachments, finalPromptType);
        
        const fallbackEndTime = Date.now();
        const fallbackDuration = fallbackEndTime - fallbackStartTime;
        const totalFallbackDuration = fallbackEndTime - messageStartTime;
        
        console.log('📥 Normal endpoint response alindi:', {
          fallbackDuration: `${fallbackDuration}ms`,
          fallbackDurationSeconds: `${(fallbackDuration / 1000).toFixed(2)}s`,
          totalDuration: `${totalFallbackDuration}ms`,
          totalDurationSeconds: `${(totalFallbackDuration / 1000).toFixed(2)}s`,
          success: response.success,
          hasData: !!response.data,
          timestamp: new Date().toISOString()
        });
        
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
              timestamp: new Date(aiMessage.timestamp || aiMessage.createdAt),
              isStreaming: false // Fallback endpoint'te streaming yok
            };
            try {
              await addMessage(conversationId, aiChatMessage);
              const addMessageTime = Date.now();
              const totalNormalDuration = addMessageTime - messageStartTime;
              
              console.log('✅ AI cevabi basariyla eklendi:', {
                totalDuration: `${totalNormalDuration}ms`,
                totalDurationSeconds: `${(totalNormalDuration / 1000).toFixed(2)}s`,
                timestamp: new Date().toISOString()
              });
            } catch (addError) {
              console.error('❌ AI cevabi eklenirken hata:', addError);
            }
          }
        } else {
          // Hata durumunda optimistic mesajı kaldır
          if (conversationId) {
            removeMessage(conversationId, tempUserMessageId);
          }
          
          const errorText = response.error || response.message || 'Bir hata oluştu. Lütfen tekrar deneyin.';
          
          // Timeout hataları - UI'da gösterilmesin
          const isTimeoutError = errorText.includes('zaman aşımına uğradı') || 
                                 errorText.includes('timeout') || 
                                 errorText.includes('Timeout') ||
                                 errorText.includes('Yanıt alınamadı');
          
          if (isTimeoutError) {
            console.warn('⚠️ Timeout hatası - UI\'da gösterilmeyecek (normal endpoint):', errorText);
            // Loading state'ini temizle
            setIsLoading(false);
            return; // UI'da gösterme
          }
          
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
      
      const errorTime = Date.now();
      const errorDuration = errorTime - messageStartTime;
      
      console.error('💥 Chat hatasi:', {
        error: error,
        message: error.message,
        duration: `${errorDuration}ms`,
        durationSeconds: `${(errorDuration / 1000).toFixed(2)}s`,
        userMessageReceived: userMessageReceivedTime !== null,
        aiStarted: aiStartTime !== null,
        firstChunkReceived: firstChunkTime !== null,
        streamingFailed: streamingFailed,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      
      const errorText = error.message || 'Bağlantı hatası. Lütfen internet bağlantınızı kontrol edin.';
      
      // Görsel yükleme hatası kontrolü - Alert göster
      if (errorText.includes('Görsel') || 
          errorText.includes('görsel') || 
          errorText.includes('request entity too large') ||
          errorText.includes('çok büyük') ||
          errorText.includes('Maksimum boyut')) {
        console.error('❌ Görsel yükleme hatası:', errorText);
        Alert.alert(
          "Görsel Yükleme Hatası",
          errorText.includes('çok büyük') || errorText.includes('Maksimum boyut')
            ? errorText
            : "Görsel yüklenemedi. Lütfen daha küçük bir görsel seçin veya tekrar deneyin.",
          [{ text: "Tamam" }]
        );
        setIsLoading(false);
        return; // Görsel yükleme hatasında mesajı chat'e ekleme
      }
      
      // Timeout hataları - UI'da gösterilmesin
      const isTimeoutError = errorText.includes('zaman aşımına uğradı') || 
                             errorText.includes('timeout') || 
                             errorText.includes('Timeout') ||
                             errorText.includes('Yanıt alınamadı');
      
      if (isTimeoutError) {
        console.warn('⚠️ Timeout hatası - UI\'da gösterilmeyecek:', errorText);
        // Loading state'ini temizle
        setIsLoading(false);
        return; // UI'da gösterme
      }
      
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
        setIsLoading(false);
        return; // Rate limit hatasında mesajı chat'e ekleme
      }
      
      // Mesaj veya attachment gereklidir hatası - Alert göster
      if (errorText.includes('Mesaj veya görsel') || 
          errorText.includes('Message or attachment is required')) {
        console.error('❌ Mesaj/attachment eksik hatası:', errorText);
        Alert.alert(
          "Eksik Bilgi",
          "Mesaj veya görsel/dosya gereklidir. Lütfen bir mesaj yazın veya görsel/dosya seçin.",
          [{ text: "Tamam" }]
        );
        setIsLoading(false);
        return; // Bu hatada mesajı chat'e ekleme
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
      // Cleanup: abort stream if still active
      // state objesi kullanarak scope sorunlarını önle
      let finalDuration: number | null = null;
      
      // messageStartTime'a state objesi üzerinden erişim
      try {
        if (state && typeof state.messageStartTime === 'number') {
          const finalTime = Date.now();
          finalDuration = finalTime - state.messageStartTime;
        }
      } catch (durationError: any) {
        // messageStartTime'a erişirken hata oluşursa (çok nadir)
        console.warn('⚠️ Duration hesaplanırken hata (non-critical):', durationError?.message || durationError);
      }
      
      // abortStream'i state objesi üzerinden kontrol et ve temizle
      try {
        if (state && state.abortStream && typeof state.abortStream === 'function') {
          try {
            state.abortStream();
          } catch (abortCallError) {
            // abortStream çağrılırken hata oluşursa sessizce devam et
            console.warn('⚠️ abortStream çağrılırken hata (non-critical):', abortCallError);
          }
          state.abortStream = null;
        }
      } catch (abortError: any) {
        // abortStream'e erişirken hata oluşursa (çok nadir)
        console.warn('⚠️ abortStream cleanup kontrolünde hata (non-critical):', abortError?.message || abortError);
      }
      
      // Log mesajı
      if (finalDuration !== null) {
        console.log('🏁 Mesaj islemi tamamlandi:', {
          totalDuration: `${finalDuration}ms`,
          totalDurationSeconds: `${(finalDuration / 1000).toFixed(2)}s`,
          streamingUsed: !streamingFailed,
          timestamp: new Date().toISOString()
        });
      } else {
        console.log('🏁 Mesaj islemi tamamlandi');
      }
      
      setIsLoading(false);
    }
  }, [currentConversation, addMessage, updateMessage, removeMessage, isLoading, selectConversation]);

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

