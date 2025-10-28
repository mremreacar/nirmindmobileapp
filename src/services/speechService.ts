import { Platform, Alert } from 'react-native';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import { 
  AndroidOutputFormat, 
  AndroidAudioEncoder, 
  IOSOutputFormat, 
  IOSAudioQuality,
  RecordingOptionsPresets 
} from 'expo-av/build/Audio/RecordingConstants';

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
      
      // Audio session'ı configure et
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

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
      console.log('Processing audio with OpenAI Whisper...');
      
      // OpenAI Whisper API'ye gönder
      const formData = new FormData();
      formData.append('model', 'whisper-1');
      formData.append('file', {
        uri: audioUri,
        type: 'audio/m4a',
        name: 'recording.m4a',
      } as any);
      formData.append('language', 'tr');
      formData.append('response_format', 'json');

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.EXPO_PUBLIC_OPENAI_API_KEY}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API error details:', errorText);
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      console.log('Whisper API result:', result);
      
      if (this.onResultCallback && result.text) {
        this.onResultCallback({
          text: result.text,
          confidence: 0.95,
          isFinal: true
        });
      }
    } catch (error) {
      console.error('Whisper API error:', error);
      this.onErrorCallback?.(error instanceof Error ? error.message : 'Whisper API failed');
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