import { useState, useEffect, useRef, useCallback } from 'react';
import { Keyboard, Platform, Dimensions, TextInput } from 'react-native';

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
    const keyboardWillShowListener = Keyboard.addListener(
      'keyboardWillShow',
      (e) => {
        setKeyboardAnimationDuration(e.duration || 250);
        setKeyboardAnimationEasing(e.easing || 'easeInEaseOut');
      }
    );

    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      (e) => {
        // Clear any pending hide timeout
        if (keyboardHideTimeoutRef.current) {
          clearTimeout(keyboardHideTimeoutRef.current);
          keyboardHideTimeoutRef.current = null;
        }

        // Debounce keyboard show
        if (keyboardShowTimeoutRef.current) {
          clearTimeout(keyboardShowTimeoutRef.current);
        }
        
        keyboardShowTimeoutRef.current = setTimeout(() => {
          setKeyboardHeight(e.endCoordinates.height);
          setIsKeyboardVisible(true);
        }, 50);
      }
    );

    const keyboardWillHideListener = Keyboard.addListener(
      'keyboardWillHide',
      (e) => {
        setKeyboardAnimationDuration(e.duration || 250);
        setKeyboardAnimationEasing(e.easing || 'easeInEaseOut');
      }
    );

    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        // Clear any pending show timeout
        if (keyboardShowTimeoutRef.current) {
          clearTimeout(keyboardShowTimeoutRef.current);
          keyboardShowTimeoutRef.current = null;
        }

        // Debounce keyboard hide
        if (keyboardHideTimeoutRef.current) {
          clearTimeout(keyboardHideTimeoutRef.current);
        }
        
        keyboardHideTimeoutRef.current = setTimeout(() => {
          setKeyboardHeight(0);
          setIsKeyboardVisible(false);
          // Don't automatically set input focus to false - let user control it
        }, 50);
      }
    );

    return () => {
      keyboardWillShowListener.remove();
      keyboardDidShowListener.remove();
      keyboardWillHideListener.remove();
      keyboardDidHideListener.remove();
      
      if (keyboardShowTimeoutRef.current) {
        clearTimeout(keyboardShowTimeoutRef.current);
      }
      if (keyboardHideTimeoutRef.current) {
        clearTimeout(keyboardHideTimeoutRef.current);
      }
    };
  }, []);

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
