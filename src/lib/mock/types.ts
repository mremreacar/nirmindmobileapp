/**
 * Chat History Types
 * 
 * @description Mock JSON verileri için TypeScript type tanımları
 */

export interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  images?: string[];
  files?: any[];
  isStreaming?: boolean; // Streaming mesajları için flag
}

export interface ChatConversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  isResearchMode?: boolean;
  isSoftDeleted?: boolean;
  createdAt: Date;
  updatedAt: Date;
  totalMessageCount?: number; // Toplam mesaj sayısı (ilk 10'dan fazla varsa)
}

export interface ChatHistoryMetadata {
  totalConversations: number;
  lastUpdated: string;
  categories: string[];
}

export interface MockChatHistory {
  conversations: ChatConversation[];
  metadata: ChatHistoryMetadata;
}
