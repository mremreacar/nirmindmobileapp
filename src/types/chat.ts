import type { Animated } from 'react-native';

export interface ChatScreenProps {
  translateX: Animated.Value;
  onClose: () => void;
  onOpenChatHistory?: () => void;
  initialMessage?: string;
  initialImages?: string[];
  initialFiles?: ChatSelectedFile[];
  conversationId?: string;
  initialArastirmaModu?: boolean;
  initialUploadModalOpen?: boolean;
  initialPromptType?: string;
}

export interface ChatSelectedFile {
  name: string;
  uri: string;
  size?: number;
  mimeType?: string;
}

export interface ChatQuickSuggestion {
  question: string;
  promptType: string;
}

