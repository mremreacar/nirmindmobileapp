import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Alert, Modal, Linking, Dimensions } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { ChatMessage } from '@/src/lib/mock/types';
import { useChat } from '@/src/lib/context/ChatContext';
import { WebView } from 'react-native-webview';
import { getFileTypeIcon, formatFileSize } from '@/src/utils/fileValidation';

const { width, height } = Dimensions.get('window');

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
  const [previewFile, setPreviewFile] = useState<{ uri: string; name: string; mimeType?: string } | null>(null);

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

  const handleFilePress = (file: { name: string; uri?: string }) => {
    if (!file.uri) {
      Alert.alert('Hata', 'Dosya URL\'si bulunamadı');
      return;
    }

    // Dosya uzantısına göre MIME type belirle
    const fileExtension = file.name.toLowerCase().split('.').pop() || '';
    let mimeType = 'application/octet-stream';
    
    if (['pdf'].includes(fileExtension)) {
      mimeType = 'application/pdf';
    } else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension)) {
      mimeType = `image/${fileExtension === 'jpg' ? 'jpeg' : fileExtension}`;
    } else if (['txt', 'md'].includes(fileExtension)) {
      mimeType = 'text/plain';
    } else if (['html', 'htm'].includes(fileExtension)) {
      mimeType = 'text/html';
    }

    setPreviewFile({
      uri: file.uri,
      name: file.name,
      mimeType
    });
  };

  const closePreview = () => {
    setPreviewFile(null);
  };

  // Dosya tipine göre renk döndür
  const getFileTypeColor = (extension: string, mimeType?: string | null): string => {
    if (mimeType?.startsWith('image/')) return '#00DDA5';
    if (mimeType?.startsWith('video/')) return '#FF6B6B';
    if (mimeType?.startsWith('audio/')) return '#4ECDC4';
    
    switch (extension.toLowerCase()) {
      case 'pdf':
        return '#FF6B6B';
      case 'doc':
      case 'docx':
        return '#4A90E2';
      case 'xls':
      case 'xlsx':
        return '#50C878';
      case 'ppt':
      case 'pptx':
        return '#FF9500';
      case 'txt':
      case 'md':
        return '#9B59B6';
      case 'json':
      case 'xml':
        return '#E67E22';
      case 'zip':
      case 'rar':
        return '#95A5A6';
      default:
        return '#7F8C8D';
    }
  };

  const openFileInBrowser = async (uri: string) => {
    try {
      const canOpen = await Linking.canOpenURL(uri);
      if (canOpen) {
        await Linking.openURL(uri);
      } else {
        Alert.alert('Hata', 'Dosya açılamadı');
      }
    } catch (error) {
      console.error('❌ Dosya açma hatası:', error);
      Alert.alert('Hata', 'Dosya açılırken bir hata oluştu');
    }
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
      keyboardDismissMode="on-drag"
      maintainVisibleContentPosition={{
        minIndexForVisible: 0,
        autoscrollToTopThreshold: 10,
      }}
      onContentSizeChange={() => {
        // Auto-scroll to bottom when new messages arrive - delay ile daha smooth
        setTimeout(() => {
          if (scrollViewRef.current) {
            scrollViewRef.current.scrollToEnd({ animated: true });
          }
        }, 100);
        onScrollToEnd?.();
      }}
      onLayout={() => {
        // Auto-scroll to bottom on layout - delay ile daha smooth
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
                      key={`${message.id}-image-${index}`}
                      source={{ uri: imageUri }}
                      style={styles.messageImage}
                      resizeMode="cover"
                      onError={(error) => {
                        console.error('❌ Image yüklenemedi:', imageUri, error.nativeEvent.error);
                      }}
                    />
                  ))}
                </View>
              )}
              
              {/* Dosyalar varsa göster */}
              {message.files && message.files.length > 0 && (
                <View style={styles.filesContainer}>
                  {message.files.map((file, index) => {
                    const fileExtension = file.name.toLowerCase().split('.').pop() || '';
                    const fileIcon = getFileTypeIcon(file.mimeType || null, file.name);
                    const fileSize = file.size ? formatFileSize(file.size) : null;
                    const fileTypeColor = getFileTypeColor(fileExtension, file.mimeType);
                    
                    return (
                      <TouchableOpacity 
                        key={index} 
                        style={[styles.fileItem, { borderLeftColor: fileTypeColor }]}
                        onPress={() => handleFilePress(file)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.fileIconContainer, { backgroundColor: fileTypeColor + '20' }]}>
                          <Text allowFontScaling={false} style={styles.fileIcon}>{fileIcon}</Text>
                        </View>
                        <View style={styles.fileInfoContainer}>
                          <Text allowFontScaling={false} style={styles.fileName} numberOfLines={1}>
                            {file.name}
                          </Text>
                          {fileSize && (
                            <Text allowFontScaling={false} style={styles.fileSize}>
                              {fileSize} • {fileExtension.toUpperCase()}
                            </Text>
                          )}
                        </View>
                        <View style={styles.fileArrowContainer}>
                          <Text allowFontScaling={false} style={styles.fileArrow}>›</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
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
                    {message.text + (message.isStreaming ? ' ▊' : '')}
                  </Markdown>
                )
              )}
              {/* Streaming cursor - sadece text yoksa ve streaming ise */}
              {!message.text && message.isStreaming && (
                <Markdown
                  style={markdownStyles}
                  allowFontScaling={false}
                >
                  ▊
                </Markdown>
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
      
      {/* Loading indicator - sadece streaming mesajı yoksa göster */}
      {isLoading && !messages.some(msg => !msg.isUser && msg.isStreaming) && (
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
      
      {/* Dosya Önizleme Modalı */}
      <Modal
        visible={previewFile !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={closePreview}
      >
        <View style={styles.previewModalOverlay}>
          <TouchableOpacity 
            style={styles.previewModalCloseButton}
            onPress={closePreview}
          >
            <Text style={styles.previewModalCloseText}>✕</Text>
          </TouchableOpacity>
          
          {previewFile && (
            <>
              <View style={styles.previewModalHeader}>
                <Text style={styles.previewModalFileName} numberOfLines={2}>
                  {previewFile.name}
                </Text>
              </View>
              
              <View style={styles.previewModalContent}>
                {previewFile.mimeType?.startsWith('image/') ? (
                  <Image 
                    source={{ uri: previewFile.uri }} 
                    style={styles.previewImage}
                    resizeMode="contain"
                  />
                ) : previewFile.mimeType === 'application/pdf' ? (
                  <WebView
                    source={{ uri: previewFile.uri }}
                    style={styles.previewWebView}
                    startInLoadingState={true}
                    scalesPageToFit={true}
                  />
                ) : (
                  <View style={styles.previewUnsupportedContainer}>
                    <Text style={styles.previewUnsupportedText}>📄</Text>
                    <Text style={styles.previewUnsupportedLabel}>
                      Bu dosya türü önizlenemiyor
                    </Text>
                    <TouchableOpacity 
                      style={styles.previewOpenButton}
                      onPress={() => openFileInBrowser(previewFile.uri)}
                    >
                      <Text style={styles.previewOpenButtonText}>Tarayıcıda Aç</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </>
          )}
        </View>
      </Modal>
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
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    minHeight: 200,
  },
  filesContainer: {
    marginBottom: 8,
    gap: 10,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#7F8C8D',
    gap: 12,
    minHeight: 64,
  },
  fileIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileIcon: {
    fontSize: 24,
  },
  fileInfoContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  fileName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Poppins-Medium',
    lineHeight: 20,
  },
  fileSize: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    lineHeight: 16,
  },
  fileArrowContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileArrow: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 20,
    fontWeight: '300',
  },
  // Dosya Önizleme Modal Stilleri
  previewModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewModalCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  previewModalCloseText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  previewModalHeader: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 70,
    zIndex: 1000,
  },
  previewModalFileName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  previewModalContent: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
    paddingBottom: 50,
  },
  previewImage: {
    width: width * 0.9,
    height: height * 0.7,
    borderRadius: 12,
  },
  previewWebView: {
    width: width * 0.9,
    height: height * 0.7,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  previewUnsupportedContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  previewUnsupportedText: {
    fontSize: 64,
    marginBottom: 20,
  },
  previewUnsupportedLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
    marginBottom: 30,
    textAlign: 'center',
  },
  previewOpenButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  previewOpenButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
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
