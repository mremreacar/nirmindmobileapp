import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect, useRef } from 'react';
import { InteractionManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  loadConversations: (options?: { reset?: boolean; limit?: number }) => Promise<number>;
  updateConversationMessages: (conversationId: string, messages: ChatMessage[]) => void;
  loadMoreMessages: (conversationId: string) => Promise<boolean>; // Returns true if messages were loaded, false if no more messages
  hasMoreConversations: boolean;
  isLoadingConversations: boolean;
  loadingMessagesConversationIds: string[];
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const SOFT_DELETED_CONVERSATIONS_KEY = 'softDeletedConversations';
const DEFAULT_CONVERSATION_PAGE_SIZE = 10;

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
  const [softDeletedConversationIds, setSoftDeletedConversationIds] = useState<string[]>([]);
  const [hasMoreConversations, setHasMoreConversations] = useState<boolean>(true);
  const [isLoadingConversations, setIsLoadingConversations] = useState<boolean>(false);
  const [loadingMessagesConversationIds, setLoadingMessagesConversationIds] = useState<string[]>([]);
  const backendApiService = BackendApiService.getInstance();
  
  // Conversation yükleme durumunu takip et (duplicate istekleri önlemek için)
  const loadingConversationsRef = useRef<Set<string>>(new Set());
  const softDeletedConversationsRef = useRef<Set<string>>(new Set());
  const conversationsPaginationRef = useRef<{ page: number; limit: number; hasMore: boolean }>({
    page: 1,
    limit: DEFAULT_CONVERSATION_PAGE_SIZE,
    hasMore: true,
  });
  const isConversationsLoadingRef = useRef<boolean>(false);
  
  // Message pagination ve cache için refs
  const messagePaginationRef = useRef<Map<string, { page: number; limit: number; hasMore: boolean; lastLoadTime: number }>>(new Map());
  const messageCacheRef = useRef<Map<string, { messages: ChatMessage[]; timestamp: number }>>(new Map());
  const MESSAGE_CACHE_TTL = 5 * 60 * 1000; // 5 dakika cache TTL
  const DEFAULT_MESSAGE_PAGE_SIZE = 3; // TEST: İlk yüklemede 3 mesaj (test için, sonra 50'ye alınacak)
  const MAX_MESSAGE_PAGE_SIZE = 200; // Maksimum sayfa boyutu
  
  // Request deduplication - aynı conversation ve sayfa için aynı anda birden fazla istek gönderme
  const loadingMessagesRequestsRef = useRef<Map<string, Promise<void>>>(new Map());
  
  // Rate limiting - çok sık istek göndermeyi önle (minimum 500ms aralık)
  const lastRequestTimeRef = useRef<Map<string, number>>(new Map());
  const MIN_REQUEST_INTERVAL = 500; // 500ms minimum aralık
  
  // selectConversation için request deduplication - aynı conversation için birden fazla çağrıyı önle
  const selectingConversationsRef = useRef<Map<string, Promise<void>>>(new Map());

  const setConversationMessagesLoading = useCallback((conversationId: string, isLoading: boolean) => {
    setLoadingMessagesConversationIds(prev => {
      const exists = prev.includes(conversationId);
      if (isLoading) {
        if (exists) {
          return prev;
        }
        return [...prev, conversationId];
      }
      if (!exists) {
        return prev;
      }
      return prev.filter(id => id !== conversationId);
    });
  }, []);

  useEffect(() => {
    const loadSoftDeletedConversations = async () => {
      try {
        const storedIds = await AsyncStorage.getItem(SOFT_DELETED_CONVERSATIONS_KEY);
        if (storedIds) {
          const parsed: unknown = JSON.parse(storedIds);
          if (Array.isArray(parsed)) {
            const validIds = parsed.filter(id => typeof id === 'string');
            setSoftDeletedConversationIds(validIds);
          }
        }
      } catch (error) {
        console.error('❌ Soft delete edilmiş konuşmalar yüklenemedi:', error);
      }
    };

    loadSoftDeletedConversations();
  }, []);

  useEffect(() => {
    softDeletedConversationsRef.current = new Set(softDeletedConversationIds);
  }, [softDeletedConversationIds]);

  useEffect(() => {
    AsyncStorage.setItem(SOFT_DELETED_CONVERSATIONS_KEY, JSON.stringify(softDeletedConversationIds)).catch(error => {
      console.error('❌ Soft delete edilmiş konuşmalar kaydedilemedi:', error);
    });
  }, [softDeletedConversationIds]);

  useEffect(() => {
    if (softDeletedConversationIds.length === 0) {
      return;
    }

    setConversations(prev => prev.filter(conv => !softDeletedConversationsRef.current.has(conv.id)));

    setCurrentConversation(prev => {
      if (prev && softDeletedConversationsRef.current.has(prev.id)) {
        return null;
      }
      return prev;
    });
  }, [softDeletedConversationIds]);

  const addMessage = useCallback(async (conversationId: string, message: ChatMessage) => {
    // ChatGPT benzeri akış: addMessage sadece mesaj ekler
    // Conversation oluşturma sendMessage içinde yapılıyor
    
    if (!message || !message.id) {
      console.error('❌ addMessage: Geçersiz mesaj objesi:', message);
      return;
    }
    
    if (!conversationId) {
      console.error('❌ addMessage: conversationId eksik, mesaj eklenemedi:', message.id);
      return;
    }

    if (softDeletedConversationsRef.current.has(conversationId)) {
      console.warn('⚠️ Soft delete edilmiş conversation\'a mesaj eklenemez:', conversationId);
      return;
    }
    
    // CRITICAL FIX: Conversation kontrolünü optimize et
    // State güncellemelerini minimize etmek için önce mevcut state'i kontrol et
    const existingConversation = conversations.find(conv => conv.id === conversationId);
    const needsCurrentConversationUpdate = !currentConversation || currentConversation.id !== conversationId;
    
    // Conversation yoksa basit bir fallback oluştur (sendMessage zaten oluşturmuş olmalı)
    if (!existingConversation) {
      // Sessizce geçici conversation oluştur - bu normal bir durum olabilir
      const tempConversation: ChatConversation = {
        id: conversationId,
        title: 'Yeni Sohbet',
        isResearchMode: false,
        isSoftDeleted: false,
        messages: [] as ChatMessage[],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      setConversations(prevConvs => {
        const exists = prevConvs.find(c => c.id === conversationId);
        if (!exists) {
          return [tempConversation, ...prevConvs];
        }
        return prevConvs;
      });
      
      // Eğer currentConversation yoksa veya farklıysa güncelle
      if (needsCurrentConversationUpdate) {
        setCurrentConversation(tempConversation);
      }
    } else if (needsCurrentConversationUpdate) {
      // Conversation var ama currentConversation farklı
      setCurrentConversation(existingConversation);
    }
    
    // Duplicate kontrolü - aynı ID'ye sahip mesaj varsa ekleme
    let messageAdded = false;
    let updatedConversationForCurrent: ChatConversation | null = null;
    
    // CRITICAL FIX: State güncellemelerini hemen yapmak için önce conversations'ı güncelle
    // Sonra currentConversation'ı aynı render cycle'da güncelle
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
          isSoftDeleted: false,
          messages: [message],
          createdAt: new Date(),
          updatedAt: new Date()
        };
        updated.push(tempConversation);
        updatedConversationForCurrent = tempConversation;
      } else {
        // Conversation var, güncellenmiş halini al
        updatedConversationForCurrent = updated.find(conv => conv.id === conversationId) || null;
      }
      
      return updated;
    });
    
    // CRITICAL FIX: currentConversation'ı hemen güncelle (aynı render cycle'da)
    // Bu sayede UI hemen güncellenir
    // requestAnimationFrame kullanarak state güncellemesini bir sonraki frame'de yap
    // Bu sayede UI daha hızlı güncellenir
    if (updatedConversationForCurrent) {
      // Hemen güncelle (senkron görünmesi için)
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
          return updatedConversationForCurrent;
        }
      });
    }
    
    // Cache'i invalidate et - yeni mesaj eklendi
    if (messageAdded) {
      messageCacheRef.current.delete(conversationId);
      // Pagination'ı da güncelle - yeni mesaj eklendi, hasMore true olabilir
      const pagination = messagePaginationRef.current.get(conversationId);
      if (pagination) {
        messagePaginationRef.current.set(conversationId, {
          ...pagination,
          hasMore: true // Yeni mesaj eklendi, daha fazla mesaj olabilir
        });
      }
    }

    // İlk kullanıcı mesajından sonra başlık güncelle (backend ID varsa)
    if (message.isUser && message.text && message.text.trim() && messageAdded) {
      setConversations(prev => {
        const conversation = prev.find(conv => conv.id === conversationId);
        if (conversation && 
            (conversation.title === "Yeni Sohbet" || conversation.title === "New Conversation") &&
            !conversationId.startsWith('conv-')) {
          // Backend ID'si varsa başlığı güncelle
          const newTitle = generateConversationTitle(message.text);
          
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
          backendApiService.updateConversation(conversationId, newTitle).catch(error => {
            console.error('❌ Backend başlık güncelleme hatası:', error);
          });
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
    // CRITICAL FIX: Boş text ile updateMessage çağrılmasını önle
    // Boş text ile güncelleme yapmak gereksiz ve performans sorunlarına neden olur
    // Streaming mesajları için text boş olabilir (sadece "Düşünüyorum..." gösterilecek), bu durumda güncelleme yap
    if (!message.isStreaming && (!message.text || message.text.trim().length === 0)) {
      // Boş text ve streaming değil, güncelleme yapma
      return;
    }
    
    // Sadece önemli durumlarda log (ilk mesaj veya sorun varsa)
    if (message.text && (message.text.length <= 2 || message.text.length % 500 === 0)) {
      console.log('💬 [AI] Mesaj context\'e güncellendi:', {
        conversationId,
        messageId: message.id,
        textLength: message.text.length,
        isStreaming: message.isStreaming,
        hasContent: message.text.length > 0
      });
    }
    
    if (softDeletedConversationsRef.current.has(conversationId)) {
      console.warn('⚠️ Soft delete edilmiş conversation\'daki mesaj güncellenemez:', conversationId);
      return;
    }

    let updatedConversation: ChatConversation | null = null;

    setConversations(prev => {
      const conversation = prev.find(conv => conv.id === conversationId);
      if (!conversation) {
        // Conversation yoksa ekle
        const tempConversation: ChatConversation = {
          id: conversationId,
          title: 'Yeni Sohbet',
          isResearchMode: false,
          isSoftDeleted: false,
          messages: [message],
          createdAt: new Date(),
          updatedAt: new Date()
        };
        updatedConversation = tempConversation;
        return [...prev, tempConversation];
      }
      
      // Mesajı güncelle veya ekle
      // Duplicate kontrolü: Eğer mesaj zaten varsa ve aynıysa, tekrar ekleme
      const messageIndex = conversation.messages.findIndex(msg => msg.id === message.id);
      if (messageIndex >= 0) {
        // Mesaj zaten var, güncelle
        const existingMessage = conversation.messages[messageIndex];
        // Eğer mesaj aynıysa (text, streaming, user aynı), güncelleme yapma
        // Ama streaming mesajları için text değiştiyse her zaman güncelle (streaming sırasında text sürekli değişir)
        const isStreamingUpdate = message.isStreaming || existingMessage.isStreaming;
        const textChanged = existingMessage.text !== message.text;
        
        if (!isStreamingUpdate && !textChanged &&
            existingMessage.text === message.text && 
            existingMessage.isStreaming === message.isStreaming &&
            existingMessage.isUser === message.isUser) {
          // Mesaj aynı ve streaming değil, güncelleme yapma (duplicate önleme)
          // Ama yine de yeni array döndür (React state güncellemesi için)
          updatedConversation = conversation;
          return prev; // Aynı array'i döndür - React state güncellemesi algılanmayacak ama bu durumda sorun değil
        }
        
        // Streaming güncellemesi veya text değişti - her zaman güncelle
        // Mesaj farklı, güncelle
        // Thinking steps kaldırıldı - artık frontend'de işlenmiyor
        // updateMessage logları kaldırıldı (çok fazla log üretiyordu)
        
        let finalMessage = message;
        
        // Text field'ını merge et: 
        // - Eğer yeni mesajın text'i varsa, onu kullan (ana mesaj geldiğinde)
        // - Eğer yeni mesajın text'i boşsa, mevcut text'i koru ("Düşünüyorum..." gösterilecek)
        if (!message.text || message.text.trim() === '') {
          // Yeni mesajın text'i boş, mevcut text'i koru (MessageList'te "Düşünüyorum..." gösterilecek)
          finalMessage = {
            ...finalMessage,
            text: existingMessage.text || ''
          };
        }
        // Eğer yeni mesajın text'i varsa, onu kullan (ana mesaj geldiğinde) - finalMessage zaten message'ı içeriyor
        
        const updatedMessages = conversation.messages.map((msg, idx) => idx === messageIndex ? finalMessage : msg);
        updatedConversation = {
          ...conversation,
          messages: updatedMessages,
          updatedAt: new Date()
        };
        
        // Yeni array döndür - React state güncellemesi için referans değişmeli
        const newConversations = prev.map(conv =>
          conv.id === conversationId ? updatedConversation! : conv
        );
        
        // Sadece önemli durumlarda log (ilk mesaj veya sorun varsa)
        if (message.text && (message.text.length <= 2 || message.text.length % 500 === 0)) {
          console.log('💬 [AI] Conversations array güncellendi:', {
            conversationId,
            messageId: message.id,
            textLength: message.text.length,
            messageCount: newConversations.find(c => c.id === conversationId)?.messages?.length || 0
          });
        }
        
        return newConversations;
      }
      // Mesaj yok, ekle
      const updatedMessages = [...conversation.messages, message];
      
      updatedConversation = {
        ...conversation,
        messages: updatedMessages,
        updatedAt: new Date()
      };
      
      // Yeni array döndür - React state güncellemesi için referans değişmeli
      const newConversations = prev.map(conv =>
        conv.id === conversationId ? updatedConversation! : conv
      );
      
      // Sadece önemli durumlarda log (yeni mesaj eklendiğinde)
      if (message.text && message.text.length > 0) {
        console.log('💬 [AI] Yeni mesaj eklendi:', {
          conversationId,
          messageId: message.id,
          textLength: message.text.length,
          isUser: message.isUser,
          messageCount: newConversations.find(c => c.id === conversationId)?.messages?.length || 0
        });
      }
      
      return newConversations;
    });
    
    // currentConversation'ı da güncelle
    // Eğer currentConversation bu conversation'a işaret ediyorsa güncelle
    // Eğer currentConversation undefined veya farklı conversation'a işaret ediyorsa,
    // güncellenmiş conversation'ı set et
    if (updatedConversation) {
      setCurrentConversation(prevConv => {
        if (prevConv?.id === conversationId) {
          // Aynı conversation, mesajı güncelle
          const messageIndex = prevConv.messages.findIndex(msg => msg.id === message.id);
          if (messageIndex >= 0) {
            // Mesaj zaten var, duplicate kontrolü yap
            const existingMessage = prevConv.messages[messageIndex];
            // Eğer mesaj aynıysa (text, streaming, user aynı), güncelleme yapma
            if (existingMessage.text === message.text && 
                existingMessage.isStreaming === message.isStreaming &&
                existingMessage.isUser === message.isUser) {
              return prevConv; // Mesaj aynı, güncelleme yapma
            }
            // Mesaj farklı, güncelle
            // Thinking steps kaldırıldı - artık frontend'de işlenmiyor
            const updatedMessages = prevConv.messages.map((msg, idx) => idx === messageIndex ? message : msg);
            // Log'u sadece önemli durumlarda göster (ilk birkaç karakter veya her 500 karakter)
            if (!message.text || message.text.length <= 2 || message.text.length % 500 === 0) {
              console.log('✅ currentConversation mesajı güncellendi:', { 
                conversationId, 
                messageId: message.id,
                messageCount: updatedMessages.length,
                textLength: message.text?.length || 0
              });
            }
            return {
              ...prevConv,
              messages: updatedMessages,
              updatedAt: new Date()
            };
          }
          // Mesaj yok, ekle
          const messageExists = prevConv.messages.some(msg => msg.id === message.id);
          if (!messageExists) {
            console.log('✅ currentConversation\'a yeni mesaj eklendi:', { 
              conversationId, 
              messageId: message.id,
              previousMessageCount: prevConv.messages.length,
              newMessageCount: prevConv.messages.length + 1
            });
            return {
              ...prevConv,
              messages: [...prevConv.messages, message],
              updatedAt: new Date()
            };
          }
          return prevConv;
        } else {
          // Farklı conversation veya undefined, güncellenmiş conversation'ı kullan
          if (updatedConversation) {
            console.log('✅ currentConversation otomatik seçildi (updateMessage):', { 
              previousId: prevConv?.id, 
              newId: conversationId,
              messageCount: updatedConversation.messages.length
            });
            return updatedConversation;
          }
          return prevConv;
        }
      });
    }
  }, []); // currentConversation dependency'sini kaldırdık - closure sorununu önlemek için

  // Remove message from conversation (for optimistic updates)
  const removeMessage = useCallback((conversationId: string, messageId: string) => {
    if (softDeletedConversationsRef.current.has(conversationId)) {
      console.warn('⚠️ Soft delete edilmiş conversation\'daki mesaj kaldırılamaz:', conversationId);
      return;
    }

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
    
    // CRITICAL FIX: currentConversation'ı da güncelle
    // Closure sorununu önlemek için setCurrentConversation callback pattern kullan
    setCurrentConversation(prev => {
      if (prev?.id === conversationId) {
        const filteredMessages = prev.messages.filter(msg => msg.id !== messageId);
        console.log('🗑️ currentConversation\'dan mesaj kaldırıldı:', {
          conversationId,
          messageId,
          remainingMessages: filteredMessages.length
        });
        return {
          ...prev,
          messages: filteredMessages,
          updatedAt: new Date()
        };
      }
      return prev;
    });
  }, []);

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
          isSoftDeleted: false,
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
      isSoftDeleted: false,
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
  // Optimized: Pagination ve caching ile performans iyileştirmesi
  const loadConversationMessages = useCallback(async (
    conversationId: string, 
    conversation: ChatConversation,
    options?: { page?: number; limit?: number; forceRefresh?: boolean }
  ) => {
    if (softDeletedConversationsRef.current.has(conversationId)) {
      console.log('⚠️ Soft delete edilmiş conversation için mesaj yükleme atlandı:', conversationId);
      return;
    }

    // Pagination bilgilerini al veya oluştur (requestKey için gerekli)
    const pagination = messagePaginationRef.current.get(conversationId) || {
      page: 1,
      limit: DEFAULT_MESSAGE_PAGE_SIZE,
      hasMore: true,
      lastLoadTime: 0
    };
    
    const page = options?.page || pagination.page;
    const limit = options?.limit || Math.min(pagination.limit, MAX_MESSAGE_PAGE_SIZE);
    
    // Request deduplication - aynı conversation ve sayfa için aynı anda birden fazla istek gönderme
    const requestKey = `${conversationId}-page-${page}`;
    const existingRequest = loadingMessagesRequestsRef.current.get(requestKey);
    if (existingRequest) {
      console.log('⚠️ Aynı sayfa zaten yükleniyor, mevcut request bekleniyor...', { conversationId, page });
      await existingRequest; // Mevcut request'in tamamlanmasını bekle
      return;
    }
    
    // Rate limiting - çok sık istek göndermeyi önle (minimum 500ms aralık)
    const lastRequestTime = lastRequestTimeRef.current.get(conversationId) || 0;
    const timeSinceLastRequest = Date.now() - lastRequestTime;
    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL && !options?.forceRefresh) {
      console.log('⚠️ Rate limit - çok sık istek gönderiliyor, bekleniyor...', {
        conversationId,
        timeSinceLastRequest,
        minInterval: MIN_REQUEST_INTERVAL
      });
      // Kısa bir delay ile tekrar dene
      await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
    }
    
    // Eğer zaten yükleniyorsa tekrar yükleme (duplicate prevention - genel kontrol)
    if (loadingConversationsRef.current.has(conversationId)) {
      console.log('⚠️ Conversation mesajları zaten yükleniyor, atlanıyor...', conversationId);
      return;
    }
    
    // Cache kontrolü - forceRefresh yoksa ve cache geçerliyse cache'den dön
    // NOT: Pagination için cache'i bypass et (yeni mesajlar için)
    if (!options?.forceRefresh && page === 1) {
      const cached = messageCacheRef.current.get(conversationId);
      if (cached && (Date.now() - cached.timestamp) < MESSAGE_CACHE_TTL) {
        // Cache'den gelen mesajlarla conversation objesini oluştur
        const conversationWithCachedMessages: ChatConversation = {
          ...conversation,
          messages: cached.messages
        };
        
        // Hem conversations hem currentConversation'ı güncelle
        setConversations(prev => 
          prev.map(conv => 
            conv.id === conversationId 
              ? conversationWithCachedMessages
              : conv
          )
        );
        
        if (currentConversation?.id === conversationId) {
          setCurrentConversation(conversationWithCachedMessages);
        }
        
        // State update'in tamamlanması için kısa bir delay
        await new Promise(resolve => setTimeout(resolve, 10));
        
        return;
      }
    }
    
    // Yükleme işlemini başlat
    loadingConversationsRef.current.add(conversationId);
    setConversationMessagesLoading(conversationId, true);
    lastRequestTimeRef.current.set(conversationId, Date.now());
    
    // Request promise'ını oluştur ve kaydet (deduplication için)
    const requestPromise = (async () => {
      try {
        // Pagination ile mesajları yükle (ilk yüklemede 50, sonraki sayfalarda 100)
        const messagesResponse = await backendApiService.getMessages(conversationId, page, limit);
        
        // Rate limit hatası kontrolü
      if (!messagesResponse.success && 
          (messagesResponse.error === 'Çok fazla istek' || 
           messagesResponse.message?.includes('Çok fazla istek') ||
           messagesResponse.message?.includes('rate limit'))) {
        console.warn('⚠️ Rate limit hatası - mesajlar yüklenemedi');
        return;
      }
      
      if (messagesResponse.success && messagesResponse.data && 'messages' in messagesResponse.data) {
        const responseData = messagesResponse.data as any;
        const paginationInfo = responseData.pagination;
        const fetchedMessages = responseData.messages || [];
        
        console.log('📥 [ChatContext] Backend\'den mesajlar alındı:', {
          conversationId,
          page,
          limit,
          fetchedMessageCount: fetchedMessages.length,
          paginationInfo: paginationInfo ? {
            page: paginationInfo.page,
            pages: paginationInfo.pages,
            total: paginationInfo.total
          } : null
        });
        
        // Pagination bilgilerini güncelle
        const hasMore = paginationInfo 
          ? (paginationInfo.page < paginationInfo.pages)
          : fetchedMessages.length === limit;
        
        messagePaginationRef.current.set(conversationId, {
          page: paginationInfo?.page || page,
          limit: paginationInfo?.limit || limit,
          hasMore,
          lastLoadTime: Date.now()
        });
        
        const backendMessages: ChatMessage[] = fetchedMessages
          .filter((msg: any) => {
            // Geçersiz mesajları filtrele
            if (!msg || !msg.id) return false;
            
            // CRITICAL FIX: Boş AI mesajlarını filtrele (geçmiş sohbetlerde boş balon görünmesin)
            // Kullanıcı mesajları her zaman göster (boş olsa bile - görsel/dosya olabilir)
            // AI mesajları sadece text, görsel veya dosya varsa göster
            // NOT: Backend'den text boş gelebilir ama mesaj backend'de kaydedilmişse gösterilmeli
            // Bu durumda text'i parse ederken düzeltiyoruz
            if (!msg.isUser) {
              // Text parse et - null, undefined veya boş string olabilir
              let messageText = '';
              if (msg.text && typeof msg.text === 'string') {
                messageText = msg.text.trim();
              } else if (msg.text !== null && msg.text !== undefined) {
                messageText = String(msg.text).trim();
              }
              
              const hasText = messageText.length > 0;
              const hasAttachments = msg.attachments && Array.isArray(msg.attachments) && msg.attachments.length > 0;
              
              // CRITICAL: Eğer mesaj backend'de kaydedilmişse (ID formatı gerçek bir ID ise), text boş olsa bile göster
              // Çünkü bu mesaj zaten backend'de var ve muhtemelen streaming sırasında text kaybolmuş olabilir
              // Sadece gerçekten hiçbir içeriği olmayan mesajları filtrele
              const isRealBackendMessage = msg.id && !msg.id.startsWith('ai-streaming-') && !msg.id.startsWith('temp-');
              
              if (!hasText && !hasAttachments && !isRealBackendMessage) {
                console.warn('⚠️ Boş AI mesajı filtrelendi:', {
                  messageId: msg.id,
                  hasText,
                  hasAttachments,
                  attachmentsCount: msg.attachments?.length || 0,
                  isRealBackendMessage
                });
                return false; // Boş AI mesajını filtrele
              }
              
              // Eğer gerçek backend mesajı ama text boşsa, log'la ama göster
              if (isRealBackendMessage && !hasText && !hasAttachments) {
                console.warn('⚠️ Backend AI mesajı text boş ama gösteriliyor (backend\'de kayıtlı):', {
                  messageId: msg.id
                });
              }
            }
            
            return true;
          })
          .map((msg: any) => {
            // Timestamp validation - geçersiz tarihler için fallback
            let timestamp: Date;
            try {
              const tsValue = msg.timestamp || msg.createdAt;
              if (tsValue) {
                timestamp = new Date(tsValue);
                // Invalid date kontrolü
                if (isNaN(timestamp.getTime())) {
                  console.warn('⚠️ Geçersiz timestamp, şu anki zaman kullanılıyor:', tsValue);
                  timestamp = new Date();
                }
              } else {
                timestamp = new Date();
              }
            } catch (error) {
              console.error('❌ Timestamp parse hatası:', error);
              timestamp = new Date();
            }
            
            // CRITICAL: Backend'den gelen mesajların isStreaming flag'ini false yap
            // Streaming mesajları sadece aktif streaming sırasında true olmalı
            // Backend'den yüklenen mesajlar her zaman tamamlanmış mesajlardır
            
            // Attachments validation
            const attachments = msg.attachments || [];
            const images = attachments
              .filter((a: any) => a && (a.type === 'IMAGE' || a.type === 'image') && a.url)
              .map((a: any) => a.url);
            const files = attachments
              .filter((a: any) => a && (a.type === 'FILE' || a.type === 'file' || a.type === 'AUDIO' || a.type === 'VIDEO') && a.url)
              .map((a: any) => ({
                name: a.filename || 'Dosya',
                uri: a.url,
                size: a.size || undefined,
                mimeType: a.mimeType || undefined
              }));
            
            // CRITICAL FIX: Text field'ını doğru parse et
            // Backend'den text null, undefined veya boş string olabilir
            let messageText = '';
            if (msg.text && typeof msg.text === 'string') {
              messageText = msg.text.trim();
            } else if (msg.text !== null && msg.text !== undefined) {
              // String değilse string'e çevir
              messageText = String(msg.text).trim();
            }
            
            // CRITICAL FIX: Eğer AI mesajı text boşsa ama backend'de kayıtlıysa,
            // bu mesaj muhtemelen streaming sırasında text kaybolmuş olabilir
            // Bu durumda mesajı filtrele (boş balon görünmesin)
            // Ama eğer attachments varsa mesajı göster
            const hasAttachments = (images.length > 0 || files.length > 0);
            if (!msg.isUser && !messageText && !hasAttachments) {
              // Text boş ve attachment yok, mesajı filtrele
              console.warn('⚠️ Backend AI mesajı text boş ve attachment yok, filtreleniyor:', {
                messageId: msg.id
              });
              return null; // null döndür, filter'da false olacak
            }
            
            return {
              id: msg.id,
              text: messageText, // Trim edilmiş text (boş olabilir)
              isUser: msg.isUser === true, // Boolean coercion
              timestamp,
              isStreaming: false, // CRITICAL: Backend'den yüklenen mesajlar her zaman tamamlanmış mesajlardır
              images: images.length > 0 ? images : undefined,
              files: files.length > 0 ? files : undefined
            };
          })
          .filter((msg: ChatMessage | null): msg is ChatMessage => msg !== null); // null'ları filtrele
        
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
        // Pagination durumunda: eğer page > 1 ise yeni mesajları ekle, page === 1 ise replace et
        // CRITICAL FIX: mergedConversation'ı direkt hesapla, ref kullanma
        // setConversations callback'i içinde hesapla ve döndür, sonra conversations state'inden al
        let mergedConversation: ChatConversation | undefined;
        
        setConversations(prev => {
          const currentConv = prev.find(c => c.id === conversationId);
          const baseConversation: ChatConversation = currentConv ? { ...currentConv } : { ...conversation };
          const existingMessages: ChatMessage[] = currentConv?.messages || conversation.messages || [];
          
          let mergedMessages: ChatMessage[];
          if (page === 1) {
            // CRITICAL FIX: İlk sayfa - backend'den gelen mesajları kullan (geçmiş sohbetler için)
            // Mevcut mesajları replace et - backend'den gelen mesajlar kaynak olmalı
            // Duplicate kontrolü yap - aynı ID'ye sahip mesajları filtrele
            const existingIds = new Set(existingMessages.map((m: ChatMessage) => m.id));
            const newMessages = backendMessages.filter((m: ChatMessage) => !existingIds.has(m.id));
            
            // Backend'den gelen mesajları öncelikli olarak kullan
            // Eğer backend'de mesaj varsa onu kullan, yoksa mevcut mesajı koru
            const backendMessageIds = new Set(backendMessages.map((m: ChatMessage) => m.id));
            const existingMessagesNotInBackend = existingMessages.filter((m: ChatMessage) => !backendMessageIds.has(m.id));
            
            // Backend mesajları + backend'de olmayan mevcut mesajlar (streaming mesajları gibi)
            mergedMessages = [...backendMessages, ...existingMessagesNotInBackend];
          } else {
            // Sonraki sayfalar - yeni mesajları başa ekle (eski mesajlar)
            const existingIds = new Set(existingMessages.map((m: ChatMessage) => m.id));
            const newMessages = backendMessages.filter((m: ChatMessage) => !existingIds.has(m.id));
            
            console.log('📥 [ChatContext] Pagination merge:', {
              conversationId,
              page,
              existingMessageCount: existingMessages.length,
              backendMessageCount: backendMessages.length,
              newMessageCount: newMessages.length,
              existingIds: Array.from(existingIds).slice(0, 5), // İlk 5 ID'yi göster
              newMessageIds: newMessages.map(m => m.id).slice(0, 5) // İlk 5 yeni mesaj ID'si
            });
            
            mergedMessages = [...newMessages, ...existingMessages]; // Eski mesajlar başa
          }
          
          // Mesajları timestamp'e göre sırala (en eski en başta)
          mergedMessages.sort((a, b) => {
            try {
              const timeA = a.timestamp instanceof Date 
                ? a.timestamp.getTime() 
                : (a.timestamp ? new Date(a.timestamp).getTime() : 0);
              const timeB = b.timestamp instanceof Date 
                ? b.timestamp.getTime() 
                : (b.timestamp ? new Date(b.timestamp).getTime() : 0);
              
              // Invalid date kontrolü
              const validTimeA = isNaN(timeA) ? 0 : timeA;
              const validTimeB = isNaN(timeB) ? 0 : timeB;
              
              return validTimeA - validTimeB; // En eski en başta
            } catch (error) {
              console.error('❌ Mesaj sıralama hatası:', error);
              return 0; // Hata durumunda sıralama yapma
            }
          });
          
          // CRITICAL FIX: totalMessageCount'u backend'den gelen pagination bilgisinden al
          // Eğer backend'den totalMessageCount geliyorsa onu kullan, yoksa mergedMessages.length kullan
          const backendTotalCount = paginationInfo?.total || mergedMessages.length;
          
          const nextConversation: ChatConversation = {
            ...baseConversation,
            title: conversation.title,
            messages: mergedMessages,
            totalMessageCount: backendTotalCount, // Backend'den gelen gerçek total count
            updatedAt: new Date()
          };

          // mergedConversation'ı direkt set et
          mergedConversation = nextConversation;

          if (currentConv) {
            return prev.map(conv => (conv.id === conversationId ? nextConversation : conv));
          }

          return [nextConversation, ...prev];
        });
        
        // mergedConversation set edildi, şimdi currentConversation'ı güncelle
        if (mergedConversation) {
          // Eğer bu conversation şu anki conversation ise güncelle
          if (currentConversation?.id === conversationId) {
            setCurrentConversation(mergedConversation);
          }
          
          // Cache'e kaydet
          messageCacheRef.current.set(conversationId, {
            messages: mergedConversation.messages,
            timestamp: Date.now()
          });
        }
        
        console.log('✅ Conversation mesajları güncellendi:', {
          conversationId,
          messageCount: mergedConversation?.messages.length || 0,
          totalMessageCount: mergedConversation?.totalMessageCount,
          page,
          hasMore,
          fromCache: false
        });
      }
      } catch (error) {
        console.error('❌ Mesajlar yüklenirken hata:', error);
        throw error; // Hata durumunda promise'i reject et
      } finally {
        // Yükleme işlemi tamamlandı (başarılı veya başarısız)
        loadingConversationsRef.current.delete(conversationId);
        setConversationMessagesLoading(conversationId, false);
        // Request promise'ını temizle (deduplication için)
        loadingMessagesRequestsRef.current.delete(requestKey);
      }
    })();
    
    // Request promise'ını kaydet (deduplication için)
    loadingMessagesRequestsRef.current.set(requestKey, requestPromise);
    
    // Request'i bekle
    await requestPromise;
  }, [backendApiService, setConversationMessagesLoading, currentConversation]);
  
  // Load more messages (pagination) - lazy loading için
  // Returns: true if messages were loaded, false if no more messages
  const loadMoreMessages = useCallback(async (conversationId: string): Promise<boolean> => {
    const pagination = messagePaginationRef.current.get(conversationId);
    console.log('📄 [ChatContext] loadMoreMessages çağrıldı:', {
      conversationId,
      pagination: pagination ? {
        page: pagination.page,
        limit: pagination.limit,
        hasMore: pagination.hasMore
      } : null,
      currentMessagesCount: conversations.find(c => c.id === conversationId)?.messages?.length || 0
    });
    
    if (!pagination || !pagination.hasMore) {
      console.log('ℹ️ Yüklenecek daha fazla mesaj yok:', {
        conversationId,
        hasPagination: !!pagination,
        hasMore: pagination?.hasMore
      });
      return false; // No more messages
    }
    
    const conversation = conversations.find(c => c.id === conversationId);
    if (!conversation) {
      console.error('❌ Conversation bulunamadı:', conversationId);
      return false; // Conversation not found
    }
    
    // Sonraki sayfayı yükle
    // NOT: forceRefresh: false - cache'i kullan, ama pagination için yeni mesajlar gerekiyor
    // Backend'den yeni mesajları çek ama rate limiting ile
    await loadConversationMessages(conversationId, conversation, {
      page: pagination.page + 1,
      limit: Math.min(pagination.limit * 2, MAX_MESSAGE_PAGE_SIZE), // Her sayfada limit'i artır
      forceRefresh: false // Cache'i kullan ama yeni sayfa için backend'den çek
    });
    
    // Yeni pagination durumunu kontrol et
    const newPagination = messagePaginationRef.current.get(conversationId);
    return newPagination?.hasMore ?? false; // Return true if there are more messages
  }, [conversations, loadConversationMessages]);

  const selectConversation = useCallback(async (conversationId: string) => {
    if (softDeletedConversationsRef.current.has(conversationId)) {
      console.warn('⚠️ Soft delete edilmiş conversation seçilemez:', conversationId);
      return;
    }

    // Request deduplication: Eğer aynı conversation zaten yükleniyorsa, mevcut promise'i bekle
    const existingPromise = selectingConversationsRef.current.get(conversationId);
    if (existingPromise) {
      console.log('⏳ Conversation zaten yükleniyor, mevcut promise bekleniyor:', conversationId);
      try {
        await existingPromise;
        // Promise tamamlandıktan sonra tekrar kontrol et
        // State'de conversation olup olmadığını kontrol et
        let foundAfterWait: ChatConversation | undefined;
        setConversations(prev => {
          foundAfterWait = prev.find(conv => conv.id === conversationId);
          return prev;
        });
        if (foundAfterWait) {
          setCurrentConversation(foundAfterWait);
          console.log('✅ Conversation başka bir çağrı tarafından yüklendi:', conversationId);
          return;
        }
      } catch (error) {
        // Promise hata verdi, devam et ve kendin yükle
        console.warn('⚠️ Beklenen promise hata verdi, devam ediliyor:', conversationId);
        selectingConversationsRef.current.delete(conversationId);
      }
    }

    console.log('🔍 selectConversation çağrıldı:', conversationId);
    
    // Conversation'ı güncel state'den al - useRef ile güncel state'i al
    // setConversations callback pattern race condition yaratabilir, bu yüzden daha güvenli bir yaklaşım
    let foundConversation: ChatConversation | undefined;
    
    // State'i güncel olarak almak için callback pattern kullan ama dikkatli
    setConversations(prev => {
      foundConversation = prev.find(conv => conv.id === conversationId);
      return prev; // State'i değiştirme, sadece okuma yap
    });
    
    // Eğer conversation bulunduysa currentConversation olarak set et
    if (foundConversation) {
      console.log('✅ Conversation state\'de bulundu, currentConversation set ediliyor:', conversationId, {
        messageCount: foundConversation.messages?.length || 0,
        totalMessageCount: foundConversation.totalMessageCount
      });
      
      // Mesajları kontrol et ve yükle - Optimized: Cache ve pagination ile
      const hasMessages = foundConversation.messages && foundConversation.messages.length > 0;
      const totalCount = foundConversation.totalMessageCount;
      const currentCount = foundConversation.messages?.length || 0;
      
      // Cache kontrolü - ÖNCE cache kontrolü yap, sonra currentConversation set et
      const cached = messageCacheRef.current.get(conversationId);
      const cacheValid = cached && (Date.now() - cached.timestamp) < MESSAGE_CACHE_TTL;
      
      // Eğer cache geçerliyse ve mesajlar varsa cache'den yükle
      if (cacheValid && cached && cached.messages.length > 0) {
        // Cache'den gelen mesajlarla conversation objesini oluştur
        const conversationWithCachedMessages: ChatConversation = {
          ...foundConversation,
          messages: cached.messages
        };
        
        // Hem conversations hem currentConversation'ı güncelle
        setConversations(prev => 
          prev.map(conv => 
            conv.id === conversationId 
              ? conversationWithCachedMessages
              : conv
          )
        );
        
        // currentConversation'ı cache'li mesajlarla set et
        // ÖNEMLİ: setCurrentConversation ve setConversations aynı anda çağrılmalı
        // React'in state batching'i nedeniyle aynı render cycle'ında güncellenir
        setCurrentConversation(conversationWithCachedMessages);
        
        // State update'in tamamlanması için kısa bir delay
        // React 18'de automatic batching var, ama yine de garanti için delay ekle
        await new Promise(resolve => setTimeout(resolve, 50));
        
        return; // Cache'den yüklendi, backend'e istek yok
      }
      
      // Cache yoksa veya geçersizse normal conversation'ı set et
      setCurrentConversation(foundConversation);
      
      // CRITICAL FIX: Mesaj yükleme mantığını optimize et
      // Geçmiş sohbetlerden seçildiğinde mesajların yüklendiğinden emin ol
      const shouldLoadMessages = !hasMessages || 
                                 !totalCount || 
                                 totalCount === 0 || 
                                 (totalCount > 0 && currentCount < totalCount);
      
      // CRITICAL FIX: Duplicate yükleme isteklerini önle
      // Eğer mesajlar zaten yükleniyorsa tekrar yükleme
      const isLoading = loadingConversationsRef.current.has(conversationId);
      
      // CRITICAL FIX: Geçmiş sohbetlerden seçildiğinde mesajları yükle
      // Eğer mesajlar yoksa veya eksikse mutlaka yükle
      // Bu, geçmiş sohbetlerden seçildiğinde mesajların görünmesini garanti eder
      if (shouldLoadMessages && !isLoading) {
        console.log('📥 Conversation\'da mesaj yükleniyor...', {
          hasMessages,
          currentCount,
          totalCount,
          shouldLoad: shouldLoadMessages,
          fromCache: false,
          forceLoad: !hasMessages || currentCount === 0,
          isLoading
        });
        // Mesajları paralel yükle (non-blocking) - İlk sayfa ile başla
        // forceRefresh: true ile cache'i bypass et ve backend'den yükle
        // CRITICAL: Geçmiş sohbetlerden seçildiğinde mesajlar yoksa force refresh yap
        loadConversationMessages(conversationId, foundConversation, { 
          page: 1, 
          limit: DEFAULT_MESSAGE_PAGE_SIZE,
          forceRefresh: !hasMessages || currentCount === 0 // Mesajlar yoksa veya eksikse force refresh
        })
          .then(() => {
            console.log('✅ Conversation mesajları yüklendi:', conversationId);
          })
          .catch(error => {
            console.error('❌ Mesajlar yüklenirken hata:', error);
          });
      } else if (isLoading) {
        console.log('⏳ Conversation mesajları zaten yükleniyor, atlanıyor:', conversationId);
      } else if (hasMessages && currentCount > 0 && totalCount && currentCount >= totalCount) {
        console.log('✅ Conversation\'da mesajlar mevcut, yükleme gerekmiyor', {
          currentCount,
          totalCount,
          hasMessages
        });
      } else {
        console.log('ℹ️ Conversation\'da mesaj yükleme atlandı (mesajlar mevcut veya yükleniyor)', {
          currentCount,
          totalCount,
          hasMessages,
          isLoading
        });
      }
      return; // Conversation bulundu, işlem tamamlandı
    }
    
    // Eğer conversation local state'de yoksa backend'den yükle
    if (!foundConversation) {
      console.log('⚠️ Conversation state\'de bulunamadı, backend\'den yükleniyor...');
      
      // Promise oluştur ve tracking'e ekle
      const loadPromise = (async () => {
        try {
          const convResponse = await backendApiService.getConversation(conversationId);
          
          // Rate limit hatası kontrolü
          if (!convResponse.success && 
              (convResponse.error === 'Çok fazla istek' || 
               convResponse.message?.includes('Çok fazla istek') ||
               convResponse.message?.includes('rate limit'))) {
            console.warn('⚠️ Rate limit hatası - conversation yüklenemedi');
            throw new Error('Çok fazla istek gönderildi. Lütfen birkaç dakika sonra tekrar deneyin.');
          }
          
          if (convResponse.success && convResponse.data) {
            const convData = convResponse.data;
            
            // Timestamp validation
            let createdAt: Date;
            let updatedAt: Date;
            try {
              createdAt = convData.createdAt ? new Date(convData.createdAt) : new Date();
              updatedAt = convData.updatedAt ? new Date(convData.updatedAt) : new Date();
              
              if (isNaN(createdAt.getTime())) createdAt = new Date();
              if (isNaN(updatedAt.getTime())) updatedAt = new Date();
            } catch (error) {
              console.error('❌ Timestamp parse hatası:', error);
              createdAt = new Date();
              updatedAt = new Date();
            }
            
            const newConversation: ChatConversation = {
              id: convData.id || conversationId,
              title: convData.title || 'Yeni Sohbet',
              isResearchMode: convData.isResearchMode || false,
              isSoftDeleted: false,
              messages: [] as ChatMessage[],
              createdAt,
              updatedAt
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
            
            // State update'in tamamlanması için kısa bir delay
            await new Promise(resolve => setTimeout(resolve, 50));
            
            // Mesajları paralel yükle (non-blocking) - İlk sayfa ile başla
            loadConversationMessages(conversationId, newConversation, { page: 1, limit: DEFAULT_MESSAGE_PAGE_SIZE }).catch(error => {
              console.error('❌ Mesajlar yüklenirken hata:', error);
            });
            
            console.log('✅ Conversation backend\'den yüklendi ve currentConversation set edildi:', conversationId);
          } else {
            const errorMessage = convResponse.error || convResponse.message || 'Conversation bulunamadı';
            console.error('❌ Conversation backend\'den yüklenemedi:', errorMessage);
            throw new Error(errorMessage);
          }
        } catch (error: any) {
          console.error('❌ Conversation yüklenirken hata:', error);
          // Error'ı daha açıklayıcı hale getir
          const errorMessage = error?.message || 'Conversation yüklenirken bir hata oluştu';
          throw new Error(errorMessage);
        } finally {
          // Promise tamamlandığında tracking'den sil
          selectingConversationsRef.current.delete(conversationId);
        }
      })();
      
      // Promise'i tracking'e ekle
      selectingConversationsRef.current.set(conversationId, loadPromise);
      
      // Promise'i bekle
      await loadPromise;
      return;
    }
  }, [backendApiService, loadConversationMessages]);

  const deleteConversation = useCallback((conversationId: string) => {
    setSoftDeletedConversationIds(prev => {
      if (prev.includes(conversationId)) {
        return prev;
      }
      return [...prev, conversationId];
    });

    setConversations(prev => prev.filter(conv => conv.id !== conversationId));
    
    if (currentConversation?.id === conversationId) {
      setCurrentConversation(null);
    }
  }, [currentConversation]);

  const deleteMessage = useCallback(async (conversationId: string, messageId: string) => {
    if (softDeletedConversationsRef.current.has(conversationId)) {
      console.warn('⚠️ Soft delete edilmiş conversation\'daki mesaj backend\'de silinmeyecek:', conversationId);
      return;
    }

    // Geçici streaming mesajlarını kontrol et (backend'de olmayan mesajlar)
    // ID formatına göre karar ver - conversations array'ini aramaya gerek yok
    // Geçici mesaj ID formatları:
    // - ai-streaming-{timestamp} (streaming AI mesajları)
    // - thinking-{timestamp} (thinking mesajları)
    // - user-{timestamp} (optimistic user mesajları - eğer varsa)
    const isTemporaryStreamingMessage = messageId.startsWith('ai-streaming-') || 
                                       messageId.startsWith('thinking-') ||
                                       messageId.startsWith('user-');

    // Eğer geçici streaming mesajı ise, sadece local'den sil (backend'e istek gönderme)
    if (isTemporaryStreamingMessage) {
      console.log('⚠️ Geçici streaming mesajı siliniyor (backend\'e istek gönderilmiyor):', messageId);
      
      // Sadece local state'den kaldır
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
      
      // Cache'i invalidate et - mesaj silindi
      const cached = messageCacheRef.current.get(conversationId);
      if (cached) {
        messageCacheRef.current.set(conversationId, {
          messages: cached.messages.filter(msg => msg.id !== messageId),
          timestamp: cached.timestamp
        });
      }
      
      console.log('✅ Geçici mesaj local\'den silindi');
      return; // Backend'e istek gönderme
    }

    // Gerçek mesajlar için: Optimistic update: Önce local state'den mesajı kaldır (kullanıcı deneyimi için)
    // Önceki state'i sakla (rollback için)
    let previousConversations: ChatConversation[] | null = null;
    let previousCurrentConversation: ChatConversation | null = null;
    let cached: { messages: ChatMessage[]; timestamp: number } | undefined;
    
    // Önceki state'i yakala (functional update kullanarak)
    setConversations(prev => {
      previousConversations = prev;
      return prev.map(conv => 
        conv.id === conversationId 
          ? { 
              ...conv, 
              messages: conv.messages.filter(msg => msg.id !== messageId)
            }
          : conv
      );
    });
    
    // Eğer current conversation ise, onu da güncelle ve önceki state'i sakla
    if (currentConversation?.id === conversationId) {
      setCurrentConversation(prev => {
        previousCurrentConversation = prev;
        return prev ? {
          ...prev,
          messages: prev.messages.filter(msg => msg.id !== messageId)
        } : null;
      });
    }
    
    // Cache'i invalidate et - mesaj silindi
    cached = messageCacheRef.current.get(conversationId);
    if (cached) {
      messageCacheRef.current.set(conversationId, {
        messages: cached.messages.filter(msg => msg.id !== messageId),
        timestamp: cached.timestamp
      });
    }

    try {
      const response = await backendApiService.deleteMessage(messageId);
      
      if (response.success) {
        console.log('✅ Mesaj başarıyla silindi');
      } else {
        // Backend başarısız oldu, state'i geri yükle
        console.error('❌ Mesaj silme hatası (state geri yükleniyor):', response.error);
        if (previousConversations) {
          setConversations(previousConversations);
        }
        if (previousCurrentConversation) {
          setCurrentConversation(previousCurrentConversation);
        }
        // Cache'i de geri yükle
        if (cached) {
          messageCacheRef.current.set(conversationId, cached);
        }
      }
    } catch (error) {
      // Backend hatası, state'i geri yükle
      console.error('❌ Mesaj silme hatası (state geri yükleniyor):', error);
      if (previousConversations) {
        setConversations(previousConversations);
      }
      if (previousCurrentConversation) {
        setCurrentConversation(previousCurrentConversation);
      }
      // Cache'i de geri yükle
      if (cached) {
        messageCacheRef.current.set(conversationId, cached);
      }
    }
  }, [backendApiService, currentConversation]);

  const updateConversationTitle = useCallback((conversationId: string, title: string) => {
    if (softDeletedConversationsRef.current.has(conversationId)) {
      console.warn('⚠️ Soft delete edilmiş conversation\'ın başlığı güncellenemez:', conversationId);
      return;
    }

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
    if (softDeletedConversationsRef.current.has(conversationId)) {
      console.warn('⚠️ Soft delete edilmiş conversation\'ın araştırma modu güncellenemez:', conversationId);
      return;
    }

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

  const loadConversations = useCallback(async (options?: { reset?: boolean; limit?: number }) => {
    const limit = options?.limit ?? conversationsPaginationRef.current.limit ?? DEFAULT_CONVERSATION_PAGE_SIZE;

    if (options?.reset) {
      conversationsPaginationRef.current = {
        page: 1,
        limit,
        hasMore: true,
      };
      setHasMoreConversations(true);
      setLoadingMessagesConversationIds([]);
      setConversations([]);
      setCurrentConversation(prev => prev ? prev : null);
    }

    if (isConversationsLoadingRef.current) {
      console.log('⚠️ Konuşmalar zaten yükleniyor, istek atlandı');
      return 0;
    }

    if (!conversationsPaginationRef.current.hasMore && !options?.reset) {
      console.log('ℹ️ Yüklenecek başka konuşma yok');
      return 0;
    }

    const pageToFetch = options?.reset ? 1 : conversationsPaginationRef.current.page;

    isConversationsLoadingRef.current = true;
    setIsLoadingConversations(true);

    try {
      console.log('📚 Konuşmalar backend\'den yükleniyor...', {
        page: pageToFetch,
        limit,
        reset: options?.reset ?? false,
      });

      const response = await backendApiService.getConversations({ page: pageToFetch, limit });

      if (response.success && response.data) {
        const responseData: any = response.data;
        const conversationsData: any[] = Array.isArray(responseData)
          ? responseData
          : Array.isArray(responseData?.conversations)
            ? responseData.conversations
            : [];

        const paginationInfo = !Array.isArray(responseData) ? responseData?.pagination || responseData?.meta : undefined;

        const activeConversationsData = conversationsData.filter((conv: any) => !softDeletedConversationsRef.current.has(conv.id));

        if (activeConversationsData.length === 0) {
          conversationsPaginationRef.current = {
            page: pageToFetch,
            limit,
            hasMore: false,
          };
          setHasMoreConversations(false);
          console.log('📭 Yüklenecek aktif konuşma bulunamadı');
          return 0;
        }

        const mappedConversations: ChatConversation[] = activeConversationsData.map((conv: any) => {
          const totalMessages =
            conv.totalMessageCount ??
            conv.totalMessages ??
            conv.messageCount ??
            conv.messagesCount ??
            conv.total ??
            0;

          return {
            id: conv.id,
            title: conv.title || 'Yeni Sohbet',
            isResearchMode: conv.isResearchMode || false,
            isSoftDeleted: false,
            messages: [],
            totalMessageCount: typeof totalMessages === 'number' ? totalMessages : 0,
            createdAt: new Date(conv.createdAt),
            updatedAt: new Date(conv.updatedAt),
          };
        });

        setConversations(prev => {
          const shouldReplace = options?.reset || prev.length === 0;

          if (shouldReplace) {
            return mappedConversations
              .slice()
              .sort((a, b) => {
                const timeA = a.updatedAt instanceof Date ? a.updatedAt.getTime() : new Date(a.updatedAt).getTime();
                const timeB = b.updatedAt instanceof Date ? b.updatedAt.getTime() : new Date(b.updatedAt).getTime();
                return timeB - timeA;
              });
          }

          const mergedMap = new Map<string, ChatConversation>();
          prev.forEach(conv => mergedMap.set(conv.id, conv));

          mappedConversations.forEach(conv => {
            const existing = mergedMap.get(conv.id);
            if (existing) {
              mergedMap.set(conv.id, {
                ...existing,
                title: conv.title || existing.title,
                isResearchMode: conv.isResearchMode ?? existing.isResearchMode,
                updatedAt: conv.updatedAt,
                totalMessageCount: conv.totalMessageCount ?? existing.totalMessageCount,
              });
            } else {
              mergedMap.set(conv.id, conv);
            }
          });

          return Array.from(mergedMap.values()).sort((a, b) => {
            const timeA = a.updatedAt instanceof Date ? a.updatedAt.getTime() : new Date(a.updatedAt).getTime();
            const timeB = b.updatedAt instanceof Date ? b.updatedAt.getTime() : new Date(b.updatedAt).getTime();
            return timeB - timeA;
          });
        });

        const pagination = paginationInfo || {};
        const currentPage = pagination.currentPage ?? pagination.page ?? pageToFetch;
        const totalPages = pagination.totalPages ?? pagination.lastPage ?? undefined;
        const totalItems = pagination.total ?? pagination.totalItems ?? undefined;
        const perPage = pagination.perPage ?? pagination.limit ?? limit;

        let hasMore = true;

        if (typeof totalPages === 'number') {
          hasMore = currentPage < totalPages;
        } else if (typeof totalItems === 'number') {
          hasMore = currentPage * perPage < totalItems;
        } else {
          hasMore = mappedConversations.length === limit;
        }

        conversationsPaginationRef.current = {
          page: hasMore ? currentPage + 1 : currentPage,
          limit,
          hasMore,
        };
        setHasMoreConversations(hasMore);

        console.log('✅ Konuşmalar yüklendi:', {
          page: currentPage,
          fetched: mappedConversations.length,
          hasMore,
        });

        return mappedConversations.length;
      }

      console.error('❌ Backend\'den konuşmalar yüklenemedi:', response.error);
      return 0;
    } catch (error) {
      console.error('❌ Konuşmalar yüklenirken hata:', error);
      return 0;
    } finally {
      isConversationsLoadingRef.current = false;
      setIsLoadingConversations(false);
    }
  }, [backendApiService]);

  const updateConversationMessages = useCallback((conversationId: string, messages: ChatMessage[]) => {
    if (softDeletedConversationsRef.current.has(conversationId)) {
      console.warn('⚠️ Soft delete edilmiş conversation\'ın mesajları güncellenemez:', conversationId);
      return;
    }

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

  // Cache temizleme - bellek yönetimi için
  const clearMessageCache = useCallback((conversationId?: string) => {
    if (conversationId) {
      messageCacheRef.current.delete(conversationId);
      messagePaginationRef.current.delete(conversationId);
    } else {
      // Tüm cache'i temizle
      messageCacheRef.current.clear();
      messagePaginationRef.current.clear();
    }
  }, []);
  
  // Eski cache'leri temizle (TTL dolmuş)
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      const toDelete: string[] = [];
      
      messageCacheRef.current.forEach((cache, conversationId) => {
        if (now - cache.timestamp > MESSAGE_CACHE_TTL) {
          toDelete.push(conversationId);
        }
      });
      
      toDelete.forEach(id => {
        messageCacheRef.current.delete(id);
      });
    }, 60000); // Her 1 dakikada bir kontrol et
    
    return () => clearInterval(cleanupInterval);
  }, []);

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
    loadMoreMessages,
    hasMoreConversations,
    isLoadingConversations,
    loadingMessagesConversationIds,
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


