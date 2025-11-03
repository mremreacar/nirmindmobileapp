import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';
import BackendApiService from './BackendApiService';
import { jwtDecode } from 'jwt-decode';

interface AppleAuthResult {
  success: boolean;
  isNewUser?: boolean;
  user?: any;
  token?: any;
  message?: string;
  error?: string;
}

class AppleAuthService {
  private static instance: AppleAuthService;

  static getInstance(): AppleAuthService {
    if (!AppleAuthService.instance) {
      AppleAuthService.instance = new AppleAuthService();
    }
    return AppleAuthService.instance;
  }

  async isAvailable(): Promise<boolean> {
    try {
      if (Platform.OS !== 'ios') {
        return false;
      }
      
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      console.log('🍎 Apple Sign-In mevcut mu?:', isAvailable);
      return isAvailable;
    } catch (error) {
      console.error('❌ Apple Sign-In availability check error:', error);
      return false;
    }
  }

  async signIn(): Promise<AppleAuthResult> {
    try {
      if (Platform.OS !== 'ios') {
        return {
          success: false,
          error: 'Apple Sign-In sadece iOS\'ta mevcut',
          message: 'Apple ile giriş sadece iOS cihazlarda kullanılabilir'
        };
      }

      const isAvailable = await this.isAvailable();
      if (!isAvailable) {
        return {
          success: false,
          error: 'Apple Sign-In mevcut değil',
          message: 'Bu cihazda Apple Sign-In desteklenmiyor'
        };
      }

      console.log('🍎 Apple Sign-In başlatılıyor...');

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      console.log('✅ Apple Sign-In tamamlandı');

      if (!credential.user || !credential.identityToken) {
        throw new Error('Apple hesabından kullanıcı bilgileri alınamadı');
      }

      // Email kontrolü - Apple ilk kez login'de email vermeyebilir
      // Bu durumda identityToken'dan email'i decode edebiliriz
      let email = credential.email;
      
      if (!email && credential.identityToken) {
        try {
          // Apple identityToken JWT formatında, içinde email olabilir
          const decoded = jwtDecode(credential.identityToken) as any;
          email = decoded.email;
          
          if (email) {
            console.log('✅ Email identityToken\'dan decode edildi:', email);
          } else {
            console.warn('⚠️ IdentityToken\'da email bulunamadı');
          }
        } catch (decodeError) {
          console.error('❌ IdentityToken decode hatası:', decodeError);
        }
      }

      // Email hala yoksa backend'e gönderip backend'in token'ı doğrulamasını sağlayalım
      if (!email) {
        console.warn('⚠️ Email bilgisi yok, backend token doğrulaması ile email alınacak');
        email = ''; // Backend'e email olmadan gönderelim, backend token'dan alacak
      }

      // Name bilgisi - Apple sadece ilk girişte verir
      // Eğer fullName yoksa, kullanıcı daha önce giriş yapmış demektir
      let firstName = '';
      let lastName = '';
      
      if (credential.fullName) {
        firstName = credential.fullName.givenName || '';
        lastName = credential.fullName.familyName || '';
        console.log('✅ Apple fullName alındı:', firstName, lastName);
      } else {
        console.log('⚠️ Apple fullName yok - kullanıcı daha önce giriş yapmış olabilir');
        // İsim bilgisi yoksa backend'e boş gönderelim, backend mevcut bilgiyi koruyacak
      }

      const appleUser = {
        identityToken: credential.identityToken,
        authorizationCode: credential.authorizationCode || '',
        user: {
          email: email || '', // Email yoksa boş string, backend token'dan alacak
          name: (firstName || lastName) ? {
            firstName: firstName || '',
            lastName: lastName || ''
          } : null
        }
      };

      const backendApiService = BackendApiService.getInstance();
      const response = await backendApiService.appleAuth(appleUser);

      if (response.success) {
        console.log('✅ Backend Apple Auth başarılı');
        return {
          success: true,
          isNewUser: response.isNewUser,
          user: response.data?.user,
          token: response.data?.token,
          message: response.message
        };
      } else {
        console.error('❌ Backend Apple Auth başarısız:', response.error);
        console.error('❌ Backend Error Details:', {
          errorName: response.errorName,
          errorCode: response.errorCode,
          errorDetails: response.errorDetails,
          errorStack: response.errorStack
        });
        return {
          success: false,
          error: response.error || 'Failed to authenticate with backend',
          message: response.message || 'Backend ile kimlik doğrulama başarısız',
          errorName: response.errorName,
          errorCode: response.errorCode,
          errorDetails: response.errorDetails,
          errorStack: response.errorStack
        };
      }
    } catch (error: any) {
      // Kullanıcı iptal ettiyse sessizce iptal et
      if (error.code === 'ERR_REQUEST_CANCELED' || error.message?.includes('canceled')) {
        console.log('ℹ️ Apple Sign-In iptal edildi');
        return { 
          success: false,
          error: 'CANCELLED',
          message: 'Apple girişi iptal edildi' 
        };
      }
      
      console.error('❌ Apple Sign-In error:', error);
      
      if (error.code === 'ERR_REQUEST_NOT_HANDLED') {
        return { 
          success: false, 
          message: 'Apple girişi işlenemedi' 
        };
      } else if (error.code === 'ERR_REQUEST_NOT_INTERACTIVE') {
        return { 
          success: false, 
          message: 'Apple girişi etkileşimli değil' 
        };
      } else {
        return { 
          success: false, 
          error: error.message, 
          message: 'Apple ile giriş yapılamadı' 
        };
      }
    }
  }

  async signOut(): Promise<void> {
    try {
      console.log('✅ Apple oturumu kapatıldı (credential temizlendi)');
    } catch (error) {
      console.error('❌ Apple oturumu kapatma hatası:', error);
    }
  }
}

export default AppleAuthService;

