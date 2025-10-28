import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { ChatConversation, ChatMessage } from '../mock/types';
import BackendApiService from '../../services/BackendApiService';

interface ChatContextType {
  conversations: ChatConversation[];
  currentConversation: ChatConversation | null;
  addMessage: (conversationId: string, message: ChatMessage) => void;
  createNewConversation: (title: string, initialMessage?: string) => string;
  selectConversation: (conversationId: string) => void;
  deleteConversation: (conversationId: string) => void;
  updateConversationTitle: (conversationId: string, title: string) => void;
  loadConversations: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

interface ChatProviderProps {
  children: ReactNode;
}

// Konuşma başlığı oluşturma fonksiyonu
const generateConversationTitle = (messageText: string): string => {
  // Mesajı temizle ve kısalt
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

  const addMessage = useCallback(async (conversationId: string, message: ChatMessage) => {
    // Sadece gerçek mesajlar backend'e kaydedilsin
    if (message.text.trim()) {
      try {
        await backendApiService.sendMessage(conversationId, message.text);
        console.log('✅ Mesaj backend\'e kaydedildi:', message.text.substring(0, 30) + '...');
      } catch (error) {
        console.error('❌ Backend mesaj kaydetme hatası:', error);
      }
    }

    // Local state'i güncelle
    setConversations(prev => 
      prev.map(conv => 
        conv.id === conversationId 
          ? {
              ...conv,
              messages: [...conv.messages, message],
              updatedAt: new Date()
            }
          : conv
      )
    );

    // Update current conversation if it's the one being modified
    if (currentConversation?.id === conversationId) {
      setCurrentConversation(prev => 
        prev ? {
          ...prev,
          messages: [...prev.messages, message],
          updatedAt: new Date()
        } : null
      );
    }

    // İlk kullanıcı mesajından sonra başlık güncelle ve backend'e konuşma kaydet
    if (message.isUser && message.text.trim()) {
      const conversation = conversations.find(conv => conv.id === conversationId);
      if (conversation && conversation.title === "Yeni Sohbet") {
        // İlk mesajdan otomatik başlık oluştur
        const newTitle = generateConversationTitle(message.text);
        updateConversationTitle(conversationId, newTitle);
        console.log('📝 Konuşma başlığı güncellendi:', newTitle);
        
        // Eğer konuşma local ise (Backend ID'si yoksa), backend'e kaydet
        if (conversationId.startsWith('conv-')) {
          try {
            console.log('🔄 Local konuşma backend\'e kaydediliyor...');
            const response = await backendApiService.createConversation(newTitle);
            
            if (response.success && response.data) {
              // Konuşma ID'sini backend ID ile güncelle
              setConversations(prev => 
                prev.map(conv => 
                  conv.id === conversationId 
                    ? { ...conv, id: response.data.id }
                    : conv
                )
              );
              
              // Current conversation'ı da güncelle
              if (currentConversation?.id === conversationId) {
                setCurrentConversation(prev => 
                  prev ? { ...prev, id: response.data.id } : null
                );
              }
              
              console.log('✅ Local konuşma backend\'e kaydedildi:', response.data.id);
            }
          } catch (error) {
            console.error('❌ Local konuşma backend\'e kaydetme hatası:', error);
          }
        }
      }
    }
  }, [currentConversation, conversations, updateConversationTitle]);

  const createNewConversation = useCallback(async (title: string, initialMessage?: string): Promise<string> => {
    const now = new Date();
    const newId = `conv-${Date.now()}`;
    
    const newConversation: ChatConversation = {
      id: newId,
      title,
      messages: initialMessage ? [{
        id: `msg-${Date.now()}`,
        text: initialMessage,
        isUser: true,
        timestamp: now
      }] : [],
      createdAt: now,
      updatedAt: now
    };

    // Sadece mesaj varsa backend'e kaydet
    if (initialMessage && initialMessage.trim()) {
      try {
        // Backend'e yeni konuşma oluştur
        const response = await backendApiService.createConversation(title, initialMessage);
        
        if (response.success && response.data) {
          // Backend ID'sini kullan
          newConversation.id = response.data.id;
          console.log('✅ Konuşma backend\'e kaydedildi:', response.data.id);
        }
      } catch (error) {
        console.error('❌ Backend konuşma oluşturma hatası:', error);
        // Hata durumunda local ID kullan (zaten newId)
      }
    } else {
      console.log('📝 Boş konuşma local olarak oluşturuldu (backend\'e kaydedilmedi):', newId);
    }

    // Local state'e ekle (backend'e kaydedilmese bile)
    setConversations(prev => [newConversation, ...prev]);
    setCurrentConversation(newConversation);
    
    return newConversation.id;
  }, []);

  const selectConversation = useCallback((conversationId: string) => {
    setConversations(prev => {
      const conversation = prev.find(conv => conv.id === conversationId);
      if (conversation) {
        setCurrentConversation(conversation);
      }
      return prev; // conversations state'ini değiştirme
    });
  }, []);

  const deleteConversation = useCallback((conversationId: string) => {
    setConversations(prev => prev.filter(conv => conv.id !== conversationId));
    
    // Clear current conversation if it was deleted
    if (currentConversation?.id === conversationId) {
      setCurrentConversation(null);
    }
  }, [currentConversation]);

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

  const loadConversations = useCallback(async () => {
    try {
      console.log('📚 Konuşmalar backend\'den yükleniyor...');
      const response = await backendApiService.getConversations();
      
      if (response.success && response.data?.conversations) {
        console.log('✅ Backend\'den konuşmalar yüklendi:', response.data.conversations.length);
        
        // Backend konuşmalarını ChatConversation formatına çevir
        const convertedConversations: ChatConversation[] = response.data.conversations.map((conv: any) => ({
          id: conv.id,
          title: conv.title,
          messages: conv.messages || [],
          createdAt: new Date(conv.createdAt),
          updatedAt: new Date(conv.updatedAt)
        }));
        
        // Boş konuşmaları filtrele (mesajı olmayan konuşmaları çıkar)
        const conversationsWithMessages = convertedConversations.filter(conv => 
          conv.messages && conv.messages.length > 0
        );
        
        console.log(`📊 Toplam konuşma: ${convertedConversations.length}, Mesajlı konuşma: ${conversationsWithMessages.length}`);
        
        setConversations(conversationsWithMessages);
        console.log('✅ Mesajlı konuşmalar başarıyla yüklendi:', conversationsWithMessages.length);
      } else {
        console.log('📭 Backend\'de konuşma bulunamadı');
      }
    } catch (error) {
      console.error('❌ Konuşmalar yüklenirken hata:', error);
    }
  }, [backendApiService]);

  const value: ChatContextType = {
    conversations,
    currentConversation,
    addMessage,
    createNewConversation,
    selectConversation,
    deleteConversation,
    updateConversationTitle,
    loadConversations,
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
