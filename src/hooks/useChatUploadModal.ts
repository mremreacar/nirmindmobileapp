import { useCallback, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, PanResponder, Easing, type GestureResponderHandlers, type TextInput } from 'react-native';
import { CHAT_CONSTANTS } from '@/src/constants/chatConstants';

interface UseChatUploadModalOptions {
  initialVisible?: boolean;
  dismissKeyboard: () => void;
  textInputRef: React.RefObject<TextInput | null>;
  setIsInputFocused: (value: boolean) => void;
  isKeyboardVisible?: boolean; // Klavye durumunu takip etmek için
}

interface UseChatUploadModalResult {
  showUploadModal: boolean;
  setShowUploadModal: React.Dispatch<React.SetStateAction<boolean>>;
  translateY: Animated.Value;
  openUploadModal: () => void;
  closeUploadModal: (shouldFocusInput?: boolean) => void;
  panHandlers: GestureResponderHandlers;
}

export const useChatUploadModal = ({
  initialVisible = false,
  dismissKeyboard,
  textInputRef,
  setIsInputFocused,
  isKeyboardVisible = false,
}: UseChatUploadModalOptions): UseChatUploadModalResult => {
  const screenHeight = Dimensions.get('window').height;
  const [showUploadModal, setShowUploadModal] = useState(initialVisible);
  const translateY = useRef(new Animated.Value(initialVisible ? 0 : screenHeight)).current;
  // Modal açılırken klavye durumunu kaydet
  const wasKeyboardVisibleRef = useRef(false);

  const openUploadModal = useCallback(() => {
    // Modal açılırken klavye durumunu kaydet
    wasKeyboardVisibleRef.current = isKeyboardVisible;
    
    // translateY'yi başlangıç pozisyonuna set et (modal açılmadan önce)
    translateY.setValue(screenHeight);
    
    // Modal'ı hemen göster - senkron çalışması için
    setShowUploadModal(true);
    
    // Animasyonu hemen başlat - timing animasyonu kullan (yaylanma yok)
    Animated.timing(translateY, {
      toValue: 0,
      duration: 250, // Smooth ve hızlı
      easing: Easing.out(Easing.cubic), // Smooth easing, yaylanma yok
      useNativeDriver: true,
    }).start();
    
    // Klavye kapatma işlemlerini modal açıldıktan sonra yap (asenkron, kasma yaratmaz)
    // Modal zaten klavyeyi kapatır, bu işlemler sadece state'i günceller
    if (textInputRef.current) {
      textInputRef.current.blur();
    }
    dismissKeyboard();
    setIsInputFocused(false);
  }, [dismissKeyboard, setIsInputFocused, textInputRef, translateY, screenHeight, isKeyboardVisible]);

  const closeUploadModal = useCallback(
    (shouldFocusInput = false) => {
      // Klavye açma mantığını önceden belirle
      const shouldOpenKeyboard = shouldFocusInput 
        ? true  // Fotoğraf seçildiğinde klavye açılsın
        : wasKeyboardVisibleRef.current;  // Sadece modal açılırken klavye açıksa klavye açılsın
      
      // Ref'i sıfırla (animasyon başlamadan önce)
      const wasKeyboardVisible = wasKeyboardVisibleRef.current;
      wasKeyboardVisibleRef.current = false;
      
      Animated.timing(translateY, {
        toValue: screenHeight,
        duration: 200, // Daha hızlı: 250 -> 200 (daha smooth)
        easing: Easing.out(Easing.cubic), // Smooth easing
        useNativeDriver: true,
      }).start(() => {
        setShowUploadModal(false);

        // Klavye açma işlemini animasyon tamamlandıktan hemen sonra yap (gecikme yok)
        if (shouldOpenKeyboard) {
          // requestAnimationFrame ile smooth geçiş
          requestAnimationFrame(() => {
            if (textInputRef.current) {
              textInputRef.current.focus();
              setIsInputFocused(true);
            }
          });
        }
      });
    },
    [screenHeight, setIsInputFocused, textInputRef, translateY]
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 10,
        onPanResponderGrant: () => {
          translateY.setOffset(0);
          translateY.setValue(0);
        },
        onPanResponderMove: (_, gestureState) => {
          if (gestureState.dy > 0) {
            translateY.setValue(gestureState.dy);
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          translateY.flattenOffset();
          const shouldClose = gestureState.dy > 150 || gestureState.vy > 0.5;

          if (shouldClose) {
            closeUploadModal();
          } else {
            // Pan gesture sonrası geri dönüş - timing animasyonu kullan (yaylanma yok)
            Animated.timing(translateY, {
              toValue: 0,
              duration: 200,
              easing: Easing.out(Easing.cubic), // Smooth easing, yaylanma yok
              useNativeDriver: true,
            }).start();
          }
        },
      }),
    [closeUploadModal, translateY]
  );

  return {
    showUploadModal,
    setShowUploadModal,
    translateY,
    openUploadModal,
    closeUploadModal,
    panHandlers: panResponder.panHandlers,
  };
};


