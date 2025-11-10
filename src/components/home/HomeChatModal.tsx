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
  translateX: Animated.Value;
  onOpenChatHistory: () => void;
  conversationId?: string;
  initialArastirmaModu: boolean;
  initialUploadModalOpen: boolean;
  initialMessage?: string;
  initialPromptType?: string;
  initialImages: string[];
  initialFiles: any[];
  containerStyle?: StyleProp<ViewStyle>;
  backdropStyle?: StyleProp<ViewStyle>;
}

const HomeChatModal: React.FC<HomeChatModalProps> = ({
  visible,
  onRequestClose,
  chatBackdropOpacity,
  translateX,
  onOpenChatHistory,
  conversationId,
  initialArastirmaModu,
  initialUploadModalOpen,
  initialMessage,
  initialPromptType,
  initialImages,
  initialFiles,
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
        <ChatScreen
          translateX={translateX}
          onClose={onRequestClose}
          onOpenChatHistory={onOpenChatHistory}
          conversationId={conversationId}
          initialArastirmaModu={initialArastirmaModu}
          initialUploadModalOpen={initialUploadModalOpen}
          initialMessage={initialMessage}
          initialPromptType={initialPromptType}
          initialImages={initialImages}
          initialFiles={initialFiles}
        />
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
});

export default memo(HomeChatModal);

