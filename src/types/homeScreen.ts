export interface HomeScreenProps {
  onOpenChatHistory: () => void;
  selectedConversationId?: string;
  onConversationSelected: () => void;
}

export interface QuickSuggestion {
  question: string;
  promptType: string;
}

