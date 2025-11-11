import { useCallback, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, PanResponder, type GestureResponderHandlers, type TextInput } from 'react-native';
import { CHAT_CONSTANTS } from '@/src/constants/chatConstants';

interface UseChatUploadModalOptions {
  initialVisible?: boolean;
  dismissKeyboard: () => void;
  textInputRef: React.RefObject<TextInput | null>;
  setIsInputFocused: (value: boolean) => void;
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
}: UseChatUploadModalOptions): UseChatUploadModalResult => {
  const screenHeight = Dimensions.get('window').height;
  const [showUploadModal, setShowUploadModal] = useState(initialVisible);
  const translateY = useRef(new Animated.Value(initialVisible ? 0 : screenHeight)).current;

  const openUploadModal = useCallback(() => {
    if (textInputRef.current) {
      textInputRef.current.blur();
    }
    dismissKeyboard();
    setIsInputFocused(false);
    setShowUploadModal(true);

    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      tension: CHAT_CONSTANTS.SPRING_TENSION,
      friction: CHAT_CONSTANTS.SPRING_FRICTION,
    }).start();
  }, [dismissKeyboard, setIsInputFocused, textInputRef, translateY]);

  const closeUploadModal = useCallback(
    (shouldFocusInput = false) => {
      Animated.timing(translateY, {
        toValue: screenHeight,
        duration: CHAT_CONSTANTS.ANIMATION_DURATION,
        useNativeDriver: true,
      }).start(() => {
        setShowUploadModal(false);

        if (shouldFocusInput) {
          setTimeout(() => {
            if (textInputRef.current) {
              requestAnimationFrame(() => {
                textInputRef.current?.focus();
                setIsInputFocused(true);
              });
            }
          }, 300);
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
            Animated.spring(translateY, {
              toValue: 0,
              useNativeDriver: true,
              tension: CHAT_CONSTANTS.SPRING_TENSION,
              friction: CHAT_CONSTANTS.SPRING_FRICTION,
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


