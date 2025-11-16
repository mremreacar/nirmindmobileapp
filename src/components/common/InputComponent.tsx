import React, { useRef, useEffect, memo, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Animated, Dimensions, Platform, Easing, Image, ScrollView, Keyboard, PanResponder } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SvgXml } from 'react-native-svg';
import { DictationButton } from '../../features/dictation';

const { width, height } = Dimensions.get('window');
const isSmallScreen = height < 700;
const isLargeScreen = height > 800;
const isTablet = width > 600;
const isAndroid = Platform.OS === 'android';

// Responsive font size function
const getResponsiveFontSize = (baseSize: number): number => {
  if (isSmallScreen) return baseSize * 0.9;
  if (isLargeScreen) return baseSize * 1.1;
  return baseSize;
};

// SVG Icons
const SVG_ICONS = {
  mic: `<svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M13.9798 2.33337C11.1588 2.33337 8.8887 4.68672 8.8887 7.61103V11.1585C8.8887 14.0828 11.1588 16.4389 13.9798 16.4389H14.0209C16.8419 16.4389 19.112 14.0842 19.112 11.1585V7.61103C19.112 4.68668 16.8418 2.33337 14.0209 2.33337H13.9798ZM21.238 13.3142C20.8828 13.3342 20.5752 13.573 20.4568 13.9199C19.5263 16.6882 16.9758 18.7054 13.9952 18.7054C11.016 18.7054 8.46268 16.6883 7.53362 13.9199C7.37276 13.4516 6.87728 13.2035 6.423 13.3649C5.96743 13.529 5.72548 14.0426 5.87993 14.5162C7.04975 18.0022 10.2541 20.5265 13.9954 20.5265C17.7366 20.5265 20.9462 18.0117 22.1184 14.5244C22.1943 14.2963 22.1802 14.0455 22.0798 13.828C21.9781 13.6106 21.7966 13.4438 21.5766 13.3651C21.4685 13.3251 21.3525 13.3076 21.238 13.3142ZM14.0015 21.9259C12.4649 21.9259 10.0556 22.6997 10.0556 23.8563C10.0556 25.1824 11.7389 25.6667 14.0015 25.6667C16.2639 25.6667 17.946 25.1824 17.946 23.8563C17.946 22.6997 15.5382 21.9259 14.0015 21.9259Z" fill="white"/>
</svg>`,
  send: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M22 2L11 13" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`,
  stop: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect x="2" y="2" width="18" height="18" rx="5" fill="rgba(255,255,255,0.16)" stroke="white" stroke-width="1.5"/>
<rect x="6.5" y="6.5" width="9" height="9" rx="2" fill="white"/>
</svg>`,
} as const;

// Plus Icon SVG
const plusIconSvg = `<svg width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect width="52" height="52" rx="26" fill="#16163C"/>
<path d="M26 18V34" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M18 26H34" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

// Responsive functions
const getResponsiveInputBorderRadius = () => {
  if (isSmallScreen) return isAndroid ? 40 : 45;
  return isAndroid ? 45 : 50;
};

const getResponsiveInputPaddingVertical = () => {
  if (isSmallScreen) return isAndroid ? 10 : 8; // 2px artırıldı (daha dengeli)
  return isAndroid ? 12 : 10; // 2px artırıldı (daha dengeli)
};

const getResponsiveInputMinHeight = () => {
  if (isSmallScreen) return isAndroid ? 56 : 54; // 10px artırıldı (daha dengeli)
  return isAndroid ? 60 : 58; // 10px artırıldı (daha dengeli)
};

interface InputComponentProps {
  // Core props
  inputText: string;
  setInputText: (text: string) => void;
  onSendMessage: () => void;
  onDictate: () => void;
  onOpenUploadModal: () => void;
  
  // State props
  isDictating: boolean;
  isProcessing?: boolean; // Yeni prop: deşifre durumu
  isLoading?: boolean; // Loading state
  isStreaming?: boolean;
  isInputFocused: boolean;
  setIsInputFocused: (focused: boolean) => void;
  isKeyboardVisible?: boolean; // Klavye durumu (layout bug'ını önlemek için)
  
  // File handling
  hasSelectedFiles?: boolean;
  selectedFilesCount?: number;
  selectedImagesCount?: number;
  showSelectedFilesIndicator?: boolean;
  
  // Attachment preview
  selectedImages?: string[];
  selectedFiles?: any[];
  onRemoveImage?: (index: number) => void;
  onRemoveFile?: (index: number) => void;
  
  // TextInput props
  textInputRef?: React.RefObject<TextInput | null>;
  placeholder?: string;
  multiline?: boolean;
  maxLength?: number;
  autoCorrect?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  returnKeyType?: 'done' | 'go' | 'next' | 'search' | 'send' | 'default';
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
  secureTextEntry?: boolean;
  editable?: boolean;
  selectTextOnFocus?: boolean;
  clearButtonMode?: 'never' | 'while-editing' | 'unless-editing' | 'always';
  autoFocus?: boolean;
  blurOnSubmit?: boolean;
  
  // Event handlers
  onFocus?: () => void;
  onBlur?: () => void;
  onKeyPress?: (key: string) => void;
  onSubmitEditing?: () => void;
  onTextChange?: (text: string) => void;
  onContentSizeChange?: (event: any) => void;
  onSelectionChange?: (event: any) => void;
  onTextInput?: (event: any) => void;
  onScroll?: (event: any) => void;
  onLayout?: (event: any) => void;
  onCancelStreaming?: () => void;
  
  // Accessibility
  testID?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: string;
  
  // Custom styling
  containerStyle?: any;
  inputContainerStyle?: any;
  textInputStyle?: any;
  buttonStyle?: any;
  
  // Wave animation for dictation (optional)
  waveAnimations?: Animated.Value[];
  
  // CRITICAL: Dictation state for enhanced UX
  dictationState?: {
    isStopping?: boolean;
    hasError?: boolean;
    errorMessage?: string;
    audioLevel?: number;
    duration?: number;
  };
}

const InputComponent: React.FC<InputComponentProps> = ({
  // Core props
  inputText,
  setInputText,
  onSendMessage,
  onDictate,
  onOpenUploadModal,
  
  // State props
  isDictating,
  isProcessing = false, // Default değer
  isLoading = false, // Loading state
  isStreaming = false,
  isInputFocused,
  setIsInputFocused,
  isKeyboardVisible = false, // Klavye durumu (default: false)
  
  // File handling
  hasSelectedFiles = false,
  selectedFilesCount = 0,
  selectedImagesCount = 0,
  showSelectedFilesIndicator = true,
  
  // Attachment preview
  selectedImages = [],
  selectedFiles = [],
  onRemoveImage,
  onRemoveFile,
  
  // TextInput props
  textInputRef: externalTextInputRef,
  placeholder = "İstediğinizi sorun",
  multiline = false,
  maxLength = 1000,
  autoCorrect = true,
  autoCapitalize = 'sentences',
  editable = true,
  autoFocus = false,
  
  // Event handlers
  onFocus,
  onBlur,
  onKeyPress,
  onSubmitEditing,
  onTextChange,
  onContentSizeChange,
  onSelectionChange,
  onTextInput,
  onScroll,
  onLayout,
  onCancelStreaming = () => {},
  
  // Accessibility
  testID = 'input-component',
  accessibilityLabel = 'Soru girişi',
  accessibilityHint = 'AI asistanınıza soru yazın veya sesli yazma kullanın',
  accessibilityRole = 'textbox' as any,
  
  // Custom styling
  containerStyle,
  inputContainerStyle,
  textInputStyle,
  buttonStyle,
  
  // Wave animation
  waveAnimations,
  
  // CRITICAL: Dictation state
  dictationState,
}) => {
  const internalTextInputRef = useRef<TextInput | null>(null);
  const textInputRef = externalTextInputRef || internalTextInputRef;
  
  // Separate animated values to avoid conflicts
  const pulseAnim = useRef(new Animated.Value(1)).current;
  // animatedHeight kaldırıldı - direkt state kullanılıyor
  
  // Buton çakışmasını önlemek için ref'ler
  const isActionInProgressRef = useRef(false);
  const lastActionTimeRef = useRef(0);
  
  // Input yükseklik güncellemelerini throttle etmek için ref'ler
  const heightUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastHeightRef = useRef<number>(getResponsiveInputMinHeight());
  
  // Dynamic height state
  const [inputHeight, setInputHeight] = useState(getResponsiveInputMinHeight());
  const [isScrollable, setIsScrollable] = useState(false);
  const scrollViewRef = useRef<ScrollView | null>(null);
  const [contentHeight, setContentHeight] = useState(0);
  const [visibleHeight, setVisibleHeight] = useState(0);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  
  // CRITICAL: İlk kullanım deneyimi için tooltip
  const [showTooltip, setShowTooltip] = useState(false);
  const [buttonLayout, setButtonLayout] = useState<{ x: number; y: number; width: number; height: number } | undefined>();
  const buttonRef = useRef<TouchableOpacity | null>(null);
  
  // Constants for dynamic sizing - Daha iyi genişleme
  const MIN_INPUT_HEIGHT = getResponsiveInputMinHeight() + 10; // 10px daha yüksek (daha dengeli)
  // CRITICAL FIX: 3 satır sonra scroll aktif olsun - kullanıcı 3. satıra kadar görebilsin
  // 3 satır × 24px (lineHeight) + 16px (padding) = 88px
  // Margin için +8px = 96px, ama daha güvenli için 100px
  const MAX_INPUT_HEIGHT = isTablet ? 110 : (isLargeScreen ? 105 : 100); // 3 satır sonra scroll için ayarlandı
  const SCROLL_THRESHOLD = MAX_INPUT_HEIGHT - 16;

  useEffect(() => {
    if (!inputText.trim()) {
      // Input temizlendiğinde yüksekliği sıfırla (animasyon kaldırıldı - native driver uyumluluğu için)
      setInputHeight(MIN_INPUT_HEIGHT);
      lastHeightRef.current = MIN_INPUT_HEIGHT;
      setIsScrollable(false);
      setCanScrollUp(false);
      setCanScrollDown(false);
    }
  }, [inputText, MIN_INPUT_HEIGHT]);
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (heightUpdateTimeoutRef.current) {
        clearTimeout(heightUpdateTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isScrollable) {
      setCanScrollUp(false);
      setCanScrollDown(false);
      return;
    }

    const hasScrollableContent = contentHeight > visibleHeight + 20;
    setCanScrollDown(hasScrollableContent);
  }, [contentHeight, visibleHeight, isScrollable]);

  // Dikte animasyonu - Native driver kullan
  useEffect(() => {
    if (isDictating) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.03,
            duration: 1200,
            easing: Easing.bezier(0.4, 0.0, 0.2, 1),
            useNativeDriver: true, // Transform için native driver kullan
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1200,
            easing: Easing.bezier(0.4, 0.0, 0.2, 1),
            useNativeDriver: true, // Transform için native driver kullan
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isDictating, pulseAnim]);

  const handleFocus = () => {
    setIsInputFocused(true);
    onFocus?.();
  };

  const handleBlur = () => {
    setIsInputFocused(false);
    onBlur?.();
  };

  const handleKeyPress = (e: any) => {
    const key = e.nativeEvent.key;
    const shiftKey = e.nativeEvent.shiftKey || false;
    const metaKey = e.nativeEvent.metaKey || false; // Cmd (Mac) veya Windows key
    const ctrlKey = e.nativeEvent.ctrlKey || false;
    
    // Mobil için sadeleştirilmiş klavye özellikleri
    if (key === 'Enter') {
      // Shift+Enter: Yeni satır ekle (multiline aktifken) - Mobil ve Desktop'ta çalışır
      if (shiftKey && multiline) {
        // Yeni satır ekle - TextInput bunu otomatik yapar
        return;
      }
      
      // Desktop/Tablet: Cmd/Ctrl + Enter = Mesaj gönder (her durumda)
      // Mobil: Fiziksel klavye yoksa bu çalışmaz
      if ((metaKey || ctrlKey) && (Platform.OS === 'web' || Platform.OS === 'macos')) {
        if (onSendMessage && inputText.trim()) {
          handleSendPress();
          return;
        }
      }
      
      // Normal Enter: Multiline aktifken yeni satır, değilse gönder
      if (multiline) {
        // Yeni satır ekle - TextInput bunu otomatik yapar
        return;
      } else {
        // Multiline kapalıysa mesaj gönder (mobil için uygun)
        if (onSendMessage && inputText.trim()) {
          handleSendPress();
          return;
        }
      }
    }
    
    // Escape: Klavyeyi kapat (sadece fiziksel klavye varsa çalışır)
    if (key === 'Escape') {
      Keyboard.dismiss();
      setIsInputFocused(false);
      return;
    }
    
    // Arrow keys: Mesaj geçmişinde gezinme (sadece fiziksel klavye varsa)
    // Mobilde genelde ok tuşları yok, bu yüzden sadece callback'e gönder
    if ((key === 'ArrowUp' || key === 'ArrowDown') && !shiftKey && !metaKey && !ctrlKey) {
      // onKeyPress callback'i ile mesaj geçmişinde gezinme yapılacak (fiziksel klavye varsa)
      onKeyPress?.(key);
      return;
    }
    
    onKeyPress?.(key);
  };

  const handleSubmitEditing = () => {
    // Multiline aktifken Enter tuşu yeni satır eklemek için kullanılıyor
    // Mesaj göndermek için gönder butonunu kullan
    // Bu fonksiyon multiline modda çağrılmamalı
  };

  const handleSendPress = useCallback(() => {
    // Loading guard - eğer mesaj işleniyorsa gönderme
    if (isLoading || isStreaming) {
      return;
    }
    
    // Çift gönderimi engelle - eğer input boşsa gönderme
    if (!inputText.trim() && !hasSelectedFiles) {
      return;
    }
    
    // Send message - input'u temizleyecek
    onSendMessage();
  }, [inputText, hasSelectedFiles, isLoading, isStreaming, onSendMessage]);

  // Durdurma butonu için optimize edilmiş handler
  const handleCancelStreaming = useCallback(() => {
    // Çift basmayı ve çakışmayı önle - debounce süresini azalt
    const now = Date.now();
    if (isActionInProgressRef.current || (now - lastActionTimeRef.current < 100)) {
      return; // 100ms debounce (300ms'den 100ms'ye düşürüldü)
    }
    isActionInProgressRef.current = true;
    lastActionTimeRef.current = now;
    
    // Hemen işlemi başlat
    onCancelStreaming();
    
    // Flag'i daha hızlı reset et
    setTimeout(() => {
      isActionInProgressRef.current = false;
    }, 100);
  }, [onCancelStreaming]);

  // Dikte butonu için optimize edilmiş handler
  const handleDictatePress = useCallback(() => {
    // Çift basmayı ve çakışmayı önle - debounce süresini azalt
    const now = Date.now();
    if (isActionInProgressRef.current || (now - lastActionTimeRef.current < 100)) {
      return; // 100ms debounce (300ms'den 100ms'ye düşürüldü)
    }
    if (isStreaming) {
      return; // Streaming aktifken dikte başlatma
    }
    isActionInProgressRef.current = true;
    lastActionTimeRef.current = now;
    
    // Hemen işlemi başlat
    onDictate();
    
    // Flag'i daha hızlı reset et
    setTimeout(() => {
      isActionInProgressRef.current = false;
    }, 100);
  }, [onDictate, isStreaming]);

  // Optimized text change handler - performans ve smooth yazma için
  const handleTextChange = useCallback((text: string) => {
    // React state'i güncelle
    setInputText(text);
    onTextChange?.(text);
    
    // Native state'i de senkronize et (özellikle temizleme için önemli)
    if (text === '' && textInputRef.current) {
      try {
        textInputRef.current.setNativeProps({ text: '' });
      } catch (error) {
        // Hata durumunda sessizce devam et
      }
    }
    
    // Yazma sırasında son satıra scroll yap (her karakter için)
    // Özellikle scroll aktif olduğunda (maksimum yüksekliğe ulaşıldığında) mutlaka scroll yap
    if (text.length > 0 && scrollViewRef.current) {
      // Her zaman scroll yap (scroll aktif olsun ya da olmasın, yazarken son satırda olmalıyız)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (scrollViewRef.current) {
            scrollViewRef.current.scrollTo({
              y: Number.MAX_SAFE_INTEGER,
              animated: false, // Anında scroll (yazma sırasında daha smooth)
            });
          }
        });
      });
    }
  }, [onTextChange]);

  const handleContentSizeChange = (event: any) => {
    // CRITICAL FIX: Klavye açıkken content size değişikliklerini ignore et
    // Klavye açılınca TextInput'un layout'u değişiyor ve bu handler'ı tetikliyor
    // Bu da input yüksekliğini değiştiriyor ve layout'u bozuyor
    if (isKeyboardVisible) {
      // Klavye açıkken sadece callback'i çağır, yükseklik güncellemesi yapma
      onContentSizeChange?.(event);
      return;
    }
    
    const { height } = event.nativeEvent.contentSize;
    const adjustedHeight = height + 22; // Alt satırın kesilmemesi için fazladan boşluk
    const boundedHeight = Math.max(MIN_INPUT_HEIGHT, Math.min(Math.ceil(adjustedHeight), MAX_INPUT_HEIGHT));
    
    // Eğer yükseklik değişikliği çok küçükse (8px'den az), güncelleme yapma
    const heightDifference = Math.abs(boundedHeight - lastHeightRef.current);
    if (heightDifference < 8 && boundedHeight !== lastHeightRef.current) {
      return; // Çok küçük değişiklikleri ignore et
    }
    
    // Önceki timeout'u temizle
    if (heightUpdateTimeoutRef.current) {
      clearTimeout(heightUpdateTimeoutRef.current);
    }
    
    // Debounce: 150ms sonra güncelle
    heightUpdateTimeoutRef.current = setTimeout(() => {
      // Yükseklik değişikliği yeterince büyükse güncelle (animasyon kaldırıldı - native driver uyumluluğu için)
      if (Math.abs(boundedHeight - lastHeightRef.current) >= 8) {
        setInputHeight(boundedHeight);
        lastHeightRef.current = boundedHeight;
      }
      const newIsScrollable = adjustedHeight >= SCROLL_THRESHOLD;
      setIsScrollable(newIsScrollable);
      setContentHeight(adjustedHeight);
      
      // Content size değiştiğinde son satıra scroll yap (yazma sırasında)
      // Özellikle scroll aktif olduğunda veya maksimum yüksekliğe ulaşıldığında mutlaka scroll yap
      if (inputText.length > 0 && scrollViewRef.current) {
        // Scroll aktifse veya maksimum yüksekliğe ulaşıldıysa, hemen scroll yap
        const shouldScroll = newIsScrollable || boundedHeight >= MAX_INPUT_HEIGHT - 10;
        
        if (shouldScroll) {
          // Triple requestAnimationFrame ile layout güncellemelerini bekle (daha güvenilir)
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                if (scrollViewRef.current) {
                  scrollViewRef.current.scrollTo({
                    y: Number.MAX_SAFE_INTEGER,
                    animated: false, // Anında scroll (yazma sırasında)
                  });
                }
              });
            });
          });
        }
      }
      
      onContentSizeChange?.(event);
    }, 150);
  };

  // Enhanced scroll handling - Son yazıları göstermek için
  const handleScroll = useCallback((event: any) => {
    const offsetY = event.nativeEvent.contentOffset?.y || 0;
    const layoutHeight = event.nativeEvent.layoutMeasurement?.height || 0;
    const totalHeight = event.nativeEvent.contentSize?.height || 0;
    setCanScrollUp(offsetY > 4);
    setCanScrollDown(offsetY + layoutHeight < totalHeight - 18);
    onScroll?.(event);
  }, [onScroll]);

  // Selection change handler - kullanıcı cursor'ı manuel olarak hareket ettirdiğinde
  const handleSelectionChange = useCallback((event: any) => {
    const { selection } = event.nativeEvent;
    onSelectionChange?.(event);
    
    // Eğer kullanıcı cursor'ı sona yakın bir yere taşıdıysa, otomatik scroll yap
    const textLength = inputText.length;
    const distanceFromEnd = textLength - selection.end;
    
    // Son 50 karakter içindeyse otomatik scroll yap
    if (distanceFromEnd < 50 && scrollViewRef.current) {
      requestAnimationFrame(() => {
        if (scrollViewRef.current) {
          scrollViewRef.current.scrollTo({
            y: Number.MAX_SAFE_INTEGER,
            animated: true, // Smooth scroll (manuel cursor hareketi için)
          });
        }
      });
    }
  }, [inputText, onSelectionChange]);

  // Input text değiştiğinde native state'i senkronize et ve cursor yönetimi
  // Ayrıca scroll aktif olduğunda otomatik scroll yap
  useEffect(() => {
    if (!textInputRef.current) return;
    
    if (inputText.length > 0) {
      // Cursor'ı sona taşı (yazma sırasında)
      // requestAnimationFrame ile smooth cursor movement
      requestAnimationFrame(() => {
        if (textInputRef.current) {
          try {
            textInputRef.current.setNativeProps({
              selection: { start: inputText.length, end: inputText.length }
            });
            
            // Scroll aktifse veya maksimum yüksekliğe ulaşıldıysa, cursor hareketinden sonra scroll yap
            // Input alanı maksimum yüksekliğe ulaştığında her yeni satırda otomatik scroll
            if ((isScrollable || inputHeight >= MAX_INPUT_HEIGHT - 10) && scrollViewRef.current) {
              requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                  if (scrollViewRef.current) {
                    scrollViewRef.current.scrollTo({
                      y: Number.MAX_SAFE_INTEGER,
                      animated: false,
                    });
                  }
                });
              });
            }
          } catch (error) {
            // Hata durumunda sessizce devam et
          }
        }
      });
    } else {
      // Input temizlendiğinde TextInput'un native state'ini de temizle
      // Bu React Native'de native state ile React state senkronizasyonu için gerekli
      // Hemen temizle (gecikme yok)
      try {
        textInputRef.current.setNativeProps({
          text: ''
        });
        // Selection'ı da sıfırla
        textInputRef.current.setNativeProps({
          selection: { start: 0, end: 0 }
        });
      } catch (error) {
        // Hata durumunda sessizce devam et
        // Native state zaten React state'e bağlı, bu sadece bir optimizasyon
      }
    }
  }, [inputText, isScrollable, inputHeight]);

  // Smart scroll to bottom - Geliştirilmiş versiyon
  const scrollToBottom = useCallback(() => {
    if (!scrollViewRef.current) return;

    scrollViewRef.current.scrollTo({
      y: Number.MAX_SAFE_INTEGER,
      animated: true,
    });

    if (textInputRef.current) {
      try {
        textInputRef.current.setNativeProps({
          selection: { start: inputText.length, end: inputText.length },
        });
      } catch (error) {
        console.log('Scroll to bottom error:', error);
      }
    }
  }, [inputText.length]);

  // CRITICAL FIX: Auto scroll to bottom when typing - Her karakter yazıldığında son satıra scroll
  // Input alanı scroll edilebilir olduğunda, kullanıcı yazdığı metni görebilsin
  useEffect(() => {
    if (inputText.length > 0 && isScrollable && scrollViewRef.current) {
      // Scroll aktif olduğunda her karakter yazıldığında son satıra scroll yap
      // Bu sayede kullanıcı yazdığı metni görebilir (3. satırdan sonrasını görebilir)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (scrollViewRef.current) {
            scrollViewRef.current.scrollTo({
              y: Number.MAX_SAFE_INTEGER,
              animated: false, // Anında scroll (yazma sırasında daha smooth)
            });
          }
        });
      });
    }
  }, [inputText, isScrollable]);


  const shouldShowSendButton = !isStreaming && (inputText.trim() || hasSelectedFiles);

  // Plus butonuna basıldığında modalı aç
  // openUploadModal zaten klavyeyi kapatıyor ve smooth geçiş sağlıyor
  const handlePlusButtonPress = useCallback(() => {
    onOpenUploadModal();
  }, [onOpenUploadModal]);

  // UX: Klavyeyi kapatma için smooth dismiss fonksiyonu
  const dismissKeyboardSmoothly = useCallback(() => {
    if (isKeyboardVisible || isInputFocused) {
      Keyboard.dismiss();
      setIsInputFocused(false);
    }
  }, [isKeyboardVisible, isInputFocused, setIsInputFocused]);

  // UX: Swipe down gesture ile klavyeyi kapatma (WhatsApp, iMessage tarzı)
  const swipeDownPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false, // Başlangıçta yakalama
        onMoveShouldSetPanResponder: (_, gestureState) => {
          // Sadece aşağı doğru kaydırma hareketlerini yakala
          // Yeterince aşağı kaydırıldıysa ve dikey hareket yataydan fazlaysa
          const isDownwardSwipe = gestureState.dy > 10; // 10px'den fazla aşağı
          const isMostlyVertical = Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 1.5; // Dikey hareket yataydan 1.5x fazla
          
          return isDownwardSwipe && isMostlyVertical && (isKeyboardVisible || isInputFocused);
        },
        onPanResponderGrant: () => {
          // Gesture başladı - hafif haptic feedback eklenebilir
        },
        onPanResponderMove: (_, gestureState) => {
          // Hareket sırasında görsel feedback (opsiyonel - şimdilik sadece gesture takibi)
        },
        onPanResponderRelease: (_, gestureState) => {
          // Yeterince aşağı kaydırıldıysa klavyeyi kapat
          const swipeThreshold = 30; // 30px aşağı kaydırma threshold'u
          const velocityThreshold = 0.3; // Hızlı kaydırma için velocity threshold
          
          if (gestureState.dy > swipeThreshold || gestureState.vy > velocityThreshold) {
            // Smooth dismiss
            dismissKeyboardSmoothly();
          }
        },
      }),
    [isKeyboardVisible, isInputFocused, dismissKeyboardSmoothly]
  );

  // CRITICAL: Buton layout'unu ölç (tooltip için)
  const handleButtonLayout = useCallback((event: any) => {
    const { x, y, width, height } = event.nativeEvent.layout;
    setButtonLayout({ x, y, width, height });
  }, []);

  return (
    <View 
      style={[styles.inputSectionContainer, containerStyle]}
      {...swipeDownPanResponder.panHandlers} // UX: Swipe down gesture desteği
    >
      {/* CRITICAL: İlk kullanım deneyimi - tooltip */}
      {showTooltip && buttonLayout && (
        <DictationTooltip
          onDismiss={() => setShowTooltip(false)}
          buttonPosition={buttonLayout}
        />
      )}
      
      <Animated.View style={[
        styles.inputContainer,
        inputContainerStyle,
        {
          // CRITICAL FIX: Input alanının maksimum yüksekliği aşmamasını garanti et
          // Kullanıcı 3. satıra kadar görebilsin, sonrası scroll ile görünsün
          height: Math.min(inputHeight, MAX_INPUT_HEIGHT), // MAX_INPUT_HEIGHT'i aşmasın
          maxHeight: MAX_INPUT_HEIGHT, // Maksimum yükseklik sınırı
        },
        // Attachment'lar seçildiğinde genişlik artır
        (selectedImages.length > 0 || selectedFiles.length > 0) && {
          minHeight: Math.max(200, inputHeight), // Daha yüksek alan
          paddingVertical: 16, // Daha fazla padding
        },
        isDictating && {
          transform: [{ scale: pulseAnim }],
          borderColor: '#7E7AE9',
          borderWidth: 2,
          shadowColor: '#7E7AE9',
          shadowOffset: {
            width: 0,
            height: 0,
          },
          shadowOpacity: 0.4,
          shadowRadius: 8,
          elevation: 8,
        }
      ]}>
        {/* Plus Button - Sabit Konum */}
        <TouchableOpacity 
          style={styles.plusButtonFixed}
          onPress={handlePlusButtonPress}
          accessible={true}
          accessibilityLabel="Dosya yükle"
          accessibilityHint="Fotoğraf ve dosya yüklemek için dokunun"
          accessibilityRole="button"
        >
          <SvgXml xml={plusIconSvg} width={isSmallScreen ? 40 : 44} height={isSmallScreen ? 40 : 44} />
        </TouchableOpacity>

        {/* Input İçi İki Bölüm */}
        <View style={styles.inputContentContainer}>
          {/* Üst Bölüm - Attachment'lar */}
          {(selectedImages.length > 0 || selectedFiles.length > 0) && (
            <View style={styles.attachmentSection}>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.attachmentGridInside}
                contentContainerStyle={styles.attachmentGridContent}
                removeClippedSubviews={true}
                scrollEventThrottle={16}
              >
                {/* Seçilen Fotoğraflar */}
                {selectedImages.map((imageUri, index) => (
                  <View 
                    key={`image-${imageUri}-${index}`} 
                    style={styles.attachmentCard}
                  >
                    <TouchableOpacity 
                      style={styles.attachmentImageWrapper}
                      onPress={() => {
                        // TODO: Büyük önizleme modalı aç
                        console.log('Fotoğraf önizleme:', imageUri);
                      }}
                      activeOpacity={0.7}
                    >
                      <Image 
                        source={{ uri: imageUri }} 
                        style={styles.attachmentImage}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.removeAttachmentButton}
                      onPress={() => onRemoveImage?.(index)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.removeAttachmentIcon}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                
                {/* Seçilen Dosyalar */}
                {selectedFiles.map((file, index) => (
                  <View 
                    key={`file-${file.name || index}-${index}`} 
                    style={styles.attachmentCard}
                  >
                    <TouchableOpacity 
                      style={styles.attachmentFileWrapper}
                      onPress={() => {
                        // TODO: Dosya önizleme modalı aç
                        console.log('Dosya önizleme:', file.name);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.attachmentFileIcon}>
                        <Text style={styles.attachmentFileIconText}>📄</Text>
                      </View>
                      <View style={styles.attachmentFileInfo}>
                        <Text style={styles.attachmentFileName} numberOfLines={1}>
                          {file.name || `Dosya ${index + 1}`}
                        </Text>
                        <Text style={styles.attachmentFileSize}>
                          {file.size ? `${(file.size / 1024).toFixed(1)} KB` : 'Dosya'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.removeAttachmentButton}
                      onPress={() => onRemoveFile?.(index)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.removeAttachmentIcon}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Alt Bölüm - Mesaj Yazma Alanı */}
          <View
            style={[
              styles.messageSection,
              {
                // CRITICAL: Dikte veya processing durumunda içeriği ortala
                justifyContent: (isDictating || isProcessing) 
                  ? 'center' 
                  : (isSmallScreen && inputText.length === 0 && !isInputFocused ? 'center' : 'flex-start'),
              }
            ]}
            onLayout={(event) => {
              setVisibleHeight(event.nativeEvent.layout.height);
            }}
          >
            {/* Text Input, Processing, or Dictating */}
            {isProcessing ? (
              <Animated.View style={[styles.processingContainer, { transform: [{ scale: pulseAnim }] }]}>
                <Text style={styles.processingText}>
                  {dictationState?.isStopping ? 'Durduruluyor...' : 'Deşifre ediliyor...'}
                </Text>
              </Animated.View>
            ) : isDictating ? (
              <Animated.View style={[styles.dictatingContainer, { transform: [{ scale: pulseAnim }] }]}>
                <View style={styles.waveContainer}>
                  {waveAnimations && waveAnimations.length > 0 ? (
                    <View style={styles.waveRow}>
                      {waveAnimations.map((anim, index) => {
                        // CRITICAL: Gerçek zamanlı ses seviyesine göre animasyon yoğunluğu
                        const audioLevel = dictationState?.audioLevel || 0;
                        const baseOpacity = 0.2 + (audioLevel * 0.6); // 0.2 - 0.8 arası
                        const baseScale = 1 + (audioLevel * 0.3); // 1.0 - 1.3 arası
                        
                        return (
                          <Animated.View
                            key={index}
                            style={[
                              styles.inputWave,
                              {
                                transform: [{ scale: Animated.multiply(anim, baseScale) }],
                                opacity: anim.interpolate({
                                  inputRange: [1, 2.2],
                                  outputRange: [baseOpacity * 0.5, baseOpacity],
                                }),
                                backgroundColor: anim.interpolate({
                                  inputRange: [1, 2.2],
                                  outputRange: [
                                    `rgba(126, 122, 233, ${0.3 + audioLevel * 0.2})`,
                                    `rgba(126, 122, 233, ${0.7 + audioLevel * 0.2})`,
                                  ],
                                }),
                              },
                            ]}
                          />
                        );
                      })}
                    </View>
                  ) : null}
                </View>
                
                {/* CRITICAL: Gerçek zamanlı feedback - süre ve ses seviyesi göstergesi */}
                {(dictationState?.duration !== undefined || dictationState?.audioLevel !== undefined) && (
                  <View style={styles.realtimeFeedbackContainer}>
                    {dictationState.duration !== undefined && dictationState.duration > 0 && (
                      <Text style={styles.realtimeFeedbackText}>
                        {Math.floor(dictationState.duration / 60)}:{(dictationState.duration % 60).toString().padStart(2, '0')}
                      </Text>
                    )}
                    {dictationState.audioLevel !== undefined && dictationState.audioLevel > 0 && (
                      <View style={styles.audioLevelIndicator}>
                        <View 
                          style={[
                            styles.audioLevelBar,
                            { 
                              width: `${dictationState.audioLevel * 100}%`,
                              opacity: 0.6 + (dictationState.audioLevel * 0.4),
                            }
                          ]} 
                        />
                      </View>
                    )}
                  </View>
                )}
              </Animated.View>
            ) : (
              <>
                <View style={styles.textInputWrapper}>
                  {/* Bağımsız Placeholder - TextInput'tan ayrı, ortalanmış */}
                  {inputText.length === 0 && !isInputFocused && (
                    <View style={styles.placeholderContainer} pointerEvents="none">
                      <Text style={styles.placeholderText}>{placeholder}</Text>
                    </View>
                  )}
                  
                  <ScrollView
                    ref={scrollViewRef}
                    style={[
                      styles.textScrollView,
                      { 
                        height: inputHeight, // Dinamik yükseklik - TextInput'un içeriğine göre
                        minHeight: MIN_INPUT_HEIGHT, // Başlangıç yüksekliği - TextInput görünür olsun
                        maxHeight: MAX_INPUT_HEIGHT, // Maksimum yükseklik - scroll için
                      }
                    ]}
                    contentContainerStyle={[
                      styles.textScrollViewContent,
                      { 
                        // minHeight kaldırıldı - TextInput kendi yüksekliğini belirlesin
                        justifyContent: 'flex-start', // Her zaman üstten başla
                      }
                    ]}
                    scrollEnabled={isScrollable} // Scroll aktif olduğunda etkinleştir
                    showsVerticalScrollIndicator={isScrollable} // Scroll aktif olduğunda scroll göstergesini göster
                    keyboardShouldPersistTaps="handled"
                    nestedScrollEnabled={true}
                    onScroll={handleScroll}
                    scrollEventThrottle={16}
                    bounces={false} // Scroll sınırında bounce yapma
                  >
                    <TextInput
                      ref={textInputRef}
                      style={[
                        styles.textInput, 
                        textInputStyle,
                        {
                              // height kaldırıldı - multiline TextInput kendi yüksekliğini ayarlasın
                              minHeight: MIN_INPUT_HEIGHT, // Minimum yükseklik
                              paddingRight: isScrollable ? 8 : 4, // CRITICAL: Scroll indicator için yeterli boşluk: 12/8 -> 8/4
                              // paddingTop ve paddingBottom stil dosyasında ayarlanıyor
                              opacity: isProcessing ? 0.6 : 1,
                              width: '100%',
                              color: isDictating ? '#7E7AE9' : (inputText.length === 0 ? 'transparent' : '#FFFFFF'), // Boşken transparent (placeholder görünsün)
                              fontSize: 17, // Daha büyük font - daha iyi okunabilirlik
                              lineHeight: 24, // Daha büyük line height - daha iyi okunabilirlik
                              textAlign: 'left', // Her zaman sol hizalı
                              paddingTop: 24, // CRITICAL: Text alanı ikinci satırda başlamalı - ilk satır boş kalsın (12 -> 24, lineHeight kadar)
                              paddingBottom: 8,
                        },
                        isDictating && {
                          fontWeight: '600',
                        },
                      ]}
                      placeholder="" // Placeholder kaldırıldı - ayrı component kullanılıyor
                      placeholderTextColor="transparent" // Placeholder rengi transparent
                      value={inputText}
                onChangeText={handleTextChange}
                onContentSizeChange={handleContentSizeChange}
                onSelectionChange={handleSelectionChange}
                onKeyPress={handleKeyPress}
                onFocus={handleFocus}
                onBlur={handleBlur}
                editable={editable && !isDictating}
                multiline={multiline !== undefined ? multiline : true} // Her zaman multiline aktif - kullanıcı alt satıra geçebilmeli
                maxLength={maxLength}
                returnKeyType="default" // Multiline aktifken "default" kullan (yeni satır için)
                autoCorrect={autoCorrect}
                autoCapitalize={autoCapitalize}
                autoFocus={autoFocus}
                onSubmitEditing={undefined} // Multiline aktifken onSubmitEditing'i devre dışı bırak
                underlineColorAndroid="transparent"
                selectionColor="#7E7AE9"
                cursorColor="#7E7AE9"
                textAlignVertical="top" // Her zaman üstten başla - placeholder ayrı component
                keyboardType="default"
                blurOnSubmit={false}
                enablesReturnKeyAutomatically={false}
                autoComplete="off"
                spellCheck={false}
                textContentType="none"
              />
                    </ScrollView>

                    {isScrollable && canScrollUp && (
                      <LinearGradient
                        pointerEvents="none"
                        colors={["rgba(2, 2, 10, 0.85)", "rgba(2, 2, 10, 0)"]}
                        style={[styles.scrollFade, styles.scrollFadeTop]}
                      >
                        <Text style={styles.scrollHintArrow}>⌃</Text>
                      </LinearGradient>
                    )}

                    {isScrollable && canScrollDown && (
                      <LinearGradient
                        pointerEvents="none"
                        colors={["rgba(2, 2, 10, 0)", "rgba(2, 2, 10, 0.85)"]}
                        style={[styles.scrollFade, styles.scrollFadeBottom]}
                      >
                        <Text style={styles.scrollHintArrow}>⌄</Text>
                      </LinearGradient>
                    )}
                  </View>
              </>
            )}
          </View>
        </View>

      </Animated.View>


      {/* Microphone/Send Button */}
      {/* Öncelik sırası: 1. Dikte aktifse dikte butonu, 2. AI cevap yazıyorsa AI durdurma butonu, 3. Mesaj gönderilebilir durumda gönder butonu, 4. Değilse dikte başlatma butonu */}
      {isDictating || isProcessing ? (
        // Dikte aktifse veya işleniyorsa → Dikte butonu (durdurma/başlatma)
        <View
          ref={buttonRef}
          onLayout={handleButtonLayout}
          collapsable={false}
        >
          <DictationButton
            isDictating={isDictating}
            isProcessing={isProcessing}
            isStopping={dictationState?.isStopping}
            hasError={dictationState?.hasError}
            errorMessage={dictationState?.errorMessage}
            audioLevel={dictationState?.audioLevel}
            duration={dictationState?.duration}
            onPress={handleDictatePress}
            onRetry={handleDictatePress} // CRITICAL: Hata durumunda retry
            waveAnimations={waveAnimations || []}
            style={[styles.micButton, buttonStyle]}
          />
        </View>
      ) : isStreaming ? (
        // AI cevap yazıyorsa → AI cevabını durdurma butonu
        <TouchableOpacity
          style={[styles.cancelButton, buttonStyle]}
          onPress={handleCancelStreaming}
          disabled={isActionInProgressRef.current || isDictating || isProcessing}
          activeOpacity={0.6}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessible={true}
          accessibilityLabel="Yanıtı durdur"
          accessibilityHint="Devam eden AI yanıtını durdurmak için dokunun"
          accessibilityRole="button"
        >
          <LinearGradient
            colors={["#7E7AE9", "#4C46B3"]}
            locations={[0, 1]}
            style={styles.cancelButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          >
            <SvgXml 
              xml={SVG_ICONS.stop}
              width="26"
              height="26"
            />
          </LinearGradient>
        </TouchableOpacity>
      ) : shouldShowSendButton ? (
        // Mesaj gönderilebilir durumda → Gönder butonu
        <TouchableOpacity
          style={[styles.micButton, buttonStyle]}
          onPress={handleSendPress}
          activeOpacity={0.6}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessible={true}
          accessibilityLabel="Mesaj gönder"
          accessibilityHint="Mesajı göndermek için dokunun"
          accessibilityRole="button"
        >
          <LinearGradient
            colors={["#7E7AE9", "#3532A8"]}
            locations={[0, 1]}
            style={styles.micButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          >
            <SvgXml 
              xml={SVG_ICONS.send}
              width="24"
              height="24"
            />
          </LinearGradient>
        </TouchableOpacity>
      ) : (
        // Mesaj gönderilemez durumda → Dikte başlatma butonu
        <View
          ref={buttonRef}
          onLayout={handleButtonLayout}
          collapsable={false}
        >
          <DictationButton
            isDictating={isDictating}
            isProcessing={isProcessing}
            isStopping={dictationState?.isStopping}
            hasError={dictationState?.hasError}
            errorMessage={dictationState?.errorMessage}
            audioLevel={dictationState?.audioLevel}
            duration={dictationState?.duration}
            onPress={handleDictatePress}
            onRetry={handleDictatePress} // CRITICAL: Hata durumunda retry
            waveAnimations={waveAnimations || []}
            style={[styles.micButton, buttonStyle]}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  inputSectionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10, // Kenarlara göre optimize edildi: 12 -> 10
    width: '100%',
    paddingHorizontal: 0, // Kenarlara göre optimize edildi: 2 -> 0 (ChatInputSection'da zaten padding var)
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF0D',
    borderRadius: getResponsiveInputBorderRadius(),
    paddingLeft: 16, // CRITICAL: Text alanı sınırına çok yakın olmaması için artırıldı: 12 -> 16
    paddingRight: 16, // CRITICAL: Text alanı sınırına çok yakın olmaması için artırıldı: 12 -> 16
    paddingVertical: getResponsiveInputPaddingVertical(),
    gap: 8, // Kenarlara göre optimize edildi: 10 -> 8
    flex: 1,
    borderWidth: 0, // Hayalet çizgi kaldırıldı
    borderColor: 'transparent', // Border rengi şeffaf
    minHeight: getResponsiveInputMinHeight(),
  },
  plusButton: {
    width: isSmallScreen ? 44 : 48,
    height: isSmallScreen ? 44 : 48,
    borderRadius: isSmallScreen ? 24 : 28,
    backgroundColor: '#16163C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedFilesIndicator: {
    backgroundColor: 'rgba(126, 122, 233, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#7E7AE9',
  },
  selectedFilesText: {
    fontSize: 12,
    color: '#7E7AE9',
    fontWeight: '500',
    textAlign: 'center',
  },
  textInput: {
    width: '100%', // flex: 1 kaldırıldı - height dinamik olarak ayarlanacak
    fontFamily: 'Poppins-Regular',
    fontSize: 17, // Artırıldı: 15 -> 17 (daha iyi okunabilirlik)
    color: '#FFFFFF',
    textAlignVertical: 'top', // Uzun mesajlarda üstten başlat - satır satır görünmesi için kritik
    // height kaldırıldı - multiline TextInput kendi yüksekliğini ayarlasın
    minHeight: 50, // Minimum yükseklik
    paddingBottom: 8, // Alt padding eklendi - daha iyi görünürlük
    paddingLeft: 8, // CRITICAL: Text alanı sınırına çok yakın olmaması için artırıldı: 4 -> 8
    paddingRight: 4, // CRITICAL: Scroll indicator için minimal padding: 0 -> 4
    paddingTop: 24, // CRITICAL: Text alanı ikinci satırda başlamalı - ilk satır boş kalsın (12 -> 24, lineHeight kadar)
    lineHeight: 24, // Artırıldı: 20 -> 24 (daha iyi okunabilirlik) - satırlar arası boşluk
    // marginTop kaldırıldı - attachment'lardan bağımsız
    // Uzun mesajlarda daha iyi okunabilirlik için
    textAlign: 'left',
    includeFontPadding: false, // Android'de font padding'i kaldır
    fontWeight: '400', // Normal font weight - daha iyi okunabilirlik
  },
  micButton: {
    width: isSmallScreen ? 52 : 58,
    height: isSmallScreen ? 52 : 58,
    borderRadius: isSmallScreen ? 38 : 42,
    borderWidth: 1.8,
    borderColor: 'rgba(255, 255, 255, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  micButtonGradient: {
    width: '100%',
    height: '100%',
    borderRadius: isSmallScreen ? 38 : 42,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  devSendDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#7E7AE9',
  },
  cancelButton: {
    width: isSmallScreen ? 52 : 58,
    height: isSmallScreen ? 52 : 58,
    borderRadius: isSmallScreen ? 26 : 29, // CRITICAL: Tam yuvarlak - width/height'in yarısı (diğer butonlarla uyumlu)
    borderWidth: 1.6,
    borderColor: 'rgba(126, 122, 233, 0.6)',
    overflow: 'hidden',
  },
  cancelButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: isSmallScreen ? 26 : 29, // CRITICAL: Tam yuvarlak - width/height'in yarısı
  },
  // Attachment Preview Styles
  attachmentPreview: {
    backgroundColor: 'rgba(126, 122, 233, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(126, 122, 233, 0.3)',
  },
  attachmentTitle: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
    color: '#7E7AE9',
    marginBottom: 8,
    fontWeight: '600',
  },
  attachmentList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    maxWidth: 120,
    gap: 6,
  },
  attachmentImageContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(126, 122, 233, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachmentImageText: {
    fontSize: 12,
  },
  attachmentFileContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(126, 122, 233, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachmentFileText: {
    fontSize: 12,
  },
  attachmentText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 11,
    color: '#FFFFFF',
    flex: 1,
  },
  removeAttachmentText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  processingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: isTablet ? 24 : isLargeScreen ? 20 : 16, // Responsive padding - büyük ekranlarda daha fazla
    width: '100%', // Tam genişlik kullan
    maxWidth: '100%', // Maksimum genişlik sınırı yok
  },
  processingText: {
    fontFamily: 'Poppins-Medium',
    fontSize: getResponsiveFontSize(16), // Responsive font size - büyük ekranlarda daha büyük
    color: '#7E7AE9',
    textAlign: 'center',
    opacity: 0.8,
    width: '100%', // Tam genişlik kullan
  },
  dictatingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: isTablet ? 24 : isLargeScreen ? 20 : 16, // Responsive padding - büyük ekranlarda daha fazla
    width: '100%', // Tam genişlik kullan
    maxWidth: '100%', // Maksimum genişlik sınırı yok
    position: 'relative',
  },
  realtimeFeedbackContainer: {
    position: 'absolute',
    bottom: -30,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  realtimeFeedbackText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
    color: '#7E7AE9',
    fontWeight: '600',
    backgroundColor: 'rgba(126, 122, 233, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  audioLevelIndicator: {
    width: 60,
    height: 4,
    backgroundColor: 'rgba(126, 122, 233, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  audioLevelBar: {
    height: '100%',
    backgroundColor: '#7E7AE9',
    borderRadius: 2,
  },
  waveContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: 40,
  },
  waveRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 40,
  },
  inputWave: {
    width: 4,
    height: 20,
    borderRadius: 2,
    backgroundColor: '#7E7AE9',
    marginHorizontal: 1.5,
    shadowColor: '#7E7AE9',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 2,
  },
  
  // Inline Attachment Preview Styles
  attachmentPreviewInline: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginHorizontal: 4,
    backgroundColor: 'rgba(126, 122, 233, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(126, 122, 233, 0.2)',
  },
  attachmentListInline: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  attachmentItemInline: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(126, 122, 233, 0.15)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginRight: 4,
    marginBottom: 2,
    borderWidth: 1,
    borderColor: 'rgba(126, 122, 233, 0.3)',
  },
  attachmentImageContainerInline: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(126, 122, 233, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  attachmentImageTextInline: {
    fontSize: 8,
    color: '#7E7AE9',
  },
  attachmentFileContainerInline: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(126, 122, 233, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  attachmentFileTextInline: {
    fontSize: 8,
    color: '#7E7AE9',
  },
  attachmentTextInline: {
    fontSize: 10,
    color: '#7E7AE9',
    fontFamily: 'Poppins-Medium',
    maxWidth: 60,
  },
  removeAttachmentButtonInline: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(126, 122, 233, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  removeAttachmentTextInline: {
    color: '#7E7AE9',
    fontSize: 8,
    fontWeight: 'bold',
  },
  // Top Attachment Preview Styles (Kare Şeklinde)
  attachmentPreviewTop: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(126, 122, 233, 0.05)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(126, 122, 233, 0.1)',
  },
  attachmentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  attachmentSquare: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: 'rgba(126, 122, 233, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(126, 122, 233, 0.2)',
    position: 'relative',
    overflow: 'hidden',
  },
  attachmentOverlay: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  attachmentIcon: {
    fontSize: 10,
    color: '#FFFFFF',
  },
  attachmentFileSquare: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  removeAttachmentButtonSquare: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  removeAttachmentTextSquare: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  // Input İçi Attachment Preview Styles
  attachmentPreviewInside: {
    flex: 1,
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachmentGridInside: {
    maxHeight: 90, // Tek satır yüksekliği
    overflow: 'hidden', // Taşan içeriği gizle
    paddingHorizontal: 4,
    width: '100%',
  },
  attachmentGridContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  attachmentSquareInside: {
    width: 50,
    height: 50,
    borderRadius: 6,
    backgroundColor: 'rgba(126, 122, 233, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(126, 122, 233, 0.2)',
    position: 'relative',
    overflow: 'hidden',
  },
  attachmentImageInside: {
    width: '100%',
    height: '100%',
    borderRadius: 5,
  },
  attachmentOverlayInside: {
    position: 'absolute',
    top: 2,
    left: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 3,
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  attachmentIconInside: {
    fontSize: 8,
    color: '#FFFFFF',
  },
  attachmentFileSquareInside: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
  },
  attachmentFileIconInside: {
    fontSize: 16,
    marginBottom: 1,
  },
  attachmentFileNameInside: {
    fontSize: 7,
    color: '#7E7AE9',
    fontFamily: 'Poppins-Medium',
    textAlign: 'center',
    maxWidth: 40,
  },
  removeAttachmentButtonInside: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  removeAttachmentTextInside: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  
  // Yeni Profesyonel Attachment Styles
  attachmentCard: {
    backgroundColor: 'rgba(126, 122, 233, 0.1)',
    borderRadius: 4, // Dikdörtgen köşeler
    borderWidth: 1,
    borderColor: 'rgba(126, 122, 233, 0.3)',
    padding: 4,
    marginBottom: 0, // Tek satır için margin kaldırıldı
    position: 'relative',
    width: 70, // Küçültüldü - daha fazla sığsın
    height: 50, // Küçültüldü
    overflow: 'visible', // Remove button'un tamamen görünmesi için
    shadowColor: '#7E7AE9',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
    marginHorizontal: 2, // Yan boşluklar
    marginVertical: 2, // Üst-alt boşluklar
    flexShrink: 0, // Küçülmesin
  },
  attachmentImageWrapper: {
    width: '100%',
    height: 35,
    borderRadius: 2, // Dikdörtgen köşeler
    overflow: 'hidden',
    backgroundColor: 'rgba(126, 122, 233, 0.05)',
  },
  attachmentImage: {
    width: '100%',
    height: '100%',
  },
  attachmentFileWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 1,
    height: 35,
  },
  attachmentFileIcon: {
    width: 24,
    height: 24,
    borderRadius: 2, // Dikdörtgen köşeler
    backgroundColor: 'rgba(126, 122, 233, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  attachmentFileIconText: {
    fontSize: 12,
    color: '#7E7AE9',
  },
  attachmentFileInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  attachmentFileName: {
    fontSize: 9,
    color: '#FFFFFF',
    fontFamily: 'Poppins-Medium',
    marginBottom: 1,
  },
  attachmentFileSize: {
    fontSize: 8,
    color: '#9CA3AF',
    fontFamily: 'Poppins-Regular',
  },
  removeAttachmentButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 18,
    height: 18,
    borderRadius: 4, // Dikdörtgen köşeler
    backgroundColor: '#7E7AE9', // Mavi renk
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    shadowColor: '#7E7AE9',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
    zIndex: 10,
  },
  removeAttachmentIcon: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  // TextInput Container Styles
  textInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  textInputContainerWithAttachments: {
    marginTop: 8, // Attachment'lar olduğunda üstten boşluk
    width: '100%',
  },
  // Plus ve Attachment Container
  plusAndAttachmentsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  // Sabit Plus Button
  plusButtonFixed: {
    width: isSmallScreen ? 40 : 44,
    height: isSmallScreen ? 40 : 44,
    borderRadius: isSmallScreen ? 20 : 22,
    backgroundColor: 'transparent', // SVG'nin kendi background'u var (#16163C)
    borderWidth: 0, // SVG'nin kendi border'ı var
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  // Input İçi İki Bölüm Container
  inputContentContainer: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'flex-end', // Alt kısma hizala
  },
  // Üst Bölüm - Attachment'lar
  attachmentSection: {
    minHeight: 90,
    paddingVertical: 12,
    // Alt çizgi kaldırıldı - attachment'lar seçildiğinde çizgi yok
    marginBottom: 0, // Boşluk kaldırıldı
    flexDirection: 'column', // Dikey düzen
    maxHeight: 90, // Tek satır yüksekliği
    overflow: 'visible', // Taşan içeriği göster
    width: '100%', // Tam genişlik
    alignSelf: 'flex-start', // Üst kısma hizala
  },
  // Alt Bölüm - Mesaj Yazma
  messageSection: {
    flex: 1,
    minHeight: isSmallScreen ? 54 : 58, // TextInput'un minHeight'i kadar - görünür olsun
    alignSelf: 'stretch', // Tam genişlik
    position: 'relative',
    justifyContent: 'flex-start', // Üstten hizala - TextInput görünür olsun
    // paddingTop ve marginTop kaldırıldı - attachment'lardan bağımsız
    // Çizgi kaldırıldı - ortadan bölen çizgi yok
  },
  textInputWrapper: {
    position: 'relative',
    width: '100%',
  },
  placeholderContainer: {
    position: 'absolute',
    top: 24, // CRITICAL: Placeholder da ikinci satırda başlamalı - textInput ile aynı hizada (0 -> 24)
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-start', // CRITICAL: Üstten hizala - ikinci satırda başlasın (center -> flex-start)
    alignItems: 'center',
    zIndex: 1,
    pointerEvents: 'none', // Tıklamaları TextInput'a geçir
  },
  placeholderText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 17,
    color: '#9CA3AF',
    textAlign: 'left', // CRITICAL: TextInput ile aynı hizada olması için left (center -> left)
    width: '100%',
    paddingLeft: 8, // CRITICAL: TextInput'un paddingLeft'i ile aynı (8px)
  },
  textScrollView: {
    width: '100%',
    // flex: 1 kaldırıldı - height dinamik olarak ayarlanacak
    // maxHeight kaldırıldı - inline style'da ayarlanıyor
  },
  textScrollViewContent: {
    paddingRight: 8, // CRITICAL: Text alanı sınırına çok yakın olmaması için artırıldı: 6 -> 8
    paddingTop: 0, // CRITICAL: TextInput'un kendi paddingTop'u var (24px), burada padding gerekmez
    paddingBottom: 8,
    paddingLeft: 0, // TextInput'un kendi paddingLeft'i var
    // flexGrow: 1 kaldırıldı - minHeight dinamik olarak ayarlanacak
  },
  scrollFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollFadeTop: {
    top: 0,
  },
  scrollFadeBottom: {
    bottom: 0,
  },
  scrollHintArrow: {
    color: '#FFFFFF',
    fontSize: 12,
    opacity: 0.6,
  },
});

export default memo(InputComponent);

