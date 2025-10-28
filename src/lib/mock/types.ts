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
}

export interface ChatConversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
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
