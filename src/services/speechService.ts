import { Platform, Alert, AppState } from 'react-native';

// React Native Voice - Cihazın kendi speech recognition'ını kullan (speech-to-text)
let Voice: any = null;
let voiceModuleLoadingAttempted = false;

const loadVoiceModule = (): any => {
  if (Voice !== null) {
    return Voice;
  }
  
  if (voiceModuleLoadingAttempted) {
    console.log('ℹ️ React Native Voice modülü daha önce yüklenmeye çalışıldı ama başarısız oldu');
    return null;
  }
  
  voiceModuleLoadingAttempted = true;
  
  try {
    // Try to require @react-native-voice/voice module
    console.log('🔍 React Native Voice modülü yüklenmeye çalışılıyor...');
    const voiceModuleRaw = require('@react-native-voice/voice');
    
    if (voiceModuleRaw) {
      console.log('📦 Voice modülü require edildi, metodları kontrol ediliyor...');
      console.log('📦 Voice modülü raw keys:', Object.keys(voiceModuleRaw));
      
      // Default export kontrolü - React Native Voice modülü default export olarak geliyor
      // Modül yapısı: export default new RCTVoice();
      // Bu yüzden voiceModuleRaw.default kullanmalıyız
      let voiceModule: any = null;
      
      // Önce default export'u kontrol et (modül default export olarak geliyor)
      if (voiceModuleRaw.default) {
        console.log('📦 Voice modülü default export var, default kullanılıyor');
        voiceModule = voiceModuleRaw.default;
        console.log('📦 Default export keys:', Object.keys(voiceModule || {}));
        console.log('📦 Default export tipi:', typeof voiceModule);
      } else {
        // Default export yoksa direkt raw'ı kullan
        console.log('📦 Voice modülü default export yok, raw kullanılıyor');
        voiceModule = voiceModuleRaw;
      }
      
      // Voice modülünün gerekli metodlarını kontrol et
      // onSpeechResults, onSpeechError gibi property'ler başlangıçta undefined olabilir, 
      // bu yüzden sadece start ve stop metodlarını kontrol ediyoruz
      if (voiceModule && typeof voiceModule.start === 'function' && 
          typeof voiceModule.stop === 'function') {
        Voice = voiceModule;
        console.log('✅ React Native Voice modülü başarıyla yüklendi ve hazır');
        console.log('✅ Voice modülü metodları:', {
          hasStart: typeof voiceModule.start === 'function',
          hasStop: typeof voiceModule.stop === 'function',
          hasIsAvailable: typeof voiceModule.isAvailable === 'function',
          hasDestroy: typeof voiceModule.destroy === 'function',
          hasCancel: typeof voiceModule.cancel === 'function',
          allKeys: Object.keys(voiceModule).slice(0, 20) // İlk 20 key'i göster
        });
        return Voice;
      } else {
        // Detaylı debug bilgisi
        console.warn('⚠️ Voice modülü yüklendi ama gerekli metodlar eksik');
        console.warn('⚠️ Debug bilgileri:', {
          voiceModuleExists: !!voiceModule,
          hasStart: voiceModule ? typeof voiceModule.start : 'N/A',
          hasStop: voiceModule ? typeof voiceModule.stop : 'N/A',
          moduleKeys: voiceModule ? Object.keys(voiceModule).slice(0, 20) : [],
          moduleType: typeof voiceModule,
          defaultExists: !!voiceModuleRaw.default,
          defaultType: typeof voiceModuleRaw.default,
          rawKeys: Object.keys(voiceModuleRaw).slice(0, 10)
        });
        
        // Eğer default export varsa ama metodlar yoksa, default'un prototype'ını kontrol et
        if (voiceModuleRaw.default && voiceModule === voiceModuleRaw.default) {
          const defaultModule = voiceModuleRaw.default;
          console.log('🔍 Default modül prototype kontrolü...');
          if (defaultModule.__proto__) {
            console.log('📦 Default modül prototype keys:', Object.keys(defaultModule.__proto__).slice(0, 10));
          }
        }
      }
    } else {
      console.warn('⚠️ Voice modülü require edildi ama null/undefined döndü');
    }
  } catch (error: any) {
    // Module not available
    const errorMessage = error?.message || 'Unknown error';
    console.error('❌ React Native Voice modülü yüklenemedi:', errorMessage);
    console.error('❌ Hata detayları:', {
      message: errorMessage,
      code: error?.code,
      name: error?.name,
      stack: error?.stack?.substring(0, 200)
    });
    
    // Expo Go'da çalışmıyor olabilir
    if (errorMessage.includes('Cannot find native module') || 
        errorMessage.includes('Native module') ||
        errorMessage.includes('expo-dev-client')) {
      console.warn('⚠️ React Native Voice native modül gerektirir. Development build gerekli: npx expo run:ios veya npx expo run:android');
    }
  }
  
  return null;
};

// Expo Speech - Text-to-speech için (speak fonksiyonları)
let Speech: any = null;
let speechModuleLoadingAttempted = false;

const loadSpeechModule = (): any => {
  if (Speech !== null) {
    return Speech;
  }
  
  if (speechModuleLoadingAttempted) {
    return null;
  }
  
  speechModuleLoadingAttempted = true;
  
  try {
    // Try to require expo-speech module
    const expoSpeechModule = require('expo-speech');
    if (expoSpeechModule && typeof expoSpeechModule.speak === 'function') {
      Speech = expoSpeechModule;
      console.log('✅ Expo Speech modülü başarıyla yüklendi');
      return Speech;
    }
  } catch (error: any) {
    // Module not available (e.g., in Expo Go)
    const errorMessage = error?.message || 'Unknown error';
    if (errorMessage.includes('Cannot find native module') || errorMessage.includes('ExpoSpeech')) {
      console.log('ℹ️ Expo Speech modülü mevcut değil (Development build gerekli: npx expo run:ios veya npx expo run:android)');
    } else {
      console.warn('⚠️ Expo Speech modülü yüklenemedi:', errorMessage);
    }
  }
  
  return null;
};

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
  private appStateSubscription: any = null;
  private isStarting = false; // Mutex: startListening işlemi devam ediyor mu?
  private lastFinalResult: string = ''; // Son final result'ı takip et (interim result'ları filtrelemek için)

  async startListening(
    onResult: (result: SpeechRecognitionResult) => void,
    onError?: (error: string) => void,
    options: SpeechRecognitionOptions = {}
  ): Promise<boolean> {
    // Mutex kontrolü: Eğer zaten başlatma işlemi devam ediyorsa, bekle
    if (this.isStarting) {
      console.log('⚠️ Speech recognition başlatma işlemi zaten devam ediyor, bekleniyor...');
      // Maksimum 2 saniye bekle
      let waitCount = 0;
      while (this.isStarting && waitCount < 20) {
        await new Promise(resolve => setTimeout(resolve, 100));
        waitCount++;
      }
      if (this.isStarting) {
        console.error('❌ Speech recognition başlatma işlemi timeout oldu');
        onError?.('Dikte başlatılamadı. Lütfen tekrar deneyin.');
        return false;
      }
    }

    // Mutex'i set et
    this.isStarting = true;

    try {
      // Eğer zaten listening ise, önce durdur ve temizle
      if (this.isListening) {
        console.log('⚠️ Speech recognition zaten aktif, önce durduruluyor...');
        await this.stopListening();
        // Kısa bir bekleme - temizleme işleminin tamamlanması için
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      // Callback'leri sakla
      this.onResultCallback = onResult;
      this.onErrorCallback = onError || null;

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
              
              // Speech recognition başlat (sadece Voice)
              const voiceModule = loadVoiceModule();
              if (voiceModule) {
                this.startVoiceRecognition(options).then((result) => {
                  this.isStarting = false; // Mutex'i serbest bırak
                  resolve(result);
                }).catch((error) => {
                  this.isStarting = false; // Mutex'i serbest bırak
                  resolve(false);
                });
              } else {
                const errorMsg = 'React Native Voice modülü mevcut değil. Development build gerekli: npx expo run:ios veya npx expo run:android';
                console.error('❌ Voice modülü bulunamadı:', errorMsg);
                this.isStarting = false; // Mutex'i serbest bırak
                this.isListening = false;
                onError?.(errorMsg);
                resolve(false);
              }
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
            this.isStarting = false; // Mutex'i serbest bırak
            onError?.(errorMsg);
            resolve(false);
          }, 5000);
        });
      }

      this.isListening = true;
      console.log('Starting speech recognition...');

      // React Native Voice kullan (cihazın kendi speech recognition'ı)
      const voiceModule = loadVoiceModule();
      if (voiceModule) {
        console.log('✅ React Native Voice kullanılıyor (cihazın kendi speech recognition\'ı)');
        const result = await this.startVoiceRecognition(options);
        this.isStarting = false; // Mutex'i serbest bırak
        return result;
      } else {
        // Voice modülü yoksa hata döndür
        const errorMsg = 'React Native Voice modülü mevcut değil. Development build gerekli: npx expo run:ios veya npx expo run:android';
        console.error('❌ Voice modülü bulunamadı:', errorMsg);
        this.isListening = false;
        this.isStarting = false; // Mutex'i serbest bırak
        onError?.(errorMsg);
        return false;
      }
    } catch (error) {
      console.error('Speech recognition start error:', error);
      this.isListening = false;
      this.isStarting = false; // Mutex'i serbest bırak
      onError?.(error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  }

  // React Native Voice ile cihazın kendi speech recognition'ını kullan
  private async startVoiceRecognition(options: SpeechRecognitionOptions = {}): Promise<boolean> {
    try {
      const voiceModule = loadVoiceModule();
      if (!voiceModule) {
        const errorMsg = 'React Native Voice modülü mevcut değil. Development build gerekli: npx expo run:ios veya npx expo run:android';
        console.error('❌ Voice modülü bulunamadı:', errorMsg);
        this.onErrorCallback?.(errorMsg);
        this.isListening = false;
        this.isStarting = false; // Mutex'i serbest bırak
        return false;
      }

      console.log('🎤 React Native Voice ile speech recognition başlatılıyor...');

      // Önce mevcut listener'ları temizle
      try {
        if (typeof voiceModule.removeAllListeners === 'function') {
          voiceModule.removeAllListeners();
        }
      } catch (cleanupError) {
        console.warn('⚠️ Listener temizleme hatası (devam ediliyor):', cleanupError);
      }

      // Voice event listener'ları
      voiceModule.onSpeechStart = () => {
        // Eğer listening durdurulmuşsa, event'leri ignore et
        if (!this.isListening) {
          console.log('⚠️ onSpeechStart event geldi ama listening durdurulmuş, ignore ediliyor');
          return;
        }
        console.log('✅ Speech recognition başladı (Voice)');
      };

      voiceModule.onSpeechEnd = () => {
        // Eğer listening durdurulmuşsa, event'leri ignore et
        if (!this.isListening) {
          console.log('⚠️ onSpeechEnd event geldi ama listening durdurulmuş, ignore ediliyor');
          return;
        }
        console.log('✅ Speech recognition bitti (Voice)');
      };

      voiceModule.onSpeechResults = (e: any) => {
        // Eğer listening durdurulmuşsa, event'leri ignore et
        if (!this.isListening) {
          console.log('⚠️ onSpeechResults event geldi ama listening durdurulmuş, ignore ediliyor');
          return;
        }
        
        console.log('📝 Voice onSpeechResults event:', e);
        if (e.value && e.value.length > 0) {
          const text = e.value[0];
          console.log('📝 Speech recognition sonucu:', text);
          
          if (this.onResultCallback && text && text.trim()) {
            // Final result için callback çağır
            // React Native Voice'da onSpeechResults genellikle final result'tur
            const trimmedText = text.trim();
            
            // Son final result ile aynı mı kontrol et (tekrar eklenmesini önle)
            if (trimmedText === this.lastFinalResult) {
              console.log('⚠️ Aynı final result tekrar geldi, ignore ediliyor:', trimmedText);
              return;
            }
            
            // Son final result'ı güncelle
            this.lastFinalResult = trimmedText;
            
            console.log('✅ Final result callback çağrılıyor:', trimmedText);
            
            // Dikte ile yazılan metni terminale yazdır
            console.log('═══════════════════════════════════════════════════════');
            console.log('🎤 DİKTE İLE YAZILAN METİN:', trimmedText);
            console.log('═══════════════════════════════════════════════════════');
            
            this.onResultCallback({
              text: trimmedText,
              confidence: 0.9,
              isFinal: true
            });
          }
        }
      };

      voiceModule.onSpeechPartialResults = (e: any) => {
        // Eğer listening durdurulmuşsa, event'leri ignore et
        if (!this.isListening) {
          console.log('⚠️ onSpeechPartialResults event geldi ama listening durdurulmuş, ignore ediliyor');
          return;
        }
        
        if (e.value && e.value.length > 0 && options.interimResults) {
          const text = e.value[0];
          const trimmedText = text.trim();
          
          // Son final result ile aynı interim result'ı ignore et
          // (Final result'tan hemen sonra gelen aynı metinli interim result gereksiz)
          if (trimmedText === this.lastFinalResult) {
            console.log('⚠️ Interim result son final result ile aynı, ignore ediliyor:', trimmedText);
            return;
          }
          
          console.log('📝 Speech recognition ara sonuç (interim):', trimmedText);
          
          if (this.onResultCallback && trimmedText) {
            // Ara sonuçları da terminale yazdır (daha hafif format)
            console.log('🎤 [ARA SONUÇ]', trimmedText);
            
            this.onResultCallback({
              text: trimmedText,
              confidence: 0.7,
              isFinal: false
            });
          }
        }
      };

      voiceModule.onSpeechError = (e: any) => {
        // Eğer listening durdurulmuşsa, error event'lerini ignore et (normal durdurma hatası olabilir)
        if (!this.isListening) {
          console.log('⚠️ onSpeechError event geldi ama listening durdurulmuş, ignore ediliyor:', e.error?.message || e.error?.code);
          return;
        }
        
        console.error('❌ Speech recognition hatası (Voice):', e);
        const errorMessage = e.error?.message || e.error?.code || 'Speech recognition hatası';
        console.error('❌ Voice error detayları:', {
          error: e.error,
          message: errorMessage
        });
        this.onErrorCallback?.(errorMessage);
      };

      // Speech recognition başlat
      const language = options.language || 'tr-TR';
      console.log('🎤 Voice.start() çağrılıyor, dil:', language);
      try {
        await voiceModule.start(language);
        console.log('✅ React Native Voice başarıyla başlatıldı:', language);
        return true;
      } catch (startError: any) {
        console.error('❌ Voice start hatası:', startError);
        console.error('❌ Start error detayları:', {
          message: startError?.message,
          code: startError?.code,
          name: startError?.name
        });
        
        // Voice modülünü durdur (eğer başlatılmışsa)
        try {
          if (typeof voiceModule.stop === 'function') {
            await voiceModule.stop();
          }
          if (typeof voiceModule.cancel === 'function') {
            await voiceModule.cancel();
          }
          // Listener'ları temizle
          if (typeof voiceModule.removeAllListeners === 'function') {
            voiceModule.removeAllListeners();
          } else {
            voiceModule.onSpeechStart = undefined;
            voiceModule.onSpeechEnd = undefined;
            voiceModule.onSpeechResults = undefined;
            voiceModule.onSpeechPartialResults = undefined;
            voiceModule.onSpeechError = undefined;
          }
          console.log('✅ Voice modülü temizlendi');
        } catch (cleanupError) {
          console.warn('⚠️ Voice temizleme hatası (devam ediliyor):', cleanupError);
        }
        
        const errorMsg = startError?.message || 'Speech recognition başlatılamadı';
        this.onErrorCallback?.(errorMsg);
        this.isListening = false;
        this.isStarting = false; // Mutex'i serbest bırak
        return false;
      }

    } catch (error) {
      console.error('❌ Voice recognition start error:', error);
      this.isListening = false;
      this.isStarting = false; // Mutex'i serbest bırak
      this.onErrorCallback?.(error instanceof Error ? error.message : 'Voice recognition failed');
      
      // Voice modülünü temizle
      try {
        const voiceModule = loadVoiceModule();
        if (voiceModule) {
          if (typeof voiceModule.stop === 'function') {
            await voiceModule.stop();
          }
          if (typeof voiceModule.cancel === 'function') {
            await voiceModule.cancel();
          }
          if (typeof voiceModule.removeAllListeners === 'function') {
            voiceModule.removeAllListeners();
          } else {
            voiceModule.onSpeechStart = undefined;
            voiceModule.onSpeechEnd = undefined;
            voiceModule.onSpeechResults = undefined;
            voiceModule.onSpeechPartialResults = undefined;
            voiceModule.onSpeechError = undefined;
          }
        }
      } catch (cleanupError) {
        console.warn('⚠️ Voice temizleme hatası:', cleanupError);
      }
      
      return false;
    }
  }

  async stopListening(): Promise<void> {
    console.log('🛑 stopListening çağrıldı, isListening:', this.isListening);
    
    // Önce state'i false yap (diğer işlemler için) - her zaman yap
    const wasListening = this.isListening;
    this.isListening = false;
    this.isStarting = false; // Mutex'i serbest bırak (eğer başlatma işlemi devam ediyorsa)
    console.log('✅ isListening false yapıldı (wasListening:', wasListening, ')');
    
    // Eğer zaten listening değilse, sadece temizlik yap
    if (!wasListening) {
      console.log('ℹ️ Zaten durdurulmuş, sadece temizlik yapılıyor');
      // Yine de temizlik yap
    }
    
    // AppState subscription'ı temizle
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
    
    if (this.recognitionTimeout) {
      clearTimeout(this.recognitionTimeout);
      this.recognitionTimeout = null;
    }

    // React Native Voice'u durdur
    try {
      const voiceModule = loadVoiceModule();
      if (voiceModule) {
        try {
          console.log('🛑 React Native Voice durduruluyor...');
          // Önce cancel dene (eğer varsa) - bu daha agresif bir durdurma
          if (typeof voiceModule.cancel === 'function') {
            try {
              await voiceModule.cancel();
              console.log('✅ Voice cancel edildi');
            } catch (cancelError) {
              console.warn('⚠️ Voice cancel hatası (devam ediliyor):', cancelError);
            }
          }
          
          // Sonra stop dene
          if (typeof voiceModule.stop === 'function') {
            try {
              await voiceModule.stop();
              console.log('✅ Voice stop edildi');
            } catch (stopError) {
              console.warn('⚠️ Voice stop hatası (devam ediliyor):', stopError);
            }
          }
          
          // removeAllListeners metodu varsa çağır
          if (typeof voiceModule.removeAllListeners === 'function') {
            voiceModule.removeAllListeners();
            console.log('✅ Voice listeners temizlendi (removeAllListeners)');
          } else {
            // removeAllListeners yoksa, event listener'ları manuel temizle
            voiceModule.onSpeechStart = undefined;
            voiceModule.onSpeechEnd = undefined;
            voiceModule.onSpeechResults = undefined;
            voiceModule.onSpeechPartialResults = undefined;
            voiceModule.onSpeechError = undefined;
            console.log('✅ Voice listeners manuel temizlendi');
          }
          console.log('✅ React Native Voice tamamen durduruldu');
        } catch (stopError) {
          console.warn('⚠️ Voice stop hatası (devam ediliyor):', stopError);
          // Hata olsa bile listener'ları temizle
          try {
            if (typeof voiceModule.removeAllListeners === 'function') {
              voiceModule.removeAllListeners();
            } else {
              voiceModule.onSpeechStart = undefined;
              voiceModule.onSpeechEnd = undefined;
              voiceModule.onSpeechResults = undefined;
              voiceModule.onSpeechPartialResults = undefined;
              voiceModule.onSpeechError = undefined;
            }
          } catch (cleanupError) {
            console.warn('⚠️ Listener temizleme hatası:', cleanupError);
          }
        }
      }
    } catch (voiceError) {
      console.warn('⚠️ Voice durdurma hatası (devam ediliyor):', voiceError);
    }
    
    // Callback'leri temizle
    this.onResultCallback = null;
    this.onErrorCallback = null;
    
    // State'leri kesinlikle temizle
    this.isListening = false;
    this.isStarting = false; // Mutex'i serbest bırak
    this.lastFinalResult = ''; // Son final result'ı temizle
    console.log('✅ stopListening tamamlandı, tüm state temizlendi');
  }

  isCurrentlyListening(): boolean {
    return this.isListening;
  }

  // Transkripsiyon sonucunun geçerli olup olmadığını kontrol et (Voice için de kullanılabilir)
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

  async speak(text: string, options?: { language?: string; rate?: number }): Promise<void> {
    const speechModule = loadSpeechModule();
    if (!speechModule) {
      console.warn('⚠️ Expo Speech modülü mevcut değil (Development build gerekli)');
      return;
    }
    try {
      await speechModule.speak(text, {
        language: options?.language || 'tr-TR',
        rate: options?.rate || 0.5,
      });
    } catch (error) {
      console.error('Speech synthesis error:', error);
      throw error;
    }
  }

  async stopSpeaking(): Promise<void> {
    const speechModule = loadSpeechModule();
    if (!speechModule) {
      console.warn('⚠️ Expo Speech modülü mevcut değil (Development build gerekli)');
      return;
    }
    try {
      await speechModule.stop();
    } catch (error) {
      console.error('Stop speaking error:', error);
    }
  }

  async isSpeaking(): Promise<boolean> {
    const speechModule = loadSpeechModule();
    if (!speechModule) {
      console.warn('⚠️ Expo Speech modülü mevcut değil (Development build gerekli)');
      return false;
    }
    try {
      return speechModule.isSpeakingAsync();
    } catch (error) {
      console.error('Is speaking check error:', error);
      return false;
    }
  }
}

export const speechService = new SpeechService();