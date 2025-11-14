import React, { useState, memo, useMemo, useEffect, useRef, useCallback } from 'react';
import { View, Text, ScrollView, FlatList, Image, TouchableOpacity, Alert, Modal, Linking, Dimensions } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { ChatMessage } from '@/src/lib/mock/types';
import { useChat } from '@/src/lib/context/ChatContext';
import { WebView } from 'react-native-webview';
import { getFileTypeIcon, formatFileSize } from '@/src/utils/fileValidation';
import { messageStyles, markdownStyles } from '@/src/styles/messageStyles';

const { width, height } = Dimensions.get('window');

// Mesaj zamanı component'i - memoize edilmiş (performans için)
const MessageTime = memo(({ message }: { message: ChatMessage }) => {
  const timeString = useMemo(() => {
    return message.timestamp 
      ? new Date(message.timestamp).toLocaleTimeString('tr-TR', {
          hour: '2-digit',
          minute: '2-digit'
        })
      : '--:--';
  }, [message.timestamp]);

  return (
    <Text allowFontScaling={false} style={[
      messageStyles.messageTime,
      message.isUser ? messageStyles.userMessageTime : messageStyles.aiMessageTime
    ]}>
      {timeString}
    </Text>
  );
});

// AI mesaj içeriği component'i - memoize edilmiş (performans için)
// Streaming sırasında Markdown render'ını optimize eder
const AIMessageContent = memo(({ text, isStreaming }: { text: string; isStreaming: boolean }) => {
  const displayText = useMemo(() => {
    return text + (isStreaming ? ' |' : '');
  }, [text, isStreaming]);

  return (
    <View style={__DEV__ ? messageStyles.devAiTextWrapper : undefined}>
      {__DEV__ && (
        <View style={messageStyles.devAiAnimationOverlay} />
      )}
      <Markdown
        style={markdownStyles}
      >
        {displayText}
      </Markdown>
    </View>
  );
}, (prevProps, nextProps) => {
  // Sadece text veya isStreaming değiştiğinde re-render
  return prevProps.text === nextProps.text && prevProps.isStreaming === nextProps.isStreaming;
});

// Mesaj item component'i - memoize edilmiş
const MessageItem = memo(({ 
  message, 
  conversationId, 
  aiBubbleColor, 
  onDeleteMessage, 
  onFilePress 
}: { 
  message: ChatMessage; 
  conversationId?: string; 
  aiBubbleColor?: string; 
  onDeleteMessage: (message: ChatMessage) => void;
  onFilePress: (file: { name: string; uri?: string }) => void;
}) => {
  const getFileTypeColor = useCallback((extension: string, mimeType?: string | null): string => {
    if (mimeType?.startsWith('image/')) return '#00DDA5';
    if (mimeType?.startsWith('video/')) return '#FF6B6B';
    if (mimeType?.startsWith('audio/')) return '#4ECDC4';
    
    switch (extension.toLowerCase()) {
      case 'pdf': return '#FF6B6B';
      case 'doc':
      case 'docx': return '#4A90E2';
      case 'xls':
      case 'xlsx': return '#50C878';
      case 'ppt':
      case 'pptx': return '#FF9500';
      case 'txt':
      case 'md': return '#9B59B6';
      case 'json':
      case 'xml': return '#E67E22';
      case 'zip':
      case 'rar': return '#95A5A6';
      default: return '#7F8C8D';
    }
  }, []);

  return (
    <TouchableOpacity
      onLongPress={() => onDeleteMessage(message)}
      activeOpacity={0.7}
    >
      <View
        style={[
          messageStyles.messageContainer,
          message.isUser ? messageStyles.userMessage : messageStyles.aiMessage
        ]}
      >
        <View style={[
          messageStyles.messageWrapper,
          message.isUser ? messageStyles.userMessageWrapper : messageStyles.aiMessageWrapper
        ]}>
          <View style={[
            messageStyles.messageBubble,
            message.isUser ? messageStyles.userBubble : messageStyles.aiBubble,
            !message.isUser && aiBubbleColor && {
              backgroundColor: aiBubbleColor,
            },
            !message.isUser && __DEV__ && {
              borderWidth: 2,
              borderColor: '#FF0000',
            },
            message.isUser && __DEV__ && {
              position: 'relative',
            }
          ]}>
            {message.isUser && __DEV__ && (
              <View style={messageStyles.devUserDot} />
            )}
            {message.images && message.images.length > 0 && (
              <View style={messageStyles.imagesContainer}>
                {message.images.map((imageUri, index) => (
                  <Image
                    key={`${message.id}-image-${index}`}
                    source={{ uri: imageUri }}
                    style={messageStyles.messageImage}
                    resizeMode="cover"
                    onError={(error) => {
                      console.error('❌ Image yüklenemedi:', imageUri, error.nativeEvent.error);
                    }}
                  />
                ))}
              </View>
            )}
            {message.files && message.files.length > 0 && (
              <View style={messageStyles.filesContainer}>
                {message.files.map((file, index) => {
                  const fileName = file?.name || 'Dosya';
                  const fileExtension = fileName.toLowerCase().split('.').pop() || '';
                  const fileIcon = getFileTypeIcon(file?.mimeType || null, fileName);
                  const fileSize = file?.size ? formatFileSize(file.size) : null;
                  const fileTypeColor = getFileTypeColor(fileExtension, file?.mimeType);
                  
                  return (
                    <TouchableOpacity 
                      key={index} 
                      style={[messageStyles.fileItem, { borderLeftColor: fileTypeColor }]}
                      onPress={() => onFilePress(file)}
                      activeOpacity={0.7}
                    >
                      <View style={[messageStyles.fileIconContainer, { backgroundColor: fileTypeColor + '20' }]}>
                        <Text allowFontScaling={false} style={messageStyles.fileIcon}>{fileIcon}</Text>
                      </View>
                      <View style={messageStyles.fileInfoContainer}>
                        <Text allowFontScaling={false} style={messageStyles.fileName} numberOfLines={1}>
                          {fileName}
                        </Text>
                        {fileSize && (
                          <Text allowFontScaling={false} style={messageStyles.fileSize}>
                            {fileSize} • {fileExtension.toUpperCase()}
                          </Text>
                        )}
                      </View>
                      <View style={messageStyles.fileArrowContainer}>
                        <Text allowFontScaling={false} style={messageStyles.fileArrow}>›</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
            {message.isThinking && (
              <View style={messageStyles.thinkingContainer}>
                {__DEV__ && (
                  <View style={messageStyles.devAiAnimationOverlay} />
                )}
                <Text allowFontScaling={false} style={messageStyles.thinkingText}>
                  Düşünüyorum
                </Text>
              </View>
            )}
            {!message.isThinking && message.text && typeof message.text === 'string' && message.text.trim() && (
              message.isUser ? (
                <Text allowFontScaling={false} style={[
                  messageStyles.messageText,
                  messageStyles.userMessageText
                ]}>
                  {message.text}
                </Text>
              ) : (
                <AIMessageContent 
                  text={message.text} 
                  isStreaming={message.isStreaming || false}
                />
              )
            )}
            {!message.isThinking && !message.text && message.isStreaming && (
              <AIMessageContent 
                text="▊" 
                isStreaming={true}
              />
            )}
          </View>
          <MessageTime message={message} />
        </View>
      </View>
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => {
  // Mesaj item memoization - sadece mesaj içeriği değiştiğinde re-render
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.text === nextProps.message.text &&
    prevProps.message.isStreaming === nextProps.message.isStreaming &&
    prevProps.message.isThinking === nextProps.message.isThinking &&
    prevProps.message.images?.length === nextProps.message.images?.length &&
    prevProps.message.files?.length === nextProps.message.files?.length &&
    prevProps.conversationId === nextProps.conversationId &&
    prevProps.aiBubbleColor === nextProps.aiBubbleColor
  );
});

interface MessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
  scrollViewRef: React.RefObject<ScrollView | null>;
  isKeyboardVisible?: boolean;
  keyboardHeight?: number;
  onScrollToEnd?: () => void;
  conversationId?: string;
  isDataLoading?: boolean;
  aiBubbleColor?: string; // Home ekranı için özel AI balon rengi
}

const MessageList: React.FC<MessageListProps> = ({ 
  messages, 
  isLoading, 
  scrollViewRef,
  isKeyboardVisible = false,
  keyboardHeight = 0,
  onScrollToEnd,
  conversationId,
  isDataLoading = false,
  aiBubbleColor,
}) => {
  const { deleteMessage } = useChat();
  const [previewFile, setPreviewFile] = useState<{ uri: string; name: string; mimeType?: string } | null>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Eğer mesaj yoksa ve yükleme tamamlandıysa hiçbir şey gösterme
  const shouldShowEmpty = !isDataLoading && messages.length === 0;

  // Mesajları filtrele ve memoize et (performans için)
  const validMessages = useMemo(() => {
    return Array.isArray(messages) 
      ? messages.filter((message) => message && message.id)
      : [];
  }, [messages]);

  const handleDeleteMessage = useCallback((message: ChatMessage) => {
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
  }, [conversationId, deleteMessage]);

  const handleFilePress = useCallback((file: { name: string; uri?: string }) => {
    if (!file || !file.uri) {
      Alert.alert('Hata', 'Dosya URL\'si bulunamadı');
      return;
    }

    // Dosya uzantısına göre MIME type belirle
    const fileName = file.name || 'Dosya';
    const fileExtension = fileName.toLowerCase().split('.').pop() || '';
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
      name: fileName,
      mimeType
    });
  }, []);

  const closePreview = useCallback(() => {
    setPreviewFile(null);
  }, []);

  const openFileInBrowser = useCallback(async (uri: string) => {
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
  }, []);

  // Scroll to end - optimize edilmiş (debounce ile)
  const scrollToEnd = useCallback((animated: boolean = true) => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    const delay = animated ? 50 : 0; // Animasyonlu ise 50ms, animasyonsuz ise 0ms
    scrollTimeoutRef.current = setTimeout(() => {
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollToEnd({ animated });
      }
      onScrollToEnd?.();
    }, delay);
  }, [onScrollToEnd]);

  // Klavye açıldığında/kapandığında mesajları anında son mesaja scroll et (senkronize)
  // Debounce ekle - çoklu scroll çağrılarını önle
  const keyboardScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    // Önceki timeout'u temizle
    if (keyboardScrollTimeoutRef.current) {
      clearTimeout(keyboardScrollTimeoutRef.current);
    }
    
    // Klavye durumu değiştiğinde mesajları anında son mesaja scroll et
    // Animasyon yok çünkü klavye ile senkronize olması gerekiyor
    if (messages.length > 0 && scrollViewRef.current) {
      // Debounce: 100ms sonra scroll yap (çoklu çağrıları önle)
      keyboardScrollTimeoutRef.current = setTimeout(() => {
        if (scrollViewRef.current) {
          scrollViewRef.current.scrollToEnd({ animated: false });
        }
      }, 100);
    }
    
    return () => {
      if (keyboardScrollTimeoutRef.current) {
        clearTimeout(keyboardScrollTimeoutRef.current);
      }
    };
  }, [isKeyboardVisible, keyboardHeight, messages.length]);

  // onContentSizeChange ve onLayout için ayrı handler'lar
  // Debounce ekle - çoklu scroll çağrılarını önle
  const contentSizeScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const layoutScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const handleContentSizeChange = useCallback(() => {
    // Önceki timeout'u temizle
    if (contentSizeScrollTimeoutRef.current) {
      clearTimeout(contentSizeScrollTimeoutRef.current);
    }
    
    if (isKeyboardVisible && scrollViewRef.current) {
      // Klavye açıkken debounce ile scroll (senkronize)
      contentSizeScrollTimeoutRef.current = setTimeout(() => {
        if (scrollViewRef.current) {
          scrollViewRef.current.scrollToEnd({ animated: false });
        }
      }, 50);
    } else if (!isKeyboardVisible) {
      // Klavye kapalıyken animasyonlu scroll
      scrollToEnd(true);
    }
  }, [scrollToEnd, isKeyboardVisible]);

  const handleLayout = useCallback(() => {
    // Önceki timeout'u temizle
    if (layoutScrollTimeoutRef.current) {
      clearTimeout(layoutScrollTimeoutRef.current);
    }
    
    if (isKeyboardVisible && scrollViewRef.current) {
      // Klavye açıkken debounce ile scroll (senkronize)
      layoutScrollTimeoutRef.current = setTimeout(() => {
        if (scrollViewRef.current) {
          scrollViewRef.current.scrollToEnd({ animated: false });
        }
      }, 50);
    } else if (!isKeyboardVisible) {
      // Klavye kapalıyken animasyonlu scroll
      scrollToEnd(true);
    }
  }, [scrollToEnd, isKeyboardVisible]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      if (keyboardScrollTimeoutRef.current) {
        clearTimeout(keyboardScrollTimeoutRef.current);
      }
      if (contentSizeScrollTimeoutRef.current) {
        clearTimeout(contentSizeScrollTimeoutRef.current);
      }
      if (layoutScrollTimeoutRef.current) {
        clearTimeout(layoutScrollTimeoutRef.current);
      }
    };
  }, []);

  return (
    <ScrollView
      ref={scrollViewRef}
      style={messageStyles.messagesContainer}
      contentContainerStyle={[
        messageStyles.messagesContent,
        isKeyboardVisible && { paddingBottom: 10 }
      ]}
      showsVerticalScrollIndicator={true}
      keyboardShouldPersistTaps="handled"
      scrollEnabled={true}
      bounces={true}
      alwaysBounceVertical={false}
      scrollEventThrottle={32}
      nestedScrollEnabled={true}
      removeClippedSubviews={true}
      directionalLockEnabled={false}
      canCancelContentTouches={true}
      keyboardDismissMode="interactive"
      onContentSizeChange={handleContentSizeChange}
      onLayout={handleLayout}
    >
      {shouldShowEmpty ? (
        // Mesaj yoksa ve yükleme tamamlandıysa hiçbir şey gösterme
        null
      ) : (
        validMessages.length > 0 ? (
          validMessages.map((message) => (
            <MessageItem
              key={message.id}
              message={message}
              conversationId={conversationId}
              aiBubbleColor={aiBubbleColor}
              onDeleteMessage={handleDeleteMessage}
              onFilePress={handleFilePress}
            />
          ))
        ) : (
          // Mesaj yoksa boş state göster (opsiyonel)
          null
        )
      )}
      
      {/* Dosya Önizleme Modalı */}
      <Modal
        visible={previewFile !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={closePreview}
      >
        <View style={messageStyles.previewModalOverlay}>
          <TouchableOpacity 
            style={messageStyles.previewModalCloseButton}
            onPress={closePreview}
          >
            <Text style={messageStyles.previewModalCloseText}>✕</Text>
          </TouchableOpacity>
          
          {previewFile && (
            <>
              <View style={messageStyles.previewModalHeader}>
                <Text style={messageStyles.previewModalFileName} numberOfLines={2}>
                  {previewFile.name}
                </Text>
              </View>
              
              <View style={messageStyles.previewModalContent}>
                {previewFile.mimeType?.startsWith('image/') ? (
                  <Image 
                    source={{ uri: previewFile.uri }} 
                    style={messageStyles.previewImage}
                    resizeMode="contain"
                  />
                ) : previewFile.mimeType === 'application/pdf' ? (
                  <WebView
                    source={{ uri: previewFile.uri }}
                    style={messageStyles.previewWebView}
                    startInLoadingState={true}
                    scalesPageToFit={true}
                  />
                ) : (
                  <View style={messageStyles.previewUnsupportedContainer}>
                    <Text style={messageStyles.previewUnsupportedText}>📄</Text>
                    <Text style={messageStyles.previewUnsupportedLabel}>
                      Bu dosya türü önizlenemiyor
                    </Text>
                    <TouchableOpacity 
                      style={messageStyles.previewOpenButton}
                      onPress={() => openFileInBrowser(previewFile.uri)}
                    >
                      <Text style={messageStyles.previewOpenButtonText}>Tarayıcıda Aç</Text>
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


// Memoize MessageList to prevent unnecessary re-renders
// Messages array reference comparison - eğer reference aynıysa re-render yok
export default memo(MessageList, (prevProps, nextProps) => {
  // Custom comparison function for better performance
  // Messages array reference değişmediyse ve diğer props aynıysa re-render yapma
  if (prevProps.messages === nextProps.messages &&
      prevProps.isLoading === nextProps.isLoading &&
      prevProps.isKeyboardVisible === nextProps.isKeyboardVisible &&
      prevProps.keyboardHeight === nextProps.keyboardHeight &&
      prevProps.conversationId === nextProps.conversationId &&
      prevProps.isDataLoading === nextProps.isDataLoading) {
    return true; // Props aynı, re-render yapma
  }
  
  // Eğer messages array reference değiştiyse ama içerik aynıysa kontrol et
  if (prevProps.messages.length !== nextProps.messages.length) {
    return false; // Length farklı, re-render yap
  }
  
  // Length aynıysa, son mesajın ID'sini kontrol et (daha hızlı)
  const prevLastMessage = prevProps.messages[prevProps.messages.length - 1];
  const nextLastMessage = nextProps.messages[nextProps.messages.length - 1];
  
  if (prevLastMessage?.id !== nextLastMessage?.id) {
    return false; // Son mesaj farklı, re-render yap
  }
  
  // Diğer props kontrolü
  return (
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.isKeyboardVisible === nextProps.isKeyboardVisible &&
    prevProps.keyboardHeight === nextProps.keyboardHeight &&
    prevProps.conversationId === nextProps.conversationId &&
    prevProps.isDataLoading === nextProps.isDataLoading
  );
});
