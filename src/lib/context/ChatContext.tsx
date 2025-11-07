import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect, useRef } from 'react';
import { ChatConversation, ChatMessage } from '../mock/types';
import BackendApiService from '../../services/BackendApiService';

interface ChatContextType {
  conversations: ChatConversation[];
  currentConversation: ChatConversation | null;
  addMessage: (conversationId: string, message: ChatMessage) => Promise<void>;
  updateMessage: (conversationId: string, message: ChatMessage) => void;
  removeMessage: (conversationId: string, messageId: string) => void;
  createNewConversation: (title: string, initialMessage?: string) => Promise<string>;
  selectConversation: (conversationId: string) => Promise<void>;
  deleteConversation: (conversationId: string) => void;
  deleteMessage: (conversationId: string, messageId: string) => Promise<void>;
  updateConversationTitle: (conversationId: string, title: string) => void;
  updateResearchMode: (conversationId: string, isResearchMode: boolean) => Promise<void>;
  loadConversations: () => Promise<void>;
  updateConversationMessages: (conversationId: string, messages: ChatMessage[]) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

interface ChatProviderProps {
  children: ReactNode;
}

// Konuşma başlığı oluşturma fonksiyonu
const generateConversationTitle = (messageText: string): string => {
  // Mesajı temizle ve kısalt
  if (!messageText || typeof messageText !== 'string') {
    return 'Yeni Sohbet';
  }
  
  let title = messageText.trim();
  
  // Çok uzun mesajları kısalt
  if (title.length > 30) {
    title = title.substring(0, 30) + '...';
  }
  
  // Boş mesaj kontrolü
  if (!title) {
    return 'Yeni Sohbet';
  }
  
  // Özel karakterleri temizle
  title = title.replace(/[^\w\sçğıöşüÇĞIİÖŞÜ]/g, '');
  
  // Başlık boş kaldıysa varsayılan başlık
  if (!title.trim()) {
    return 'Yeni Sohbet';
  }
  
  return title;
};

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<ChatConversation | null>(null);
  const backendApiService = BackendApiService.getInstance();
  
  // Conversation yükleme durumunu takip et (duplicate istekleri önlemek için)
  const loadingConversationsRef = useRef<Set<string>>(new Set());

  const addMessage = useCallback(async (conversationId: string, message: ChatMessage) => {
    console.log('📝 addMessage çağrıldı:', { conversationId, messageId: message.id, isUser: message.isUser, text: message.text.substring(0, 50) });
    
    // Conversation ID kontrolü
    if (!conversationId) {
      console.error('❌ addMessage: conversationId eksik, mesaj eklenemedi:', {
        messageId: message.id,
        messageText: message.text?.substring(0, 50),
        isUser: message.isUser
      });
      return;
    }
    
    // Eğer currentConversation undefined ise veya farklı conversation'a işaret ediyorsa,
    // önce conversation'ı kontrol et ve gerekirse yükle
    let conversationExists = false;
    let foundConversation: ChatConversation | undefined;
    
    setConversations(prev => {
      foundConversation = prev.find(conv => conv.id === conversationId);
      conversationExists = !!foundConversation;
      return prev;
    });
    
    // Eğer conversation yoksa backend'den yükle
    if (!conversationExists) {
      // Eğer zaten yükleniyorsa tekrar yükleme
      if (loadingConversationsRef.current.has(conversationId)) {
        console.log('⚠️ Conversation zaten yükleniyor, bekleniyor...', conversationId);
        // Bekle ve tekrar kontrol et
        await new Promise(resolve => setTimeout(resolve, 500));
        setConversations(prev => {
          const retryFound = prev.find(conv => conv.id === conversationId);
          if (retryFound) {
            foundConversation = retryFound;
            conversationExists = true;
          }
          return prev;
        });
        
        if (conversationExists && foundConversation) {
          // Conversation yüklendi, devam et
          if (!currentConversation || currentConversation.id !== conversationId) {
            setCurrentConversation(foundConversation);
          }
        } else {
          // Hala yükleniyor, devam et ama tekrar yükleme
          console.log('⚠️ Conversation hala yükleniyor, mesaj ekleniyor ama conversation yüklenene kadar bekleniyor');
          return; // Mesaj ekleme işlemini iptal et
        }
      } else {
        // Yükleme işlemini başlat
        loadingConversationsRef.current.add(conversationId);
        console.log('⚠️ Conversation henüz yüklenmemiş, backend\'den yükleniyor...', conversationId);
        try {
          const convResponse = await backendApiService.getConversation(conversationId);
          
          // Rate limit hatası kontrolü - sessizce atla
          if (!convResponse.success && 
              (convResponse.error === 'Çok fazla istek' || 
               convResponse.message?.includes('Çok fazla istek') ||
               convResponse.message?.includes('rate limit'))) {
            console.warn('⚠️ Rate limit hatası - conversation yüklenemedi, geçici conversation oluşturulacak');
            loadingConversationsRef.current.delete(conversationId);
            // Rate limit hatasında sessizce devam et, geçici conversation oluşturulacak
          } else if (convResponse.success && convResponse.data) {
            const convData = convResponse.data;
            const newConversation: ChatConversation = {
              id: convData.id,
              title: convData.title,
              isResearchMode: convData.isResearchMode || false,
              messages: [],
              createdAt: new Date(convData.createdAt),
              updatedAt: new Date(convData.updatedAt)
            };
            
            setConversations(prevConvs => {
              const exists = prevConvs.find(c => c.id === conversationId);
              if (!exists) {
                return [newConversation, ...prevConvs];
              }
              return prevConvs;
            });
            
            setCurrentConversation(newConversation);
            foundConversation = newConversation;
            conversationExists = true;
            loadingConversationsRef.current.delete(conversationId);
            console.log('✅ Conversation backend\'den yüklendi ve seçildi:', conversationId);
          } else {
            loadingConversationsRef.current.delete(conversationId);
          }
        } catch (error: any) {
          loadingConversationsRef.current.delete(conversationId);
          // Rate limit hatası kontrolü
          const errorMessage = error.message || '';
          if (errorMessage.includes('Çok fazla istek') || 
              errorMessage.includes('rate limit') || 
              errorMessage.includes('429')) {
            console.warn('⚠️ Rate limit hatası - conversation yüklenemedi, geçici conversation oluşturulacak');
            // Rate limit hatasında sessizce devam et
          } else {
            console.error('❌ Conversation yüklenirken hata:', error);
          }
          // Devam et, fallback olarak geçici conversation oluşturulacak
        }
      }
    } else if (!currentConversation || currentConversation.id !== conversationId) {
      // Conversation var ama currentConversation farklı veya undefined
      console.log('⚠️ Conversation var ama seçili değil, seçiliyor...', conversationId);
      if (foundConversation) {
        setCurrentConversation(foundConversation);
        console.log('✅ Conversation seçildi:', conversationId);
      }
    }
    
    // Duplicate kontrolü - aynı ID'ye sahip mesaj varsa ekleme
    let messageAdded = false;
    
    setConversations(prev => {
      const conversation = prev.find(conv => conv.id === conversationId);
      if (conversation) {
        const messageExists = conversation.messages.some(msg => msg.id === message.id);
        if (messageExists) {
          console.log('⚠️ Mesaj zaten mevcut, eklenmedi:', message.id);
          return prev;
        }
      }
      
      messageAdded = true;
      const updated = prev.map(conv => 
        conv.id === conversationId 
          ? {
              ...conv,
              messages: [...conv.messages, message],
              updatedAt: new Date()
            }
          : conv
      );
      
      // Eğer conversation yoksa oluştur (fallback)
      if (!conversation) {
        console.log('⚠️ Conversation bulunamadı, geçici olarak oluşturuluyor:', conversationId);
        const tempConversation: ChatConversation = {
          id: conversationId,
          title: 'Yeni Sohbet',
          isResearchMode: false,
          messages: [message],
          createdAt: new Date(),
          updatedAt: new Date()
        };
        updated.push(tempConversation);
      }
      
      // currentConversation'ı da güncelle (eğer bu conversation ise)
      const updatedConversation = updated.find(conv => conv.id === conversationId);
      if (updatedConversation) {
        // setCurrentConversation'ı hemen çağır (callback pattern ile güncel state'i al)
        setCurrentConversation(prevConv => {
          if (prevConv?.id === conversationId) {
            // Aynı conversation'a mesaj ekleniyor
            const messageExists = prevConv.messages.some(msg => msg.id === message.id);
            if (!messageExists) {
              console.log('✅ currentConversation güncellendi:', { conversationId, messageId: message.id });
              return {
                ...prevConv,
                messages: [...prevConv.messages, message],
                updatedAt: new Date()
              };
            } else {
              console.log('⚠️ currentConversation\'da mesaj zaten var:', message.id);
              return prevConv;
            }
          } else {
            // Farklı conversation veya currentConversation undefined
            // Mesaj eklenen conversation'ı currentConversation olarak ayarla
            console.log('✅ currentConversation otomatik seçildi:', { 
              previousId: prevConv?.id, 
              newId: conversationId 
            });
            return updatedConversation;
          }
        });
      }
      
      return updated;
    });

    // İlk kullanıcı mesajından sonra başlık güncelle ve backend'e konuşma kaydet
    if (message.isUser && message.text && message.text.trim() && messageAdded) {
      setConversations(prev => {
        const conversation = prev.find(conv => conv.id === conversationId);
        if (conversation && (conversation.title === "Yeni Sohbet" || conversation.title === "New Conversation")) {
          // İlk mesajdan otomatik başlık oluştur
          const newTitle = generateConversationTitle(message.text);
          
          // Başlığı güncelle - setTimeout ile async işlemi yap
          setTimeout(() => {
            setConversations(prevConvs => 
              prevConvs.map(conv => 
                conv.id === conversationId 
                  ? { ...conv, title: newTitle }
                  : conv
              )
            );
            
            setCurrentConversation(prev => 
              prev && prev.id === conversationId ? { ...prev, title: newTitle } : prev
            );
          }, 0);
          
          // Backend'e başlık güncellemesi gönder
          if (!conversationId.startsWith('conv-')) {
            // Backend ID'si varsa başlığı güncelle
            backendApiService.updateConversation(conversationId, newTitle).catch(error => {
              console.error('❌ Backend başlık güncelleme hatası:', error);
            });
          } else {
            // Eğer konuşma local ise (Backend ID'si yoksa), backend'e kaydet
            backendApiService.createConversation(newTitle).then(response => {
              if (response.success && response.data) {
                // Konuşma ID'sini backend ID ile güncelle
                setConversations(prevConvs => 
                  prevConvs.map(conv => 
                    conv.id === conversationId 
                      ? { ...conv, id: response.data!.id }
                      : conv
                  )
                );
                
                // Current conversation'ı da güncelle
                setCurrentConversation(prev => 
                  prev && prev.id === conversationId ? { ...prev, id: response.data!.id } : prev
                );
              }
            }).catch(error => {
              console.error('❌ Local konuşma backend\'e kaydetme hatası:', error);
            });
          }
        }
        return prev;
      });
    }
    
    // React'in render cycle'ını tamamlaması için kısa bir delay
    // Bu sayede kullanıcı mesajı ekranda görünür hale gelir
    await new Promise(resolve => setTimeout(resolve, 50));
    console.log('✅ addMessage tamamlandı:', { conversationId, messageId: message.id });
  }, [backendApiService]);

  // Update message in conversation (for streaming updates)
  // Bu fonksiyon duplicate kontrolü yapmaz, sadece günceller veya ekler
  const updateMessage = useCallback((conversationId: string, message: ChatMessage) => {
    setConversations(prev => {
      const conversation = prev.find(conv => conv.id === conversationId);
      if (!conversation) {
        // Conversation yoksa ekle
        const tempConversation: ChatConversation = {
          id: conversationId,
          title: 'Yeni Sohbet',
          isResearchMode: false,
          messages: [message],
          createdAt: new Date(),
          updatedAt: new Date()
        };
        return [...prev, tempConversation];
      }
      
      // Mesajı güncelle veya ekle (duplicate kontrolü yok - streaming için önemli)
      const messageIndex = conversation.messages.findIndex(msg => msg.id === message.id);
      const updatedMessages = messageIndex >= 0
        ? conversation.messages.map((msg, idx) => idx === messageIndex ? message : msg)
        : [...conversation.messages, message];
      
      return prev.map(conv =>
        conv.id === conversationId
          ? {
              ...conv,
              messages: updatedMessages,
              updatedAt: new Date()
            }
          : conv
      );
    });
    
    // currentConversation'ı da güncelle
    if (currentConversation?.id === conversationId) {
      setCurrentConversation(prev => {
        if (!prev) return null;
        const messageIndex = prev.messages.findIndex(msg => msg.id === message.id);
        const updatedMessages = messageIndex >= 0
          ? prev.messages.map((msg, idx) => idx === messageIndex ? message : msg)
          : [...prev.messages, message];
        return {
          ...prev,
          messages: updatedMessages,
          updatedAt: new Date()
        };
      });
    }
  }, [currentConversation]);

  // Remove message from conversation (for optimistic updates)
  const removeMessage = useCallback((conversationId: string, messageId: string) => {
    setConversations(prev => 
      prev.map(conv => 
        conv.id === conversationId 
          ? {
              ...conv,
              messages: conv.messages.filter(msg => msg.id !== messageId)
            }
          : conv
      )
    );
    
    if (currentConversation?.id === conversationId) {
      setCurrentConversation(prev => 
        prev ? {
          ...prev,
          messages: prev.messages.filter(msg => msg.id !== messageId)
        } : null
      );
    }
  }, [currentConversation]);

  const createNewConversation = useCallback(async (title: string, initialMessage?: string): Promise<string> => {
    const now = new Date();
    
    // Önce backend'e kaydet
    try {
      const response = await backendApiService.createConversation(title, initialMessage);
      
      if (response.success && response.data) {
        // Backend ID'sini kullan
        const backendId = response.data.id;
        console.log('✅ Konuşma backend\'e kaydedildi:', backendId);
        
        const newConversation: ChatConversation = {
          id: backendId,
          title,
          isResearchMode: false,
          messages: initialMessage ? [{
            id: `msg-${Date.now()}`,
            text: initialMessage,
            isUser: true,
            timestamp: now
          }] : [],
          createdAt: new Date(response.data.createdAt || now),
          updatedAt: new Date(response.data.updatedAt || now)
        };
        
        // Local state'e ekle
        setConversations(prev => [newConversation, ...prev]);
        setCurrentConversation(newConversation);
        
        return backendId;
      }
    } catch (error) {
      console.error('❌ Backend konuşma oluşturma hatası:', error);
    }

    // Backend'e kaydedilemediyse local ID kullan (fallback)
    const localId = `conv-${Date.now()}`;
    const newConversation: ChatConversation = {
      id: localId,
      title,
      isResearchMode: false,
      messages: initialMessage ? [{
        id: `msg-${Date.now()}`,
        text: initialMessage,
        isUser: true,
        timestamp: now
      }] : [],
      createdAt: now,
      updatedAt: now
    };
    
    setConversations(prev => [newConversation, ...prev]);
    setCurrentConversation(newConversation);
    
    return localId;
  }, [backendApiService]);

  // Helper function to load conversation messages - MUST be defined before selectConversation
  const loadConversationMessages = useCallback(async (conversationId: string, conversation: ChatConversation) => {
    // Eğer zaten yükleniyorsa tekrar yükleme
    if (loadingConversationsRef.current.has(conversationId)) {
      console.log('⚠️ Conversation mesajları zaten yükleniyor, atlanıyor...', conversationId);
      return;
    }
    
    // Yükleme işlemini başlat
    loadingConversationsRef.current.add(conversationId);
    
    try {
      // Tüm mesajları yüklemek için büyük bir limit kullan (1000 mesaj)
      const messagesResponse = await backendApiService.getMessages(conversationId, 1, 1000);
      
      // Rate limit hatası kontrolü
      if (!messagesResponse.success && 
          (messagesResponse.error === 'Çok fazla istek' || 
           messagesResponse.message?.includes('Çok fazla istek') ||
           messagesResponse.message?.includes('rate limit'))) {
        console.warn('⚠️ Rate limit hatası - mesajlar yüklenemedi');
        loadingConversationsRef.current.delete(conversationId);
        return;
      }
      
      if (messagesResponse.success && messagesResponse.data && 'messages' in messagesResponse.data) {
        const backendMessages: ChatMessage[] = (messagesResponse.data as any).messages.map((msg: any) => ({
          id: msg.id,
          text: msg.text || '', // text undefined olabilir, boş string olarak set et
          isUser: msg.isUser,
          timestamp: new Date(msg.timestamp || msg.createdAt),
          images: msg.attachments?.filter((a: any) => a.type === 'IMAGE' || a.type === 'image').map((a: any) => a.url),
          files: msg.attachments?.filter((a: any) => a.type === 'FILE' || a.type === 'file').map((a: any) => ({
            name: a.filename,
            uri: a.url,
            size: a.size,
            mimeType: a.mimeType
          }))
        }));
        
        // Eğer conversation başlığı varsayılan ise ve ilk kullanıcı mesajı varsa başlık oluştur
        const firstUserMessage = backendMessages.find(msg => msg.isUser && msg.text && msg.text.trim());
        if (firstUserMessage && (conversation.title === 'New Conversation' || conversation.title === 'Yeni Sohbet' || !(conversation.title || '').trim())) {
          const newTitle = generateConversationTitle(firstUserMessage.text);
          
          // Backend'e başlık güncellemesi gönder
          backendApiService.updateConversation(conversationId, newTitle).catch(error => {
            console.error('❌ Backend başlık güncelleme hatası:', error);
          });
          
          // Local state'i güncelle
          conversation.title = newTitle;
        }
        
        // Mevcut mesajlarla birleştir ve duplicate'leri kaldır
        let updatedConversation: ChatConversation | null = null;
        
        setConversations(prev => {
          const currentConv = prev.find(c => c.id === conversationId);
          const existingMessages: ChatMessage[] = currentConv?.messages || conversation.messages || [];
          const existingIds = new Set(existingMessages.map((m: ChatMessage) => m.id));
          const newMessages = backendMessages.filter((m: ChatMessage) => !existingIds.has(m.id));
          const mergedMessages: ChatMessage[] = [...existingMessages, ...newMessages];
          
          // Mesajları timestamp'e göre sırala (en eski en başta)
          mergedMessages.sort((a, b) => {
            const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime();
            const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime();
            return timeA - timeB; // En eski en başta
          });
          
          const updated = prev.map(conv => 
            conv.id === conversationId 
              ? { 
                  ...conv, 
                  messages: mergedMessages, 
                  title: conversation.title,
                  totalMessageCount: mergedMessages.length // totalMessageCount'u güncelle
                }
              : conv
          );
          
          updatedConversation = updated.find(c => c.id === conversationId) || conversation;
          if (updatedConversation) {
            updatedConversation.totalMessageCount = mergedMessages.length;
          }
          
          return updated;
        });
        
        // currentConversation'ı güncelle (setConversations callback'i dışında)
        if (updatedConversation) {
          setCurrentConversation(updatedConversation);
          console.log('✅ Conversation mesajları güncellendi:', {
            conversationId,
            messageCount: updatedConversation.messages.length,
            totalMessageCount: updatedConversation.totalMessageCount
          });
        }
      }
    } catch (error) {
      console.error('❌ Mesajlar yüklenirken hata:', error);
    } finally {
      // Yükleme işlemi tamamlandı (başarılı veya başarısız)
      loadingConversationsRef.current.delete(conversationId);
    }
  }, [backendApiService]);

  const selectConversation = useCallback(async (conversationId: string) => {
    console.log('🔍 selectConversation çağrıldı:', conversationId);
    
    // Conversation'ı güncel state'den al (callback pattern ile)
    let foundConversation: ChatConversation | undefined;
    
    setConversations(prev => {
      foundConversation = prev.find(conv => conv.id === conversationId);
      return prev;
    });
    
    // Eğer conversation bulunduysa currentConversation olarak set et (callback dışında)
    if (foundConversation) {
      console.log('✅ Conversation state\'de bulundu, currentConversation set ediliyor:', conversationId, {
        messageCount: foundConversation.messages?.length || 0,
        totalMessageCount: foundConversation.totalMessageCount
      });
      setCurrentConversation(foundConversation);
      
      // Mesajları kontrol et ve yükle
      // Her zaman mesajları yükle çünkü loadConversationMessages duplicate kontrolü yapar
      // ve mevcut mesajlarla birleştirir. Bu sayede eksik mesajlar yüklenir.
      const hasMessages = foundConversation.messages && foundConversation.messages.length > 0;
      const totalCount = foundConversation.totalMessageCount;
      const currentCount = foundConversation.messages?.length || 0;
      
      // Eğer totalMessageCount yoksa veya 0 ise veya currentCount totalCount'tan azsa yükle
      // Ayrıca, eğer totalMessageCount yoksa ve mesaj varsa bile yükle (güvenlik için)
      const shouldLoadMessages = !hasMessages || 
                                 !totalCount || 
                                 totalCount === 0 || 
                                 (totalCount > 0 && currentCount < totalCount);
      
      if (shouldLoadMessages) {
        console.log('📥 Conversation\'da mesaj yükleniyor...', {
          hasMessages,
          currentCount,
          totalCount,
          shouldLoad: shouldLoadMessages
        });
        // Mesajları paralel yükle (non-blocking)
        loadConversationMessages(conversationId, foundConversation)
          .then(() => {
            console.log('✅ Conversation mesajları yüklendi:', conversationId);
          })
          .catch(error => {
            console.error('❌ Mesajlar yüklenirken hata:', error);
          });
      } else {
        console.log('✅ Conversation\'da tüm mesajlar mevcut, yükleme gerekmiyor', {
          currentCount,
          totalCount
        });
      }
      return; // Conversation bulundu, işlem tamamlandı
    }
    
    // Eğer conversation local state'de yoksa backend'den yükle
    if (!foundConversation) {
      console.log('⚠️ Conversation state\'de bulunamadı, backend\'den yükleniyor...');
      try {
        const convResponse = await backendApiService.getConversation(conversationId);
        if (convResponse.success && convResponse.data) {
          const convData = convResponse.data;
          const newConversation: ChatConversation = {
            id: convData.id,
            title: convData.title,
            isResearchMode: convData.isResearchMode || false,
            messages: [],
            createdAt: new Date(convData.createdAt),
            updatedAt: new Date(convData.updatedAt)
          };
          
          // Local state'e ekle
          setConversations(prevConvs => {
            const exists = prevConvs.find(c => c.id === conversationId);
            if (!exists) {
              return [newConversation, ...prevConvs];
            }
            return prevConvs;
          });
          
          // currentConversation'ı set et (setConversations callback'i dışında)
          setCurrentConversation(newConversation);
          
          // Mesajları paralel yükle (non-blocking)
          loadConversationMessages(conversationId, newConversation).catch(error => {
            console.error('❌ Mesajlar yüklenirken hata:', error);
          });
          
          console.log('✅ Conversation backend\'den yüklendi ve currentConversation set edildi:', conversationId);
          return;
        } else {
          console.error('❌ Conversation backend\'den yüklenemedi:', convResponse.error);
          throw new Error('Conversation bulunamadı');
        }
      } catch (error) {
        console.error('❌ Conversation yüklenirken hata:', error);
        throw error;
      }
    }
  }, [backendApiService, loadConversationMessages]);

  const deleteConversation = useCallback((conversationId: string) => {
    setConversations(prev => prev.filter(conv => conv.id !== conversationId));
    
    // Clear current conversation if it was deleted
    if (currentConversation?.id === conversationId) {
      setCurrentConversation(null);
    }
  }, [currentConversation]);

  const deleteMessage = useCallback(async (conversationId: string, messageId: string) => {
    try {
      const response = await backendApiService.deleteMessage(messageId);
      
      if (response.success) {
        // Local state'den mesajı kaldır
        setConversations(prev => 
          prev.map(conv => 
            conv.id === conversationId 
              ? { 
                  ...conv, 
                  messages: conv.messages.filter(msg => msg.id !== messageId)
                }
              : conv
          )
        );
        
        // Eğer current conversation ise, onu da güncelle
        if (currentConversation?.id === conversationId) {
          setCurrentConversation(prev => 
            prev ? {
              ...prev,
              messages: prev.messages.filter(msg => msg.id !== messageId)
            } : null
          );
        }
        
        console.log('✅ Mesaj başarıyla silindi');
      } else {
        console.error('❌ Mesaj silme hatası:', response.error);
      }
    } catch (error) {
      console.error('❌ Mesaj silme hatası:', error);
    }
  }, [backendApiService, currentConversation]);

  const updateConversationTitle = useCallback((conversationId: string, title: string) => {
    setConversations(prev => 
      prev.map(conv => 
        conv.id === conversationId 
          ? { ...conv, title, updatedAt: new Date() }
          : conv
      )
    );

    // Update current conversation if it's the one being modified
    if (currentConversation?.id === conversationId) {
      setCurrentConversation(prev => 
        prev ? { ...prev, title, updatedAt: new Date() } : null
      );
    }
  }, [currentConversation]);

  const updateResearchMode = useCallback(async (conversationId: string, isResearchMode: boolean) => {
    try {
      console.log('📝 updateResearchMode çağrıldı:', {
        conversationId,
        isResearchMode
      });
      
      const response = await backendApiService.updateResearchMode(conversationId, isResearchMode);
      
      console.log('📥 updateResearchMode response:', {
        success: response.success,
        error: response.error,
        message: response.message,
        errorDetails: response.errorDetails
      });
      
      if (response.success && response.data) {
        // Local state'i güncelle
        setConversations(prev => 
          prev.map(conv => 
            conv.id === conversationId 
              ? { ...conv, isResearchMode, updatedAt: new Date() }
              : conv
          )
        );
        
        // Current conversation'ı da güncelle
        if (currentConversation?.id === conversationId) {
          setCurrentConversation(prev => 
            prev ? { ...prev, isResearchMode, updatedAt: new Date() } : null
          );
        }
        
        console.log('✅ updateResearchMode: Local state güncellendi');
      } else {
        console.error('❌ Araştırma modu güncellenemedi:', {
          error: response.error,
          message: response.message,
          errorDetails: response.errorDetails,
          conversationId,
          isResearchMode
        });
      }
    } catch (error: any) {
      console.error('❌ Araştırma modu güncelleme hatası:', {
        message: error.message,
        stack: error.stack,
        conversationId,
        isResearchMode
      });
    }
  }, [backendApiService, currentConversation]);

  const loadConversations = useCallback(async () => {
    try {
      console.log('📚 Konuşmalar backend\'den yükleniyor...');
      const response = await backendApiService.getConversations();
      
      if (response.success && response.data) {
        const conversationsData: any[] = Array.isArray(response.data) ? response.data : (response.data as any).conversations || [];
        console.log('✅ Backend\'den konuşmalar yüklendi:', conversationsData.length);
        
        // Her konuşma için ilk 10 mesajı yükle - BATCH'ler halinde (rate limit'i önlemek için)
        // Önce conversation'ları oluştur (mesajlar olmadan)
        const conversationsWithoutMessages: ChatConversation[] = conversationsData.map((conv: any) => ({
          id: conv.id,
          title: conv.title || 'Yeni Sohbet',
          isResearchMode: conv.isResearchMode || false,
          messages: [], // Mesajlar sonra yüklenecek
          totalMessageCount: 0,
          createdAt: new Date(conv.createdAt),
          updatedAt: new Date(conv.updatedAt)
        }));
        
        // Conversation'ları önce set et (mesajlar olmadan)
        setConversations(conversationsWithoutMessages);
        
        // Mesajları batch'ler halinde yükle (3'er 3'er - rate limit'i önlemek için)
        const BATCH_SIZE = 3;
        const conversationsWithMessages: ChatConversation[] = [];
        
        for (let i = 0; i < conversationsData.length; i += BATCH_SIZE) {
          const batch = conversationsData.slice(i, i + BATCH_SIZE);
          
          // Batch'i paralel yükle
          const batchResults = await Promise.all(
            batch.map(async (conv: any) => {
              try {
                // Rate limit kontrolü - eğer loadingConversationsRef'te varsa atla
                if (loadingConversationsRef.current.has(conv.id)) {
                  console.log(`⚠️ Conversation ${conv.id} zaten yükleniyor, atlanıyor...`);
                  return conversationsWithoutMessages.find(c => c.id === conv.id) || {
                    id: conv.id,
                    title: conv.title || 'Yeni Sohbet',
                    isResearchMode: conv.isResearchMode || false,
                    messages: [],
                    totalMessageCount: 0,
                    createdAt: new Date(conv.createdAt),
                    updatedAt: new Date(conv.updatedAt)
                  };
                }
                
                loadingConversationsRef.current.add(conv.id);
                
                const messagesResponse = await backendApiService.getMessages(conv.id, 1, 10);
                
                // Rate limit hatası kontrolü
                if (!messagesResponse.success && 
                    (messagesResponse.error === 'Çok fazla istek' || 
                     messagesResponse.message?.includes('Çok fazla istek') ||
                     messagesResponse.message?.includes('rate limit'))) {
                  console.warn(`⚠️ Rate limit hatası - conversation ${conv.id} mesajları yüklenemedi`);
                  loadingConversationsRef.current.delete(conv.id);
                  return conversationsWithoutMessages.find(c => c.id === conv.id) || {
                    id: conv.id,
                    title: conv.title || 'Yeni Sohbet',
                    isResearchMode: conv.isResearchMode || false,
                    messages: [],
                    totalMessageCount: 0,
                    createdAt: new Date(conv.createdAt),
                    updatedAt: new Date(conv.updatedAt)
                  };
                }
                
                const allMessages: ChatMessage[] = messagesResponse.success && messagesResponse.data && 'messages' in messagesResponse.data
                  ? (messagesResponse.data as any).messages.map((msg: any) => ({
                      id: msg.id,
                      text: msg.text || '',
                      isUser: msg.isUser,
                      timestamp: new Date(msg.timestamp || msg.createdAt),
                      images: msg.attachments?.filter((a: any) => a.type === 'IMAGE' || a.type === 'image').map((a: any) => a.url),
                      files: msg.attachments?.filter((a: any) => a.type === 'FILE' || a.type === 'file').map((a: any) => ({
                        name: a.filename,
                        uri: a.url,
                        size: a.size,
                        mimeType: a.mimeType
                      }))
                    }))
                  : [];
                
                loadingConversationsRef.current.delete(conv.id);
                
                const messages = allMessages.slice(0, 10);
                
                let totalMessageCount = allMessages.length;
                if (messagesResponse.data && 'pagination' in messagesResponse.data) {
                  totalMessageCount = (messagesResponse.data as any).pagination?.total || allMessages.length;
                } else if (allMessages.length === 10) {
                  totalMessageCount = 10;
                }
                
                let finalTitle = conv.title || '';
                if ((conv.title === 'New Conversation' || conv.title === 'Yeni Sohbet' || !(conv.title || '').trim()) && messages.length > 0) {
                  const firstUserMessage = messages.find((msg: ChatMessage) => msg.isUser && msg.text && msg.text.trim());
                  if (firstUserMessage) {
                    finalTitle = generateConversationTitle(firstUserMessage.text);
                    backendApiService.updateConversation(conv.id, finalTitle).catch(error => {
                      console.error('❌ Backend başlık güncelleme hatası:', error);
                    });
                  }
                }
                
                return {
                  id: conv.id,
                  title: finalTitle,
                  isResearchMode: conv.isResearchMode || false,
                  messages,
                  totalMessageCount,
                  createdAt: new Date(conv.createdAt),
                  updatedAt: new Date(conv.updatedAt)
                };
              } catch (error) {
                loadingConversationsRef.current.delete(conv.id);
                console.error(`❌ Konuşma ${conv.id} mesajları yüklenirken hata:`, error);
                return conversationsWithoutMessages.find(c => c.id === conv.id) || {
                  id: conv.id,
                  title: conv.title || 'Yeni Sohbet',
                  isResearchMode: conv.isResearchMode || false,
                  messages: [],
                  totalMessageCount: 0,
                  createdAt: new Date(conv.createdAt),
                  updatedAt: new Date(conv.updatedAt)
                };
              }
            })
          );
          
          conversationsWithMessages.push(...batchResults);
          
          // Batch'ler arasında kısa bir delay ekle (rate limit'i önlemek için)
          if (i + BATCH_SIZE < conversationsData.length) {
            await new Promise(resolve => setTimeout(resolve, 500)); // 500ms bekle
          }
        }
        
        const allConversations: ChatConversation[] = conversationsWithMessages;
        
        // Conversation'ları updatedAt'e göre sırala (en yeni en üstte)
        allConversations.sort((a, b) => {
          const timeA = a.updatedAt instanceof Date ? a.updatedAt.getTime() : new Date(a.updatedAt).getTime();
          const timeB = b.updatedAt instanceof Date ? b.updatedAt.getTime() : new Date(b.updatedAt).getTime();
          return timeB - timeA; // En yeni en üstte
        });
        
        // Tüm conversation'ları göster (mesajlar lazy load ile yüklenecek)
        // Mesajsız conversation'lar da gösterilmeli çünkü mesajlar conversation seçildiğinde yüklenecek
        console.log(`📊 Toplam konuşma: ${allConversations.length}`);
        
        setConversations(allConversations);
        console.log('✅ Konuşmalar başarıyla yüklendi');
      } else {
        console.log('📭 Backend\'de konuşma bulunamadı');
      }
    } catch (error) {
      console.error('❌ Konuşmalar yüklenirken hata:', error);
    }
  }, [backendApiService]);

  const updateConversationMessages = useCallback((conversationId: string, messages: ChatMessage[]) => {
    setConversations(prev => 
      prev.map(conv => 
        conv.id === conversationId 
          ? { ...conv, messages, totalMessageCount: messages.length }
          : conv
      )
    );
    
    // Eğer current conversation ise, onu da güncelle
    if (currentConversation?.id === conversationId) {
      setCurrentConversation(prev => 
        prev ? { ...prev, messages, totalMessageCount: messages.length } : null
      );
    }
  }, [currentConversation]);

  const value: ChatContextType = {
    conversations,
    currentConversation,
    addMessage,
    updateMessage,
    removeMessage,
    createNewConversation,
    selectConversation,
    deleteConversation,
    deleteMessage,
    updateConversationTitle,
    updateResearchMode,
    loadConversations,
    updateConversationMessages,
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = (): ChatContextType => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};


