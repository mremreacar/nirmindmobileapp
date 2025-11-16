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

