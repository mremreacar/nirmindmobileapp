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
        
        // Önceki subscription varsa temizle
        if (this.appStateSubscription) {
          this.appStateSubscription.remove();
          this.appStateSubscription = null;
        }
        
        // AppState değişikliğini dinle ve aktif olduğunda başlat
        return new Promise((resolve) => {
          let timeoutId: NodeJS.Timeout | null = null;
          
          const handleAppStateChange = (nextAppState: string) => {
            if (nextAppState === 'active') {
              console.log('✅ Uygulama aktif oldu, audio session başlatılıyor...');
              
              // Timeout'u temizle
              if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
              }
              
              // Subscription'ı temizle
              if (this.appStateSubscription) {
                this.appStateSubscription.remove();
                this.appStateSubscription = null;
              }
              
              // Recording başlat
              this.startWhisperRecognition(options).then(resolve);
            }
          };
          
          this.appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
          
          // 5 saniye sonra timeout
          timeoutId = setTimeout(() => {
            if (this.appStateSubscription) {
              this.appStateSubscription.remove();
              this.appStateSubscription = null;
            }
            const errorMsg = 'Uygulama aktif olmadığı için audio session başlatılamadı. Lütfen uygulamayı ön plana getirin.';
            console.error('❌ AppState timeout:', errorMsg);
            this.isListening = false; // State'i temizle
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
      
      // Eğer zaten bir recording varsa, önce temizle
      if (this.recording) {
        console.log('⚠️ Mevcut recording temizleniyor...');
        try {
          const status = await this.recording.getStatusAsync();
          if (status.isRecording) {
            await this.recording.stopAndUnloadAsync();
          } else if (status.canRecord) {
            // Prepare edilmiş ama henüz başlatılmamış
            await this.recording.unloadAsync();
          }
        } catch (cleanupError) {
          console.warn('⚠️ Recording temizleme hatası (devam ediliyor):', cleanupError);
          // Temizleme başarısız olsa bile null yap
          try {
            await this.recording.unloadAsync();
          } catch (unloadError) {
            console.warn('⚠️ Recording zorla unload ediliyor:', unloadError);
          }
        }
        this.recording = null;
      }
      
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
      // Hata durumunda recording'i temizle
      if (this.recording) {
        try {
          const status = await this.recording.getStatusAsync();
          if (status.isRecording || status.canRecord) {
            try {
              await this.recording.stopAndUnloadAsync();
            } catch (stopError) {
              await this.recording.unloadAsync();
            }
          }
        } catch (cleanupError) {
          console.warn('⚠️ Recording temizleme hatası:', cleanupError);
        }
        this.recording = null;
      }
      this.isListening = false; // State'i temizle
      this.onErrorCallback?.(error instanceof Error ? error.message : 'Whisper recognition failed');
      return false;
    }
  }

  async stopListening(): Promise<void> {
    // Eğer zaten listening değilse ve recording yoksa, işlem yapma
    if (!this.isListening && !this.recording) {
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
        
        // Recording durumunu kontrol et
        try {
          const status = await this.recording.getStatusAsync();
          
          if (status.isRecording) {
            // Recording aktif, önce URI'yi al (stopAndUnloadAsync öncesi)
            let uri: string | null = null;
            let durationMillis: number | null = null;
            
            try {
              uri = this.recording.getURI();
              // Kayıt süresini kontrol et (durationMillis milisaniye cinsinden)
              durationMillis = status.durationMillis || null;
            } catch (uriError) {
              console.warn('⚠️ Recording URI alınamadı (devam ediliyor):', uriError);
            }
            
            // Sonra durdur ve unload et
            await this.recording.stopAndUnloadAsync();
            
            // Minimum kayıt süresi kontrolü (1 saniye = 1000ms)
            const MIN_RECORDING_DURATION_MS = 1000;
            if (durationMillis !== null && durationMillis < MIN_RECORDING_DURATION_MS) {
              console.log(`⚠️ Kayıt süresi çok kısa (${durationMillis}ms), transcription yapılmıyor`);
              return;
            }
            
            // URI varsa ses dosyasını işle
            if (uri && this.onResultCallback) {
              console.log('Recording stopped, URI:', uri, 'Duration:', durationMillis, 'ms');
              // OpenAI Whisper API ile ses dosyasını işle
              await this.processAudioWithWhisper(uri);
            } else if (!uri) {
              console.warn('⚠️ Recording URI alınamadı, transcription yapılamadı');
              this.onErrorCallback?.('Recording URI could not be retrieved');
            }
          } else if (status.canRecord) {
            // Prepare edilmiş ama henüz başlatılmamış, sadece unload et
            console.log('Recording prepare edilmiş ama başlatılmamış, unload ediliyor...');
            await this.recording.unloadAsync();
          }
        } catch (statusError) {
          console.warn('⚠️ Recording status kontrolü hatası, unload denenecek:', statusError);
          // Status kontrolü başarısız olduysa, doğrudan unload etmeyi dene
          try {
            await this.recording.unloadAsync();
          } catch (unloadError) {
            console.error('⚠️ Recording unload hatası:', unloadError);
          }
        }
        
        this.recording = null;
      }
      console.log('Whisper recognition stopped');
    } catch (error) {
      console.error('Error stopping whisper recognition:', error);
      // Hata durumunda recording'i null yap
      this.recording = null;
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
        const transcribedText = response.data.text?.trim() || '';
        
        console.log('✅ Audio transcription başarılı:', {
          text: transcribedText.substring(0, 50),
          textLength: transcribedText.length
        });

        // Transkripsiyon sonucunu kontrol et
        if (!this.isValidTranscription(transcribedText)) {
          console.log('⚠️ Transkripsiyon sonucu geçersiz veya çok kısa, göz ardı ediliyor:', transcribedText);
          
          // Spam pattern'e yakalanan metinler için sessizce göz ardı et
          const isSpamPattern = this.isSpamPattern(transcribedText);
          if (isSpamPattern) {
            // Spam pattern'ler için sessizce göz ardı et, kullanıcıya bilgi verme
            console.log('⚠️ Spam pattern tespit edildi, sessizce göz ardı ediliyor:', transcribedText);
            return;
          }
          
          // "Altyazı" içeren metinler spam kabul edilir, sessizce göz ardı et
          if (/altyazı/i.test(transcribedText.trim())) {
            console.log('⚠️ "Altyazı" içeren metin spam olarak kabul edildi, sessizce göz ardı ediliyor:', transcribedText);
            return;
          }
          
          // Diğer geçersiz transkripsiyonlar için kullanıcıya bilgilendirme mesajı göster
          this.onErrorCallback?.('Sesinizi net alamadık. Lütfen daha net konuşun.');
          return;
        }

        if (this.onResultCallback && transcribedText) {
          this.onResultCallback({
            text: transcribedText,
            confidence: 0.95,
            isFinal: true
          });
        }
      } else {
        // Transcription başarısız oldu
        let errorMessage = response.error || response.message || 'Desifre başarısız';
        
        // Permission denied gibi teknik hataları kullanıcı dostu mesajlara çevir
        if (errorMessage.includes('EACCES') || errorMessage.includes('permission denied')) {
          errorMessage = 'Sunucu izin hatası. Lütfen daha sonra tekrar deneyin.';
        } else if (errorMessage.includes('Failed to transcribe audio')) {
          errorMessage = 'Ses dosyası işlenirken bir hata oluştu. Lütfen tekrar deneyin.';
        }
        
        console.error('❌ Audio transcription başarısız:', errorMessage);
        this.onErrorCallback?.(errorMessage);
      }

    } catch (error) {
      console.error('❌ Audio transcription error:', error);
      let errorMessage = 'Desifre başarısız';
      
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Permission denied gibi teknik hataları kullanıcı dostu mesajlara çevir
        if (errorMessage.includes('EACCES') || errorMessage.includes('permission denied')) {
          errorMessage = 'Sunucu izin hatası. Lütfen daha sonra tekrar deneyin.';
        } else if (errorMessage.includes('Failed to transcribe audio')) {
          errorMessage = 'Ses dosyası işlenirken bir hata oluştu. Lütfen tekrar deneyin.';
        } else if (errorMessage.includes('Network') || errorMessage.includes('fetch')) {
          errorMessage = 'Sunucuya bağlanılamadı. Lütfen internet bağlantınızı kontrol edin.';
        }
      }
      
      this.onErrorCallback?.(errorMessage);
    }
  }

  // Transkripsiyon sonucunun geçerli olup olmadığını kontrol et
  private isValidTranscription(text: string): boolean {
    if (!text || typeof text !== 'string') {
      return false;
    }

    const trimmed = text.trim();
    
    // Çok kısa metinleri (3 karakterden az) geçersiz say
    if (trimmed.length < 3) {
      return false;
    }

    // Sadece noktalama işaretleri veya özel karakterlerden oluşuyorsa geçersiz say
    const onlyPunctuation = /^[^\wçğıöşüÇĞIİÖŞÜ]+$/.test(trimmed);
    if (onlyPunctuation) {
      return false;
    }

    // "M:K", "A:B", "X:Y" gibi sadece harf:harf formatındaki metinleri geçersiz say
    if (/^[A-Za-zÄÖÜäöüÇĞŞçğıöşü]:[A-Za-zÄÖÜäöüÇĞŞçğıöşü]$/.test(trimmed)) {
      console.log('⚠️ Tek harf:harf formatı tespit edildi:', trimmed);
      return false;
    }

    // "M.K.", "A.B.", "X.Y." gibi harf.nokta.harf formatındaki metinleri geçersiz say
    if (/^[A-Za-zÄÖÜäöüÇĞŞçğıöşü]\.[A-Za-zÄÖÜäöüÇĞŞçğıöşü]\.?$/.test(trimmed)) {
      console.log('⚠️ Harf.nokta.harf formatı tespit edildi:', trimmed);
      return false;
    }

    // "Altyazı" ile başlayan metinleri geçersiz say (genelde yanlış transkripsiyon)
    if (/^[Aa]ltyazı/i.test(trimmed)) {
      console.log('⚠️ "Altyazı" ile başlayan metin tespit edildi:', trimmed);
      return false;
    }

    // "Altyazı" içeren kısa metinleri geçersiz say (örn: "Çeviri ve Altyazı M.K.")
    if (/altyazı/i.test(trimmed) && trimmed.length <= 30) {
      console.log('⚠️ "Altyazı" içeren kısa metin tespit edildi:', trimmed);
      return false;
    }

    // "Çeviri ve Altyazı" gibi kalıpları geçersiz say
    if (/çeviri\s+ve\s+altyazı/i.test(trimmed)) {
      console.log('⚠️ "Çeviri ve Altyazı" kalıbı tespit edildi:', trimmed);
      return false;
    }

    // Çok kısa ve anlamsız metinleri kontrol et (örn: "M:K", "A", "B", "OK", "AH")
    if (trimmed.length <= 4 && !/^[çğıöşüÇĞIİÖŞÜa-zığüşöç]{3,}$/i.test(trimmed)) {
      // Türkçe karakterler içermeyen ve çok kısa olan metinleri geçersiz say
      const hasTurkishChars = /[çğıöşüÇĞIİÖŞÜ]/.test(trimmed);
      const isCommonWord = /^(evet|hayır|tamam|ok|ah|eh|oh|mm|hmm|aha)$/i.test(trimmed);
      
      if (!hasTurkishChars && !isCommonWord) {
        console.log('⚠️ Çok kısa ve anlamsız metin tespit edildi:', trimmed);
        return false;
      }
    }

    // Kısa metinleri kontrol et (özellikle "Altyazı X.Y." gibi formatlar için)
    if (trimmed.length <= 20) {
      // "Altyazı" içeren kısa metinleri kontrol et
      if (/altyazı/i.test(trimmed)) {
        console.log('⚠️ "Altyazı" içeren kısa metin tespit edildi:', trimmed);
        return false;
      }
      
      // Nokta içeren ve çok kısa olan metinleri kontrol et (örn: "M.K.", "A.B.")
      if (/[A-Za-z]\.[A-Za-z]\.?/i.test(trimmed) && trimmed.length <= 15) {
        console.log('⚠️ Nokta içeren kısa format tespit edildi:', trimmed);
        return false;
      }
    }

    // "M.K." formatını içeren metinleri kontrol et (uzun metinlerde bile)
    if (/[A-Za-z]\.[A-Za-z]\.?/i.test(trimmed) && trimmed.length <= 30) {
      console.log('⚠️ "M.K." formatı içeren kısa metin tespit edildi:', trimmed);
      return false;
    }

    // Yaygın spam/yanlış transkripsiyon kalıplarını kontrol et
    const spamPatterns = [
      /^kanal(ıma|ına|a)\s+abone\s+ol/i,
      /^yorum\s+yap/i,
      /^like\s+at/i,
      /^beğen/i,
      /^subscribe/i,
      /^follow/i,
      /^like\s+and\s+subscribe/i,
      /^thanks?\s+for\s+watching/i,
      /^please\s+subscribe/i,
      /kanal.*abone.*yorum/i, // "Kanalıma abone olmayı yorum yapmayı unutmayın" gibi
      /abone.*yorum/i, // "abone yorum" içeren metinler
      /unutmayın/i, // "unutmayın" kelimesi genelde spam içerir
      /izlediğiniz\s+için\s+teşekkür/i, // "izlediğiniz için teşekkür ederim" gibi
      /teşekkür\s+ederim/i, // "teşekkür ederim" kalıpları
      /thank\s+you\s+for/i, // "thank you for watching" gibi
      /beğenmeyi\s+unutmayın/i, // "beğenmeyi unutmayın" gibi
      /yorum\s+yapmayı\s+unutmayın/i, // "yorum yapmayı unutmayın" gibi
      /abone\s+olmayı\s+unutmayın/i, // "abone olmayı unutmayın" gibi
      /bir\s+sonraki\s+videoda/i, // "bir sonraki videoda görüşürüz" gibi
      /görüşürüz/i, // "görüşürüz" kelimesi genelde video sonu spam içerir
      /sonraki\s+videoda/i, // "sonraki videoda" kalıpları
      /çeviri\s+ve\s+altyazı/i, // "Çeviri ve Altyazı" gibi
      /altyazı.*[A-Za-z]\.[A-Za-z]/i, // "Altyazı M.K." gibi
    ];

    for (const pattern of spamPatterns) {
      if (pattern.test(trimmed)) {
        console.log('⚠️ Spam pattern tespit edildi:', trimmed);
        return false;
      }
    }

    // Geçerli transkripsiyon
    return true;
  }

  // Spam pattern kontrolü (ayrı bir fonksiyon olarak)
  private isSpamPattern(text: string): boolean {
    if (!text || typeof text !== 'string') {
      return false;
    }

    const trimmed = text.trim();
    
    const spamPatterns = [
      /^kanal(ıma|ına|a)\s+abone\s+ol/i,
      /^yorum\s+yap/i,
      /^like\s+at/i,
      /^beğen/i,
      /^subscribe/i,
      /^follow/i,
      /^like\s+and\s+subscribe/i,
      /^thanks?\s+for\s+watching/i,
      /^please\s+subscribe/i,
      /kanal.*abone.*yorum/i,
      /abone.*yorum/i,
      /unutmayın/i,
      /izlediğiniz\s+için\s+teşekkür/i,
      /teşekkür\s+ederim/i,
      /thank\s+you\s+for/i,
      /beğenmeyi\s+unutmayın/i,
      /yorum\s+yapmayı\s+unutmayın/i,
      /abone\s+olmayı\s+unutmayın/i,
      /bir\s+sonraki\s+videoda/i,
      /görüşürüz/i,
      /sonraki\s+videoda/i,
      /çeviri\s+ve\s+altyazı/i,
      /altyazı.*[A-Za-z]\.[A-Za-z]/i, // "Altyazı M.K." gibi
      /^altyazı/i, // "Altyazı" ile başlayan metinler
      /altyazı/i, // "Altyazı" içeren tüm metinler (spam kabul edilir)
    ];

    for (const pattern of spamPatterns) {
      if (pattern.test(trimmed)) {
        return true;
      }
    }

    return false;
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