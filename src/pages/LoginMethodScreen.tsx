import * as React from "react";
import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  StatusBar,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFonts } from "expo-font";
import { SvgXml } from "react-native-svg";
import { WebView } from "react-native-webview";
import CrossAppAuthService from "../services/CrossAppAuthService";
import GoogleAuthService from "../services/GoogleAuthService";
import AppleAuthService from "../services/AppleAuthService";
import BackendApiService from "../services/BackendApiService";
import { useAuth } from "../contexts/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width, height } = Dimensions.get("window");

const nirmindLogoIcon = `<svg width="89" height="82" viewBox="0 0 89 82" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M68.7556 44.2752V43.3077C63.2793 41.4882 57.5144 41.0178 52.9656 37.1435C50.1564 34.7515 48.1061 31.0015 46.9035 27.5488C46.1446 25.3654 45.723 21.4467 44.8798 19.7027C44.6579 19.2367 44.507 19.0059 43.9434 19.1124C42.1239 27.6331 40.1934 34.3033 32.3428 38.9941C28.0824 41.5415 24.004 41.8965 19.433 43.4453C19.4463 43.8625 19.2865 44.0311 19.646 44.324C20.8797 45.3137 26.8221 46.614 28.8014 47.3551C34.7836 49.5873 39.5721 53.3862 41.0588 59.9409C46.6683 84.7132 9.50102 89.87 1.48177 68.8921C-1.07889 62.1954 -0.142495 56.6436 2.92408 50.4172C9.91374 36.2249 19.8368 22.4808 27.3191 8.44375C34.0602 -1.15982 48.8561 -2.85509 57.7053 4.82244C60.5633 7.29878 62.4494 10.9157 64.4109 14.1154C71.1831 25.1701 78.9228 38.0577 84.8296 49.5163C88.2823 56.2087 89.6403 61.827 86.6358 69.1406C77.982 90.2117 41.4937 84.154 47.1653 59.9542C49.655 49.3255 59.6713 46.9867 68.7556 44.2752Z" fill="white"/>
</svg>`;

const nirpaxLogoIcon = `<svg width="24" height="16" viewBox="0 0 24 16" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M12.1116 3.21782L11.2899 0.650322C10.4916 -0.727837 9.89485 0.39177 9.55586 1.3868C9.22468 2.35911 9.17859 3.31654 9.02394 4.30922C8.99972 4.46592 8.99113 4.95403 8.79898 4.94541C8.83726 4.17133 8.7654 3.40429 8.64355 2.64195C8.33189 0.687929 7.65781 -0.546851 7.10949 2.25804C6.49634 5.39514 6.49712 10.6053 7.10949 13.7464C7.22118 14.3199 7.34225 15.0689 7.807 15.441C8.38657 15.5664 8.75056 12.7623 8.79586 12.3188C8.83335 11.9475 8.77477 11.5636 8.79898 11.1914C8.99113 11.1648 9.00128 11.5526 9.0255 11.6928C9.16375 12.5139 9.46525 15.5296 10.2573 15.9135C11.4484 16.4909 11.8171 13.4667 12.0475 12.7842C12.1819 13.4533 12.713 16.7299 13.9143 15.8516C14.5658 15.3752 15.1102 12.195 15.0321 11.3238C15.275 11.3747 15.2773 11.5847 15.3008 11.7837C15.3625 12.3032 15.5101 15.5695 16.2771 15.4371C16.7387 15.3572 17.0785 13.1525 17.1363 12.7027C17.4722 10.082 17.5433 3.86733 16.7622 1.41657C16.1451 -0.517862 15.6351 1.46045 15.4679 2.3928C15.3578 3.00706 15.3718 3.62837 15.3015 4.21912C15.2781 4.41813 15.2758 4.6281 15.0328 4.67903C15.1281 3.80935 14.5212 0.511644 13.8378 0.0948273C12.7372 -0.576624 12.1108 2.51346 12.1124 3.21625L12.1116 3.21782Z" fill="white"/>
<path d="M5.48952 0.964478C5.37704 1.4761 5.18333 1.98301 5.09975 2.50325C4.71077 4.92815 4.51238 12.557 5.37782 14.6842C5.45281 14.8683 5.51373 15.0493 5.68088 15.1746C6.08939 15.1825 6.36512 12.9777 6.40886 12.5852C6.70411 9.93387 6.79862 4.09374 6.10658 1.59519C6.04721 1.38129 5.92693 1.18777 5.86366 0.97623L5.48952 0.964478Z" fill="white"/>
<path d="M18.4103 0.959726C18.1408 0.894696 18.069 1.30995 18.0112 1.4878C17.2699 3.78342 17.3371 11.5713 17.8745 13.9884C17.969 14.4122 18.0479 14.8957 18.4119 15.1746C18.5493 15.1746 18.7696 14.4193 18.8133 14.2509C19.4999 11.6058 19.5054 4.51755 18.8391 1.85917C18.7884 1.65547 18.5978 1.00439 18.4103 0.958943V0.959726Z" fill="white"/>
<path d="M3.62661 1.88986C3.47898 2.48296 3.31964 3.09095 3.24465 3.7005C2.95175 6.07369 2.87598 11.0677 3.39306 13.3507C3.51179 13.8765 3.76174 14.6208 4.04761 13.6743C4.66389 11.6318 4.56626 5.77753 4.27257 3.56731C4.24132 3.33069 4.00544 1.60467 3.62661 1.89064V1.88986Z" fill="white"/>
<path d="M20.2037 14.2469C20.6044 14.0573 20.6161 13.4775 20.6934 13.078C20.8621 12.2052 20.9613 10.9641 21.0035 10.0662C21.0347 9.40732 20.9527 1.87641 20.3997 1.88738C20.1138 1.88268 20.0553 2.20391 19.9967 2.41389C19.4351 4.40317 19.4843 11.4342 19.9732 13.4799C20.0357 13.7416 20.1693 13.979 20.2045 14.2469H20.2037Z" fill="white"/>
<path d="M21.9932 3.35339C21.8276 3.35339 21.6987 4.17684 21.6784 4.3641C21.4386 6.62917 21.4253 9.37686 21.6784 11.6388C21.6987 11.8182 21.826 12.6511 21.9932 12.6495C22.2095 12.4466 22.2759 12.0541 22.3087 11.7728C22.5719 9.52573 22.5587 6.61271 22.3079 4.3641C22.2876 4.18468 22.1603 3.35339 21.9932 3.35339Z" fill="white"/>
<path d="M1.90199 12.6534C2.22692 12.727 2.19334 12.5312 2.25739 12.2852C2.44875 11.5549 2.53545 10.1893 2.56982 9.40348C2.65652 7.40167 2.50733 5.3121 2.16522 3.35181C1.72156 3.83757 1.67001 5.00497 1.63095 5.67172C1.49426 7.98693 1.65204 10.3617 1.90199 12.6542V12.6534Z" fill="white"/>
<path d="M0.577266 10.1266C0.816279 10.0584 0.832682 9.47078 0.84596 9.26864C0.869393 8.91059 0.9022 5.88005 0.642097 5.87378C0.182818 7.22295 0.295293 8.73274 0.577266 10.1266Z" fill="white"/>
<path d="M23.2522 9.9284C23.264 9.97305 23.4327 10.1321 23.5162 10.1274C23.724 9.97305 23.7146 6.07676 23.5162 5.8754C23.4311 5.86522 23.2522 6.05169 23.2522 6.07441C23.2522 6.9433 23.0851 9.27105 23.2522 9.9284Z" fill="white"/>
</svg>`;

interface LoginMethodScreenProps {
  onBack: () => void;
  onLoginSuccess: () => void;
}

const LoginMethodScreen = ({
  onBack,
  onLoginSuccess,
}: LoginMethodScreenProps): React.JSX.Element | null => {
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);
  const [isNirpaxLoading, setIsNirpaxLoading] = useState(false);
  const [showWebView, setShowWebView] = useState(false);
  const [webViewUrl, setWebViewUrl] = useState("");
  const { handleAuthCallback, setUser } = useAuth();
  const insets = useSafeAreaInsets();
  const crossAppAuthService = CrossAppAuthService.getInstance();
  const googleAuthService = GoogleAuthService.getInstance();
  const appleAuthService = AppleAuthService.getInstance();
  const backendApiService = BackendApiService.getInstance();

  let [fontsLoaded] = useFonts({
    "Poppins-Regular": require("@assets/fonts/Poppins-Regular .ttf"),
    "Poppins-Medium": require("@assets/fonts/Poppins-Medium.ttf"),
    "SpaceGrotesk-Regular": require("@assets/fonts/SpaceGrotesk-Regular.ttf"),
  });

  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    const setLoading = provider === 'google' ? setIsGoogleLoading : setIsAppleLoading;
    
    try {
      setLoading(true);
      console.log(`🔵 ${provider === 'google' ? 'Google' : 'Apple'} login başlatılıyor...`);

      let result;
      try {
        if (provider === 'google') {
          result = await googleAuthService.signIn();
        } else {
          result = await appleAuthService.signIn();
        }
      } catch (authError: any) {
        console.error(`❌ ${provider} auth service error:`, authError);
        setLoading(false);
        Alert.alert(
          "Giriş Başarısız",
          "Giriş işlemi tamamlanamadı. Lütfen tekrar deneyin.",
          [{ text: "Tamam" }]
        );
        return;
      }

      console.log(`📥 ${provider} auth result:`, { 
        success: result.success, 
        hasToken: !!result.token,
        hasUser: !!result.user,
        error: result.error 
      });

      if (result.success && result.token) {
        console.log(`✅ ${provider === 'google' ? 'Google' : 'Apple'} login başarılı`);
        
        // Token'ı kaydet ve kullanıcıyı giriş yaptır
        try {
          // Backend'den gelen user bilgisini kullan
          if (result.user) {
            await backendApiService.setAuthToken(result.token.accessToken);
            await AsyncStorage.setItem('authToken', result.token.accessToken);
            
            // User bilgisini kaydet
            const userData = {
              id: result.user.id,
              email: result.user.email,
              firstName: result.user.firstName,
              lastName: result.user.lastName,
              phone: result.user.phone || '',
              profileImageUrl: result.user.profileImageUrl,
              nirpaxId: result.user.nirpaxId,
              apps: ['nirmind'],
              permissions: {}
            };
            
            await AsyncStorage.setItem('user', JSON.stringify(userData));
            
            // AuthContext'i güncelle
            setUser(userData);
            
            console.log(`✅ ${provider === 'google' ? 'Google' : 'Apple'} kullanıcı bilgileri kaydedildi`);
            setLoading(false);
          } else {
            // Fallback: handleAuthCallback kullan
            await handleAuthCallback(result.token.accessToken);
            setLoading(false);
          }
        } catch (error: any) {
          console.error(`❌ User kaydetme hatası:`, error);
          setLoading(false);
          Alert.alert(
            "Giriş Başarısız",
            "Giriş işlemi tamamlanamadı. Lütfen tekrar deneyin.",
            [{ text: "Tamam" }]
          );
        }
      } else {
        setLoading(false);
        // Kullanıcı iptal etmediyse uyarı göster
        if (result.error !== 'CANCELLED' && result.error !== 'USER_CANCELLED') {
          console.log(`❌ ${provider} login başarısız:`, result.error || result.message);
          const errorMessage = result.message || result.error || 'Giriş işlemi tamamlanamadı.';
          
          // Rate limit hatası kontrolü - tekrar deneme yapma
          if (result.error === 'RATE_LIMIT' ||
              errorMessage.includes('Çok fazla istek') || 
              errorMessage.includes('rate limit') || 
              errorMessage.includes('429')) {
            const alertMessage = result.message || errorMessage || 'Çok fazla istek gönderildi. Lütfen birkaç dakika sonra tekrar deneyin.';
            Alert.alert(
              "Çok Fazla İstek",
              alertMessage,
              [{ text: "Tamam" }]
            );
            return; // Rate limit hatasında işlemi durdur
          }
          
          // Network hatası kontrolü
          if (errorMessage.includes('Network') || errorMessage.includes('502') || errorMessage.includes('Sunucu hatası')) {
            Alert.alert(
              "Bağlantı Hatası",
              "Sunucuya bağlanılamadı. Lütfen internet bağlantınızı kontrol edin ve tekrar deneyin.",
              [{ text: "Tamam" }]
            );
          } else {
            Alert.alert(
              "Giriş Başarısız",
              errorMessage,
              [{ text: "Tamam" }]
            );
          }
        } else {
          console.log(`ℹ️ ${provider} login iptal edildi`);
        }
      }
    } catch (error: any) {
      console.error(`❌ ${provider === 'google' ? 'Google' : 'Apple'} login hatası:`, error);
      setLoading(false);
      
      const errorMessage = error.message || 'Giriş işlemi tamamlanamadı.';
      
      // Rate limit hatası kontrolü
      if (errorMessage.includes('Çok fazla istek') || 
          errorMessage.includes('rate limit') || 
          errorMessage.includes('429') ||
          error.code === 'RATE_LIMIT') {
        Alert.alert(
          "Çok Fazla İstek",
          "Çok fazla istek gönderildi. Lütfen birkaç dakika sonra tekrar deneyin.",
          [{ text: "Tamam" }]
        );
        return; // Rate limit hatasında işlemi durdur
      }
      
      // Özel hata mesajları
      if (errorMessage.includes('Network') || errorMessage.includes('502') || errorMessage.includes('Sunucu hatası')) {
        Alert.alert(
          "Bağlantı Hatası",
          "Sunucuya bağlanılamadı. Lütfen internet bağlantınızı kontrol edin ve tekrar deneyin.",
          [{ text: "Tamam" }]
        );
      } else if (errorMessage.includes('JSON Parse error')) {
        Alert.alert(
          "Sunucu Hatası",
          "Sunucudan beklenmeyen bir yanıt alındı. Lütfen daha sonra tekrar deneyin.",
          [{ text: "Tamam" }]
        );
      } else {
        Alert.alert(
          "Giriş Başarısız",
          errorMessage,
          [{ text: "Tamam" }]
        );
      }
    }
  };

  const handleNirpaxLogin = async () => {
    try {
      setIsNirpaxLoading(true);
      console.log("🔵 Nirpax login başlatılıyor...");

      // Direkt HTML sayfasını aç (deep link kontrolü yapmadan)
      const webViewUrl = crossAppAuthService.getWebViewLoginUrl();
      console.log("🌐 WebView login açılıyor:", webViewUrl);
      setWebViewUrl(webViewUrl);
      setShowWebView(true);
      setIsNirpaxLoading(false);
    } catch (error: any) {
      console.error("❌ Nirpax login hatası:", error);
      setIsNirpaxLoading(false);
      Alert.alert(
        "Giriş Başarısız",
        "Giriş işlemi tamamlanamadı. Lütfen tekrar deneyin.",
        [{ text: "Tamam" }]
      );
    }
  };

  const parseTokenFromUrl = (url: string): { token?: string; error?: string } => {
    try {
      // URL'den token veya error parametresini çıkar
      const tokenMatch = url.match(/[?&]token=([^&]+)/);
      const errorMatch = url.match(/[?&]error=([^&]+)/);
      
      if (tokenMatch) {
        const token = decodeURIComponent(tokenMatch[1]);
        return { token };
      } else if (errorMatch) {
        const error = decodeURIComponent(errorMatch[1]);
        return { error };
      }
    } catch (error) {
      console.error("❌ URL parse hatası:", error);
    }
    return {};
  };

  const handleWebViewNavigationStateChange = async (navState: any) => {
    const { url, loading } = navState;
    console.log("🌐 WebView navigation:", url, "loading:", loading);

    // Skip if still loading
    if (loading) {
      return;
    }

    // Check if it's a callback URL with token
    if (url && (url.includes("nirmind://auth-callback") || url.startsWith("nirmind://"))) {
      console.log("✅ Callback URL yakalandı:", url);
      
      const parsed = parseTokenFromUrl(url);
      
      if (parsed.token) {
        console.log("✅ Token redirect URL'den alındı");
        setShowWebView(false);
        
        try {
          await handleAuthCallback(parsed.token);
          onLoginSuccess();
        } catch (error: any) {
          console.error("❌ Auth callback hatası:", error);
          Alert.alert(
            "Giriş Başarısız",
            error.message || "Giriş işlemi tamamlanamadı. Lütfen tekrar deneyin.",
            [{ text: "Tamam" }]
          );
        }
        return;
      } else if (parsed.error) {
        console.error("❌ Redirect URL'den hata:", parsed.error);
        Alert.alert(
          "Giriş Başarısız",
          decodeURIComponent(parsed.error) || "Giriş işlemi tamamlanamadı. Lütfen tekrar deneyin.",
          [{ text: "Tamam", onPress: () => setShowWebView(false) }]
        );
        return;
      }
    }

    // Check if URL contains token parameter (fallback for other redirect formats)
    if (url && url.includes("token=") && !url.includes("cross-app-login-page")) {
      console.log("🔍 URL'de token parametresi bulundu:", url);
      const parsed = parseTokenFromUrl(url);
      
      if (parsed.token) {
        console.log("✅ Token URL parametresinden alındı");
        setShowWebView(false);
        
        try {
          await handleAuthCallback(parsed.token);
          onLoginSuccess();
        } catch (error: any) {
          console.error("❌ Auth callback hatası:", error);
          Alert.alert(
            "Giriş Başarısız",
            error.message || "Giriş işlemi tamamlanamadı. Lütfen tekrar deneyin.",
            [{ text: "Tamam" }]
          );
        }
        return;
      }
    }
  };

  const handleShouldStartLoad = (request: any) => {
    const { url } = request;
    console.log("🔍 Should start load:", url);

    // If it's our callback URL, intercept it
    if (url && (url.includes("nirmind://auth-callback") || url.startsWith("nirmind://"))) {
      console.log("🚫 Blocking navigation, handling callback");
      handleWebViewNavigationStateChange({ url, loading: false });
      return false; // Block the navigation
    }

    // Check if URL contains token parameter (but not the login page itself)
    if (url && url.includes("token=") && !url.includes("cross-app-login-page")) {
      console.log("🚫 Blocking navigation, token detected in URL");
      handleWebViewNavigationStateChange({ url, loading: false });
      return false; // Block the navigation
    }

    // Allow all other requests (including API calls and the login page)
    return true;
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <LinearGradient
      colors={["#03030B", "#16163C"]}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      {/* Logo Icon */}
      <View style={styles.logoIconContainer}>
        <SvgXml xml={nirmindLogoIcon} width="88.3" height="82" />
      </View>

      {/* Title */}
      <View style={styles.titleContainer}>
        <Text style={styles.titleText}>Giriş Yönteminizi Seçin</Text>
      </View>

      {/* Subtitle */}
      <View style={styles.subtitleContainer}>
        <Text style={styles.subtitleText}>
          Hesabınıza nasıl giriş yapmak istiyorsunuz?
        </Text>
      </View>

      {/* Login Buttons */}
      <View style={styles.buttonsContainer}>
        {/* Google Login Button */}
        <TouchableOpacity
          style={styles.socialButton}
          onPress={() => handleSocialLogin('google')}
          disabled={isGoogleLoading || isAppleLoading || isNirpaxLoading}
        >
          <View style={styles.socialButtonContent}>
            {isGoogleLoading ? (
              <ActivityIndicator color="#333333" size="small" />
            ) : (
              <>
                <Image 
                  source={require('@assets/images/icon/Google.png')}
                  style={styles.iconImage}
                />
                <Text style={styles.socialButtonText}>Google ile Giriş Yap</Text>
              </>
            )}
          </View>
        </TouchableOpacity>

        {/* Apple Login Button */}
        <TouchableOpacity
          style={styles.socialButton}
          onPress={() => handleSocialLogin('apple')}
          disabled={isGoogleLoading || isAppleLoading || isNirpaxLoading}
        >
          <View style={styles.socialButtonContent}>
            {isAppleLoading ? (
              <ActivityIndicator color="#333333" size="small" />
            ) : (
              <>
                <Image 
                  source={require('@assets/images/icon/apple-logo.png')}
                  style={styles.iconImage}
                />
                <Text style={styles.socialButtonText}>Apple ile Giriş Yap</Text>
              </>
            )}
          </View>
        </TouchableOpacity>

        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>veya</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Nirpax Login Button */}
        <TouchableOpacity
          style={styles.nirpaxButton}
          onPress={handleNirpaxLogin}
          disabled={isGoogleLoading || isAppleLoading || isNirpaxLoading}
        >
          <LinearGradient
            colors={["#00DDA5", "#007759"]}
            style={styles.nirpaxButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {isNirpaxLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <View style={styles.nirpaxButtonContent}>
                <View style={styles.nirpaxIconContainer}>
                  <SvgXml
                    xml={nirpaxLogoIcon}
                    width="24"
                    height="24"
                    style={{ transform: [{ rotateY: "0deg" }] }}
                  />
                </View>
                <Text style={styles.nirpaxButtonText}>Nirpax ile devam et</Text>
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Info Text */}
      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          NirMind uygulamasında hesabınız oluştuğunda, otomatik olarak Nirpax hesabında da oluşur.
        </Text>
      </View>

      {/* WebView Modal */}
      <Modal
        visible={showWebView}
        animationType="slide"
        onRequestClose={() => setShowWebView(false)}
      >
        <SafeAreaView style={styles.webViewContainer} edges={['top']}>
          <StatusBar barStyle="light-content" backgroundColor="#16163C" />
          <View style={[styles.webViewHeader, { paddingTop: Math.max(insets.top, 10) }]}>
            <TouchableOpacity
              onPress={() => setShowWebView(false)}
              style={[styles.closeButton, { top: Math.max(insets.top, 10) }]}
            >
              <Text style={styles.closeButtonText}>✕ Kapat</Text>
            </TouchableOpacity>
            <Text style={styles.webViewTitle}>Nirpax ile Giriş</Text>
          </View>
          <WebView
            style={styles.webView}
            source={{ 
              uri: webViewUrl,
              headers: {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
              }
            }}
            onNavigationStateChange={handleWebViewNavigationStateChange}
            onShouldStartLoadWithRequest={handleShouldStartLoad}
            startInLoadingState={true}
            mixedContentMode="always"
            allowsInlineMediaPlayback={true}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            sharedCookiesEnabled={false}
            allowsBackForwardNavigationGestures={false}
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.error('❌ WebView error:', nativeEvent);
              Alert.alert(
                'Bağlantı Hatası',
                'Sayfa yüklenirken bir hata oluştu. Lütfen internet bağlantınızı kontrol edin ve tekrar deneyin.',
                [
                  { 
                    text: 'Kapat', 
                    onPress: () => setShowWebView(false),
                    style: 'cancel'
                  },
                  { 
                    text: 'Yeniden Dene', 
                    onPress: () => {
                      // WebView'i yeniden yükle
                      setWebViewUrl('');
                      setTimeout(() => {
                        const url = crossAppAuthService.getWebViewLoginUrl();
                        setWebViewUrl(url);
                      }, 100);
                    }
                  }
                ]
              );
            }}
            onHttpError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.error('❌ WebView HTTP error:', nativeEvent);
              if (nativeEvent.statusCode >= 400) {
                Alert.alert(
                  'Sunucu Hatası',
                  `Sunucu hatası oluştu (${nativeEvent.statusCode}). Lütfen daha sonra tekrar deneyin.`,
                  [{ text: 'Tamam', onPress: () => setShowWebView(false) }]
                );
              }
            }}
            onMessage={async (event) => {
              const messageData = event.nativeEvent.data;
              console.log('📨 WebView message received:', messageData);
              
              try {
                const message = JSON.parse(messageData);
                console.log('📨 Parsed message:', message);
                
                if (message.type === 'LOGIN_SUCCESS' && message.token) {
                  console.log('✅ Login token alındı via postMessage');
                  setShowWebView(false);
                  
                  // Token'ı işle ve direkt ana uygulamaya geç
                  try {
                    await handleAuthCallback(message.token);
                    onLoginSuccess();
                  } catch (error: any) {
                    console.error("❌ Auth callback hatası:", error);
                    Alert.alert(
                      "Giriş Başarısız",
                      error.message || "Giriş işlemi tamamlanamadı. Lütfen tekrar deneyin.",
                      [{ text: "Tamam" }]
                    );
                  }
                } else if (message.type === 'LOGIN_ERROR' && message.error) {
                  console.error('❌ Login error via postMessage:', message.error);
                  Alert.alert(
                    "Giriş Başarısız",
                    message.error || "Giriş işlemi tamamlanamadı. Lütfen tekrar deneyin.",
                    [{ text: "Tamam", onPress: () => setShowWebView(false) }]
                  );
                }
              } catch (error: any) {
                // Belki de direkt token string olarak geldi
                if (messageData && messageData.length > 50 && !messageData.includes('{')) {
                  console.log('⚠️ Message direkt token gibi görünüyor, parse ediliyor...');
                  try {
                    setShowWebView(false);
                    await handleAuthCallback(messageData);
                    onLoginSuccess();
                  } catch (tokenError: any) {
                    console.error('❌ Token parse hatası:', tokenError);
                  }
                } else {
                  console.error('❌ WebView message parse hatası:', error, 'Raw data:', messageData);
                }
              }
            }}
            renderLoading={() => (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#00DDA5" />
              </View>
            )}
          />
        </SafeAreaView>
      </Modal>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: width,
    height: height,
  },
  logoIconContainer: {
    position: "absolute",
    top: 217,
    left: -12,
    right: 0,
    width: "100%",
    height: 82,
    justifyContent: "center",
    alignItems: "center",
  },
  titleContainer: {
    position: "absolute",
    top: 335,
    left: 0,
    right: 0,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  titleText: {
    fontFamily: "Poppins-Medium",
    fontSize: 24,
    fontWeight: "500",
    color: "#FFFFFF",
    textAlign: "center",
    lineHeight: 30,
  },
  subtitleContainer: {
    position: "absolute",
    top: 380,
    left: 0,
    right: 0,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  subtitleText: {
    fontFamily: "Poppins-Regular",
    fontSize: 14,
    fontWeight: "400",
    color: "#FFFFFF",
    textAlign: "center",
    lineHeight: 25,
  },
  buttonsContainer: {
    position: "absolute",
    top: 450,
    left: (width - 350) / 2,
    width: 350,
  },
  socialButton: {
    width: 350,
    height: 56,
    backgroundColor: "#FFFFFF",
    borderRadius: 50,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  socialButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  iconImage: {
    width: 20,
    height: 20,
    resizeMode: "contain",
  },
  socialButtonText: {
    fontFamily: "Poppins-Medium",
    fontSize: 16,
    fontWeight: "500",
    color: "#333333",
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: 350,
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E5E5E5",
  },
  dividerText: {
    fontFamily: "Poppins-Regular",
    fontSize: 14,
    color: "#999999",
    marginHorizontal: 16,
  },
  nirpaxButton: {
    width: 350,
    borderRadius: 50,
    overflow: "hidden",
    height: 56,
  },
  nirpaxButtonGradient: {
    width: "100%",
    height: 56,
    justifyContent: "center",
    alignItems: "center",
  },
  nirpaxButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  nirpaxIconContainer: {
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  nirpaxButtonText: {
    fontFamily: "Poppins-Medium",
    fontSize: 16,
    fontWeight: "500",
    lineHeight: 25,
    letterSpacing: 0,
    textAlign: "center",
    color: "#FFFFFF",
  },
  webViewContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    width: width,
    height: height,
  },
  webView: {
    flex: 1,
    width: width,
  },
  webViewHeader: {
    minHeight: 60,
    backgroundColor: "#16163C",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingBottom: 10,
    width: width,
  },
  closeButton: {
    position: "absolute",
    left: 16,
    padding: 8,
  },
  closeButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Poppins-Medium",
  },
  webViewTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontFamily: "Poppins-Medium",
  },
  loadingContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  infoContainer: {
    position: "absolute",
    top: 720,
    left: (width - 350) / 2,
    width: 350,
    paddingHorizontal: 20,
  },
  infoText: {
    fontFamily: "Poppins-Regular",
    fontSize: 12,
    fontWeight: "400",
    color: "#999999",
    textAlign: "center",
    lineHeight: 18,
  },
});

export default LoginMethodScreen;
