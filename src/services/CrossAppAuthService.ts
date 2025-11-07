import { Linking, Platform } from 'react-native';

// Gerçek domain üzerinde test ediliyor
const API_BASE_URL = 'https://nircore.io/api';

class CrossAppAuthService {
  private static instance: CrossAppAuthService;
  private readonly NIRPAX_DEEP_LINK = 'nirpax://cross-app-auth';
  private readonly NIRPAX_PACKAGE_NAME = 'com.nireya.nirpax'; // Android package name
  private readonly NIRPAX_BUNDLE_ID = 'com.nireya.nirpax'; // iOS bundle ID
  private readonly BACKEND_LOGIN_URL = `${API_BASE_URL}/nirpax/auth/cross-app-login-page`;
  private readonly WEB_CALLBACK_URL = 'https://nircore.io/api/nirpax/auth/google/callback';
  private readonly APP_CALLBACK_URL = 'nirmind://auth';

  private constructor() {}

  static getInstance(): CrossAppAuthService {
    if (!CrossAppAuthService.instance) {
      CrossAppAuthService.instance = new CrossAppAuthService();
    }
    return CrossAppAuthService.instance;
  }

  /**
   * Nirpax uygulamasının yüklü olup olmadığını kontrol eder
   */
  async isNirpaxInstalled(): Promise<boolean> {
    try {
      // Deep link'i kontrol et
      const canOpen = await Linking.canOpenURL(this.NIRPAX_DEEP_LINK);
      console.log(`📱 Nirpax app kontrol: ${canOpen ? 'Yüklü' : 'Yüklü değil'}`);
      return canOpen;
    } catch (error) {
      console.error('❌ Nirpax app kontrolü hatası:', error);
      return false;
    }
  }

  /**
   * Nirpax uygulamasını açar (deep link ile)
   */
  async openNirpaxApp(): Promise<boolean> {
    try {
      const deepLinkUrl = `${this.NIRPAX_DEEP_LINK}?source=nirmind&callback=${encodeURIComponent(this.APP_CALLBACK_URL)}`;
      console.log('🚀 Nirpax uygulaması açılıyor:', deepLinkUrl);
      
      const canOpen = await Linking.canOpenURL(deepLinkUrl);
      if (canOpen) {
        await Linking.openURL(deepLinkUrl);
        return true;
      } else {
        console.warn('⚠️ Nirpax deep link açılamadı');
        return false;
      }
    } catch (error) {
      console.error('❌ Nirpax app açma hatası:', error);
      return false;
    }
  }

  /**
   * WebView için backend login URL'ini döner
   */
  getWebViewLoginUrl(): string {
    const redirectUrl = encodeURIComponent(this.WEB_CALLBACK_URL);
    const callbackUrl = encodeURIComponent(this.APP_CALLBACK_URL);
    return `${this.BACKEND_LOGIN_URL}?source=nirmind&redirect=${redirectUrl}&callback=${callbackUrl}`;
  }

  /**
   * Direct API login (WebView olmadan)
   */
  async directApiLogin(email: string, password: string): Promise<{ success: boolean; token?: string; error?: string }> {
    try {
      const response = await fetch(`${this.BACKEND_LOGIN_URL.replace('/cross-app-login-page', '/cross-app-login')}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          sourceApp: 'nirmind'
        }),
      });

      const data = await response.json();
      
      if (data.success && data.data?.token?.accessToken) {
        return { success: true, token: data.data.token.accessToken };
      } else {
        return { success: false, error: data.error || 'Login failed' };
      }
    } catch (error: any) {
      return { success: false, error: error.message || 'Network error' };
    }
  }

  /**
   * Nirpax ile login işlemini başlatır
   * - Önce Nirpax app'i kontrol eder
   * - App varsa deep link ile açar
   * - App yoksa WebView için URL döner
   */
  async initiateNirpaxLogin(): Promise<{ type: 'deep-link' | 'webview'; url?: string }> {
    const isInstalled = await this.isNirpaxInstalled();

    if (isInstalled) {
      const opened = await this.openNirpaxApp();
      if (opened) {
        return { type: 'deep-link' };
      }
    }

    // Nirpax yüklü değil veya açılamadı, WebView kullan
    console.log('🌐 WebView login açılacak');
    return {
      type: 'webview',
      url: this.getWebViewLoginUrl(),
    };
  }

  /**
   * Deep link callback'i parse eder
   */
  parseAuthCallback(url: string): { token?: string; error?: string } {
    try {
      const parsed = new URL(url);
      const token = parsed.searchParams.get('token');
      const error = parsed.searchParams.get('error');

      if (token) {
        return { token };
      } else if (error) {
        return { error };
      } else if (parsed.hash) {
        const hashParams = new URLSearchParams(parsed.hash.replace(/^#/, ''));
        const hashToken = hashParams.get('token');
        const hashError = hashParams.get('error');
        if (hashToken) {
          return { token: hashToken };
        }
        if (hashError) {
          return { error: hashError };
        }
      }

      return { error: 'Invalid callback URL' };
    } catch (error) {
      console.error('❌ Auth callback parse hatası:', error);
      return { error: 'Invalid callback URL' };
    }
  }
}

export default CrossAppAuthService;

