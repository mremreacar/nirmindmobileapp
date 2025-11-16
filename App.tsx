import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, Keyboard as RNKeyboard, Linking, Text, TextInput } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Font scaling'i devre dışı bırak - telefonların ayarlarından etkilenmesin
Text.defaultProps = Text.defaultProps || {};
Text.defaultProps.allowFontScaling = false;

TextInput.defaultProps = TextInput.defaultProps || {};
TextInput.defaultProps.allowFontScaling = false;
import SplashScreen from './src/pages/SplashScreen';
import OnboardingScreen from './src/pages/OnboardingScreen';
import LoginMethodScreen from './src/pages/LoginMethodScreen';
import HomeScreen from './src/pages/HomeScreen';
import ChatHistoryScreen from './src/pages/ChatHistoryScreen';
import ProfileScreen from './src/pages/ProfileScreen';
import HelpCenterScreen from './src/pages/HelpCenterScreen';
import CompleteProfileScreen from './src/pages/CompleteProfileScreen';
import ErrorBoundary from './src/components/ErrorBoundary';
import { ChatProvider } from './src/lib/context/ChatContext';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { DeepLinkHandler } from './src/components/DeepLinkHandler';
import BackendApiService from './src/services/BackendApiService';

// Navigation enum for type safety and performance
enum Screen {
  SPLASH = 'splash',
  ONBOARDING = 'onboarding',
  LOGIN = 'login',
  COMPLETE_PROFILE = 'completeProfile',
  HOME = 'home',
  CHAT_HISTORY = 'chatHistory',
  PROFILE = 'profile',
  HELP_CENTER = 'helpCenter'
}

// Ana App component'i - AuthContext'i kullanır
function AppContent() {
  const [currentScreen, setCurrentScreen] = useState<Screen>(Screen.SPLASH);
  const [selectedConversationId, setSelectedConversationId] = useState<string | undefined>();
  const [profileCompleteData, setProfileCompleteData] = useState<any>(null);
  const [previousScreen, setPreviousScreen] = useState<Screen | null>(null); // Chat History'ye gelmeden önceki ekran
  const timerRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const { user, isLoading } = useAuth();
  const backendApiService = BackendApiService.getInstance();

  // Simple transition function - no animations
  const performSmoothTransition = useCallback((targetScreen: Screen) => {
    // Önce klavyeyi kapat
    RNKeyboard.dismiss();
    // Sonra sayfa geçişini yap
    setCurrentScreen(targetScreen);
  }, []);

  const checkProfileCompleteness = useCallback(async () => {
    try {
      console.log('🔍 Profil bilgileri kontrol ediliyor...');
      const response = await backendApiService.getUserProfile();
      
      if (response.success && response.data) {
        if (response.data.hasMissingFields && response.data.missingFields?.length > 0) {
          console.log('⚠️ Eksik bilgiler var:', response.data.missingFields);
          
          // Placeholder değerleri kontrol et ve boş string olarak gönder
          const isPlaceholderValue = (value: string | undefined): boolean => {
            if (!value) return true;
            const normalized = value.trim().toLowerCase();
            return normalized === 'apple' || normalized === 'google' || normalized === 'user' || normalized === '';
          };

          setProfileCompleteData({
            firstName: isPlaceholderValue(response.data.firstName) ? '' : response.data.firstName,
            lastName: isPlaceholderValue(response.data.lastName) ? '' : response.data.lastName,
            phone: response.data.phone || '',
            missingFields: response.data.missingFields,
          });
          performSmoothTransition(Screen.COMPLETE_PROFILE);
        } else {
          console.log('✅ Profil bilgileri tamam');
          performSmoothTransition(Screen.HOME);
        }
      } else {
        // Profil alınamadı, direkt home'a git
        console.log('⚠️ Profil kontrol edilemedi, home\'a yönlendiriliyor');
        performSmoothTransition(Screen.HOME);
      }
    } catch (error) {
      console.error('❌ Profil kontrol hatası:', error);
      // Hata durumunda direkt home'a git
      performSmoothTransition(Screen.HOME);
    }
  }, [performSmoothTransition, backendApiService]);

  useEffect(() => {
    // Auth durumu kontrol edilene kadar splash ekranında kal
    if (isLoading) {
      return;
    }

    // Auth kontrolü tamamlandı
    if (user) {
      // Kullanıcı giriş yapmış, profil bilgilerini kontrol et
      // Yeni giriş yapıldığında seçili konuşmayı temizle - Home'da başlasın
      setSelectedConversationId(undefined);
      setPreviousScreen(null);
      checkProfileCompleteness();
    } else {
      // Kullanıcı giriş yapmamış, onboarding'e git
      // Logout sonrası state'leri temizle
      setSelectedConversationId(undefined);
      setPreviousScreen(null);
      console.log('ℹ️ Kullanıcı giriş yapmamış, onboarding ekranına yönlendiriliyor');
      performSmoothTransition(Screen.ONBOARDING);
    }
  }, [isLoading, user, checkProfileCompleteness, performSmoothTransition]);

  // Optimized navigation handlers with smooth transitions
  const handleOnboardingNext = useCallback(() => {
    performSmoothTransition(Screen.LOGIN);
  }, [performSmoothTransition]);

  const handleLoginBack = useCallback(() => {
    performSmoothTransition(Screen.ONBOARDING);
  }, [performSmoothTransition]);

  const handleLoginSuccess = useCallback(() => {
    // Login başarılı, profil kontrolü yapılacak (useEffect'te)
    checkProfileCompleteness();
  }, [checkProfileCompleteness]);

  const handleProfileComplete = useCallback(() => {
    // Profil tamamlandı, home'a git
    setProfileCompleteData(null);
    performSmoothTransition(Screen.HOME);
  }, [performSmoothTransition]);

  const handleOpenChatHistory = useCallback(() => {
    console.log('🔙 Chat history açılıyor...');
    // Mevcut ekranı previousScreen olarak kaydet
    setPreviousScreen(currentScreen);
    performSmoothTransition(Screen.CHAT_HISTORY);
  }, [performSmoothTransition, currentScreen]);

  const handleBackFromChatHistory = useCallback(() => {
    RNKeyboard.dismiss(); // Klavyeyi kapat
    // Eğer previousScreen varsa oraya dön, yoksa Home'a dön
    const targetScreen = previousScreen || Screen.HOME;
    setPreviousScreen(null); // previousScreen'i temizle
    performSmoothTransition(targetScreen);
  }, [performSmoothTransition, previousScreen]);

  const handleSelectConversation = useCallback((conversationId: string) => {
    RNKeyboard.dismiss(); // Klavyeyi kapat
    setSelectedConversationId(conversationId);
    // previousScreen'i temizle çünkü conversation seçildiğinde Home'a gidiyoruz
    setPreviousScreen(null);
    performSmoothTransition(Screen.HOME);
  }, [performSmoothTransition]);

  const handleOpenProfile = useCallback(() => {
    performSmoothTransition(Screen.PROFILE);
  }, [performSmoothTransition]);

  const handleBackFromProfile = useCallback(() => {
    performSmoothTransition(Screen.CHAT_HISTORY);
  }, [performSmoothTransition]);

  const handleChatFromProfile = useCallback(() => {
    // Hızlı ve smooth transition - beyaz ekran yok
    performSmoothTransition(Screen.HOME);
  }, [performSmoothTransition]);

  const handleOpenHelpCenter = useCallback(() => {
    performSmoothTransition(Screen.HELP_CENTER);
  }, [performSmoothTransition]);

  const handleBackFromHelpCenter = useCallback(() => {
    performSmoothTransition(Screen.PROFILE);
  }, [performSmoothTransition]);

  const handleChatFromHelpCenter = useCallback(() => {
    // Hızlı ve smooth transition - beyaz ekran yok
    performSmoothTransition(Screen.HOME);
  }, [performSmoothTransition]);

  const handleLogout = useCallback(() => {
    // Çıkış yap - AuthContext logout'u çağır ve onboarding'e dön
    console.log('🚪 Logout işlemi başlatılıyor...');
    // Seçili konuşmayı temizle - tekrar giriş yapınca Home'da başlasın
    setSelectedConversationId(undefined);
    setPreviousScreen(null);
    performSmoothTransition(Screen.ONBOARDING);
  }, [performSmoothTransition]);


  const renderCurrentScreen = useCallback(() => {
    switch (currentScreen) {
      case Screen.SPLASH:
        return <SplashScreen />;
      case Screen.ONBOARDING:
        return <OnboardingScreen onNext={handleOnboardingNext} />;
      case Screen.LOGIN:
        return <LoginMethodScreen onBack={handleLoginBack} onLoginSuccess={handleLoginSuccess} />;
      case Screen.COMPLETE_PROFILE:
        return <CompleteProfileScreen 
          onComplete={handleProfileComplete}
          initialData={profileCompleteData}
        />;
      case Screen.HOME:
        return <HomeScreen 
          onOpenChatHistory={handleOpenChatHistory} 
          selectedConversationId={selectedConversationId}
          onConversationSelected={() => setSelectedConversationId(undefined)}
        />;
      case Screen.CHAT_HISTORY:
        return <ChatHistoryScreen 
          onBack={handleBackFromChatHistory} 
          onSelectConversation={handleSelectConversation}
          onOpenProfile={handleOpenProfile}
        />;
      case Screen.PROFILE:
        return <ProfileScreen 
          onBack={handleBackFromProfile}
          onChatPress={handleChatFromProfile}
          onHelpCenterPress={handleOpenHelpCenter}
          onLogout={handleLogout}
        />;
      case Screen.HELP_CENTER:
        return <HelpCenterScreen 
          onBack={handleBackFromHelpCenter}
          onChatPress={handleChatFromHelpCenter}
        />;
      default:
        return <SplashScreen />;
    }
  }, [currentScreen, selectedConversationId, profileCompleteData, handleOnboardingNext, handleLoginBack, handleLoginSuccess, handleProfileComplete, handleOpenChatHistory, handleBackFromChatHistory, handleSelectConversation, handleOpenProfile, handleBackFromProfile, handleChatFromProfile, handleOpenHelpCenter, handleBackFromHelpCenter, handleChatFromHelpCenter]);

  return (
    <ErrorBoundary>
      <ChatProvider>
        <DeepLinkHandler onLoginSuccess={handleLoginSuccess} />
        <View style={styles.container}>
          {renderCurrentScreen()}
        </View>
        <StatusBar style="light" />
      </ChatProvider>
    </ErrorBoundary>
  );
}

// Ana App component'i - AuthProvider ile sarılmış
export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

// Optimized StyleSheet for better performance
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#16163C', // Prevent white flash during transitions
  },
});
