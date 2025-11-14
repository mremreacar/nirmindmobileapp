import React, { memo } from "react";
import {
  Modal,
  View,
  Animated,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import ChatScreen from "../../pages/ChatScreen";

interface HomeChatModalProps {
  visible: boolean;
  onRequestClose: () => void;
  chatBackdropOpacity: Animated.Value;
  chatScreenOpacity?: Animated.Value; // ChatScreen opacity animasyonu
  translateX: Animated.Value;
  onOpenChatHistory: () => void;
  conversationId?: string;
  containerStyle?: StyleProp<ViewStyle>;
  backdropStyle?: StyleProp<ViewStyle>;
}

const HomeChatModal: React.FC<HomeChatModalProps> = ({
  visible,
  onRequestClose,
  chatBackdropOpacity,
  chatScreenOpacity,
  translateX,
  onOpenChatHistory,
  conversationId,
  containerStyle,
  backdropStyle,
}) => {
  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      onRequestClose={onRequestClose}
    >
      <View style={[styles.container, containerStyle]}>
        <Animated.View
          pointerEvents="none"
          style={[styles.backdrop, { opacity: chatBackdropOpacity }, backdropStyle]}
        />
        {/* ChatScreen'i opacity animasyonu ile sarmala - smooth fade out için */}
        <Animated.View
          style={[
            styles.chatScreenWrapper,
            chatScreenOpacity ? { opacity: chatScreenOpacity } : undefined,
          ]}
        >
          <ChatScreen
            translateX={translateX}
            onClose={onRequestClose}
            onOpenChatHistory={onOpenChatHistory}
            conversationId={conversationId}
          />
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(2, 2, 10, 0.68)",
  },
  chatScreenWrapper: {
    flex: 1,
    position: 'relative',
  },
  devModalBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 4,
    borderColor: '#000000', // Siyah border
    borderStyle: 'solid',
    borderRadius: 8,
    zIndex: 10001,
    pointerEvents: 'none',
  },
});

export default memo(HomeChatModal);

