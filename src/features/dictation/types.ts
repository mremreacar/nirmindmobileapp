import { Animated } from 'react-native';

export interface DictationState {
  isListening: boolean;
  isDictating: boolean;
  isProcessing: boolean; // Yeni: deşifre durumu
  currentMessage: string;
}

export interface DictationCallbacks {
  onTextUpdate: (text: string, replacePrevious?: boolean) => void;
  onError: (error: string) => void;
  onStart?: () => void;
  onStop?: () => void;
}

export interface DictationConfig {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
}

export interface WaveAnimation {
  animations: Animated.Value[];
  startAnimations: () => void;
  stopAnimations: () => void;
  resetAnimations: () => void;
}
