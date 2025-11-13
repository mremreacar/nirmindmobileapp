import React, { useState, memo, useMemo, useEffect, useRef } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, Alert, Modal, Linking, Dimensions } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { ChatMessage } from '@/src/lib/mock/types';
import { useChat } from '@/src/lib/context/ChatContext';
import { WebView } from 'react-native-webview';
import { getFileTypeIcon, formatFileSize } from '@/src/utils/fileValidation';
import { messageStyles, markdownStyles } from '@/src/styles/messageStyles';

const { width, height } = Dimensions.get('window');

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

  // Eğer mesaj yoksa ve yükleme tamamlandıysa hiçbir şey gösterme
  const shouldShowEmpty = !isDataLoading && messages.length === 0;

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
      scrollEventThrottle={16}
      nestedScrollEnabled={true}
      removeClippedSubviews={false}
      directionalLockEnabled={false}
      canCancelContentTouches={true}
      keyboardDismissMode="interactive"
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
      {shouldShowEmpty ? (
        // Mesaj yoksa ve yükleme tamamlandıysa hiçbir şey gösterme
        null
      ) : (
        Array.isArray(messages) && messages.length > 0 ? (
          messages.map((message) => {
            // Message validation - geçersiz mesajları filtrele
            if (!message || !message.id) {
              console.warn('⚠️ Geçersiz mesaj filtrelendi:', message);
              return null;
            }
            return (
          <TouchableOpacity
            key={message.id}
            onLongPress={() => handleDeleteMessage(message)}
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
                // Home ekranı için özel AI balon rengi
                !message.isUser && aiBubbleColor && {
                  backgroundColor: aiBubbleColor,
                },
                // Dev Mode: AI mesajlarına kırmızı border ekle
                !message.isUser && __DEV__ && {
                  borderWidth: 2,
                  borderColor: '#FF0000',
                },
                // Dev Mode: Kullanıcı mesajlarına position relative ekle (beyaz nokta için)
                message.isUser && __DEV__ && {
                  position: 'relative',
                }
              ]}>
                {/* Dev Mode: Kullanıcı mesaj balonuna beyaz nokta ekle */}
                {message.isUser && __DEV__ && (
                  <View style={messageStyles.devUserDot} />
                )}
                {/* Resimler varsa göster */}
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
                
                {/* Dosyalar varsa göster */}
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
                        onPress={() => handleFilePress(file)}
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
                
                {/* Thinking state - İlk chunk gelene kadar özel görünüm */}
                {message.isThinking && (
                  <View style={messageStyles.thinkingContainer}>
                    {/* Dev Mode: Thinking animasyonuna renk alanı */}
                    {__DEV__ && (
                      <View style={messageStyles.devAiAnimationOverlay} />
                    )}
                    <Text allowFontScaling={false} style={messageStyles.thinkingText}>
                      Düşünüyorum
                    </Text>
                  </View>
                )}
                
                {/* Mesaj metni - thinking değilse normal göster */}
                {!message.isThinking && message.text && typeof message.text === 'string' && message.text.trim() && (
                  message.isUser ? (
                    <Text allowFontScaling={false} style={[
                      messageStyles.messageText,
                      messageStyles.userMessageText
                    ]}>
                      {message.text}
                    </Text>
                  ) : (
                    <View style={__DEV__ ? messageStyles.devAiTextWrapper : undefined}>
                      {/* Dev Mode: AI mesaj metni animasyonlarına renk alanı */}
                      {__DEV__ && (
                        <View style={messageStyles.devAiAnimationOverlay} />
                      )}
                      <Markdown
                        style={markdownStyles}
                      >
                        {message.text + (message.isStreaming ? ' |' : '')}
                      </Markdown>
                    </View>
                  )
                )}
                {/* Streaming cursor - sadece text yoksa ve streaming ise (thinking değilse) */}
                {!message.isThinking && !message.text && message.isStreaming && (
                  <View style={__DEV__ ? messageStyles.devAiTextWrapper : undefined}>
                    {/* Dev Mode: Streaming cursor animasyonuna renk alanı */}
                    {__DEV__ && (
                      <View style={messageStyles.devAiAnimationOverlay} />
                    )}
                    <Markdown
                      style={markdownStyles}
                    >
                      ▊
                    </Markdown>
                  </View>
                )}
              </View>
              <Text allowFontScaling={false} style={[
                messageStyles.messageTime,
                message.isUser ? messageStyles.userMessageTime : messageStyles.aiMessageTime
              ]}>
                {message.timestamp 
                  ? new Date(message.timestamp).toLocaleTimeString('tr-TR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })
                  : '--:--'}
              </Text>
            </View>
            </View>
          </TouchableOpacity>
            );
          }).filter(Boolean) // null değerleri filtrele
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
