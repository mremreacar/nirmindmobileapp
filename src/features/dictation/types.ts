import { Animated } from 'react-native';

export interface DictationState {
  isListening: boolean;
  isDictating: boolean;
  isProcessing: boolean; // Yeni: deşifre durumu
  isStopping?: boolean; // CRITICAL: Durdurma animasyonu için
  hasError?: boolean; // CRITICAL: Hata durumu
  errorMessage?: string; // CRITICAL: Hata mesajı
  audioLevel?: number; // CRITICAL: Gerçek zamanlı ses seviyesi (0-1)
  duration?: number; // CRITICAL: Konuşma süresi (saniye)
  currentMessage: string;
}

export interface DictationCallbacks {
  onTextUpdate: (text: string, replacePrevious?: boolean) => void;
  onError: (error: string) => void;
  onStart?: () => void;
  onStop?: () => void;
  onAudioLevelUpdate?: (level: number) => void; // CRITICAL: Ses seviyesi güncellemesi
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
