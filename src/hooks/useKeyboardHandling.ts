import { useState, useEffect, useRef, useCallback } from 'react';
import { Keyboard, Platform, Dimensions, TextInput, LayoutAnimation, UIManager } from 'react-native';

const { height, width } = Dimensions.get('window');

export const useKeyboardHandling = () => {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [keyboardAnimationDuration, setKeyboardAnimationDuration] = useState(250);
  const [keyboardAnimationEasing, setKeyboardAnimationEasing] = useState('easeInEaseOut');
  
  const textInputRef = useRef<TextInput | null>(null);
  const keyboardShowTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const keyboardHideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Responsive calculations
  const isSmallScreen = height < 700;
  const isLargeScreen = height > 800;
  const isTablet = width > 600;
  const isAndroid = Platform.OS === 'android';
  const isIOS = Platform.OS === 'ios';

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  const animateLayout = useCallback((duration?: number) => {
    const animationDuration = duration ?? 250;
    LayoutAnimation.configureNext({
      duration: animationDuration,
      update: {
        type: LayoutAnimation.Types.easeInEaseOut,
      },
      create: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
      delete: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
    });
  }, []);

  useEffect(() => {
    // iOS için keyboardWillShow - klavye açılmadan önce tetiklenir, daha iyi senkronizasyon
    const keyboardWillShowListener = isIOS ? Keyboard.addListener(
      'keyboardWillShow',
      (e) => {
        // Timeout yok - anında güncelle
        setKeyboardAnimationDuration(e.duration || 250);
        setKeyboardAnimationEasing(e.easing || 'easeInEaseOut');
        // LayoutAnimation'ı kaldırdık - HomeScreen kendi animasyonunu yönetiyor
        setKeyboardHeight(e.endCoordinates.height);
        setIsKeyboardVisible(true);
      }
    ) : null;

    // Android için keyboardDidShow - iOS'ta da fallback olarak kullanılabilir
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      (e) => {
        // iOS'ta keyboardWillShow zaten tetiklendi, sadece Android için
        if (isIOS && keyboardWillShowListener) {
          return;
        }
        
        // Clear any pending hide timeout
        if (keyboardHideTimeoutRef.current) {
          clearTimeout(keyboardHideTimeoutRef.current);
          keyboardHideTimeoutRef.current = null;
        }

        // Timeout yok - anında güncelle
        setKeyboardHeight(e.endCoordinates.height);
        setIsKeyboardVisible(true);
      }
    );

    // iOS için keyboardWillHide - klavye kapanmadan önce tetiklenir
    const keyboardWillHideListener = isIOS ? Keyboard.addListener(
      'keyboardWillHide',
      (e) => {
        // Timeout yok - anında güncelle
        setKeyboardAnimationDuration(e.duration || 250);
        setKeyboardAnimationEasing(e.easing || 'easeInEaseOut');
        // LayoutAnimation'ı kaldırdık
        setKeyboardHeight(0);
        setIsKeyboardVisible(false);
      }
    ) : null;

    // Android için keyboardDidHide - iOS'ta da fallback olarak kullanılabilir
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        // iOS'ta keyboardWillHide zaten tetiklendi, sadece Android için
        if (isIOS && keyboardWillHideListener) {
          return;
        }
        
        // Clear any pending show timeout
        if (keyboardShowTimeoutRef.current) {
          clearTimeout(keyboardShowTimeoutRef.current);
          keyboardShowTimeoutRef.current = null;
        }

        // Timeout yok - anında güncelle
        setKeyboardHeight(0);
        setIsKeyboardVisible(false);
      }
    );

    return () => {
      if (keyboardWillShowListener) {
        keyboardWillShowListener.remove();
      }
      keyboardDidShowListener.remove();
      if (keyboardWillHideListener) {
        keyboardWillHideListener.remove();
      }
      keyboardDidHideListener.remove();
      
      if (keyboardShowTimeoutRef.current) {
        clearTimeout(keyboardShowTimeoutRef.current);
      }
      if (keyboardHideTimeoutRef.current) {
        clearTimeout(keyboardHideTimeoutRef.current);
      }
    };
  }, [animateLayout, isIOS]);

  // Enhanced responsive padding calculations
  const getResponsivePaddingBottom = () => {
    if (isSmallScreen) return isAndroid ? 20 : 25;
    if (isLargeScreen) return isAndroid ? 35 : 40;
    return isAndroid ? 30 : 35;
  };

  const getKeyboardAwarePaddingBottom = () => {
    if (!isKeyboardVisible) {
      return getResponsivePaddingBottom();
    }
    
    // Very minimal padding when keyboard is visible - just enough to keep input above keyboard
    const minimalPadding = isAndroid ? 5 : 8;
    
    // Return minimal padding to keep input just above keyboard
    return minimalPadding;
  };

  // Enhanced input focus management
  const focusInput = useCallback(() => {
    if (textInputRef.current) {
      textInputRef.current.focus();
      setIsInputFocused(true);
    }
  }, []);

  const blurInput = useCallback(() => {
    if (textInputRef.current) {
      textInputRef.current.blur();
      setIsInputFocused(false);
    }
  }, []);

  const dismissKeyboard = useCallback(() => {
    Keyboard.dismiss();
    setIsInputFocused(false);
  }, []);

  // Smart keyboard dismissal
  const handleScreenPress = useCallback(() => {
    if (isKeyboardVisible || isInputFocused) {
      dismissKeyboard();
    }
  }, [isKeyboardVisible, isInputFocused, dismissKeyboard]);

  // Keyboard shortcuts support
  const handleKeyPress = useCallback((key: string, onSend?: () => void) => {
    if (key === 'Enter' && onSend) {
      onSend();
    }
  }, []);

  // Auto-scroll to input when keyboard shows
  const getScrollOffset = () => {
    if (!isKeyboardVisible) return 0;
    
    const headerHeight = isAndroid ? 65 : 80;
    const bottomSectionHeight = isSmallScreen ? 120 : 140;
    const availableHeight = height - headerHeight - bottomSectionHeight - keyboardHeight;
    
    return Math.max(0, availableHeight * 0.1); // 10% of available height
  };

  // Accessibility features
  const getAccessibilityProps = () => ({
    accessible: true,
    accessibilityLabel: isKeyboardVisible ? 'Klavye açık' : 'Klavye kapalı',
    accessibilityHint: isKeyboardVisible ? 'Klavyeyi kapatmak için ekrana dokunun' : 'Yazı yazmak için input alanına dokunun',
    accessibilityRole: 'button' as const,
  });

  return {
    // State
    keyboardHeight,
    isKeyboardVisible,
    isInputFocused,
    keyboardAnimationDuration,
    keyboardAnimationEasing,
    
    // Refs
    textInputRef,
    
    // Setters
    setIsInputFocused,
    
    // Functions
    getKeyboardAwarePaddingBottom,
    focusInput,
    blurInput,
    dismissKeyboard,
    handleScreenPress,
    handleKeyPress,
    getScrollOffset,
    getAccessibilityProps,
    
    // Responsive info
    isSmallScreen,
    isLargeScreen,
    isTablet,
    isAndroid,
    isIOS,
  };
};
