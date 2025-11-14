import React, { useState, memo, useMemo, useEffect, useRef, useCallback } from 'react';
import { View, Text, ScrollView, FlatList, Image, TouchableOpacity, Alert, Modal, Linking, Dimensions, Animated, ImageStyle, Platform } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { ChatMessage } from '@/src/lib/mock/types';
import { useChat } from '@/src/lib/context/ChatContext';
import { WebView } from 'react-native-webview';
import { getFileTypeIcon, formatFileSize } from '@/src/utils/fileValidation';
import { messageStyles, markdownStyles } from '@/src/styles/messageStyles';
import { useTypewriter } from '@/src/hooks/useTypewriter';

const { width, height } = Dimensions.get('window');

// "Düşünüyor..." göstergesi component'i - animasyonlu
const ThinkingIndicator = memo(() => {
  const [dots, setDots] = useState('');
  
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => {
        if (prev === '') return '.';
        if (prev === '.') return '..';
        if (prev === '..') return '...';
        return '';
      });
    }, 500); // Her 500ms'de bir nokta ekle/çıkar
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <View style={messageStyles.thinkingContainer}>
      <Text allowFontScaling={false} style={messageStyles.thinkingText}>
        Düşünüyorum{dots}
      </Text>
    </View>
  );
});

// Cihazın locale'ini al (fallback: 'tr-TR')
const getDeviceLocale = (): string => {
  try {
    // React Native'de cihazın locale'ini al
    if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
      const locale = Intl.DateTimeFormat().resolvedOptions().locale;
      return locale || 'tr-TR';
    }
    // Fallback: varsayılan locale
    return 'tr-TR';
  } catch (error) {
    console.warn('⚠️ Locale alınamadı, varsayılan kullanılıyor:', error);
    return 'tr-TR';
  }
};

// Mesaj zamanı component'i - memoize edilmiş (performans için)
const MessageTime = memo(({ message }: { message: ChatMessage }) => {
  const timeString = useMemo(() => {
    if (!message.timestamp) {
      return '--:--';
    }
    
    const locale = getDeviceLocale();
    return new Date(message.timestamp).toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit'
    });
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
// Mesaj ilk geldiğinde typewriter animasyonu ile gösteriliyor
const AIMessageContent = memo(({ text, isStreaming, isCompleted, timestamp }: { text: string; isStreaming: boolean; isCompleted?: boolean; timestamp?: Date }) => {
  // Kalın kare karakterini (▊) ve diğer cursor karakterlerini filtrele
  const cleanedText = useMemo(() => {
    return text?.replace(/[▊█■]/g, '').trim() || '';
  }, [text]);
  
  // Mesajın yeni mi eski mi olduğunu kontrol et
  // Yeni mesaj = mesaj son 10 saniye içinde oluşturulduysa VEYA streaming aktif
  // Eski mesaj = mesaj 10 saniyeden eski VE streaming değil
  const messageAge = timestamp ? Date.now() - new Date(timestamp).getTime() : Infinity;
  const isRecentMessage = messageAge < 10000; // 10 saniye
  // Yeni mesaj: streaming aktif VEYA son 10 saniye içinde oluşturuldu
  // isCompleted kontrolünü kaldırdık çünkü mesaj tamamlandığında bile animasyon devam etmeli
  const isNewMessage = isStreaming || isRecentMessage;
  // Eski mesaj: streaming değil VE 10 saniyeden eski
  const isOldMessage = !isStreaming && !isRecentMessage;
  
  // Sadece yeni mesajlar için typewriter animasyonu çalışsın
  // Eski mesajlar direkt gösterilsin (gerçekçi kullanıcı deneyimi için)
  const shouldAnimate = isNewMessage && cleanedText.length > 0;
  
  
  const typewriterText = useTypewriter(
    cleanedText,
    20, // Her karakter arası 20ms (yavaş yavaş yazıyor gibi)
    shouldAnimate
  );
  
  const displayText = useMemo(() => {
    // Eski mesajlar (10 saniyeden eski ve streaming değil) direkt gösterilsin (animasyon yok)
    // Bu gerçekçi kullanıcı deneyimi sağlar - eski mesajlar tekrar yazılmaz
    if (isOldMessage) {
      return cleanedText;
    }
    // Yeni mesajlar (streaming aktif veya son 10 saniye içinde) typewriter efekti ile gösterilsin
    if (isNewMessage && shouldAnimate) {
      // Typewriter text boşsa cleaned text göster (animasyon henüz başlamadı)
      return typewriterText.length > 0 ? typewriterText : cleanedText;
    }
    // Fallback: direkt göster
    return cleanedText;
  }, [cleanedText, isStreaming, typewriterText, isCompleted, isNewMessage, isOldMessage, shouldAnimate]);

        return (
          <View>
      <Markdown
        style={markdownStyles}
      >
        {displayText}
      </Markdown>
    </View>
  );
}, (prevProps, nextProps) => {
  // Sadece text, isStreaming, isCompleted veya timestamp değiştiğinde re-render
  return prevProps.text === nextProps.text && 
         prevProps.isStreaming === nextProps.isStreaming &&
         prevProps.isCompleted === nextProps.isCompleted &&
         prevProps.timestamp === nextProps.timestamp;
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

  // Mesaj tamamlandığında özel stil uygula (gri renk)
  // CRITICAL FIX: Geçmiş sohbetlerdeki mesajlar için isCompleted kontrolü
  // Eğer mesaj streaming değilse ve text varsa, tamamlanmış sayılır
  const messageAge = message.timestamp ? Date.now() - new Date(message.timestamp).getTime() : 0;
  const isPastMessage = messageAge > 30000; // 30 saniyeden eski mesajlar geçmiş mesaj
  // isCompleted: AI mesajı, streaming değil, ve text var
  const isCompleted = !message.isUser && !message.isStreaming && !!message.text && message.text.trim().length > 0;
  
  // Debug: AI mesajı için renk kontrolü (sadece ilk render'da)
  useEffect(() => {
    if (!message.isUser && aiBubbleColor) {
      console.log('🎨 [MessageItem] AI mesajı yeşil renk uygulanıyor:', {
        messageId: message.id,
        aiBubbleColor,
        hasText: !!(message.text && message.text.trim()),
        textLength: message.text?.length || 0,
        conversationId
      });
    }
  }, []); // Sadece mount'ta çalış

  return (
    <View>
      {/* Ana mesaj balonu */}
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
                }
              ]}>
              {message.images && message.images.length > 0 && (
                <View style={messageStyles.imagesContainer}>
                  {message.images.map((imageUri, index) => (
                    <Image
                      key={`${message.id}-image-${index}`}
                      source={{ uri: imageUri }}
                      style={messageStyles.messageImage as ImageStyle}
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
              {/* Ana mesaj - text varsa göster (kalın kare karakteri varsa filtrele) */}
              {message.text && typeof message.text === 'string' && message.text.trim() && !message.text.includes('▊') && (
                message.isUser ? (
                  <Text allowFontScaling={false} style={[
                    messageStyles.messageText,
                    messageStyles.userMessageText
                  ]}>
                    {message.text}
                  </Text>
                ) : (
                  <View style={messageStyles.messageContentWrapper}>
                    <AIMessageContent 
                      text={message.text} 
                      isStreaming={message.isStreaming || false}
                      isCompleted={isCompleted}
                      timestamp={message.timestamp}
                    />
                  </View>
                )
              )}
              {/* AI mesajı gelene kadar "Düşünüyor..." göster */}
              {/* CRITICAL FIX: Geçmiş sohbetlerdeki mesajlar için ThinkingIndicator gösterme */}
              {/* Sadece aktif streaming mesajları için göster (30 saniyeden yeni ve streaming aktif) */}
              {!message.isUser && 
               (!message.text || !message.text.trim() || message.text.includes('▊')) && 
               message.isStreaming && 
               !isPastMessage && 
               !isCompleted && (
                <ThinkingIndicator />
              )}
              </View>
              <MessageTime message={message} />
            </View>
          </View>
        </TouchableOpacity>
    </View>
  );
}, (prevProps, nextProps) => {
  // Mesaj item memoization - sadece mesaj içeriği değiştiğinde re-render
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.text === nextProps.message.text &&
    prevProps.message.isStreaming === nextProps.message.isStreaming &&
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
  onScrollBeginDrag?: () => void; // Scroll başladığında klavye kapatma için
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
  onScrollBeginDrag,
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
    const filtered = Array.isArray(messages) 
      ? messages.filter((message) => message && message.id)
      : [];
    
    // Debug: MessageList'e gelen mesajları logla
    if (filtered.length > 0) {
      const lastMessage = filtered[filtered.length - 1];
      if (lastMessage && lastMessage.isStreaming && lastMessage.text) {
        console.log('📋 [MessageList] validMessages güncellendi:', {
          conversationId,
          totalMessages: filtered.length,
          lastMessageId: lastMessage.id,
          lastMessageTextLength: lastMessage.text.length,
          lastMessagePreview: lastMessage.text.substring(0, 50),
          messagesPropLength: Array.isArray(messages) ? messages.length : 0,
          messagesPropReference: messages
        });
      }
    }
    
    return filtered;
  }, [messages, conversationId]);

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
  
  // Klavye scroll için handler (backward compatibility)
  const handleContentSizeChange = useCallback((event: any) => {
    // Güvenli kontrol - event ve nativeEvent kontrolü
    if (!event || !event.nativeEvent || !event.nativeEvent.contentSize) {
      return;
    }
    
    // Önceki timeout'u temizle
    if (contentSizeScrollTimeoutRef.current) {
      clearTimeout(contentSizeScrollTimeoutRef.current);
    }
    
    if (isKeyboardVisible && flatListRef.current && validMessages.length > 0) {
      // Klavye açıkken debounce ile scroll (senkronize)
      contentSizeScrollTimeoutRef.current = setTimeout(() => {
        if (flatListRef.current) {
          flatListRef.current.scrollToEnd({ animated: false });
        }
      }, 50);
    } else if (!isKeyboardVisible && flatListRef.current && validMessages.length > 0) {
      // Klavye kapalıyken animasyonlu scroll
      if (flatListRef.current) {
        flatListRef.current.scrollToEnd({ animated: true });
      }
    }
  }, [isKeyboardVisible, validMessages.length]);

  // Klavye scroll için handler (backward compatibility)
  const handleLayout = useCallback(() => {
    // Önceki timeout'u temizle
    if (layoutScrollTimeoutRef.current) {
      clearTimeout(layoutScrollTimeoutRef.current);
    }
    
    if (isKeyboardVisible && flatListRef.current && validMessages.length > 0) {
      // Klavye açıkken debounce ile scroll (senkronize)
      layoutScrollTimeoutRef.current = setTimeout(() => {
        if (flatListRef.current) {
          flatListRef.current.scrollToEnd({ animated: false });
        }
      }, 50);
    } else if (!isKeyboardVisible && flatListRef.current && validMessages.length > 0) {
      // Klavye kapalıyken animasyonlu scroll
      if (flatListRef.current) {
        flatListRef.current.scrollToEnd({ animated: true });
      }
    }
  }, [isKeyboardVisible, validMessages.length]);

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
      if (flatListContentSizeChangeTimeoutRef.current) {
        clearTimeout(flatListContentSizeChangeTimeoutRef.current);
      }
      if (flatListLayoutTimeoutRef.current) {
        clearTimeout(flatListLayoutTimeoutRef.current);
      }
    };
  }, []);

  // FlatList için renderItem - memoize edilmiş
  const renderItem = useCallback(({ item: message }: { item: ChatMessage }) => {
    // Debug: AI mesajları için log (sadece ilk birkaç mesaj için)
    if (!message.isUser && validMessages.length <= 3) {
      console.log('🎨 [MessageList] AI mesajı render ediliyor:', {
        messageId: message.id,
        hasText: !!(message.text && message.text.trim()),
        textLength: message.text?.length || 0,
        aiBubbleColor: aiBubbleColor || 'default (#3532A8)',
        conversationId
      });
    }
    
    return (
      <MessageItem
        message={message}
        conversationId={conversationId}
        aiBubbleColor={aiBubbleColor}
        onDeleteMessage={handleDeleteMessage}
        onFilePress={handleFilePress}
      />
    );
  }, [conversationId, aiBubbleColor, handleDeleteMessage, handleFilePress, validMessages.length]);

  // FlatList için keyExtractor - memoize edilmiş
  const keyExtractor = useCallback((item: ChatMessage) => item.id, []);

  // getItemLayout kaldırıldı - tahmini yükseklik scroll performansını bozuyor
  // FlatList otomatik olarak yükseklikleri hesaplayacak (daha doğru ama biraz daha yavaş)

  // FlatList için onEndReached - scroll to end için
  const handleEndReached = useCallback(() => {
    onScrollToEnd?.();
  }, [onScrollToEnd]);

  // FlatList ref'i - ScrollView ref'i ile uyumlu hale getir
  const flatListRef = useRef<FlatList<ChatMessage> | null>(null);

  // ScrollView ref'i ile FlatList ref'ini senkronize et (backward compatibility)
  useEffect(() => {
    if (scrollViewRef && flatListRef.current) {
      // ScrollView ref'i FlatList ref'ine bağla (backward compatibility)
      (scrollViewRef as any).current = {
        scrollToEnd: (options?: { animated?: boolean }) => {
          if (flatListRef.current && validMessages.length > 0) {
            flatListRef.current.scrollToEnd({ animated: options?.animated !== false });
          }
        },
        scrollTo: (options?: { y?: number; animated?: boolean }) => {
          if (flatListRef.current && options?.y !== undefined) {
            flatListRef.current.scrollToOffset({ offset: options.y, animated: options?.animated !== false });
          }
        },
      };
    }
  }, [scrollViewRef, validMessages.length]);

  // Geçmiş mesajlar yüklendiğinde otomatik olarak en son mesaja scroll et
  const previousMessagesLengthRef = useRef(validMessages.length);
  const previousIsDataLoadingRef = useRef(isDataLoading);
  const shouldScrollToEndRef = useRef(false);
  
  useEffect(() => {
    // Mesajlar yüklendiğinde (isDataLoading false olduğunda) veya yeni mesaj eklendiğinde
    // otomatik olarak en son mesaja scroll et
    const messagesLoaded = !isDataLoading && previousIsDataLoadingRef.current;
    const newMessagesAdded = validMessages.length > previousMessagesLengthRef.current;
    
    if ((messagesLoaded || newMessagesAdded) && validMessages.length > 0) {
      // Scroll yapılması gerektiğini işaretle
      // onContentSizeChange veya onLayout'da scroll yapılacak
      shouldScrollToEndRef.current = true;
    }
    
    previousMessagesLengthRef.current = validMessages.length;
    previousIsDataLoadingRef.current = isDataLoading;
  }, [validMessages.length, isDataLoading]);

  // FlatList için onContentSizeChange - mesajlar render edildikten sonra scroll yap (debounced)
  const flatListContentSizeChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handleFlatListContentSizeChange = useCallback(() => {
    // Debounce - çok sık tetiklenmeyi önle
    if (flatListContentSizeChangeTimeoutRef.current) {
      clearTimeout(flatListContentSizeChangeTimeoutRef.current);
    }
    
    flatListContentSizeChangeTimeoutRef.current = setTimeout(() => {
      if (shouldScrollToEndRef.current && flatListRef.current && validMessages.length > 0) {
        // requestAnimationFrame ile layout tamamlanmış olur
        requestAnimationFrame(() => {
          if (flatListRef.current && shouldScrollToEndRef.current && validMessages.length > 0) {
            // scrollToEnd kullan (scrollToIndex'ten daha performanslı)
            flatListRef.current.scrollToEnd({ animated: false });
            shouldScrollToEndRef.current = false; // Scroll yapıldı, flag'i sıfırla
          }
        });
      }
    }, 100); // 100ms debounce
  }, [validMessages.length]);

  // FlatList için onLayout - layout tamamlandığında scroll yap (debounced)
  const flatListLayoutTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handleFlatListLayout = useCallback(() => {
    // Debounce - çok sık tetiklenmeyi önle
    if (flatListLayoutTimeoutRef.current) {
      clearTimeout(flatListLayoutTimeoutRef.current);
    }
    
    flatListLayoutTimeoutRef.current = setTimeout(() => {
      if (shouldScrollToEndRef.current && flatListRef.current && validMessages.length > 0) {
        // requestAnimationFrame ile layout tamamlanmış olur
        requestAnimationFrame(() => {
          if (flatListRef.current && shouldScrollToEndRef.current && validMessages.length > 0) {
            // scrollToEnd kullan (scrollToIndex'ten daha performanslı)
            flatListRef.current.scrollToEnd({ animated: false });
            shouldScrollToEndRef.current = false; // Scroll yapıldı, flag'i sıfırla
          }
        });
      }
    }, 100); // 100ms debounce
  }, [validMessages.length]);

  if (shouldShowEmpty) {
    return null;
  }

  return (
    <>
      <FlatList
        ref={flatListRef}
        data={validMessages}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        // getItemLayout kaldırıldı - tahmini yükseklik scroll performansını bozuyor
        style={messageStyles.messagesContainer}
        contentContainerStyle={[
          messageStyles.messagesContent,
          isKeyboardVisible && { paddingBottom: 10 }
        ]}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={true}
        bounces={true}
        scrollEventThrottle={50} // Scroll performansı için throttle artırıldı (32 -> 50) - daha smooth
        nestedScrollEnabled={true}
        removeClippedSubviews={false} // Scroll performansı için false (bazen kasma yapıyor)
        maxToRenderPerBatch={5} // Batch boyutu azaltıldı (10 -> 5) - daha smooth scroll
        windowSize={5} // Window size azaltıldı (10 -> 5) - daha smooth scroll
        initialNumToRender={10} // İlk render azaltıldı (15 -> 10) - daha hızlı başlangıç
        updateCellsBatchingPeriod={100} // Batch period artırıldı (50 -> 100) - daha smooth scroll
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5} // Son %50'ye gelince onEndReached çağır
        keyboardDismissMode="interactive" // iOS'ta scroll yapınca klavye kapanır
        onScrollBeginDrag={onScrollBeginDrag} // Scroll başladığında callback (klavye kapatma için)
        onContentSizeChange={(width, height) => {
          // Önce eski handler'ı çağır (klavye scroll için)
          handleContentSizeChange({ nativeEvent: { contentSize: { width, height } } });
          // Sonra FlatList için özel handler'ı çağır (mesajlar yüklendiğinde scroll için)
          handleFlatListContentSizeChange();
        }}
        onLayout={(event) => {
          // Önce eski handler'ı çağır (klavye scroll için)
          handleLayout();
          // Sonra FlatList için özel handler'ı çağır (mesajlar yüklendiğinde scroll için)
          handleFlatListLayout();
        }}
        inverted={false} // Normal sıralama (en eski üstte)
      />
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
                    style={messageStyles.previewImage as ImageStyle}
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
    </>
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
