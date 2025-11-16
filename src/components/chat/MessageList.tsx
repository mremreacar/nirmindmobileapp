import React, { useState, memo, useMemo, useEffect, useRef, useCallback } from 'react';
import { View, Text, ScrollView, FlatList, Image, TouchableOpacity, Alert, Modal, Linking, Dimensions, Animated, ImageStyle, Platform, TouchableWithoutFeedback, StyleSheet, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import Markdown from 'react-native-markdown-display';
import { ChatMessage } from '@/src/lib/mock/types';
import { useChat } from '@/src/lib/context/ChatContext';
import { WebView } from 'react-native-webview';
import { getFileTypeIcon, formatFileSize } from '@/src/utils/fileValidation';
import { messageStyles, markdownStyles } from '@/src/styles/messageStyles';
import { useTypewriter } from '@/src/hooks/useTypewriter';
import { CopyButton, MessageActionMenu } from './message-actions';

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
        mergeStyle={true}
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
  onFilePress,
  selectedMessageId,
  onMessageSelect,
  onMessageLayout
}: { 
  message: ChatMessage; 
  conversationId?: string; 
  aiBubbleColor?: string; 
  onDeleteMessage: (message: ChatMessage) => void;
  onFilePress: (file: { name: string; uri?: string }) => void;
  selectedMessageId?: string | null;
  onMessageSelect?: (messageId: string | null) => void;
  onMessageLayout?: (messageId: string, layout: { y: number; height: number }) => void;
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
  
  const isSelected = selectedMessageId === message.id;
  const hasText = message.text && message.text.trim();
  
  // CRITICAL FIX: Mesaj uzunluğuna göre saat bilgisinin konumunu belirle
  // Kısa mesajlar: saat bilgisi yanında (inline)
  // Uzun mesajlar: saat bilgisi altında
  const messageText = message.text || '';
  const messageLength = messageText.length;
  // Yaklaşık olarak 1 satır = 40-50 karakter (ekran genişliğine göre değişir)
  // 60 karakterden az ise kısa mesaj sayılır (saat bilgisi yanında)
  // 60 karakterden fazla ise uzun mesaj sayılır (saat bilgisi altında)
  const isShortMessage = messageLength <= 60;
  // Satır sayısını da kontrol et (yeni satır karakterleri varsa)
  const lineCount = (messageText.match(/\n/g) || []).length + 1;
  const isSingleLine = lineCount === 1 && isShortMessage;
  
  // Action menü state'i
  const [actionMenuVisible, setActionMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);

  // Long press ile action menü aç - mesaj balonunun pozisyonunu al (copy.png hariç)
  const handleLongPress = useCallback((event: any) => {
    // Mesaj balonunun pozisyonunu ölç (copy.png hariç)
    if (messageBubbleRef.current) {
      messageBubbleRef.current.measure((x, y, width, height, pageX, pageY) => {
        const screenWidth = Dimensions.get('window').width;
        
        // Mesaj balonunun altında, mesajın ortasına göre konumlandır
        // Menü genişliği yaklaşık 200px, mesajın ortasından 100px sola kaydır
        const menuX = Math.max(10, Math.min(pageX + width / 2 - 100, screenWidth - 210));
        
        // Mesaj balonunun hemen altında göster (copy.png'nin üstünde)
        const menuY = pageY + height + 10;
        
        setMenuPosition({ x: menuX, y: menuY });
        setActionMenuVisible(true);
      });
    } else if (viewRef.current) {
      // Fallback: tüm container'ı ölç (copy.png dahil)
      viewRef.current.measure((x, y, width, height, pageX, pageY) => {
        const screenWidth = Dimensions.get('window').width;
        const menuX = Math.max(10, Math.min(pageX + width / 2 - 100, screenWidth - 210));
        // Copy.png'nin yüksekliğini tahmin ederek çıkar (yaklaşık 20-30px)
        const menuY = pageY + height - 30 + 10;
        setMenuPosition({ x: menuX, y: menuY });
        setActionMenuVisible(true);
      });
    } else {
      // Fallback: touch event pozisyonunu kullan
      const touch = event.nativeEvent?.touches?.[0] || event.nativeEvent;
      if (touch) {
        const screenWidth = Dimensions.get('window').width;
        const screenHeight = Dimensions.get('window').height;
        setMenuPosition({ x: touch.pageX || screenWidth / 2, y: touch.pageY || screenHeight / 2 });
      }
      setActionMenuVisible(true);
    }
  }, [message.id]);

  // Menüden kopyalama (menüdeki kopyala butonu için)
  const handleCopy = useCallback(async (): Promise<boolean> => {
    if (!message.text || !message.text.trim()) {
      return false;
    }

    try {
      if (Platform.OS === 'web') {
        if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(message.text);
        } else if (typeof document !== 'undefined') {
          const textArea = document.createElement('textarea');
          textArea.value = message.text;
          textArea.style.position = 'fixed';
          textArea.style.opacity = '0';
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
        } else {
          return false;
        }
      } else {
        const ClipboardModule = await import('expo-clipboard');
        const Clipboard = ClipboardModule.default || ClipboardModule;
        if (Clipboard && Clipboard.setStringAsync) {
          await Clipboard.setStringAsync(message.text);
        } else {
          throw new Error('Clipboard API not available');
        }
      }
      
      // Kopyalama başarılı
      return true;
    } catch (error) {
      console.error('❌ Mesaj kopyalama hatası:', error);
      return false;
    }
  }, [message.text]);

  // Silme işlemi
  const handleDelete = useCallback(() => {
    Alert.alert(
      'Mesajı Sil',
      'Bu mesajı silmek istediğinize emin misiniz?',
      [
        {
          text: 'İptal',
          style: 'cancel'
        },
        {
          text: 'Sil',
          onPress: () => {
            onDeleteMessage(message);
            setActionMenuVisible(false);
          },
          style: 'destructive'
        }
      ],
      { cancelable: true }
    );
  }, [message, onDeleteMessage]);

  // Seçilen mesaj için layout ölçümü - mesaj seçildiğinde layout'u ölç
  const layoutRef = useRef<{ y: number; height: number } | null>(null);
  const viewRef = useRef<View | null>(null);
  const messageBubbleRef = useRef<View | null>(null);
  
  useEffect(() => {
    if (isSelected && onMessageLayout) {
      // Her zaman measure ile ekran pozisyonunu al (daha güvenilir)
      const measureLayout = () => {
        if (viewRef.current) {
          viewRef.current.measure((x, y, width, height, pageX, pageY) => {
            const layout = { y: pageY, height };
            layoutRef.current = layout;
            onMessageLayout(message.id, layout);
          });
        } else {
          // viewRef henüz hazır değilse, kısa bir gecikme ile tekrar dene
          setTimeout(measureLayout, 50);
        }
      };
      
      // Hemen ölç, eğer viewRef hazır değilse tekrar dene
      setTimeout(measureLayout, 0);
    }
  }, [isSelected, onMessageLayout, message.id]);

  return (
    <View 
      ref={viewRef}
      style={[
        // Seçilen mesaj normal görünür, overlay yok
      ]}
      onLayout={(event) => {
        const { y, height } = event.nativeEvent.layout;
        // Layout ölçümünü her zaman sakla (FlatList içindeki pozisyon)
        layoutRef.current = { y, height };
        
        // Seçiliyse ve onMessageLayout varsa, measure ile ekran pozisyonunu al
        if (isSelected && onMessageLayout && viewRef.current) {
          viewRef.current.measure((x, y, width, height, pageX, pageY) => {
            const layout = { y: pageY, height };
            onMessageLayout(message.id, layout);
          });
        }
      }}
    >
      {/* Ana mesaj balonu */}
      <TouchableOpacity
        onLongPress={handleLongPress}
        activeOpacity={0.7}
        delayLongPress={500}
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
              <View 
                ref={messageBubbleRef}
                style={[
                  messageStyles.messageBubble,
                  message.isUser ? messageStyles.userBubble : messageStyles.aiBubble,
                  // aiBubbleColor prop'u varsa override et, yoksa messageStyles.aiBubble içindeki rengi kullan
                  !message.isUser && aiBubbleColor && {
                    backgroundColor: aiBubbleColor,
                  }
                ]}
              >
              {message.images && message.images.length > 0 && (
                <View style={messageStyles.imagesContainer}>
                  {message.images.map((imageUri, index) => (
                    <TouchableOpacity
                      key={`${message.id}-image-${index}`}
                      onPress={() => onFilePress({ 
                        name: `Fotoğraf ${index + 1}.jpg`, 
                        uri: imageUri
                      })}
                      activeOpacity={0.8}
                    >
                      <Image
                        source={{ uri: imageUri }}
                        style={messageStyles.messageImage as ImageStyle}
                        resizeMode="cover"
                        onError={(error) => {
                          console.error('❌ Image yüklenemedi:', imageUri, error.nativeEvent.error);
                        }}
                      />
                    </TouchableOpacity>
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
                  <View>
                    <View style={[
                      messageStyles.userMessageTextContainer,
                      isSingleLine ? messageStyles.userMessageTextContainerInline : messageStyles.userMessageTextContainerBlock
                    ]}>
                      <Text allowFontScaling={false} style={[
                        messageStyles.messageText,
                        messageStyles.userMessageText
                      ]}>
                        {message.text}
                      </Text>
                      {/* Tarih/saat - kısa mesajlarda yanında, uzun mesajlarda altında */}
                      {isSingleLine ? (
                        <View style={messageStyles.inlineTimeContainer}>
                          <MessageTime message={message} />
                        </View>
                      ) : null}
                    </View>
                    {/* Uzun mesajlarda saat bilgisi alt satırda */}
                    {!isSingleLine && (
                      <View style={messageStyles.footerTimeContainer}>
                        <MessageTime message={message} />
                      </View>
                    )}
                  </View>
                ) : (
                  <View>
                    <View style={messageStyles.messageContentWrapper}>
                      <AIMessageContent 
                        text={message.text} 
                        isStreaming={message.isStreaming || false}
                        isCompleted={isCompleted}
                        timestamp={message.timestamp}
                      />
                      {/* Tarih/saat - kısa mesajlarda yanında, uzun mesajlarda altında */}
                      {isSingleLine ? (
                        <View style={messageStyles.inlineTimeContainerAI}>
                          <MessageTime message={message} />
                        </View>
                      ) : null}
                    </View>
                    {/* Uzun mesajlarda saat bilgisi alt satırda */}
                    {!isSingleLine && (
                      <View style={messageStyles.footerTimeContainerAI}>
                        <MessageTime message={message} />
                      </View>
                    )}
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
              {/* AI mesajlarının altında copy ikonu */}
              {!message.isUser && message.text && message.text.trim() && !message.text.includes('▊') && (
                <View style={messageStyles.messageFooter}>
                  <CopyButton 
                    text={message.text} 
                    message={message}
                    showIcon={true}
                    onDelete={onDeleteMessage}
                  />
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
        
        {/* Action menü - long press ile açılır */}
        <MessageActionMenu
          visible={actionMenuVisible}
          onClose={() => {
            setActionMenuVisible(false);
            setMenuPosition(null);
          }}
          message={message}
          onCopy={handleCopy}
          onDelete={() => {
            handleDelete();
            setActionMenuVisible(false);
            setMenuPosition(null);
          }}
          position={menuPosition || undefined}
        />
    </View>
  );
}, (prevProps, nextProps) => {
  // Mesaj item memoization - sadece mesaj içeriği veya seçim durumu değiştiğinde re-render
  const isSameMessage = prevProps.message.id === nextProps.message.id;
  const isSameText = prevProps.message.text === nextProps.message.text;
  const isSameStreaming = prevProps.message.isStreaming === nextProps.message.isStreaming;
  const isSameImages = prevProps.message.images?.length === nextProps.message.images?.length;
  const isSameFiles = prevProps.message.files?.length === nextProps.message.files?.length;
  const isSameConversation = prevProps.conversationId === nextProps.conversationId;
  const isSameBubbleColor = prevProps.aiBubbleColor === nextProps.aiBubbleColor;
  const isSameSelected = prevProps.selectedMessageId === nextProps.selectedMessageId;
  
  // Sadece bu mesajın seçim durumu değiştiyse re-render (diğer mesajların seçimi değişirse re-render yapma)
  const prevIsSelected = prevProps.selectedMessageId === prevProps.message.id;
  const nextIsSelected = nextProps.selectedMessageId === nextProps.message.id;
  const selectionChanged = prevIsSelected !== nextIsSelected;
  
  // Eğer mesaj içeriği aynıysa ve seçim durumu değişmediyse re-render yapma
  if (isSameMessage && isSameText && isSameStreaming && isSameImages && isSameFiles && 
      isSameConversation && isSameBubbleColor && !selectionChanged) {
    return true; // Props aynı, re-render yapma
  }
  
  return false; // Props değişti, re-render yap
});

interface MessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
  scrollViewRef: React.RefObject<ScrollView | null>;
  isKeyboardVisible?: boolean;
  keyboardHeight?: number;
  paddingBottom?: number; // CRITICAL: Input alanı ile mesajlar arası boşluk (number olarak)
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
  paddingBottom, // CRITICAL: Input alanı ile mesajlar arası boşluk
  onScrollToEnd,
  onScrollBeginDrag,
  conversationId,
  isDataLoading = false,
  aiBubbleColor,
}) => {
  const { deleteMessage, loadMoreMessages } = useChat();
  const [previewFile, setPreviewFile] = useState<{ uri: string; name: string; mimeType?: string } | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [selectedMessageLayout, setSelectedMessageLayout] = useState<{ y: number; height: number } | null>(null);
  const [flatListScrollOffset, setFlatListScrollOffset] = useState(0);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isLoadingMoreMessages, setIsLoadingMoreMessages] = useState(false); // Pagination için loading state (UI'da gösterilecek)
  const loadMoreMessagesTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Debounce için
  const previousScrollOffsetRef = useRef(0); // Scroll direction takibi için
  const [hasNoMoreMessages, setHasNoMoreMessages] = useState(false); // hasMore: false olduğunda kullanıcıya gösterilecek
  const [hasAttemptedLoadMore, setHasAttemptedLoadMore] = useState(false); // CRITICAL: Kullanıcı en az bir kez daha fazla mesaj yüklemeyi denedi mi?
  
  // CRITICAL: ChatGPT gibi akıllı scroll - kullanıcı scroll pozisyonunu takip et
  const [isUserAtBottom, setIsUserAtBottom] = useState(true); // Kullanıcı en altta mı?
  const [contentHeight, setContentHeight] = useState(0); // Content yüksekliği
  const [layoutHeight, setLayoutHeight] = useState(0); // Layout yüksekliği
  const isUserScrollingRef = useRef(false); // Kullanıcı manuel scroll yapıyor mu?
  const scrollToBottomThreshold = 100; // En altta sayılması için threshold (px)
  
  // Conversation değiştiğinde hasNoMoreMessages'i sıfırla
  useEffect(() => {
    setHasNoMoreMessages(false);
    setIsLoadingMoreMessages(false);
    setHasAttemptedLoadMore(false); // CRITICAL: Yeni conversation'da load more denemesi yok
  }, [conversationId]);

  // Eğer mesaj yoksa ve yükleme tamamlandıysa hiçbir şey gösterme
  const shouldShowEmpty = !isDataLoading && messages.length === 0;

  // Mesajları filtrele ve memoize et (performans için)
  // CRITICAL FIX: Daha güvenli filtreleme ve unique ID kontrolü (crash önleme)
  const validMessages = useMemo(() => {
    if (!Array.isArray(messages)) {
      return [];
    }
    
    // Mesajları filtrele ve unique ID'leri kontrol et
    const filtered: ChatMessage[] = [];
    const seenIds = new Set<string>();
    
    for (const message of messages) {
      // Null/undefined kontrolü
      if (!message || !message.id) {
        continue;
      }
      
      // Duplicate ID kontrolü (aynı ID'ye sahip mesajları atla)
      if (seenIds.has(message.id)) {
        console.warn('⚠️ [MessageList] Duplicate message ID detected:', message.id);
        continue;
      }
      
      seenIds.add(message.id);
      filtered.push(message);
    }
    
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
          messagesPropLength: Array.isArray(messages) ? messages.length : 0
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
    
    // URI'den de uzantı kontrol et (image URI'lerinde uzantı olmayabilir)
    const uriExtension = file.uri.toLowerCase().split('.').pop()?.split('?')[0] || '';
    
    if (['pdf'].includes(fileExtension)) {
      mimeType = 'application/pdf';
    } else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension) || 
               ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(uriExtension)) {
      // Image dosyası - uzantıya göre MIME type belirle
      const ext = fileExtension || uriExtension;
      mimeType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
    } else if (['txt', 'md'].includes(fileExtension)) {
      mimeType = 'text/plain';
    } else if (['html', 'htm'].includes(fileExtension)) {
      mimeType = 'text/html';
    } else if (!fileExtension && file.uri) {
      // Uzantı yoksa ama URI var - image olabilir (base64 veya direct URL)
      // URI'de image kelimesi varsa veya base64 ise image olarak kabul et
      if (file.uri.includes('image') || file.uri.startsWith('data:image') || file.uri.includes('base64')) {
        mimeType = 'image/jpeg';
      }
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

  // Klavye açıldığında/kapandığında mesajları akıllı scroll et
  // CRITICAL: ChatGPT gibi - sadece kullanıcı en alttaysa veya yeni mesaj varsa scroll yap
  const keyboardScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    // Önceki timeout'u temizle
    if (keyboardScrollTimeoutRef.current) {
      clearTimeout(keyboardScrollTimeoutRef.current);
    }
    
    // CRITICAL: Daha fazla mesaj yüklenirken klavye scroll yapma
    if (isLoadingMoreMessages) {
      return; // Yukarıdan mesaj yüklenirken scroll yapma
    }
    
    // CRITICAL FIX: Kullanıcı scroll yapıyorsa klavye scroll yapma (kasma önleme)
    if (isUserScrollingRef.current) {
      return; // Kullanıcı scroll yaparken klavye scroll yapma
    }
    
    // Klavye durumu değiştiğinde akıllı scroll yap
    // Sadece kullanıcı en alttaysa veya yeni mesaj eklendiyse scroll yap
    if (validMessages.length > 0 && flatListRef.current) {
      const shouldAutoScroll = isUserAtBottom || shouldScrollToEndRef.current || !isUserScrollingRef.current;
      
      if (shouldAutoScroll) {
        // Debounce: 150ms sonra scroll yap (klavye animasyonu ile senkronize)
        keyboardScrollTimeoutRef.current = setTimeout(() => {
          // CRITICAL FIX: Try-catch ile crash önleme
          try {
            // Double check: Kullanıcı hala scroll yapmıyorsa scroll yap
            if (flatListRef.current && !isLoadingMoreMessages && !isUserScrollingRef.current) {
              // Klavye açıldığında/kapandığında son mesaja scroll yap
              // Animasyon yok çünkü klavye ile senkronize olması gerekiyor
              flatListRef.current.scrollToEnd({ animated: false });
              // Scroll yapıldı, kullanıcı artık en altta
              setIsUserAtBottom(true);
              isUserScrollingRef.current = false;
              shouldScrollToEndRef.current = false;
            }
          } catch (error) {
            console.error('❌ [MessageList] keyboardScrollTimeout error:', error);
          }
        }, 150); // Klavye animasyonu için biraz daha uzun debounce
      }
    }
    
    return () => {
      if (keyboardScrollTimeoutRef.current) {
        clearTimeout(keyboardScrollTimeoutRef.current);
      }
    };
  }, [isKeyboardVisible, keyboardHeight, validMessages.length, isUserAtBottom, isLoadingMoreMessages]);

  // onContentSizeChange ve onLayout için ayrı handler'lar
  // Debounce ekle - çoklu scroll çağrılarını önle
  const contentSizeScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const layoutScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // CRITICAL: ChatGPT gibi akıllı scroll - content size değiştiğinde
  // Sadece kullanıcı en alttaysa otomatik scroll yap
  const handleContentSizeChange = useCallback((event: any) => {
    // Güvenli kontrol - event ve nativeEvent kontrolü
    if (!event || !event.nativeEvent || !event.nativeEvent.contentSize) {
      return;
    }
    
    // CRITICAL: Daha fazla mesaj yüklenirken scroll yapma (scroll pozisyonu korunmalı)
    if (isLoadingMoreMessages) {
      return; // Yukarıdan mesaj yüklenirken scroll yapma
    }
    
    // CRITICAL FIX: Kullanıcı scroll yapıyorsa auto-scroll yapma (kasma önleme)
    if (isUserScrollingRef.current) {
      return; // Kullanıcı scroll yaparken auto-scroll yapma
    }
    
    // Önceki timeout'u temizle
    if (contentSizeScrollTimeoutRef.current) {
      clearTimeout(contentSizeScrollTimeoutRef.current);
    }
    
    // CRITICAL: Sadece kullanıcı en alttaysa veya yeni mesaj eklendiyse scroll yap
    // Kullanıcı scroll yapmıyorsa da scroll yap (yeni mesaj geldiğinde)
    const shouldAutoScroll = isUserAtBottom || shouldScrollToEndRef.current || !isUserScrollingRef.current;
    
    if (shouldAutoScroll && flatListRef.current && validMessages.length > 0) {
      // Debounce ile scroll (senkronize)
      contentSizeScrollTimeoutRef.current = setTimeout(() => {
        // Double check: Kullanıcı hala scroll yapmıyorsa scroll yap
        if (flatListRef.current && !isLoadingMoreMessages && !isUserScrollingRef.current) {
          flatListRef.current.scrollToEnd({ animated: false });
          // Scroll yapıldı, kullanıcı artık en altta
          setIsUserAtBottom(true);
          isUserScrollingRef.current = false;
          shouldScrollToEndRef.current = false; // Scroll yapıldı, flag'i sıfırla
        }
      }, 50);
    }
  }, [isKeyboardVisible, validMessages.length, isUserAtBottom, isLoadingMoreMessages]);

  // CRITICAL: ChatGPT gibi akıllı scroll - layout değiştiğinde
  // Sadece kullanıcı en alttaysa otomatik scroll yap
  const handleLayout = useCallback(() => {
    // CRITICAL: Daha fazla mesaj yüklenirken scroll yapma (scroll pozisyonu korunmalı)
    if (isLoadingMoreMessages) {
      return; // Yukarıdan mesaj yüklenirken scroll yapma
    }
    
    // CRITICAL FIX: Kullanıcı scroll yapıyorsa auto-scroll yapma (kasma önleme)
    if (isUserScrollingRef.current) {
      return; // Kullanıcı scroll yaparken auto-scroll yapma
    }
    
    // Önceki timeout'u temizle
    if (layoutScrollTimeoutRef.current) {
      clearTimeout(layoutScrollTimeoutRef.current);
    }
    
    // CRITICAL: Sadece kullanıcı en alttaysa veya yeni mesaj eklendiyse scroll yap
    // Kullanıcı scroll yapmıyorsa da scroll yap (yeni mesaj geldiğinde)
    const shouldAutoScroll = isUserAtBottom || shouldScrollToEndRef.current || !isUserScrollingRef.current;
    
    if (shouldAutoScroll && flatListRef.current && validMessages.length > 0) {
      // Debounce ile scroll (senkronize)
      layoutScrollTimeoutRef.current = setTimeout(() => {
        // Double check: Kullanıcı hala scroll yapmıyorsa scroll yap
        if (flatListRef.current && !isLoadingMoreMessages && !isUserScrollingRef.current) {
          flatListRef.current.scrollToEnd({ animated: false });
          // Scroll yapıldı, kullanıcı artık en altta
          setIsUserAtBottom(true);
          isUserScrollingRef.current = false;
          shouldScrollToEndRef.current = false; // Scroll yapıldı, flag'i sıfırla
        }
      }, 50);
    }
  }, [isKeyboardVisible, validMessages.length, isUserAtBottom, isLoadingMoreMessages]);

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
      if (loadMoreMessagesTimeoutRef.current) {
        clearTimeout(loadMoreMessagesTimeoutRef.current);
      }
    };
  }, []);

  // onMessageLayout callback'i - memoize edilmiş (renderItem'dan ayrı)
  const handleMessageLayout = useCallback((messageId: string, layout: { y: number; height: number }) => {
    if (messageId === selectedMessageId) {
      setSelectedMessageLayout(layout);
    }
  }, [selectedMessageId]);

  // FlatList için renderItem - memoize edilmiş
  const renderItem = useCallback(({ item: message }: { item: ChatMessage }) => {
    return (
      <MessageItem
        message={message}
        conversationId={conversationId}
        aiBubbleColor={aiBubbleColor}
        onDeleteMessage={handleDeleteMessage}
        onFilePress={handleFilePress}
        selectedMessageId={selectedMessageId}
        onMessageSelect={setSelectedMessageId}
        onMessageLayout={handleMessageLayout}
      />
    );
  }, [conversationId, aiBubbleColor, handleDeleteMessage, handleFilePress, selectedMessageId, handleMessageLayout]);

  // FlatList için keyExtractor - memoize edilmiş
  // CRITICAL FIX: conversationId ile birlikte unique key oluştur (crash önleme)
  const keyExtractor = useCallback((item: ChatMessage, index: number) => {
    // conversationId + messageId kombinasyonu ile unique key
    // Eğer item.id yoksa index kullan (fallback)
    return item?.id ? `${conversationId || 'default'}-${item.id}` : `message-${index}`;
  }, [conversationId]);

  // FlatList için ListHeaderComponent - loading indicator ve "daha fazla mesaj yok" mesajı
  // FlatList'in en üstünde gösterilir (en eski mesajların üstünde)
  const ListHeaderComponent = useMemo(() => {
    if (isLoadingMoreMessages) {
      return (
        <View style={{ 
          paddingVertical: 16, 
          paddingHorizontal: 16,
          alignItems: 'center', 
          justifyContent: 'center',
          backgroundColor: 'transparent'
        }}>
          <ActivityIndicator size="small" color="#3532A8" />
          <Text allowFontScaling={false} style={{ 
            marginTop: 8, 
            fontSize: 12, 
            color: 'rgba(255, 255, 255, 0.7)', 
            fontFamily: 'Poppins-Medium' 
          }}>
            Daha fazla mesaj yükleniyor...
          </Text>
        </View>
      );
    }
    
    // CRITICAL: Sadece gerçekten daha fazla mesaj yüklenmeye çalışıldığında ve hasMore: false döndüğünde göster
    // Ayrıca mesaj sayısı çok azsa (5'ten az) gösterme - muhtemelen daha fazla mesaj var ama henüz yüklenmedi
    if (hasNoMoreMessages && hasAttemptedLoadMore && validMessages.length >= 5) {
      return (
        <View style={{ 
          paddingVertical: 12, 
          paddingHorizontal: 16,
          alignItems: 'center', 
          justifyContent: 'center',
          backgroundColor: 'transparent'
        }}>
          <Text allowFontScaling={false} style={{ 
            fontSize: 11, 
            color: 'rgba(255, 255, 255, 0.5)', 
            fontFamily: 'Poppins-Regular' 
          }}>
            Tüm mesajlar yüklendi
          </Text>
        </View>
      );
    }
    
    return null;
  }, [isLoadingMoreMessages, hasNoMoreMessages, hasAttemptedLoadMore, validMessages.length]);

  // getItemLayout kaldırıldı - tahmini yükseklik scroll performansını bozuyor
  // FlatList otomatik olarak yükseklikleri hesaplayacak (daha doğru ama biraz daha yavaş)

  // FlatList için onEndReached - yukarı scroll yapıldığında (en üste gelindiğinde) daha fazla mesaj yükle
  const handleEndReached = useCallback(() => {
    // onEndReached FlatList'te listenin sonuna gelindiğinde tetikleniyor
    // inverted={false} olduğu için "son" = en alta gelmek demek
    // Ama biz yukarı scroll yapıldığında (en üste gelindiğinde) daha fazla mesaj yüklemek istiyoruz
    // Bu yüzden scroll offset kontrolü yapıyoruz
    onScrollToEnd?.();
  }, [onScrollToEnd]);

  // Yukarı scroll yapıldığında (en üste gelindiğinde) daha fazla mesaj yükle
  const handleLoadMoreMessages = useCallback(async () => {
    if (!conversationId || isDataLoading || hasNoMoreMessages) {
      // isLoadingMoreMessages kontrolünü kaldırdık çünkü zaten scroll handler'da set ediliyor
      if (isLoadingMoreMessages) {
        setIsLoadingMoreMessages(false); // Eğer zaten loading ise durdur
      }
      return;
    }

    const currentCount = validMessages.length;
    console.log('🚀 [MessageList] Daha fazla mesaj yükleniyor...', {
      conversationId,
      currentMessageCount: currentCount
    });

    // Loading state zaten scroll handler'da set edildi, burada sadece yükleme yap
    setHasAttemptedLoadMore(true); // CRITICAL: Kullanıcı daha fazla mesaj yüklemeyi denedi
    try {
      const hasMore = await loadMoreMessages(conversationId);
      // loadMoreMessages false dönerse (hasMore: false), hasNoMoreMessages'i true yap
      if (!hasMore) {
        setHasNoMoreMessages(true);
        console.log('ℹ️ [MessageList] Daha fazla mesaj yok, scroll tetikleme durduruldu');
      }
    } catch (error) {
      console.error('❌ Daha fazla mesaj yüklenirken hata:', error);
      setHasNoMoreMessages(true); // Hata durumunda da durdur
    } finally {
      setIsLoadingMoreMessages(false);
    }
  }, [conversationId, loadMoreMessages, isDataLoading, validMessages.length, hasNoMoreMessages, isLoadingMoreMessages]);

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
  const previousLastMessageIdRef = useRef<string | null>(null);
  const shouldScrollToEndRef = useRef(false);
  
  useEffect(() => {
    // Mesajlar yüklendiğinde (isDataLoading false olduğunda) veya yeni mesaj eklendiğinde
    // otomatik olarak en son mesaja scroll et
    // NOT: Pagination ile mesajlar yüklendiğinde scroll yapma (kullanıcı yukarı scroll yapıyor)
    const messagesLoaded = !isDataLoading && previousIsDataLoadingRef.current;
    const newMessagesAdded = validMessages.length > previousMessagesLengthRef.current;
    const previousLength = previousMessagesLengthRef.current;
    
    // Son mesaj ID'sini kontrol et - eğer değiştiyse yeni mesaj eklenmiş demektir
    const lastMessage = validMessages.length > 0 ? validMessages[validMessages.length - 1] : null;
    const lastMessageId = lastMessage?.id || null;
    const lastMessageIdChanged = lastMessageId !== previousLastMessageIdRef.current;
    
    // Pagination kontrolü: Eğer mesaj sayısı çok arttıysa (3'ten fazla) ve son mesaj ID'si değişmediyse, pagination demektir
    const isPagination = newMessagesAdded && previousLength > 0 && validMessages.length > previousLength + 2 && !lastMessageIdChanged;
    
    // Sadece yeni mesaj eklendiğinde (son mesaj ID'si değiştiyse) veya ilk yüklemede scroll yap
    // Pagination ile mesajlar yüklendiğinde scroll yapma
    if ((messagesLoaded && previousLength === 0) || (newMessagesAdded && lastMessageIdChanged && !isPagination)) {
      // Scroll yapılması gerektiğini işaretle
      // onContentSizeChange veya onLayout'da scroll yapılacak
      shouldScrollToEndRef.current = true;
    } else {
      // Pagination veya diğer durumlarda scroll yapma
      shouldScrollToEndRef.current = false;
    }
    
    previousMessagesLengthRef.current = validMessages.length;
    previousIsDataLoadingRef.current = isDataLoading;
    previousLastMessageIdRef.current = lastMessageId;
  }, [validMessages.length, isDataLoading, validMessages]);

  // FlatList için onContentSizeChange - mesajlar render edildikten sonra scroll yap (debounced)
  const flatListContentSizeChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handleFlatListContentSizeChange = useCallback(() => {
    // CRITICAL: Daha fazla mesaj yüklenirken scroll yapma (scroll pozisyonu korunmalı)
    if (isLoadingMoreMessages) {
      return; // Yukarıdan mesaj yüklenirken scroll yapma
    }
    
    // Debounce - çok sık tetiklenmeyi önle
    if (flatListContentSizeChangeTimeoutRef.current) {
      clearTimeout(flatListContentSizeChangeTimeoutRef.current);
    }
    
    flatListContentSizeChangeTimeoutRef.current = setTimeout(() => {
      if (shouldScrollToEndRef.current && flatListRef.current && validMessages.length > 0 && !isLoadingMoreMessages) {
        // requestAnimationFrame ile layout tamamlanmış olur
        requestAnimationFrame(() => {
          if (flatListRef.current && shouldScrollToEndRef.current && validMessages.length > 0 && !isLoadingMoreMessages) {
            // scrollToEnd kullan (scrollToIndex'ten daha performanslı)
            flatListRef.current.scrollToEnd({ animated: false });
            shouldScrollToEndRef.current = false; // Scroll yapıldı, flag'i sıfırla
          }
        });
      }
    }, 100); // 100ms debounce
  }, [validMessages.length, isLoadingMoreMessages]);

  // FlatList için onLayout - layout tamamlandığında scroll yap (debounced)
  const flatListLayoutTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handleFlatListLayout = useCallback(() => {
    // CRITICAL: Daha fazla mesaj yüklenirken scroll yapma (scroll pozisyonu korunmalı)
    if (isLoadingMoreMessages) {
      return; // Yukarıdan mesaj yüklenirken scroll yapma
    }
    
    // Debounce - çok sık tetiklenmeyi önle
    if (flatListLayoutTimeoutRef.current) {
      clearTimeout(flatListLayoutTimeoutRef.current);
    }
    
    flatListLayoutTimeoutRef.current = setTimeout(() => {
      if (shouldScrollToEndRef.current && flatListRef.current && validMessages.length > 0 && !isLoadingMoreMessages) {
        // requestAnimationFrame ile layout tamamlanmış olur
        requestAnimationFrame(() => {
          if (flatListRef.current && shouldScrollToEndRef.current && validMessages.length > 0 && !isLoadingMoreMessages) {
            // scrollToEnd kullan (scrollToIndex'ten daha performanslı)
            flatListRef.current.scrollToEnd({ animated: false });
            shouldScrollToEndRef.current = false; // Scroll yapıldı, flag'i sıfırla
          }
        });
      }
    }, 100); // 100ms debounce
  }, [validMessages.length, isLoadingMoreMessages]);

  // CRITICAL FIX: ChatGPT gibi akıllı scroll - streaming mesajı yazılırken otomatik scroll yap
  // Sadece kullanıcı en alttaysa otomatik scroll yap
  const streamingScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousLastMessageTextRef = useRef<string>('');
  
  // Son mesajı memoize et (performans için)
  const lastMessage = useMemo(() => {
    return validMessages.length > 0 ? validMessages[validMessages.length - 1] : null;
  }, [validMessages]);
  
  useEffect(() => {
    // CRITICAL: Daha fazla mesaj yüklenirken streaming scroll yapma
    if (isLoadingMoreMessages) {
      return; // Yukarıdan mesaj yüklenirken scroll yapma
    }
    
    // CRITICAL FIX: Kullanıcı scroll yapıyorsa streaming scroll yapma (kasma önleme)
    if (isUserScrollingRef.current) {
      return; // Kullanıcı scroll yaparken streaming scroll yapma
    }
    
    // Streaming mesajı var mı ve text değişti mi?
    if (lastMessage && lastMessage.isStreaming && lastMessage.text) {
      const currentText = lastMessage.text;
      const textChanged = currentText !== previousLastMessageTextRef.current;
      
      // CRITICAL: Sadece kullanıcı en alttaysa veya kullanıcı scroll yapmıyorsa otomatik scroll yap
      const shouldAutoScroll = isUserAtBottom || !isUserScrollingRef.current;
      
      if (textChanged && flatListRef.current && shouldAutoScroll) {
        // Önceki timeout'u temizle (debounce)
        if (streamingScrollTimeoutRef.current) {
          clearTimeout(streamingScrollTimeoutRef.current);
        }
        
        // Debounce: 50ms sonra scroll yap (daha hızlı görünmesi için, ama performans için debounce var)
        streamingScrollTimeoutRef.current = setTimeout(() => {
          // Double check: Kullanıcı hala scroll yapmıyorsa scroll yap
          if (flatListRef.current && validMessages.length > 0 && !isLoadingMoreMessages && !isUserScrollingRef.current) {
            // Streaming mesajı yazılırken son satıra scroll yap
            // Kullanıcı yazılan metni görebilsin
            requestAnimationFrame(() => {
              if (flatListRef.current && !isLoadingMoreMessages && !isUserScrollingRef.current) {
                flatListRef.current.scrollToEnd({ animated: false }); // Anında scroll (yazma sırasında)
                // Scroll yapıldı, kullanıcı artık en altta
                setIsUserAtBottom(true);
                isUserScrollingRef.current = false;
              }
            });
          }
        }, 50); // 50ms debounce (daha hızlı görünmesi için)
        
        previousLastMessageTextRef.current = currentText;
      }
    } else {
      // Streaming bitti, text'i sıfırla
      previousLastMessageTextRef.current = '';
    }
    
    return () => {
      if (streamingScrollTimeoutRef.current) {
        clearTimeout(streamingScrollTimeoutRef.current);
      }
    };
  }, [lastMessage?.text, lastMessage?.isStreaming, validMessages.length, isUserAtBottom, isLoadingMoreMessages]);

  // Seçilen mesajı bul - hook'lar her zaman aynı sırada çağrılmalı
  const selectedMessage = useMemo(() => {
    if (!selectedMessageId) return null;
    return validMessages.find(m => m.id === selectedMessageId);
  }, [selectedMessageId, validMessages]);

  // Debug: Seçilen mesaj ve layout bilgisi
  useEffect(() => {
    if (selectedMessageId) {
      console.log('🔍 [MessageList] Seçilen mesaj durumu:', {
        selectedMessageId,
        hasSelectedMessage: !!selectedMessage,
        hasLayout: !!selectedMessageLayout,
        layout: selectedMessageLayout,
        scrollOffset: flatListScrollOffset
      });
    }
  }, [selectedMessageId, selectedMessage, selectedMessageLayout, flatListScrollOffset]);

  // Eğer mesaj yoksa ve yükleme tamamlandıysa hiçbir şey gösterme - hook'lardan SONRA kontrol et
  if (shouldShowEmpty) {
    return null;
  }

  return (
    <View style={{ flex: 1, position: 'relative' }}>
      {/* FlatList - önce render et ki layout ölçümü yapılabilsin */}
      <FlatList
        ref={flatListRef}
        key={conversationId || 'default'} // CRITICAL FIX: conversationId değiştiğinde remount (crash önleme)
        data={validMessages}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeaderComponent} // Loading indicator ve "daha fazla mesaj yok" mesajı
        extraData={`${selectedMessageId}-${validMessages.length}-${isKeyboardVisible}`} // CRITICAL FIX: Daha kapsamlı extraData (crash önleme)
        // getItemLayout kaldırıldı - tahmini yükseklik scroll performansını bozuyor
        style={messageStyles.messagesContainer}
        contentContainerStyle={[
          messageStyles.messagesContent,
          // CRITICAL FIX: Input alanı ile mesajlar arası boşluk
          // paddingBottom prop'u varsa onu kullan, yoksa default değerleri kullan
          paddingBottom !== undefined 
            ? { paddingBottom }
            : (isKeyboardVisible ? { paddingBottom: 10 } : { paddingBottom: 20 })
        ]}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={true}
        bounces={!isKeyboardVisible} // Klavye açıkken bounce'u kapat (daha smooth scroll)
        scrollEventThrottle={isKeyboardVisible ? 100 : 50} // Klavye açıkken throttle artır (daha az event, daha smooth)
        nestedScrollEnabled={true}
        removeClippedSubviews={false} // CRITICAL FIX: removeClippedSubviews'u tamamen kapat (crash önleme - array index sorunları)
        maxToRenderPerBatch={isKeyboardVisible ? 3 : 5} // Klavye açıkken batch boyutunu azalt (daha smooth scroll)
        windowSize={isKeyboardVisible ? 3 : 5} // Klavye açıkken window size'ı azalt (daha smooth scroll)
        initialNumToRender={10} // İlk render azaltıldı (15 -> 10) - daha hızlı başlangıç
        updateCellsBatchingPeriod={isKeyboardVisible ? 150 : 100} // Klavye açıkken batch period'u artır (daha smooth scroll)
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5} // Son %50'ye gelince onEndReached çağır (en alta gelindiğinde)
        keyboardDismissMode={Platform.OS === 'ios' ? 'on-drag' : 'none'} // iOS'ta scroll başladığında klavye kapanır, Android'de manuel
        onScroll={(event) => {
          // CRITICAL FIX: Null/undefined kontrolü - crash önleme
          if (!event || !event.nativeEvent || 
              event.nativeEvent.contentOffset === undefined ||
              event.nativeEvent.contentSize === undefined ||
              event.nativeEvent.layoutMeasurement === undefined) {
            return; // Güvenli çıkış
          }
          
          const offsetY = event.nativeEvent.contentOffset.y;
          const currentContentHeight = event.nativeEvent.contentSize.height;
          const currentLayoutHeight = event.nativeEvent.layoutMeasurement.height;
          
          // CRITICAL FIX: NaN ve Infinity kontrolü - crash önleme
          if (!isFinite(offsetY) || !isFinite(currentContentHeight) || !isFinite(currentLayoutHeight)) {
            return; // Güvenli çıkış
          }
          
          // CRITICAL: Scroll direction ve distance hesaplamalarını önce yap (debug log için)
          const scrollDirection = offsetY < previousScrollOffsetRef.current ? 'up' : 'down';
          previousScrollOffsetRef.current = offsetY;
          const distanceFromBottom = currentContentHeight - (offsetY + currentLayoutHeight);
          const isAtBottom = isFinite(distanceFromBottom) && distanceFromBottom <= scrollToBottomThreshold;
          
          // CRITICAL FIX: Klavye açıkken scroll sırasında state güncellemelerini throttle et (performans için)
          // Sadece gerekli state'leri güncelle, gereksiz re-render'ları önle
          if (isKeyboardVisible) {
            // Klavye açıkken sadece kritik state'leri güncelle
            setFlatListScrollOffset(offsetY);
            
            // Kullanıcı yukarı scroll yapıyorsa, otomatik scroll'u durdur
            if (scrollDirection === 'up' && !isAtBottom) {
              isUserScrollingRef.current = true;
            }
            
            // Kullanıcı tekrar en alta gelirse, otomatik scroll'u devam ettir
            if (isAtBottom) {
              setIsUserAtBottom(true);
              isUserScrollingRef.current = false;
            }
          } else {
            // Klavye kapalıyken tüm state'leri güncelle
            setContentHeight(currentContentHeight);
            setLayoutHeight(currentLayoutHeight);
            setFlatListScrollOffset(offsetY);
            setIsUserAtBottom(isAtBottom);
            
            // Kullanıcı yukarı scroll yapıyorsa, otomatik scroll'u durdur
            if (scrollDirection === 'up' && !isAtBottom) {
              isUserScrollingRef.current = true;
            }
            
            // Kullanıcı tekrar en alta gelirse, otomatik scroll'u devam ettir
            if (isAtBottom) {
              isUserScrollingRef.current = false;
            }
          }
          
          // CRITICAL FIX: Klavye açıkken debug log'ları devre dışı bırak (performans için)
          // Debug: Scroll offset'i logla (sadece klavye kapalıyken ve %1 ihtimalle)
          if (!isKeyboardVisible && Math.random() < 0.01) { // %1 ihtimalle logla (çok sık loglamamak için)
            console.log('📜 [MessageList] Scroll offset:', {
              offsetY: Math.round(offsetY),
              contentHeight: Math.round(currentContentHeight),
              layoutHeight: Math.round(currentLayoutHeight),
              scrollDirection,
              isAtBottom,
              distanceFromBottom: Math.round(distanceFromBottom),
              isNearTop: offsetY <= 300,
              isLoadingMore: isLoadingMoreMessages,
              isDataLoading,
              conversationId,
              messageCount: validMessages.length
            });
          }
          
          // Yukarı scroll yapıldığında (en üste gelindiğinde) daha fazla mesaj yükle
          // Threshold artırıldı (100px -> 300px) - daha kolay tetiklenir
          // Negatif değerleri filtrele (FlatList bounce efekti)
          // Debounce azaltıldı (300ms -> 100ms) - daha hızlı yükleme
          // hasNoMoreMessages: hasMore: false olduğunda scroll tetiklemeyi durdur
          const SCROLL_THRESHOLD = 300; // 100px'den 300px'e çıkarıldı - daha kolay tetiklenir
          
          if (offsetY >= 0 && offsetY <= SCROLL_THRESHOLD && !isLoadingMoreMessages && !isDataLoading && !hasNoMoreMessages && conversationId) {
            // Scroll direction kontrolünü kaldırdık - sadece offsetY kontrolü yeterli
            // Önceki timeout'u temizle
            if (loadMoreMessagesTimeoutRef.current) {
              clearTimeout(loadMoreMessagesTimeoutRef.current);
            }
            
            // Loading state'ini hemen set et (kullanıcı feedback'i için)
            setIsLoadingMoreMessages(true);
            
            // 500ms debounce - scroll durduktan sonra yükle (backend yükünü azaltmak için)
            // Kullanıcı scroll yaparken sürekli istek göndermeyi önle
            loadMoreMessagesTimeoutRef.current = setTimeout(() => {
              // CRITICAL FIX: Try-catch ile crash önleme
              try {
                handleLoadMoreMessages();
              } catch (error) {
                console.error('❌ [MessageList] handleLoadMoreMessages error:', error);
                setIsLoadingMoreMessages(false);
              }
            }, 500);
          } else if (offsetY > SCROLL_THRESHOLD && isLoadingMoreMessages && loadMoreMessagesTimeoutRef.current) {
            // Kullanıcı aşağı scroll yaptıysa (threshold'dan uzaklaştıysa) ve loading aktifse, iptal et
            clearTimeout(loadMoreMessagesTimeoutRef.current);
            loadMoreMessagesTimeoutRef.current = null;
            setIsLoadingMoreMessages(false);
          }
        }}
        onScrollBeginDrag={() => {
          // CRITICAL: Kullanıcı scroll yapmaya başladığında, otomatik scroll'u durdur
          isUserScrollingRef.current = true;
          
          // CRITICAL FIX: Scroll başladığında tüm pending scroll timeout'larını iptal et (kasma önleme)
          if (keyboardScrollTimeoutRef.current) {
            clearTimeout(keyboardScrollTimeoutRef.current);
            keyboardScrollTimeoutRef.current = null;
          }
          if (contentSizeScrollTimeoutRef.current) {
            clearTimeout(contentSizeScrollTimeoutRef.current);
            contentSizeScrollTimeoutRef.current = null;
          }
          if (layoutScrollTimeoutRef.current) {
            clearTimeout(layoutScrollTimeoutRef.current);
            layoutScrollTimeoutRef.current = null;
          }
          if (streamingScrollTimeoutRef.current) {
            clearTimeout(streamingScrollTimeoutRef.current);
            streamingScrollTimeoutRef.current = null;
          }
          
          // Scroll başladığında seçimi kaldır
          if (selectedMessageId) {
            setSelectedMessageId(null);
          }
          if (onScrollBeginDrag) {
            onScrollBeginDrag();
          }
        }}
        onScrollEndDrag={() => {
          // CRITICAL: Scroll bittiğinde, kullanıcı en alttaysa otomatik scroll'u devam ettir
          // Kısa bir delay ile kontrol et (scroll momentum'u bitmesi için)
          setTimeout(() => {
            // CRITICAL FIX: Try-catch ve NaN kontrolü - crash önleme
            try {
              if (flatListRef.current && !isUserScrollingRef.current) {
                const offsetY = flatListScrollOffset;
                const distanceFromBottom = contentHeight - (offsetY + layoutHeight);
                
                // NaN ve Infinity kontrolü
                if (isFinite(offsetY) && isFinite(distanceFromBottom)) {
                  const isAtBottom = distanceFromBottom <= scrollToBottomThreshold;
                  
                  if (isAtBottom) {
                    setIsUserAtBottom(true);
                    isUserScrollingRef.current = false;
                  }
                }
              }
            } catch (error) {
              console.error('❌ [MessageList] onScrollEndDrag error:', error);
            }
          }, 100); // Scroll momentum'u bitmesi için kısa delay
        }}
        onMomentumScrollEnd={() => {
          // CRITICAL: Scroll momentum'u bittiğinde, kullanıcı en alttaysa otomatik scroll'u devam ettir
          // CRITICAL FIX: Try-catch ve NaN kontrolü - crash önleme
          try {
            if (flatListRef.current) {
              const offsetY = flatListScrollOffset;
              const distanceFromBottom = contentHeight - (offsetY + layoutHeight);
              
              // NaN ve Infinity kontrolü
              if (isFinite(offsetY) && isFinite(distanceFromBottom)) {
                const isAtBottom = distanceFromBottom <= scrollToBottomThreshold;
                
                if (isAtBottom) {
                  setIsUserAtBottom(true);
                  isUserScrollingRef.current = false;
                } else {
                  // Kullanıcı en altta değilse, scroll yapıyor olarak işaretle
                  isUserScrollingRef.current = true;
                }
              }
            }
          } catch (error) {
            console.error('❌ [MessageList] onMomentumScrollEnd error:', error);
          }
        }}
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
      {/* Overlay kaldırıldı - sadece butonlar mesajın altında gösterilecek */}
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
    </View>
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
