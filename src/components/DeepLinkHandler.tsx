import { useEffect } from 'react';
import { Linking } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import CrossAppAuthService from '../services/CrossAppAuthService';

interface DeepLinkHandlerProps {
  onLoginSuccess?: () => void;
}

export const DeepLinkHandler: React.FC<DeepLinkHandlerProps> = ({ onLoginSuccess }) => {
  const { handleAuthCallback } = useAuth();
  const crossAppAuthService = CrossAppAuthService.getInstance();

  useEffect(() => {
    // Handle initial URL (app opened from deep link)
    const handleInitialUrl = async () => {
      try {
        const url = await Linking.getInitialURL();
        if (url) {
          // Deep link logları kaldırıldı (açılışta çok fazla log üretiyordu)
          await handleDeepLink(url);
        }
      } catch (error) {
        // Sadece hata durumunda log
        console.error('❌ Initial URL hatası:', error);
      }
    };

    // Handle deep link while app is running
    const handleUrlChange = (event: { url: string }) => {
      // Deep link logları kaldırıldı
      handleDeepLink(event.url);
    };

    const handleDeepLink = async (url: string) => {
      if (url.startsWith('nirmind://auth')) {
        // Auth callback logları kaldırıldı
        const parsed = crossAppAuthService.parseAuthCallback(url);

        if (parsed.token) {
          try {
            await handleAuthCallback(parsed.token);
            // Auth callback başarı logları kaldırıldı
            
            if (onLoginSuccess) {
              onLoginSuccess();
            }
          } catch (error: any) {
            console.error('❌ Auth callback hatası:', error);
          }
        } else if (parsed.error) {
          console.error('❌ Auth callback error:', parsed.error);
        }
      }
    };

    handleInitialUrl();

    // Subscribe to URL changes
    const subscription = Linking.addEventListener('url', handleUrlChange);

    // Cleanup
    return () => {
      subscription.remove();
    };
  }, [handleAuthCallback, onLoginSuccess]);

  return null; // This component doesn't render anything
};

