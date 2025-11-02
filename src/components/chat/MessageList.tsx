import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Alert } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { ChatMessage } from '@/src/lib/mock/types';
import { useChat } from '@/src/lib/context/ChatContext';

interface MessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
  scrollViewRef: React.RefObject<ScrollView | null>;
  isKeyboardVisible?: boolean;
  keyboardHeight?: number;
  onScrollToEnd?: () => void;
  conversationId?: string;
}

const MessageList: React.FC<MessageListProps> = ({ 
  messages, 
  isLoading, 
  scrollViewRef,
  isKeyboardVisible = false,
  keyboardHeight = 0,
  onScrollToEnd,
  conversationId
}) => {
  const { deleteMessage } = useChat();

  const handleDeleteMessage = (message: ChatMessage) => {
    if (!conversationId) {
      console.error('❌ Conversation ID bulunamadı');
      return;
    }

    Alert.alert(
      'Mesajı Sil',
      'Bu mesajı silmek istediğinizden emin misiniz?',
      [
        {
          text: 'İptal',
          style: 'cancel',
        },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: () => {
            deleteMessage(conversationId, message.id);
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      ref={scrollViewRef}
      style={styles.messagesContainer}
      contentContainerStyle={[
        styles.messagesContent,
        isKeyboardVisible && { paddingBottom: 10 }
      ]}
      showsVerticalScrollIndicator={true}
      keyboardShouldPersistTaps="handled"
      scrollEnabled={true}
      bounces={true}
      alwaysBounceVertical={false}
      scrollEventThrottle={16}
      nestedScrollEnabled={true}
      removeClippedSubviews={false}
      directionalLockEnabled={false}
      canCancelContentTouches={true}
      delaysContentTouches={false}
      onContentSizeChange={() => {
        // Auto-scroll to bottom when new messages arrive
        setTimeout(() => {
          if (scrollViewRef.current) {
            scrollViewRef.current.scrollToEnd({ animated: true });
          }
        }, 100);
        onScrollToEnd?.();
      }}
      onLayout={() => {
        // Auto-scroll to bottom on layout
        setTimeout(() => {
          if (scrollViewRef.current) {
            scrollViewRef.current.scrollToEnd({ animated: false });
          }
        }, 100);
      }}
    >
      {messages.map((message) => (
        <TouchableOpacity
          key={message.id}
          onLongPress={() => handleDeleteMessage(message)}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.messageContainer,
              message.isUser ? styles.userMessage : styles.aiMessage
            ]}
          >
          <View style={[
            styles.messageWrapper,
            message.isUser ? styles.userMessageWrapper : styles.aiMessageWrapper
          ]}>
            <View style={[
              styles.messageBubble,
              message.isUser ? styles.userBubble : styles.aiBubble
            ]}>
              {/* Resimler varsa göster */}
              {message.images && message.images.length > 0 && (
                <View style={styles.imagesContainer}>
                  {message.images.map((imageUri, index) => (
                    <Image
                      key={index}
                      source={{ uri: imageUri }}
                      style={styles.messageImage}
                      resizeMode="cover"
                    />
                  ))}
                </View>
              )}
              
              {/* Dosyalar varsa göster */}
              {message.files && message.files.length > 0 && (
                <View style={styles.filesContainer}>
                  {message.files.map((file, index) => (
                    <View key={index} style={styles.fileItem}>
                      <Text allowFontScaling={false} style={styles.fileIcon}>📄</Text>
                      <Text allowFontScaling={false} style={styles.fileName}>{file.name}</Text>
                    </View>
                  ))}
                </View>
              )}
              
              {/* Mesaj metni */}
              {message.text && (
                message.isUser ? (
                  <Text allowFontScaling={false} style={[
                    styles.messageText,
                    styles.userMessageText
                  ]}>
                    {message.text}
                  </Text>
                ) : (
                  <Markdown
                    style={markdownStyles}
                    allowFontScaling={false}
                  >
                    {message.text}
                  </Markdown>
                )
              )}
            </View>
            <Text allowFontScaling={false} style={[
              styles.messageTime,
              message.isUser ? styles.userMessageTime : styles.aiMessageTime
            ]}>
              {new Date(message.timestamp).toLocaleTimeString('tr-TR', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Text>
          </View>
          </View>
        </TouchableOpacity>
      ))}
      
      {/* Loading indicator */}
      {isLoading && (
        <View style={[styles.messageContainer, styles.aiMessage]}>
          <View style={[styles.messageWrapper, styles.aiMessageWrapper]}>
            <View style={[styles.messageBubble, styles.aiBubble]}>
              <View style={styles.loadingContainer}>
                <View style={styles.loadingDots}>
                  <View style={[styles.loadingDot, styles.loadingDot1]} />
                  <View style={[styles.loadingDot, styles.loadingDot2]} />
                  <View style={[styles.loadingDot, styles.loadingDot3]} />
                </View>
              </View>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 20,
    backgroundColor: 'transparent',
  },
  messagesContent: {
    paddingBottom: 20,
    paddingTop: 10,
    flexGrow: 1,
    minHeight: '100%',
  },
  messageContainer: {
    marginVertical: 6,
    flexDirection: 'row',
    width: '100%',
  },
  userMessage: {
    justifyContent: 'flex-end',
  },
  aiMessage: {
    justifyContent: 'flex-start',
  },
  messageWrapper: {
    maxWidth: '90%',
    minWidth: 'auto',
  },
  userMessageWrapper: {
    alignItems: 'flex-end',
  },
  aiMessageWrapper: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    marginBottom: 4,
  },
  userBubble: {
    backgroundColor: '#7E7AE9',
    borderBottomRightRadius: 4,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 20,
  },
  aiBubble: {
    backgroundColor: '#3532A8',
    borderBottomLeftRadius: 4,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
  },
  messageText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    lineHeight: 24,
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  aiMessageText: {
    color: '#FFFFFF',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
    opacity: 0.7,
  },
  userMessageTime: {
    color: '#FFFFFF',
    textAlign: 'right',
  },
  aiMessageTime: {
    color: '#FFFFFF',
    textAlign: 'left',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  loadingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  loadingDot1: {
    opacity: 0.4,
  },
  loadingDot2: {
    opacity: 0.7,
  },
  loadingDot3: {
    opacity: 1,
  },
  imagesContainer: {
    marginBottom: 8,
    gap: 8,
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  filesContainer: {
    marginBottom: 8,
    gap: 8,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 8,
    borderRadius: 8,
    gap: 8,
  },
  fileIcon: {
    fontSize: 16,
  },
  fileName: {
    color: '#FFFFFF',
    fontSize: 14,
    flex: 1,
  },
});

// Markdown stilleri
const markdownStyles = StyleSheet.create({
  body: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    lineHeight: 24,
    color: '#FFFFFF',
  },
  heading1: {
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
    lineHeight: 32,
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  heading2: {
    fontFamily: 'Poppins-Bold',
    fontSize: 20,
    lineHeight: 28,
    color: '#FFFFFF',
    marginTop: 14,
    marginBottom: 6,
  },
  heading3: {
    fontFamily: 'Poppins-Bold',
    fontSize: 18,
    lineHeight: 26,
    color: '#FFFFFF',
    marginTop: 12,
    marginBottom: 6,
  },
  heading4: {
    fontFamily: 'Poppins-Bold',
    fontSize: 16,
    lineHeight: 24,
    color: '#FFFFFF',
    marginTop: 10,
    marginBottom: 4,
  },
  paragraph: {
    marginTop: 8,
    marginBottom: 8,
    color: '#FFFFFF',
  },
  strong: {
    fontFamily: 'Poppins-Bold',
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  em: {
    fontStyle: 'italic',
    color: '#FFFFFF',
  },
  link: {
    color: '#FFFFFF',
    textDecorationLine: 'underline',
  },
  listItem: {
    marginTop: 4,
    marginBottom: 4,
    color: '#FFFFFF',
  },
  bullet_list: {
    marginTop: 8,
    marginBottom: 8,
  },
  ordered_list: {
    marginTop: 8,
    marginBottom: 8,
  },
  code_inline: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    fontFamily: 'monospace',
    fontSize: 14,
    color: '#FFFFFF',
  },
  fence: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  code_block: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  blockquote: {
    borderLeftWidth: 4,
    borderLeftColor: 'rgba(255, 255, 255, 0.3)',
    paddingLeft: 12,
    marginTop: 8,
    marginBottom: 8,
    color: '#FFFFFF',
  },
  hr: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    height: 1,
    marginTop: 16,
    marginBottom: 16,
  },
});

export default MessageList;
