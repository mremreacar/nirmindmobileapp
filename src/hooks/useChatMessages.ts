import { useState, useCallback, useRef, useEffect } from 'react';
import { Alert, AppState, AppStateStatus } from 'react-native';
import { useChat } from '@/src/lib/context/ChatContext';
import { ChatMessage } from '@/src/lib/mock/types';
import BackendApiService from '../services/BackendApiService';
import * as FileSystem from 'expo-file-system/legacy';
import { hasInternetConnection } from '../utils/networkUtils';

type ActiveStreamState = {
  abort?: (() => void) | null;
  conversationId: string;
  streamingMessageId?: string | null;
  streamingText?: string;
  state?: {
    cancelledByUser?: boolean;
  };
};

export const useChatMessages = () => {
  const { 
    currentConversation,
    conversations,
    addMessage,
    updateMessage,
    removeMessage,
    createNewConversation, 
    selectConversation 
  } = useChat();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const activeStreamRef = useRef<ActiveStreamState | null>(null);
  const thinkingMessageIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // Streaming performans optimizasyonu: Chunk güncellemelerini throttle et
  const lastUpdateTimeRef = useRef<number>(0);
  const pendingUpdateRef = useRef<{ messageId: string; content: string; conversationId: string } | null>(null);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousConversationIdRef = useRef<string | null>(null);
  const lastConversationBeforeChangeRef = useRef<string | null>(null); // Conversation değişmeden önceki son conversation ID
  // currentMsg bulunamama sorununu çözmek için mesajı ref ile takip et
  const streamingMessageRef = useRef<ChatMessage | null>(null);
  
  // Not: "Düşünüyorum" metni MessageList.tsx içindeki ThinkingIndicator component'inde tanımlı
  const backendApiService = BackendApiService.getInstance();

  const sendMessage = useCallback(async (
    messageText: string,
    conversationId: string | null,
    isResearchMode: boolean = false,
    selectedImages: string[] = [],
    selectedFiles: any[] = [],
    promptType?: string
  ) => {
    // ChatGPT benzeri akış: 
    // 1. Conversation yoksa backend'de oluştur
    // 2. Mesajı backend'e kaydet (streaming endpoint zaten kaydediyor)
    // 3. AI'ya istek at (streaming)
    // 4. Streaming sırasında cevabı göster
    // 5. Streaming tamamlandığında cevap zaten backend'de kayıtlı

    // Duplicate mesaj gönderme kontrolü
    if (isLoading || isStreaming || activeStreamRef.current) {
      console.warn('⚠️ [useChatMessages] Mesaj zaten gönderiliyor veya streaming devam ediyor, duplicate çağrı engellendi');
      return;
    }
    
    // Cleanup pending updates
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
      updateTimeoutRef.current = null;
    }
    pendingUpdateRef.current = null;
    lastUpdateTimeRef.current = 0;

    // Farklı conversation'dan mesaj gönderiliyorsa önceki streaming'i temizle
    const currentActiveStream = activeStreamRef.current;
    if (currentActiveStream) {
      const streamConversationId = (currentActiveStream as ActiveStreamState).conversationId;
      if (streamConversationId && streamConversationId !== conversationId) {
        console.log('🔄 Farklı conversation\'a mesaj gönderiliyor, önceki streaming temizleniyor');
        activeStreamRef.current = null;
        setIsStreaming(false);
      }
    }

    if (!messageText.trim() && selectedImages.length === 0 && selectedFiles.length === 0) {
      console.log('⚠️ Mesaj gönderilemedi: içerik yok');
      return;
    }

    setIsLoading(true);
    
    let finalConversationId = conversationId;
    let conversationCreated = false;
    
    // Streaming state değişkenleri (scope için try dışında tanımla)
    let streamingAIMessageId: string | null = null;
    let streamState: any = null;
    let messageStartTime = Date.now();
    let userMessageReceivedTime: number | null = null;
    let aiStartTime: number | null = null;
    let firstChunkTime: number | null = null;
    let aiCompleteTime: number | null = null;
    let abortStream: (() => void) | null = null;
    let abortFunction: (() => void) | null = null;
    let streamingFailed = false;
    let aiStartCalled = false;
    let streamingAIMessageText = '';
    let backendUserMessageId: string | null = null;

    try {
      // ADIM 1: Conversation kontrolü ve oluşturma
      // Eğer conversationId yoksa veya local ID ise, backend'de oluştur
      if (!finalConversationId || finalConversationId.startsWith('conv-')) {
        console.log('📝 Yeni conversation oluşturuluyor...');
        
        // Başlık oluştur
        const title = messageText.trim().length > 30 
          ? messageText.trim().substring(0, 30) + '...' 
          : messageText.trim() || 'Yeni Sohbet';
        
        // Backend'de conversation oluştur
        const createResponse = await backendApiService.createConversation(title);
        
        if (createResponse.success && createResponse.data) {
          finalConversationId = createResponse.data.id;
          conversationCreated = true;
          console.log('✅ Conversation backend\'de oluşturuldu:', finalConversationId);
          
          // Local state'e ekle
          const newConversation = {
            id: finalConversationId,
            title: createResponse.data.title || title,
            isResearchMode: isResearchMode,
            isSoftDeleted: false,
            messages: [] as ChatMessage[],
            createdAt: new Date(createResponse.data.createdAt),
            updatedAt: new Date(createResponse.data.updatedAt)
          };
          
          // Conversation'ı state'e ekle ve seç
          await selectConversation(finalConversationId);
        } else {
          throw new Error(createResponse.error || 'Conversation oluşturulamadı');
        }
      } else {
        // Conversation var, kontrol et ve seç
        const conversationExists = conversations.find(conv => conv.id === finalConversationId) || 
                                  (currentConversation?.id === finalConversationId ? currentConversation : null);
        
        if (!conversationExists) {
          // Conversation backend'de var ama local state'de yok, yükle
          await selectConversation(finalConversationId);
        } else if (!currentConversation || currentConversation.id !== finalConversationId) {
          // Conversation var ama seçili değil, seç
          await selectConversation(finalConversationId);
        }
      }

      // ADIM 2: İnternet bağlantısı kontrolü
      let isConnected = false;
      try {
        isConnected = await hasInternetConnection();
      } catch (connectionError) {
        console.error('❌ İnternet bağlantısı kontrolü hatası:', connectionError);
        isConnected = true; // Optimistic - backend kontrol edecek
      }
      
      if (!isConnected) {
        setIsLoading(false);
        setIsStreaming(false);
        return;
      }

      // ADIM 3: Önceki boş streaming mesajlarını temizle
      if (finalConversationId) {
        const conversation = conversations.find(conv => conv.id === finalConversationId) || 
                            (currentConversation?.id === finalConversationId ? currentConversation : null);
        
        if (conversation) {
          const emptyStreamingMessages = conversation.messages.filter(
            msg => !msg.isUser && (!msg.text || !msg.text.trim()) && msg.isStreaming
          );
          
          if (emptyStreamingMessages.length > 0 && finalConversationId) {
            console.log('🧹 Önceki boş streaming mesajları temizleniyor:', emptyStreamingMessages.length);
            const convId = finalConversationId; // Type narrowing için
            emptyStreamingMessages.forEach(msg => {
              removeMessage(convId, msg.id);
            });
          }
        }
      }

      // ADIM 4: Attachments yükle
      const finalMessage = messageText.trim();
      const attachments: any[] = [];
      
      // messageStartTime'ı güncelle
      messageStartTime = Date.now();
      
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
      // Performans takibi ve cleanup için bir obje kullan (scope sorunlarını önlemek için)
      streamState = {
        messageStartTime: Date.now(),
        userMessageReceivedTime: null as number | null,
        aiStartTime: null as number | null,
        firstChunkTime: null as number | null,
        aiCompleteTime: null as number | null,
        abortStream: null as (() => void) | null,
        abortFunction: null as (() => void) | null,
        cancelledByUser: false,
      };

      activeStreamRef.current = {
        conversationId: finalConversationId,
        streamingMessageId: null,
        streamingText: '',
        abort: null,
        state: streamState,
      };
      
      // Eski kodlarla uyumluluk için değişkenleri de tanımla
      messageStartTime = streamState.messageStartTime;
      userMessageReceivedTime = streamState.userMessageReceivedTime;
      aiStartTime = streamState.aiStartTime;
      firstChunkTime = streamState.firstChunkTime;
      aiCompleteTime = streamState.aiCompleteTime;
      abortStream = streamState.abortStream;
      abortFunction = streamState.abortFunction;
      
      console.log('🚀 Mesaj gönderimi başladı:', {
        conversationId: finalConversationId,
        messageLength: finalMessage.length,
        attachmentsCount: attachments.length,
        timestamp: new Date().toISOString(),
        startTime: messageStartTime
      });
      
      try {
        // sendMessageStream artık abort fonksiyonu döndürüyor (Promise döndürüyor, resolve değeri abort fonksiyonu)
        try {
          streamState.abortFunction = await backendApiService.sendMessageStream(
          finalConversationId,
          finalMessage,
          attachments,
          finalPromptType,
          // onUserMessage - Backend mesajı kaydedildi, göster
          (userMessage: any) => {
            if (!userMessage || !userMessage.id) {
              console.error('❌ Geçersiz userMessage (streaming):', userMessage);
              return;
            }
            
            backendUserMessageId = userMessage.id;
            userMessageReceivedTime = Date.now();
            
            console.log('📨 [onUserMessage] Backend mesajı alındı:', {
              conversationId: finalConversationId,
              messageId: userMessage.id,
              textLength: userMessage.text?.length || 0
            });
            
            // Duplicate kontrolü
            const conversation = conversations.find(conv => conv.id === finalConversationId) || 
                                (currentConversation?.id === finalConversationId ? currentConversation : null);
            
            if (conversation) {
              const messageExists = conversation.messages.some(msg => msg.id === userMessage.id);
              if (messageExists) {
                console.log('ℹ️ [onUserMessage] Mesaj zaten mevcut, eklenmedi:', userMessage.id);
                return;
              }
            }
            
            // Backend'den gelen mesajı ekle
            const attachments = userMessage.attachments || [];
            const backendImages = attachments
              .filter((att: any) => att && (att.type === 'IMAGE' || att.type === 'image') && att.url)
              .map((att: any) => att.url);
            
            const backendFiles = attachments
              .filter((att: any) => att && (att.type === 'FILE' || att.type === 'file' || att.type === 'AUDIO' || att.type === 'VIDEO') && att.url)
              .map((att: any) => ({
                name: att.filename || 'Dosya',
                uri: att.url
              }));

            const finalImages = backendImages.length > 0 ? backendImages : (selectedImages.length > 0 ? selectedImages : undefined);
            const finalFiles = backendFiles.length > 0 ? backendFiles : (selectedFiles.length > 0 ? selectedFiles.map(f => ({
              name: f.name || 'Dosya',
              uri: f.uri
            })) : undefined);

            let timestamp: Date;
            try {
              const tsValue = userMessage.timestamp || userMessage.createdAt;
              timestamp = tsValue ? new Date(tsValue) : new Date();
              if (isNaN(timestamp.getTime())) timestamp = new Date();
            } catch (error) {
              timestamp = new Date();
            }

            const userChatMessage: ChatMessage = {
              id: userMessage.id,
              text: userMessage.text || '',
              isUser: true,
              timestamp,
              images: finalImages,
              files: finalFiles
            };
            
            // Backend mesajını ekle (optimistic mesaj yok, direkt backend mesajı)
            if (finalConversationId) {
              addMessage(finalConversationId, userChatMessage);
              console.log('✅ Backend user mesajı eklendi:', {
                conversationId: finalConversationId,
                messageId: userChatMessage.id
              });
            }
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
            
            console.log('🤖 [AI AÇIK] AI cevabı başladı:', {
              conversationId: finalConversationId,
              totalDuration: `${aiStartDuration}ms`,
              timeToAIStart: `${timeToAIStart}ms`
            });
            
            // AI cevabı başladı - placeholder mesaj oluştur
            if (!streamingAIMessageId) {
              const conversation = conversations.find(conv => conv.id === finalConversationId) || 
                                  (currentConversation?.id === finalConversationId ? currentConversation : null);
              
              // Duplicate kontrolü
              const existingStreamingMessage = conversation?.messages?.find(
                msg => !msg.isUser && (!msg.text || !msg.text.trim()) && msg.isStreaming
              );
              
              if (existingStreamingMessage) {
                streamingAIMessageId = existingStreamingMessage.id;
                streamingAIMessageText = existingStreamingMessage.text || '';
              } else {
                streamingAIMessageId = `ai-streaming-${Date.now()}`;
                streamingAIMessageText = '';
                
                const aiPlaceholderMessage: ChatMessage = {
                  id: streamingAIMessageId,
                  text: '',
                  isUser: false,
                  timestamp: new Date(),
                  isStreaming: true
                };
                
                streamingMessageRef.current = aiPlaceholderMessage;
                if (finalConversationId) {
                  updateMessage(finalConversationId, aiPlaceholderMessage);
                  console.log('✅ Streaming mesajı oluşturuldu:', streamingAIMessageId);
                }
              }

              if (activeStreamRef.current && finalConversationId) {
                activeStreamRef.current.streamingMessageId = streamingAIMessageId;
                activeStreamRef.current.streamingText = streamingAIMessageText;
                activeStreamRef.current.conversationId = finalConversationId;
              }
            }

            setIsStreaming(true);
          },
          // onAIChunk - ChatGPT gibi gerçek zamanlı yazma efekti
          // Performans optimizasyonu: Chunk'ları throttle et (her 100ms'de bir güncelle)
          (chunk: string, fullContent: string) => {
            // CRITICAL FIX: Boş content ile updateMessage çağrılmasını önle
            // Boş content ile güncelleme yapmak gereksiz ve performans sorunlarına neden olur
            // Ayrıca rate limit hatalarına da neden olabilir (çok fazla gereksiz state güncellemesi)
            if (!fullContent || fullContent.trim().length === 0) {
              // Boş content, güncelleme yapma
              return;
            }
            
            // İlk chunk geldiğinde thinking mesaj interval'ini temizle
            if (thinkingMessageIntervalRef.current) {
              clearInterval(thinkingMessageIntervalRef.current);
              thinkingMessageIntervalRef.current = null;
            }
            
            if (!firstChunkTime) {
              firstChunkTime = Date.now();
              const timeToFirstChunk = firstChunkTime - messageStartTime;
              const timeToFirstChunkFromAIStart = aiStartTime ? (firstChunkTime - aiStartTime) : timeToFirstChunk;
              
              console.log('💬 [AI YAZIYOR] İlk AI chunk alındı:', {
                conversationId,
                chunkLength: chunk.length,
                fullContentLength: fullContent.length,
                hasContent: fullContent.length > 0,
                timeFromAIStart: `${timeToFirstChunkFromAIStart}ms`,
                streamingMessageId: streamingAIMessageId
              });
              
              if (timeToFirstChunk > 10000) {
                console.warn('⚠️ Ilk chunk cok gec geldi (>10s):', {
                  timeToFirstChunk: `${timeToFirstChunk}ms`,
                  timeToFirstChunkSeconds: `${(timeToFirstChunk / 1000).toFixed(2)}s`
                });
              }
              
            }
            
            streamingAIMessageText = fullContent;
            
            // Performans optimizasyonu: Chunk güncellemelerini throttle et (her 100ms'de bir güncelle)
            // Bu sayede çok sık UI güncellemesi yapılmaz, daha smooth bir akış sağlanır ve render problemi önlenir
            const now = Date.now();
            const timeSinceLastUpdate = now - lastUpdateTimeRef.current;
            const THROTTLE_INTERVAL = 100; // 100ms throttle (10 FPS - render problemi önlemek için)
            
            // Pending update'i kaydet
            if (streamingAIMessageId && finalConversationId) {
              pendingUpdateRef.current = {
                messageId: streamingAIMessageId,
                content: fullContent,
                conversationId: finalConversationId
              };
            }
            
            // Eğer throttle interval'ı geçtiyse veya ilk chunk ise, hemen güncelle
            if (timeSinceLastUpdate >= THROTTLE_INTERVAL || !firstChunkTime) {
              if (updateTimeoutRef.current) {
                clearTimeout(updateTimeoutRef.current);
                updateTimeoutRef.current = null;
              }
              
              if (pendingUpdateRef.current) {
                const { messageId, content, conversationId: convId } = pendingUpdateRef.current;
                if (convId) {
                  lastUpdateTimeRef.current = now;
                  
                  requestAnimationFrame(() => {
                    const updatedAIMessage: ChatMessage = {
                      id: messageId,
                      text: content,
                      isUser: false,
                      timestamp: new Date(),
                      isStreaming: true
                    };
                    
                    streamingMessageRef.current = updatedAIMessage;
                    updateMessage(convId, updatedAIMessage);
                  });
                }
                
                pendingUpdateRef.current = null;
              }
            } else {
              // Throttle interval'ı geçmediyse, timeout ile geciktir
              if (!updateTimeoutRef.current && pendingUpdateRef.current) {
                updateTimeoutRef.current = setTimeout(() => {
                  if (pendingUpdateRef.current) {
                    const { messageId, content, conversationId: convId } = pendingUpdateRef.current;
                    if (convId) {
                      lastUpdateTimeRef.current = Date.now();
                      
                      requestAnimationFrame(() => {
                        const updatedAIMessage: ChatMessage = {
                          id: messageId,
                          text: content,
                          isUser: false,
                          timestamp: new Date(),
                          isStreaming: true
                        };
                        
                        streamingMessageRef.current = updatedAIMessage;
                        updateMessage(convId, updatedAIMessage);
                      });
                    }
                    
                    pendingUpdateRef.current = null;
                  }
                  updateTimeoutRef.current = null;
                }, THROTTLE_INTERVAL - timeSinceLastUpdate);
              }
            }

            if (activeStreamRef.current) {
              activeStreamRef.current.streamingText = fullContent;
            }
          },
          // onAIComplete
          (aiMessage: any) => {
            // Cleanup pending updates
            if (updateTimeoutRef.current) {
              clearTimeout(updateTimeoutRef.current);
              updateTimeoutRef.current = null;
            }
            pendingUpdateRef.current = null;
            lastUpdateTimeRef.current = 0;

            // AI Message validation
            if (!aiMessage || !aiMessage.id) {
              console.error('❌ Geçersiz aiMessage:', aiMessage);
              if (streamingAIMessageId && finalConversationId) {
                removeMessage(finalConversationId, streamingAIMessageId);
              }
              streamingAIMessageId = null;
              setIsLoading(false);
              setIsStreaming(false);
              return;
            }
            
            aiCompleteTime = Date.now();
            const totalDuration = aiCompleteTime - messageStartTime;
            
            console.log('✅ [AI CEVAP VERDİ] AI cevabı tamamlandı:', {
              conversationId: finalConversationId,
              messageId: aiMessage.id,
              responseLength: aiMessage.text?.length || 0,
              totalDuration: `${totalDuration}ms`
            });
            
            // AI cevabı tamamlandı - backend'den gelen mesaj zaten kaydedildi
            // Streaming mesajını backend mesajı ile değiştir
            if (!streamState.cancelledByUser) {
              let timestamp: Date;
              try {
                const tsValue = aiMessage.timestamp || aiMessage.createdAt;
                timestamp = tsValue ? new Date(tsValue) : new Date();
                if (isNaN(timestamp.getTime())) timestamp = new Date();
              } catch (error) {
                timestamp = new Date();
              }
              
              // Backend text'i kullan, yoksa streaming text'ini kullan
              let finalText = aiMessage.text || '';
              if (!finalText || !finalText.trim()) {
                if (streamingMessageRef.current?.text) {
                  finalText = streamingMessageRef.current.text;
                } else if (activeStreamRef.current?.streamingText) {
                  finalText = activeStreamRef.current.streamingText;
                }
              }
              
              const aiChatMessage: ChatMessage = {
                id: aiMessage.id,
                text: finalText,
                isUser: false,
                timestamp,
                isStreaming: false // Streaming tamamlandı
              };
              
              // Streaming mesajını backend mesajı ile değiştir
              if (finalConversationId) {
                if (streamingAIMessageId && streamingAIMessageId !== aiMessage.id) {
                  // Farklı ID'ler - streaming mesajını kaldır, backend mesajını ekle
                  removeMessage(finalConversationId, streamingAIMessageId);
                  requestAnimationFrame(() => {
                    if (finalConversationId) {
                      addMessage(finalConversationId, aiChatMessage);
                      console.log('✅ Backend AI mesajı eklendi:', {
                        conversationId: finalConversationId,
                        messageId: aiChatMessage.id
                      });
                    }
                  });
                } else {
                  // Aynı ID - sadece güncelle
                  updateMessage(finalConversationId, aiChatMessage);
                  console.log('✅ Streaming mesaj güncellendi:', {
                    conversationId: finalConversationId,
                    messageId: aiChatMessage.id
                  });
                }
              }
            }
            
            // CRITICAL: Tüm streaming state'lerini ve ref'leri temizle - AI cevabı tamamlandı
            streamingAIMessageId = null;
            
            // Thinking mesaj interval'ini temizle
            if (thinkingMessageIntervalRef.current) {
              clearInterval(thinkingMessageIntervalRef.current);
              thinkingMessageIntervalRef.current = null;
            }
            
            // Pending update'leri temizle
            if (updateTimeoutRef.current) {
              clearTimeout(updateTimeoutRef.current);
              updateTimeoutRef.current = null;
            }
            pendingUpdateRef.current = null;
            lastUpdateTimeRef.current = 0;
            
            // Streaming message ref'ini temizle
            streamingMessageRef.current = null;
            
            // Active stream ref'ini temizle
            activeStreamRef.current = null;
            
            // State'leri temizle - AI cevabı tamamlandı, artık durmalı
            setIsLoading(false);
            setIsStreaming(false);
            
            console.log('✅ [AI DURDU] Tüm streaming state\'leri temizlendi (AI complete):', {
              conversationId,
              messageId: aiMessage.id,
              streamingCleared: true,
              isLoading: false,
              isStreaming: false
            });
          },
          // onError
          (error: string) => {
            // Thinking mesaj interval'ini temizle
            if (thinkingMessageIntervalRef.current) {
              clearInterval(thinkingMessageIntervalRef.current);
              thinkingMessageIntervalRef.current = null;
            }
            
            if (streamState.cancelledByUser) {
              console.log('ℹ️ AI cevabı kullanıcı tarafından durduruldu:', error);
              if (streamingAIMessageId && finalConversationId) {
                removeMessage(finalConversationId, streamingAIMessageId);
              }
              streamingAIMessageId = null;
              if (updateTimeoutRef.current) {
                clearTimeout(updateTimeoutRef.current);
                updateTimeoutRef.current = null;
              }
              pendingUpdateRef.current = null;
              lastUpdateTimeRef.current = 0;
              streamingMessageRef.current = null;
              activeStreamRef.current = null;
              setIsStreaming(false);
              setIsLoading(false);
              return;
            }

            const appState = AppState.currentState;
            const isAppInBackground = appState !== 'active';
            
            if (isAppInBackground) {
              if (streamingAIMessageId && finalConversationId) {
                removeMessage(finalConversationId, streamingAIMessageId);
              }
              streamingAIMessageId = null;
              if (updateTimeoutRef.current) {
                clearTimeout(updateTimeoutRef.current);
                updateTimeoutRef.current = null;
              }
              pendingUpdateRef.current = null;
              lastUpdateTimeRef.current = 0;
              streamingMessageRef.current = null;
              activeStreamRef.current = null;
              setIsStreaming(false);
              setIsLoading(false);
              return;
            }

            streamingFailed = true;
            const errorTime = Date.now();
            const errorDuration = errorTime - messageStartTime;
            
            const isConnectionError = error.includes('Bağlantı hatası') || 
                                    error.includes('bağlanılamadı') || 
                                    error.includes('connection') ||
                                    error.includes('Network');
            
            if (isConnectionError) {
              if (streamingAIMessageId && finalConversationId) {
                removeMessage(finalConversationId, streamingAIMessageId);
              }
              streamingAIMessageId = null;
              if (updateTimeoutRef.current) {
                clearTimeout(updateTimeoutRef.current);
                updateTimeoutRef.current = null;
              }
              pendingUpdateRef.current = null;
              lastUpdateTimeRef.current = 0;
              streamingMessageRef.current = null;
              activeStreamRef.current = null;
              setIsStreaming(false);
              setIsLoading(false);
              return;
            }
            
            const isTimeoutError = error.includes('zaman aşımına uğradı') || 
                                   error.includes('timeout') || 
                                   error.includes('Timeout') ||
                                   error.includes('Yanıt alınamadı');
            
            if (isTimeoutError) {
              console.warn('⚠️ Streaming timeout:', {
                error,
                duration: `${errorDuration}ms`
              });
              
              if (streamingAIMessageId && finalConversationId) {
                removeMessage(finalConversationId, streamingAIMessageId);
              }
              streamingAIMessageId = null;
              if (updateTimeoutRef.current) {
                clearTimeout(updateTimeoutRef.current);
                updateTimeoutRef.current = null;
              }
              pendingUpdateRef.current = null;
              lastUpdateTimeRef.current = 0;
              streamingMessageRef.current = null;
              setIsStreaming(false);
              return;
            }
            
            const isRateLimitError = error.includes('Rate limit') || 
                                    error.includes('rate limit') ||
                                    error.includes('Çok fazla istek') ||
                                    error.includes('rate limit exceeded');
            
            if (isRateLimitError) {
              console.error('❌ Rate limit hatası:', error);
              
              if (streamingAIMessageId && finalConversationId) {
                removeMessage(finalConversationId, streamingAIMessageId);
              }
              streamingAIMessageId = null;
              if (updateTimeoutRef.current) {
                clearTimeout(updateTimeoutRef.current);
                updateTimeoutRef.current = null;
              }
              pendingUpdateRef.current = null;
              lastUpdateTimeRef.current = 0;
              streamingMessageRef.current = null;
              activeStreamRef.current = null;
              setIsStreaming(false);
              setIsLoading(false);
              
              if (streamState && streamState.abortStream && typeof streamState.abortStream === 'function') {
                try {
                  streamState.abortStream();
                } catch (abortError) {
                  console.error('❌ abortStream hatası:', abortError);
                }
                streamState.abortStream = null;
              }
              
              streamingFailed = false;
              return;
            }
            
            console.error('❌ Streaming endpoint hatası:', error);
            
            if (streamingAIMessageId && finalConversationId) {
              removeMessage(finalConversationId, streamingAIMessageId);
            }
            streamingAIMessageId = null;
            setIsStreaming(false);
            setIsLoading(false);
          }
        );
        
        // abortFunction'ı kontrol et ve abortStream'e ata
        // abortFunction her zaman olmalı (sendMessageStream her durumda abort fonksiyonu döndürür)
        abortFunction = streamState.abortFunction;
        if (abortFunction && typeof abortFunction === 'function') {
          abortStream = abortFunction;
          streamState.abortStream = abortFunction; // state objesine de kaydet
          console.log('✅ abortStream başarıyla atandı');
          if (activeStreamRef.current) {
            activeStreamRef.current.abort = abortFunction;
          }
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
        streamState.abortStream = null; // state objesinde de temizle
        } catch (streamingInitError: any) {
          // sendMessageStream çağrısında hata (örneğin token yok veya abort fonksiyonu alınamadı)
          console.error('❌ sendMessageStream başlatılamadı:', {
            error: streamingInitError?.message || streamingInitError,
            stack: streamingInitError?.stack
          });
          // Hata'yı yukarı fırlat - normal endpoint'e fallback yapılacak
          setIsStreaming(false);
          activeStreamRef.current = null;
          throw streamingInitError;
        }
      } catch (streamingError: any) {
        streamingFailed = true;
        const errorTime = Date.now();
        const errorDuration = errorTime - messageStartTime;
        const errorMessage = streamingError?.message || streamingError?.toString() || '';
        
        // Rate limit hatası kontrolü
        const isRateLimitError = errorMessage.includes('Rate limit') || 
                                errorMessage.includes('rate limit') ||
                                errorMessage.includes('Çok fazla istek') ||
                                errorMessage.includes('rate limit exceeded');
        
        if (isRateLimitError) {
          console.error('❌ Rate limit hatası (catch bloğu):', errorMessage);
          
          if (streamingAIMessageId && finalConversationId) {
            removeMessage(finalConversationId, streamingAIMessageId);
          }
          
          streamingAIMessageId = null;
          setIsStreaming(false);
          setIsLoading(false);
          activeStreamRef.current = null;
          
          if (streamState && streamState.abortStream && typeof streamState.abortStream === 'function') {
            try {
              streamState.abortStream();
            } catch (abortError) {
              console.error('❌ abortStream hatası:', abortError);
            }
            streamState.abortStream = null;
            abortStream = null;
          } else if (abortStream && typeof abortStream === 'function') {
            try {
              abortStream();
            } catch (abortError) {
              console.error('❌ abortStream hatası:', abortError);
            }
            abortStream = null;
          }
          
          streamingFailed = false;
          return;
        }
        
        console.error('❌ Streaming endpoint hatası, normal endpoint kullanılıyor:', errorMessage);
        
        if (streamingAIMessageId && finalConversationId) {
          removeMessage(finalConversationId, streamingAIMessageId);
        }
        
        setIsStreaming(false);
        setIsLoading(false);
        activeStreamRef.current = null;
        
        // Cleanup on error - abortStream'in geçerli olduğundan emin ol
        // state objesi üzerinden kontrol et
        if (streamState && streamState.abortStream && typeof streamState.abortStream === 'function') {
          try {
            streamState.abortStream();
          } catch (abortError) {
            console.error('❌ abortStream çağrılırken hata:', abortError);
          }
          streamState.abortStream = null;
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
        // CRITICAL: finally bloğunda state'leri temizleme - streaming devam ederken temizlenmemeli
        // State'ler sadece şu durumlarda temizlenmeli:
        // 1. Streaming başarısız olduysa (streamingFailed = true)
        // 2. Hata oluştuysa (catch bloğunda zaten temizleniyor)
        // 3. AI complete olduğunda (onAIComplete callback'inde temizleniyor)
        // Bu yüzden finally bloğunda state temizleme yapmıyoruz
        if (streamingFailed) {
          // Streaming başarısız olduysa state'leri temizle
          console.log('🧹 [finally] Streaming başarısız oldu, state\'ler temizleniyor');
          setIsLoading(false);
          setIsStreaming(false);
        }
        // Streaming başarılıysa state'ler onAIComplete callback'inde temizlenecek
      }
      
      // Streaming başarısız olduysa normal endpoint kullan (fallback)
      if (streamingFailed) {
        const fallbackStartTime = Date.now();
        console.log('📤 Normal endpoint kullaniliyor (streaming fallback)...', {
          timestamp: new Date().toISOString()
        });
        
        // Streaming mesajını kaldır (eğer oluşturulduysa)
        if (streamingAIMessageId && finalConversationId) {
          removeMessage(finalConversationId, streamingAIMessageId);
        }
        
        // Normal endpoint'i kullan
        const response = await backendApiService.sendMessage(finalConversationId, finalMessage, attachments, finalPromptType);
        
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
          if (userMessage && userMessage.id) {
            const attachments = userMessage.attachments || [];
            const backendImages = attachments
              .filter((att: any) => att && (att.type === 'IMAGE' || att.type === 'image') && att.url)
              .map((att: any) => att.url);
            
            const backendFiles = attachments
              .filter((att: any) => att && (att.type === 'FILE' || att.type === 'file' || att.type === 'AUDIO' || att.type === 'VIDEO') && att.url)
              .map((att: any) => ({
                name: att.filename || 'Dosya',
                uri: att.url
              }));

            // Backend'den gelen attachment'ları kullan, yoksa local'den
            const finalImages = backendImages.length > 0 ? backendImages : (selectedImages.length > 0 ? selectedImages : undefined);
            const finalFiles = backendFiles.length > 0 ? backendFiles : (selectedFiles.length > 0 ? selectedFiles.map(f => ({
              name: f.name || 'Dosya',
              uri: f.uri
            })) : undefined);

            // Timestamp validation
            let timestamp: Date;
            try {
              const tsValue = userMessage.timestamp || userMessage.createdAt;
              if (tsValue) {
                timestamp = new Date(tsValue);
                if (isNaN(timestamp.getTime())) {
                  console.warn('⚠️ Geçersiz userMessage timestamp (fallback), şu anki zaman kullanılıyor');
                  timestamp = new Date();
                }
              } else {
                timestamp = new Date();
              }
            } catch (error) {
              console.error('❌ Timestamp parse hatası (fallback):', error);
              timestamp = new Date();
            }

            const userChatMessage: ChatMessage = {
              id: userMessage.id,
              text: userMessage.text || '',
              isUser: true,
              timestamp,
              images: finalImages,
              files: finalFiles
            };
            
            // Backend'den gelen mesajı ekle
            try {
              await addMessage(finalConversationId, userChatMessage);
              console.log('✅ Kullanıcı mesajı backend\'den eklendi');
            } catch (addError) {
              console.error('❌ Kullanıcı mesajı eklenirken hata:', addError);
            }
          }
          
          // AI cevabını ekle
          if (aiMessage && aiMessage.id) {
            // Timestamp validation
            let timestamp: Date;
            try {
              const tsValue = aiMessage.timestamp || aiMessage.createdAt;
              if (tsValue) {
                timestamp = new Date(tsValue);
                if (isNaN(timestamp.getTime())) {
                  console.warn('⚠️ Geçersiz aiMessage timestamp (fallback), şu anki zaman kullanılıyor');
                  timestamp = new Date();
                }
              } else {
                timestamp = new Date();
              }
            } catch (error) {
              console.error('❌ Timestamp parse hatası (fallback):', error);
              timestamp = new Date();
            }
            
            const aiChatMessage: ChatMessage = {
              id: aiMessage.id,
              text: aiMessage.text || '',
              isUser: false,
              timestamp,
              isStreaming: false // Fallback endpoint'te streaming yok
            };
            try {
              await addMessage(finalConversationId, aiChatMessage);
              console.log('✅ AI cevabı eklendi');
            } catch (addError) {
              console.error('❌ AI cevabı eklenirken hata:', addError);
            }
          }
        } else {
          const errorText = response.error || response.message || 'Bir hata oluştu. Lütfen tekrar deneyin.';
          
          const isTimeoutError = errorText.includes('zaman aşımına uğradı') || 
                                 errorText.includes('timeout') || 
                                 errorText.includes('Timeout') ||
                                 errorText.includes('Yanıt alınamadı');
          
          if (isTimeoutError) {
            setIsLoading(false);
            return;
          }
          
          if (errorText.includes('Çok fazla istek') || 
              errorText.includes('rate limit') || 
              errorText.includes('429') ||
              response.error === 'Çok fazla istek') {
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
          
          try {
            await addMessage(finalConversationId, errorMessage);
          } catch (addError) {
            console.error('❌ Hata mesajı eklenirken hata:', addError);
          }
        }
      }
    } catch (error: any) {
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
      
      // AppState kontrolü - ekran kapalıyken hata mesajlarını UI'da gösterme
      const appState = AppState.currentState;
      const isAppInBackground = appState !== 'active';
      
      const errorText = error.message || 'Bağlantı hatası. Lütfen internet bağlantınızı kontrol edin.';
      
      // Bağlantı hatası kontrolü - Status 200 ile gelen hatalar gerçek hata değil
      const isConnectionError = errorText.includes('Bağlantı hatası') || 
                                errorText.includes('bağlanılamadı') || 
                                errorText.includes('bağlanışamadı') ||
                                errorText.includes('Sunucuya bağlanılamadı') ||
                                errorText.includes('Sunucuya bağlanışamadı') ||
                                errorText.includes('connection') ||
                                errorText.includes('Network');
      
      // Status 200 ile gelen bağlantı hataları gerçek hata değil (SSE stream normal kapanmış)
      // Ekran kapalıyken veya açıkken, bu hataları sessizce ignore et
      if (isConnectionError) {
        // Sessizce ignore et - gereksiz log spam'ini önlemek için
        setIsLoading(false);
        return; // UI'da gösterme
      }
      
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
      
      // Bağlantı hatası kontrolü - Status 200 ile gelen hatalar gerçek hata değil
      // Ekran kapalıyken veya açıkken, bu hataları sessizce ignore et
      if (isConnectionError) {
        // Sessizce ignore et - gereksiz log spam'ini önlemek için
        setIsLoading(false);
        return; // UI'da gösterme
      }
      
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        text: errorText,
        isUser: false,
        timestamp: new Date()
      };
      
      // Hata mesajını ekle
      if (finalConversationId) {
        try {
          await addMessage(finalConversationId, errorMessage);
        } catch (addError) {
          console.error('❌ Hata mesajı eklenirken hata:', addError);
        }
      } else {
        console.error('⚠️ Conversation ID eksik olduğu için hata mesajı eklenemedi:', errorMessage.text);
      }
    } finally {
      // Cleanup: abort stream if still active
      // Değişkenler try bloğundan önce tanımlandığı için scope sorunu yok
      let finalDuration: number | null = null;
      
      try {
        if (streamState && typeof streamState.messageStartTime === 'number') {
          const finalTime = Date.now();
          finalDuration = finalTime - streamState.messageStartTime;
        } else if (messageStartTime) {
          const finalTime = Date.now();
          finalDuration = finalTime - messageStartTime;
        }
      } catch (durationError: any) {
        console.warn('⚠️ Duration hesaplanırken hata:', durationError?.message || durationError);
      }
      
      // abortStream'i temizle
      try {
        if (streamState && streamState.abortStream && typeof streamState.abortStream === 'function') {
          try {
            streamState.abortStream();
          } catch (abortCallError) {
            console.warn('⚠️ abortStream hatası:', abortCallError);
          }
          streamState.abortStream = null;
        } else if (abortStream && typeof abortStream === 'function') {
          try {
            abortStream();
          } catch (abortCallError) {
            console.warn('⚠️ abortStream hatası:', abortCallError);
          }
          abortStream = null;
        }
      } catch (abortError: any) {
        console.warn('⚠️ abortStream cleanup hatası:', abortError?.message || abortError);
      }
      
      // Log mesajı
      if (finalDuration !== null) {
        console.log('🏁 Mesaj işlemi tamamlandı:', {
          totalDuration: `${finalDuration}ms`,
          totalDurationSeconds: `${(finalDuration / 1000).toFixed(2)}s`,
          streamingUsed: !streamingFailed,
          timestamp: new Date().toISOString()
        });
      }
      
      // Streaming state'lerini temizle
      const active = activeStreamRef.current;
      const isSameConversation = active && finalConversationId && active.conversationId === finalConversationId;
      const isCancelled = (streamState && streamState.cancelledByUser) || (active?.state?.cancelledByUser);
      const stillStreaming = active && isSameConversation && !isCancelled;

      if (!stillStreaming) {
        setIsLoading(false);
        setIsStreaming(false);
        if (!active || isSameConversation) {
          activeStreamRef.current = null;
        }
      }
    }
  }, [currentConversation, conversations, addMessage, updateMessage, removeMessage, isLoading, isStreaming, selectConversation]);

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

  const cancelStreamingResponse = useCallback((): boolean => {
    const active = activeStreamRef.current;

    if (!active || typeof active.abort !== 'function') {
      console.log('ℹ️ Aktif bir AI yanıtı bulunamadı veya yanıt zaten tamamlandı.');
      return false;
    }

    try {
      if (active.state) {
        active.state.cancelledByUser = true;
      }

      active.abort();
    } catch (error) {
      console.error('❌ AI yanıtı durdurulurken hata oluştu:', error);
    }

    // Pending update'leri temizle
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
      updateTimeoutRef.current = null;
    }
    pendingUpdateRef.current = null;
    lastUpdateTimeRef.current = 0;

    if (active.conversationId && active.streamingMessageId) {
      removeMessage(active.conversationId, active.streamingMessageId);
    }

    activeStreamRef.current = null;
    setIsStreaming(false);
    setIsLoading(false);

    return true;
  }, [removeMessage]);

  // Yeni sohbete geçildiğinde veya home'a dönüldüğünde streaming state'ini temizle
  // Aynı conversation'a geri döndüğünde de streaming state'ini temizle (yeni mesaj yazabilmek için)
  useEffect(() => {
    const currentConversationId = currentConversation?.id || null;
    const previousConversationId = previousConversationIdRef.current;
    
    // Eğer conversation değiştiyse veya null olduysa (home'a dönüldüyse), streaming'i temizle
    const conversationChanged = previousConversationId !== null && 
                                 previousConversationId !== currentConversationId;
    const isHomeScreen = currentConversationId === null && previousConversationId !== null;
    const isNewConversation = previousConversationId === null && currentConversationId !== null;
    
    // Aynı conversation'a geri döndüğünde streaming state'ini temizle (yeni mesaj yazabilmek için)
    // lastConversationBeforeChangeRef, conversation değişmeden önceki son conversation ID'yi tutar
    // Eğer şu anki conversation, değişmeden önceki conversation ile aynıysa, geri dönüş var demektir
    const returnedToSameConversation = lastConversationBeforeChangeRef.current !== null && 
                                       lastConversationBeforeChangeRef.current !== undefined &&
                                       lastConversationBeforeChangeRef.current === currentConversationId &&
                                       currentConversationId !== null &&
                                       previousConversationId !== currentConversationId; // Önceki conversation farklıydı
    
    if (returnedToSameConversation) {
      // Aynı conversation'a geri döndük - streaming state'ini temizle (yeni mesaj yazabilmek için)
      const active = activeStreamRef.current;
      console.log('🔄 Aynı conversation\'a geri dönüldü, streaming state\'i temizleniyor (yeni mesaj yazabilmek için)...', {
        conversationId: currentConversationId,
        previousId: previousConversationId,
        lastBeforeChange: lastConversationBeforeChangeRef.current,
        hasActiveStream: !!active,
        activeStreamId: active?.conversationId
      });
      
      // Streaming state'ini temizle (stream zaten durmuş olabilir)
      activeStreamRef.current = null;
      setIsStreaming(false);
      setIsLoading(false);
      
      // Pending update'leri temizle
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
        updateTimeoutRef.current = null;
      }
      pendingUpdateRef.current = null;
      lastUpdateTimeRef.current = 0;
      
      // Flag'i sıfırla (bir sonraki değişiklik için)
      lastConversationBeforeChangeRef.current = null;
    }
    
    if (conversationChanged || isHomeScreen || isNewConversation) {
      // Conversation değişti - değişmeden önceki conversation ID'yi kaydet (geri dönüş için)
      if (previousConversationId !== null && previousConversationId !== currentConversationId) {
        lastConversationBeforeChangeRef.current = previousConversationId;
      }
      
      // Eğer aktif bir stream varsa ve farklı bir conversation'dan geliyorsa, iptal et
      const active = activeStreamRef.current;
      if (active) {
        // Eğer home'a dönüldüyse, yeni conversation açıldıysa veya farklı bir conversation'a geçildiyse
        if (isHomeScreen || isNewConversation || active.conversationId !== currentConversationId) {
          console.log('🔄 Conversation değişti, yeni sohbet açıldı veya home\'a dönüldü, streaming state\'i temizleniyor...', {
            previousId: previousConversationIdRef.current,
            currentId: currentConversationId,
            activeStreamId: active.conversationId,
            isNewConversation,
            isHomeScreen
          });
          
          // Stream'i iptal et
          try {
            if (active.state) {
              active.state.cancelledByUser = true;
            }
            if (typeof active.abort === 'function') {
              active.abort();
            }
          } catch (error) {
            console.error('❌ Stream iptal edilirken hata:', error);
          }
          
          // State'leri temizle
          if (updateTimeoutRef.current) {
            clearTimeout(updateTimeoutRef.current);
            updateTimeoutRef.current = null;
          }
          pendingUpdateRef.current = null;
          lastUpdateTimeRef.current = 0;
          
          activeStreamRef.current = null;
          setIsStreaming(false);
          setIsLoading(false);
        }
      } else {
        // Eğer aktif stream yoksa ama conversation değiştiyse veya yeni sohbet açıldıysa, 
        // state'leri kesin olarak temizle (yeni sohbet açıldığında durdur ikonu görünmemeli)
        if (conversationChanged || isNewConversation || isHomeScreen) {
          console.log('🧹 Conversation değişti veya yeni sohbet açıldı, streaming state\'leri temizleniyor (aktif stream yok)...', {
            previousId: previousConversationIdRef.current,
            currentId: currentConversationId,
            isNewConversation
          });
          setIsStreaming(false);
          setIsLoading(false);
        }
      }
    }
    
    // Mevcut conversation ID'yi kaydet
    previousConversationIdRef.current = currentConversationId;
  }, [currentConversation?.id]);

  return {
    isLoading,
    isStreaming,
    sendMessage,
    sendQuickSuggestion,
    cancelStreamingResponse,
    currentConversation
  };
};

