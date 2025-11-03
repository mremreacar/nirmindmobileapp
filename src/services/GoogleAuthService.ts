import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import BackendApiService from './BackendApiService';
import { Platform } from 'react-native';

class GoogleAuthService {
  private static instance: GoogleAuthService;
  private initialized: boolean = false;

  private constructor() {}

  static getInstance(): GoogleAuthService {
    if (!GoogleAuthService.instance) {
      GoogleAuthService.instance = new GoogleAuthService();
    }
    return GoogleAuthService.instance;
  }

  async configure() {
    if (this.initialized) {
      return;
    }

    try {
      // iOS Google Sign-In için:
      // - iosClientId: iOS uygulaması için Client ID (bundle ID ile eşleşmeli)
      // - webClientId: Backend token verification için OAuth 2.0 Web Client ID
      // NOT: iOS'ta token iosClientId ile oluşturulur ama backend'de webClientId ile verify edilir
      // Eğer aynı Client ID kullanılıyorsa her ikisi de aynı olabilir
      GoogleSignin.configure({
        webClientId: '331062533957-d7fbhednl9gi1og0u8fqcb281qhj7480.apps.googleusercontent.com', // Backend verification için
        iosClientId: '331062533957-d7fbhednl9gi1og0u8fqcb281qhj7480.apps.googleusercontent.com', // iOS app için
        offlineAccess: true,
        forceCodeForRefreshToken: true,
      });

      this.initialized = true;
      console.log('✅ Google Sign-In configured');
    } catch (error: any) {
      console.error('❌ Google Sign-In configuration error:', error);
      
      // Eğer modül bulunamazsa, development build gerektiğini belirt
      if (error.message?.includes('TurboModuleRegistry') || error.message?.includes('could not be found')) {
        throw new Error('Google Sign-In modülü bulunamadı. Lütfen development build oluşturun: npx expo run:ios veya npx expo run:android');
      }
      
      throw error;
    }
  }

  async signIn() {
    try {
      await this.configure();

      try {
        await GoogleSignin.hasPlayServices();
      } catch (error) {
        console.log('Play Services check (iOS için gerekli değil)');
      }

      const userInfo = await GoogleSignin.signIn();
      console.log('✅ Google Sign-In tamamlandı');

      // Kullanıcı vazgeçtiyse kontrol et
      if (!userInfo || !userInfo.data || !userInfo.data.user) {
        console.log('ℹ️ Google Sign-In iptal edildi');
        return {
          success: false,
          error: 'CANCELLED',
          message: 'Giriş iptal edildi'
        };
      }

      // Type-safe user extraction
      const googleUser = (userInfo as any).data?.user || (userInfo as any).user || userInfo;
      
      if (!googleUser || !googleUser.email) {
        console.log('ℹ️ Google Sign-In iptal edildi veya kullanıcı bilgileri alınamadı');
        return {
          success: false,
          error: 'CANCELLED',
          message: 'Giriş iptal edildi'
        };
      }

      // Token'ları al - signIn sonrası kısa bir bekleme ekle
      await new Promise(resolve => setTimeout(resolve, 100));
      
      let tokens;
      try {
        tokens = await GoogleSignin.getTokens();
        console.log('✅ Google tokens alındı');
      } catch (tokenError: any) {
        console.warn('⚠️ getTokens hatası, tekrar deniyor...', tokenError);
        // Daha uzun bekleme sonrası tekrar dene
        await new Promise(resolve => setTimeout(resolve, 1000));
        try {
          tokens = await GoogleSignin.getTokens();
          console.log('✅ Google tokens ikinci denemede alındı');
        } catch (retryError: any) {
          console.error('❌ getTokens ikinci denemede de başarısız:', retryError);
          // userInfo içinde token var mı kontrol et
          const userInfoWithTokens = userInfo as any;
          if (userInfoWithTokens?.idToken || userInfoWithTokens?.data?.idToken) {
            console.log('⚠️ userInfo içinden token kullanılıyor');
            tokens = {
              idToken: userInfoWithTokens.idToken || userInfoWithTokens.data?.idToken,
              accessToken: userInfoWithTokens.accessToken || userInfoWithTokens.data?.accessToken || ''
            };
          } else {
            throw new Error('Google token bilgileri alınamadı: ' + retryError.message);
          }
        }
      }

      if (!tokens || !tokens.idToken) {
        throw new Error('Google token bilgileri alınamadı');
      }

      const backendApiService = BackendApiService.getInstance();
      const response = await backendApiService.googleAuth({
        idToken: tokens.idToken,
        accessToken: tokens.accessToken,
        email: googleUser.email,
        displayName: googleUser.name || '',
        photoURL: googleUser.photo || '',
      });

      if (response.success) {
        console.log('✅ Backend Google Auth başarılı');
        return {
          success: true,
          isNewUser: response.isNewUser,
          user: response.data?.user,
          token: response.data?.token,
          message: response.message
        };
      } else {
        console.error('❌ Backend Google Auth başarısız:', response.error);
        console.error('❌ Backend hata detayları:', response.details || response);
        return {
          success: false,
          error: response.error || 'Google authentication failed',
          message: response.message || 'Failed to authenticate with backend',
          details: response.details
        };
      }
    } catch (error: any) {
      // Kullanıcı iptal ettiyse sessizce iptal et
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        console.log('ℹ️ Google Sign-In iptal edildi');
        return {
          success: false,
          error: 'CANCELLED',
          message: 'Giriş iptal edildi'
        };
      }
      
      console.error('❌ Google Sign-In error:', error);

      if (error.code === statusCodes.IN_PROGRESS) {
        return {
          success: false,
          error: 'IN_PROGRESS',
          message: 'Giriş işlemi devam ediyor'
        };
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        return {
          success: false,
          error: 'PLAY_SERVICES_NOT_AVAILABLE',
          message: 'Google Play Services kullanılamıyor'
        };
      } else {
        return {
          success: false,
          error: 'UNKNOWN',
          message: error.message || 'Bilinmeyen bir hata oluştu'
        };
      }
    }
  }

  async signOut() {
    try {
      await this.configure();
      await GoogleSignin.signOut();
      console.log('✅ Google Sign-Out başarılı');
      return { success: true };
    } catch (error: any) {
      console.error('❌ Google Sign-Out error:', error);
      return {
        success: false,
        error: error.message || 'Sign out failed'
      };
    }
  }
}

export default GoogleAuthService;
