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
      GoogleSignin.configure({
        webClientId: '331062533957-4n31v4u4ahh8ebpufkdbpj33q6asad04.apps.googleusercontent.com',
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

      const tokens = await GoogleSignin.getTokens();
      console.log('✅ Google tokens alındı');

      const googleUser = userInfo.data?.user || userInfo.user || userInfo;
      
      if (!googleUser || !googleUser.email) {
        throw new Error('Google hesabından kullanıcı bilgileri alınamadı');
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
        return {
          success: false,
          error: response.error || 'Google authentication failed',
          message: response.message || 'Failed to authenticate with backend'
        };
      }
    } catch (error: any) {
      console.error('❌ Google Sign-In error:', error);

      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        return {
          success: false,
          error: 'CANCELLED',
          message: 'Giriş iptal edildi'
        };
      } else if (error.code === statusCodes.IN_PROGRESS) {
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
