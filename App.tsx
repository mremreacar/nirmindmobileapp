import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, Keyboard, Linking } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import SplashScreen from './src/pages/SplashScreen';
import OnboardingScreen from './src/pages/OnboardingScreen';
import LoginMethodScreen from './src/pages/LoginMethodScreen';
import HomeScreen from './src/pages/HomeScreen';
import ChatHistoryScreen from './src/pages/ChatHistoryScreen';
import ProfileScreen from './src/pages/ProfileScreen';
import HelpCenterScreen from './src/pages/HelpCenterScreen';
import ErrorBoundary from './src/components/ErrorBoundary';
import { ChatProvider } from './src/lib/context/ChatContext';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { DeepLinkHandler } from './src/components/DeepLinkHandler';

// Navigation enum for type safety and performance
enum Screen {
  SPLASH = 'splash',
  ONBOARDING = 'onboarding',
  LOGIN = 'login',
  HOME = 'home',
  CHAT_HISTORY = 'chatHistory',
  PROFILE = 'profile',
  HELP_CENTER = 'helpCenter'
}

// Ana App component'i - AuthContext'i kullanır
function AppContent() {
  const [currentScreen, setCurrentScreen] = useState<Screen>(Screen.SPLASH);
  const [selectedConversationId, setSelectedConversationId] = useState<string | undefined>();
  const timerRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const { user, isLoading } = useAuth();
  

  // Simple transition function - no animations
  const performSmoothTransition = useCallback((targetScreen: Screen) => {
    // Önce klavyeyi kapat
    Keyboard.dismiss();
    // Sonra sayfa geçişini yap
    setCurrentScreen(targetScreen);
  }, []);

  useEffect(() => {
    // Auth durumu kontrol edilene kadar splash ekranında kal
    if (isLoading) {
      return;
    }

    // Auth kontrolü tamamlandı
    if (user) {
      // Kullanıcı giriş yapmış, direkt home'a git
      console.log('✅ Kullanıcı giriş yapmış, home ekranına yönlendiriliyor');
      performSmoothTransition(Screen.HOME);
    } else {
      // Kullanıcı giriş yapmamış, onboarding'e git
      console.log('ℹ️ Kullanıcı giriş yapmamış, onboarding ekranına yönlendiriliyor');
      performSmoothTransition(Screen.ONBOARDING);
    }
  }, [isLoading, user, performSmoothTransition]);

  // Optimized navigation handlers with smooth transitions
  const handleOnboardingNext = useCallback(() => {
    performSmoothTransition(Screen.LOGIN);
  }, [performSmoothTransition]);

  const handleLoginBack = useCallback(() => {
    performSmoothTransition(Screen.ONBOARDING);
  }, [performSmoothTransition]);

  const handleLoginSuccess = useCallback(() => {
    performSmoothTransition(Screen.HOME);
  }, [performSmoothTransition]);

  const handleOpenChatHistory = useCallback(() => {
    console.log('🔙 Chat history açılıyor...');
    performSmoothTransition(Screen.CHAT_HISTORY);
  }, [performSmoothTransition]);

  const handleBackToHome = useCallback(() => {
    performSmoothTransition(Screen.HOME);
  }, [performSmoothTransition]);

  const handleSelectConversation = useCallback((conversationId: string) => {
    setSelectedConversationId(conversationId);
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
      case Screen.HOME:
        return <HomeScreen 
          onOpenChatHistory={handleOpenChatHistory} 
          selectedConversationId={selectedConversationId}
          onConversationSelected={() => setSelectedConversationId(undefined)}
        />;
      case Screen.CHAT_HISTORY:
        return <ChatHistoryScreen 
          onBack={handleBackToHome} 
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
  }, [currentScreen, selectedConversationId, handleOnboardingNext, handleLoginBack, handleLoginSuccess, handleOpenChatHistory, handleBackToHome, handleSelectConversation, handleOpenProfile, handleBackFromProfile, handleChatFromProfile, handleOpenHelpCenter, handleBackFromHelpCenter, handleChatFromHelpCenter]);

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
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

// Optimized StyleSheet for better performance
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#16163C', // Prevent white flash during transitions
  },
});
