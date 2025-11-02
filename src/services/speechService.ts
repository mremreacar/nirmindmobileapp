import { Platform, Alert, AppState } from 'react-native';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import { 
  AndroidOutputFormat, 
  AndroidAudioEncoder, 
  IOSOutputFormat, 
  IOSAudioQuality,
  RecordingOptionsPresets 
} from 'expo-av/build/Audio/RecordingConstants';
import BackendApiService from './BackendApiService';
import * as FileSystem from 'expo-file-system/legacy';

export interface SpeechRecognitionResult {
  text: string;
  confidence?: number;
  isFinal: boolean;
}

export interface SpeechRecognitionOptions {
  language?: string;
  maxAlternatives?: number;
  continuous?: boolean;
  interimResults?: boolean;
}

class SpeechService {
  private isListening = false;
  private recognitionTimeout: NodeJS.Timeout | null = null;
  private onResultCallback: ((result: SpeechRecognitionResult) => void) | null = null;
  private onErrorCallback: ((error: string) => void) | null = null;
  private recording: Audio.Recording | null = null;
  private audioPermission: Audio.PermissionResponse | null = null;
  private backendApiService = BackendApiService.getInstance();
  private appStateSubscription: any = null;

  async startListening(
    onResult: (result: SpeechRecognitionResult) => void,
    onError?: (error: string) => void,
    options: SpeechRecognitionOptions = {}
  ): Promise<boolean> {
    try {
      if (this.isListening) {
        console.log('Speech recognition already listening');
        return false;
      }

      // Callback'leri sakla
      this.onResultCallback = onResult;
      this.onErrorCallback = onError || null;

      // Mikrofon izni kontrol et
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        const errorMsg = `Mikrofon izni reddedildi. Status: ${permission.status}. Lütfen ayarlardan mikrofon iznini açın.`;
        console.log('Permission denied:', errorMsg);
        onError?.(errorMsg);
        return false;
      }
      this.audioPermission = permission;

      // Uygulama state kontrolü - iOS'ta background'da audio session başlatılamaz
      const appState = AppState.currentState;
      if (appState !== 'active') {
        console.warn('⚠️ Uygulama background\'da, audio session başlatılamaz. Bekleniyor...', appState);
        
        // AppState değişikliğini dinle ve aktif olduğunda başlat
        return new Promise((resolve) => {
          const handleAppStateChange = (nextAppState: string) => {
            if (nextAppState === 'active') {
              console.log('✅ Uygulama aktif oldu, audio session başlatılıyor...');
              if (this.appStateSubscription) {
                this.appStateSubscription.remove();
                this.appStateSubscription = null;
              }
              this.startWhisperRecognition(options).then(resolve);
            }
          };
          
          this.appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
          
          // 5 saniye sonra timeout
          setTimeout(() => {
            if (this.appStateSubscription) {
              this.appStateSubscription.remove();
              this.appStateSubscription = null;
            }
            const errorMsg = 'Uygulama aktif olmadığı için audio session başlatılamadı. Lütfen uygulamayı ön plana getirin.';
            console.error('❌ AppState timeout:', errorMsg);
            onError?.(errorMsg);
            resolve(false);
          }, 5000);
        });
      }

      this.isListening = true;
      console.log('Starting speech recognition with OpenAI Whisper...');

      // OpenAI Whisper API ile ses kaydı ve speech recognition
      return this.startWhisperRecognition(options);
    } catch (error) {
      console.error('Speech recognition start error:', error);
      this.isListening = false;
      onError?.(error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  }


  private async startWhisperRecognition(options: SpeechRecognitionOptions = {}): Promise<boolean> {
    try {
      console.log('Starting Whisper recognition...');
      
      // Uygulama state kontrolü - iOS'ta background'da audio session başlatılamaz
      const appState = AppState.currentState;
      if (appState !== 'active') {
        console.warn('⚠️ Uygulama background\'da, audio session başlatılamaz:', appState);
        this.onErrorCallback?.('Uygulama aktif değil. Lütfen uygulamayı ön plana getirin.');
        return false;
      }
      
      // Audio session'ı configure et
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // Kısa bir delay - iOS'ta audio session'ın aktif olması için
      await new Promise(resolve => setTimeout(resolve, 100));

      // Recording başlat
      this.recording = new Audio.Recording();
      await this.recording.prepareToRecordAsync(RecordingOptionsPresets.HIGH_QUALITY);
      await this.recording.startAsync();
      console.log('Recording started for Whisper');

      // 10 saniye timeout
      this.recognitionTimeout = setTimeout(async () => {
        await this.stopListening();
      }, 10000);
      
      return true;
    } catch (error) {
      console.error('Whisper recognition start error:', error);
      this.onErrorCallback?.(error instanceof Error ? error.message : 'Whisper recognition failed');
      return false;
    }
  }

  async stopListening(): Promise<void> {
    if (!this.isListening) {
      return;
    }

    this.isListening = false;
    
    // AppState subscription'ı temizle
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
    
    if (this.recognitionTimeout) {
      clearTimeout(this.recognitionTimeout);
      this.recognitionTimeout = null;
    }

    try {
      if (this.recording) {
        console.log('Stopping recording...');
        await this.recording.stopAndUnloadAsync();
        
        // getURI() çağrısından önce recording'in hala geçerli olduğunu kontrol et
        if (this.recording) {
          try {
            const uri = this.recording.getURI();
            console.log('Recording stopped, URI:', uri);
            
            if (uri && this.onResultCallback) {
              // OpenAI Whisper API ile ses dosyasını işle
              await this.processAudioWithWhisper(uri);
            }
          } catch (uriError) {
            console.error('Error getting recording URI:', uriError);
            // URI alınamadıysa hata callback'ini çağır
            this.onErrorCallback?.('Recording URI could not be retrieved');
          }
        }
        
        this.recording = null;
      }
      console.log('Whisper recognition stopped');
    } catch (error) {
      console.error('Error stopping whisper recognition:', error);
    }
    
    // Callback'leri temizle
    this.onResultCallback = null;
    this.onErrorCallback = null;
  }

  isCurrentlyListening(): boolean {
    return this.isListening;
  }

  private async processAudioWithWhisper(audioUri: string): Promise<void> {
    try {
      console.log('🎤 Audio backend üzerinden transcription başlatılıyor...');
      
      // Audio dosyasını base64'e çevir
      const base64Audio = await FileSystem.readAsStringAsync(audioUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      console.log('📤 Audio backend\'e gönderiliyor:', {
        audioUri: audioUri.substring(0, 50),
        base64Length: base64Audio.length
      });

      // Backend'e gönder
      const response = await this.backendApiService.transcribeAudio(
        base64Audio,
        'tr',
        'audio/m4a'
      );

      if (response.success && response.data) {
        console.log('✅ Audio transcription başarılı:', {
          text: response.data.text.substring(0, 50),
          textLength: response.data.text.length
        });

        if (this.onResultCallback && response.data.text) {
          this.onResultCallback({
            text: response.data.text,
            confidence: 0.95,
            isFinal: true
          });
        }
      } else {
        throw new Error(response.error || 'Audio transcription failed');
      }

    } catch (error) {
      console.error('❌ Audio transcription error:', error);
      this.onErrorCallback?.(error instanceof Error ? error.message : 'Audio transcription failed');
    }
  }

  private async audioToBase64(audioUri: string): Promise<string> {
    try {
      const response = await fetch(audioUri);
      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          // Remove data URL prefix
          const base64Data = base64.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Audio to base64 conversion error:', error);
      throw error;
    }
  }

  async speak(text: string, options?: { language?: string; rate?: number }): Promise<void> {
    try {
      await Speech.speak(text, {
        language: options?.language || 'tr-TR',
        rate: options?.rate || 0.5,
      });
    } catch (error) {
      console.error('Speech synthesis error:', error);
      throw error;
    }
  }

  async stopSpeaking(): Promise<void> {
    try {
      await Speech.stop();
    } catch (error) {
      console.error('Stop speaking error:', error);
    }
  }

  async isSpeaking(): Promise<boolean> {
    try {
      return Speech.isSpeakingAsync();
    } catch (error) {
      console.error('Is speaking check error:', error);
      return false;
    }
  }
}

export const speechService = new SpeechService();