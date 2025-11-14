import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Image,
  Keyboard,
  ActivityIndicator,
  RefreshControl,
  TouchableWithoutFeedback,
  PanResponder,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts } from 'expo-font';
import { SvgXml } from 'react-native-svg';
import { useChat } from '@/src/lib/context/ChatContext';
import { ChatConversation } from '@/src/lib/mock/types';
import Header from '../components/Header';
import { useAuth } from '../contexts/AuthContext';
import { useKeyboardHandling } from '../hooks/useKeyboardHandling';

const { width, height } = Dimensions.get('window');

const searchIcon = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M7.33333 12.6667C10.2789 12.6667 12.6667 10.2789 12.6667 7.33333C12.6667 4.38781 10.2789 2 7.33333 2C4.38781 2 2 4.38781 2 7.33333C2 10.2789 4.38781 12.6667 7.33333 12.6667Z" stroke="#9CA3AF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M14 14L11.1 11.1" stroke="#9CA3AF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const headphoneIcon = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M3 14V11C3 7.13401 6.13401 4 10 4C13.866 4 17 7.13401 17 11V14" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M17 14C18.1046 14 19 14.8954 19 16V17C19 18.1046 18.1046 19 17 19H16C15.4477 19 15 18.5523 15 18V15C15 14.4477 15.4477 14 16 14H17Z" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M3 14C1.89543 14 1 14.8954 1 16V17C1 18.1046 1.89543 19 3 19H4C4.55228 19 5 18.5523 5 18V15C5 14.4477 4.55228 14 4 14H3Z" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const documentsIcon = `<svg width="21" height="18" viewBox="0 0 21 18" fill="none" xmlns="http://www.w3.org/2000/svg">
<g clip-path="url(#clip0_30_391)">
<path d="M20.0764 4.37037V4.83053C19.958 5.15657 19.8068 5.43452 19.4886 5.60379L10.3862 9.19073L10.1707 9.19674L5.21995 7.2821C4.19881 7.69971 3.09997 8.04518 2.09594 8.49285C2.04923 8.51367 2.00299 8.49008 2.01917 8.56777L10.2743 11.837L18.6576 8.50996C18.2594 7.94251 18.7847 7.23261 19.4391 7.51796C19.7749 7.66457 19.9585 7.98922 20.076 8.31896V8.74074C19.9696 9.08482 19.8128 9.3734 19.4886 9.55284L17.0852 10.5236L19.4886 11.4943C19.8253 11.6816 19.965 11.9517 20.076 12.3064V12.6898C19.9604 13.0986 19.7425 13.4187 19.3351 13.5782C16.4821 14.5725 13.6582 16.0164 10.808 16.9741C10.4676 17.0884 10.1837 17.1813 9.8308 17.0125L1.07388 13.5394C0.390805 13.1754 0.228477 12.2208 0.791769 11.6719C1.19551 11.2783 1.91234 11.3338 2.01085 11.9508C2.04877 12.188 1.95396 12.2972 1.86656 12.4969L10.2822 15.7902L18.5429 12.5353L15.3037 11.2376L10.3927 13.1449H10.1328L1.06093 9.56579C0.21969 9.11026 0.255301 7.91523 1.1118 7.50686L3.43804 6.59348C3.4348 6.53983 3.37977 6.53428 3.3437 6.51578C2.64767 6.16338 1.72134 5.96868 1.03549 5.60379C0.213216 5.16629 0.259001 3.92871 1.10024 3.54671L10.093 0.00323731L10.3969 0L19.4507 3.55873C19.774 3.74557 19.9835 4.0064 20.0764 4.37037ZM18.5429 4.56276L10.2822 1.30741L1.98125 4.58126L10.2808 7.86204C12.9594 6.74702 15.7292 5.81606 18.3879 4.65572C18.4351 4.6349 18.5415 4.61872 18.5433 4.5623L18.5429 4.56276Z" fill="white"/>
</g>
<defs>
<clipPath id="clip0_30_391">
<rect width="19.6329" height="17.1041" fill="white" transform="translate(0.443604)"/>
</clipPath>
</defs>
</svg>`;

const nirmindLogoIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1725.15 282.37">
  <g>
    <path fill="#ffffff" d="M234.58,151.05v-3.3c-18.68-6.2-38.36-7.81-53.88-21.03-9.58-8.16-16.59-20.95-20.68-32.73-2.59-7.46-4.03-20.81-6.91-26.77-.76-1.58-1.27-2.38-3.2-2.01-6.21,29.07-12.8,51.84-39.58,67.84-14.54,8.69-28.45,9.9-44.05,15.19.05,1.43-.51,2,.73,3,4.21,3.37,24.48,7.82,31.23,10.34,20.41,7.62,36.76,20.57,41.82,42.94,19.14,84.53-107.67,102.12-135.03,30.54-8.73-22.85-5.54-41.79,4.92-63.04,23.85-48.43,57.71-95.32,83.23-143.21C116.21-3.96,166.69-9.74,196.89,16.45c9.75,8.45,16.19,20.79,22.87,31.7,23.1,37.71,49.51,81.69,69.66,120.78,11.77,22.84,16.42,42,6.17,66.96-29.52,71.89-154.02,51.23-134.67-31.35,8.5-36.27,42.67-44.24,73.66-53.5Z"/>
    <path fill="#ffffff" d="M376.25,276.99V8.13h48.78l109.85,254.27h4.61V8.13h24.58v268.86h-48.78L405.44,22.34h-4.61v254.65h-24.58Z"/>
    <path fill="#ffffff" d="M642.42,58.06c-5.64,0-10.37-1.92-14.21-5.76-3.84-3.84-5.76-8.58-5.76-14.21s1.92-10.69,5.76-14.4c3.84-3.71,8.58-5.57,14.21-5.57s10.69,1.86,14.4,5.57c3.71,3.71,5.57,8.52,5.57,14.4s-1.86,10.37-5.57,14.21c-3.72,3.84-8.52,5.76-14.4,5.76ZM630.9,276.99V90.32h23.05v186.67h-23.05Z"/>
    <path fill="#ffffff" d="M721.54,276.99V90.32h22.28v23.43h4.61c3.58-8.45,8.89-14.6,15.94-18.44,7.04-3.84,16.83-5.76,29.38-5.76h21.89v21.51h-24.58c-14.09,0-25.35,3.97-33.8,11.91-8.45,7.94-12.68,20.36-12.68,37.26v116.76h-23.05Z"/>
    <path fill="#ffffff" d="M854.81,276.99V8.13h94.1l46.47,234.29h6.91l46.48-234.29h94.1v268.86h-49.16V45.38h-6.91l-46.09,231.61h-83.73l-46.09-231.61h-6.91v231.61h-49.16Z"/>
    <path fill="#ffffff" d="M1219.31,64.2c-8.71,0-16.07-2.81-22.08-8.45-6.02-5.63-9.03-13.06-9.03-22.28s3.01-16.64,9.03-22.28c6.01-5.63,13.38-8.45,22.08-8.45s16.38,2.82,22.28,8.45c5.89,5.64,8.83,13.06,8.83,22.28s-2.95,16.65-8.83,22.28c-5.89,5.64-13.32,8.45-22.28,8.45ZM1195.11,276.99V86.48h48.4v190.51h-48.4Z"/>
    <path fill="#ffffff" d="M1297.28,276.99V86.48h47.63v24.97h6.91c3.07-6.66,8.83-12.99,17.28-19.01,8.45-6.01,21.25-9.03,38.41-9.03,14.85,0,27.85,3.4,38.98,10.18,11.14,6.79,19.78,16.13,25.93,28.04,6.15,11.91,9.22,25.8,9.22,41.67v113.69h-48.4v-109.85c0-14.34-3.52-25.09-10.56-32.26-7.05-7.17-17.09-10.75-30.15-10.75-14.85,0-26.38,4.93-34.57,14.79-8.2,9.86-12.29,23.62-12.29,41.29v96.79h-48.4Z"/>
    <path fill="#ffffff" d="M1610.69,282.37c-15.11,0-29.26-3.78-42.44-11.33-13.19-7.55-23.75-18.63-31.69-33.22-7.94-14.6-11.91-32.26-11.91-53v-6.15c0-20.74,3.97-38.41,11.91-53,7.93-14.6,18.44-25.67,31.49-33.22,13.06-7.55,27.27-11.33,42.63-11.33,11.52,0,21.19,1.34,29,4.03,7.81,2.69,14.15,6.09,19.01,10.18,4.86,4.1,8.58,8.45,11.14,13.06h6.91V8.13h48.4v268.86h-47.63v-23.05h-6.91c-4.36,7.17-11.08,13.7-20.16,19.59-9.09,5.89-22.34,8.83-39.75,8.83ZM1625.29,240.12c14.85,0,27.27-4.8,37.26-14.4,9.99-9.6,14.98-23.62,14.98-42.06v-3.84c0-18.44-4.93-32.46-14.79-42.06-9.86-9.6-22.34-14.4-37.45-14.4s-27.27,4.8-37.26,14.4c-9.99,9.6-14.98,23.62-14.98,42.06v3.84c0,18.44,4.99,32.46,14.98,42.06,9.99,9.6,22.4,14.4,37.26,14.4Z"/>
  </g>
</svg>`;

const MAX_CONVERSATIONS_DISPLAY = 10;
const REFRESH_MIN_DURATION = 700;

// Conversation Item Component - memoize edildi (performans için)
interface ConversationItemProps {
  conversation: ChatConversation;
  onSelect: (id: string) => void;
  onDelete: (id: string, title: string) => void;
  isLoading: boolean;
}

const ConversationItem = memo<ConversationItemProps>(({ conversation, onSelect, onDelete, isLoading }) => {
  const title = useMemo(() => conversation.title || 'Sohbet', [conversation.title]);
  
  const handlePress = useCallback(() => {
    onSelect(conversation.id);
  }, [conversation.id, onSelect]);
  
  const handleLongPress = useCallback(() => {
    onDelete(conversation.id, title);
  }, [conversation.id, title, onDelete]);

  return (
    <View style={styles.conversationItem}>
      <TouchableOpacity 
        style={styles.chatItem}
        activeOpacity={0.7}
        onPress={handlePress}
        onLongPress={handleLongPress}
        disabled={isLoading}
      >
        <View style={styles.chatItemContent}>
          <Text allowFontScaling={false} style={styles.chatText}>{title}</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
});

ConversationItem.displayName = 'ConversationItem';

// Skeleton Loader Component - smooth loading animation
interface SkeletonLoaderProps {
  count: number;
}

const SkeletonLoader = memo<SkeletonLoaderProps>(({ count }) => {
  const fadeAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0.7,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [fadeAnim]);

  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <View key={`skeleton-${index}`} style={styles.conversationItem}>
          <Animated.View 
            style={[
              styles.chatItem, 
              styles.chatItemSkeleton,
              { opacity: fadeAnim }
            ]}
          >
            <View style={styles.skeletonTitle} />
          </Animated.View>
        </View>
      ))}
    </>
  );
});

SkeletonLoader.displayName = 'SkeletonLoader';

interface ChatHistoryScreenProps {
  onBack: () => void;
  onSelectConversation?: (conversationId: string) => void;
  onOpenProfile?: () => void;
}

const ChatHistoryScreen: React.FC<ChatHistoryScreenProps> = ({
  onBack,
  onSelectConversation,
  onOpenProfile,
}) => {
  const { user } = useAuth();
  const {
    conversations,
    deleteConversation,
    loadConversations,
    selectConversation,
    hasMoreConversations,
    isLoadingConversations,
  } = useChat();
  const [searchText, setSearchText] = useState('');
  const [visibleConversationCount, setVisibleConversationCount] = useState(MAX_CONVERSATIONS_DISPLAY);
  const [loadingConversationId, setLoadingConversationId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const autoLoadingRef = useRef(false);
  const scrollViewRef = useRef<ScrollView>(null);
  
  // PanResponder for swipe gesture - soldan sağa VEYA sağdan sola çekme ile geri dönme (memoized)
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: (evt) => {
          // Sol kenardan (ilk 30px) veya sağ kenardan (son 30px) başlayan dokunuşları yakala
          const startX = evt.nativeEvent.pageX;
          const screenWidth = Dimensions.get('window').width;
          return startX < 30 || startX > screenWidth - 30;
        },
        onMoveShouldSetPanResponder: (evt, gestureState) => {
          // Sol kenardan başlayan ve sağa doğru hareket eden gesture'ları algıla
          // VEYA sağ kenardan başlayan ve sola doğru hareket eden gesture'ları algıla
          const startX = evt.nativeEvent.pageX - gestureState.dx;
          const screenWidth = Dimensions.get('window').width;
          const isFromLeftEdge = startX < 30;
          const isFromRightEdge = startX > screenWidth - 30;
          const isRightwardSwipe = gestureState.dx > 20; // Sağa doğru çekme
          const isLeftwardSwipe = gestureState.dx < -20; // Sola doğru çekme
          const isMostlyHorizontal = Math.abs(gestureState.dy) < Math.abs(gestureState.dx) * 2;
          
          // Sol kenardan sağa çekme VEYA sağ kenardan sola çekme
          return (
            (isFromLeftEdge && isRightwardSwipe && isMostlyHorizontal) ||
            (isFromRightEdge && isLeftwardSwipe && isMostlyHorizontal)
          );
        },
        onPanResponderGrant: () => {
          // Swipe gesture başladı
        },
        onPanResponderMove: (evt, gestureState) => {
          // Hareket sırasında herhangi bir animasyon yapma
          // Sadece gesture'ı takip et
        },
        onPanResponderRelease: (evt, gestureState) => {
          // Eğer yeterince sağa çekildiyse (sol kenardan) VEYA yeterince sola çekildiyse (sağ kenardan) geri dön
          // Threshold'u düşürdük - daha kolay tetiklenir
          if (gestureState.dx > 50 || gestureState.dx < -50) {
            onBack();
          }
        },
      }),
    [onBack]
  );
  
  // Keyboard handling
  const {
    keyboardHeight,
    isKeyboardVisible,
    dismissKeyboard,
    handleScreenPress,
    getScrollOffset,
  } = useKeyboardHandling();
  
  // Klavye açıldığında scroll'u yukarı kaydır (search alanı görünür olsun)
  useEffect(() => {
    if (isKeyboardVisible && keyboardHeight > 0) {
      // Kısa bir delay ile scroll yap (klavye animasyonu tamamlanana kadar bekle)
      const timer = setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isKeyboardVisible, keyboardHeight]);
  
  // Kullanıcı adının baş harflerini al
  const getInitials = () => {
    if (!user) return '??';
    const firstInitial = user.firstName?.charAt(0) || '';
    const lastInitial = user.lastName?.charAt(0) || '';
    return (firstInitial + lastInitial).toUpperCase();
  };

  const fullName = user ? `${user.firstName} ${user.lastName}` : 'Kullanıcı';
  
  let [fontsLoaded] = useFonts({
    'Poppins-Regular': require('@assets/fonts/Poppins-Regular .ttf'),
    'Poppins-Medium': require('@assets/fonts/Poppins-Medium.ttf'),
  });

  if (!fontsLoaded) {
    return null;
  }

  // Konuşmaları yükle - sadece mount'ta çalış, loadConversations dependency'si infinite loop'a neden oluyor
  useEffect(() => {
    let isMounted = true;

    const fetchConversations = async () => {
      try {
        if (isMounted) {
          setIsInitialLoading(true);
        }
        await loadConversations({ reset: true, limit: MAX_CONVERSATIONS_DISPLAY });
      } catch (error) {
        console.error('❌ Konuşmalar yüklenirken hata:', error);
      } finally {
        if (isMounted) {
          setIsInitialLoading(false);
        }
      }
    };

    fetchConversations();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Sadece mount'ta çalış - loadConversations dependency'si infinite loop'a neden oluyor

  // Arama metni değiştiğinde tümünü göster durumunu sıfırla
  useEffect(() => {
    setVisibleConversationCount(MAX_CONVERSATIONS_DISPLAY);
  }, [searchText]);

  // getConversationMessageCount fonksiyonunu useCallback ile memoize et
  const getConversationMessageCount = useCallback((conversation: ChatConversation) => {
    if (typeof conversation.totalMessageCount === 'number') {
      return conversation.totalMessageCount;
    }

    if (Array.isArray(conversation.messages)) {
      return conversation.messages.length;
    }

    const updatedAt = conversation.updatedAt instanceof Date ? conversation.updatedAt : new Date(conversation.updatedAt);
    const createdAt = conversation.createdAt instanceof Date ? conversation.createdAt : new Date(conversation.createdAt);

    if (!Number.isNaN(updatedAt.getTime()) && !Number.isNaN(createdAt.getTime()) && updatedAt.getTime() > createdAt.getTime()) {
      return 1;
    }

    return 0;
  }, []);

  // Filtrelenmiş konuşmalar - useMemo ile memoize et
  const filteredConversations = useMemo(() => {
    return conversations.filter((conv: ChatConversation) => {
      const title = conv.title || '';
      const search = searchText || '';
      return title.toLowerCase().includes(search.toLowerCase());
    });
  }, [conversations, searchText]);

  // Mesajı olmayan konuşmaları gösterme - useMemo ile memoize et
  const messageEligibleConversations = useMemo(() => {
    return filteredConversations.filter((conv: ChatConversation) => {
      const messageCount = getConversationMessageCount(conv);
      if (messageCount > 0) {
        return true;
      }

      const hasLocalMessages = Array.isArray(conv.messages) && conv.messages.length > 0;
      if (hasLocalMessages) {
        return true;
      }

      const hasBackendLastMessage = Boolean((conv as any)?.lastMessage || (conv as any)?.latestMessage || (conv as any)?.lastMessageText);
      if (hasBackendLastMessage) {
        return true;
      }

      const updatedAt = conv.updatedAt instanceof Date ? conv.updatedAt : new Date(conv.updatedAt);
      const createdAt = conv.createdAt instanceof Date ? conv.createdAt : new Date(conv.createdAt);
      if (!Number.isNaN(updatedAt.getTime()) && !Number.isNaN(createdAt.getTime())) {
        const diff = Math.abs(updatedAt.getTime() - createdAt.getTime());
        if (diff >= 2000) {
          return true;
        }
      }

      return false;
    });
  }, [filteredConversations, getConversationMessageCount]);

  // Gösterilecek conversation'lar - memoize edildi (performans için)
  const conversationsForDisplay = useMemo(() => {
    return messageEligibleConversations.length > 0 ? messageEligibleConversations : filteredConversations;
  }, [messageEligibleConversations, filteredConversations]);

  // Gösterilecek konuşmalar - memoize edildi (performans için)
  const displayedConversations = useMemo(() => {
    return conversationsForDisplay.slice(0, visibleConversationCount);
  }, [conversationsForDisplay, visibleConversationCount]);

  const hasMoreLocalConversations = visibleConversationCount < conversationsForDisplay.length;
  const shouldShowLoadMoreButton = conversationsForDisplay.length > 0 && (hasMoreLocalConversations || hasMoreConversations);

  useEffect(() => {
    if (isInitialLoading || isLoadingConversations || isLoadingMore) {
      return;
    }

    if (autoLoadingRef.current) {
      return;
    }

    const desiredCount = visibleConversationCount;
    const eligibleCount = messageEligibleConversations.length;

    if (eligibleCount >= desiredCount) {
      return;
    }

    if (!hasMoreConversations) {
      return;
    }

    autoLoadingRef.current = true;
    loadConversations({ limit: MAX_CONVERSATIONS_DISPLAY })
      .catch(error => {
        console.error('❌ Otomatik konuşma yükleme hatası:', error);
      })
      .finally(() => {
        autoLoadingRef.current = false;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isInitialLoading,
    isLoadingConversations,
    isLoadingMore,
    visibleConversationCount,
    messageEligibleConversations.length, // Sadece length'i kullan - array memoize edildi ama yine de length daha güvenli
    hasMoreConversations,
    // loadConversations dependency'sini kaldırdık - infinite loop'a neden oluyor
  ]);

  const handleConversationSelect = useCallback(async (conversationId: string) => {
    // Klavyeyi kapat - hem hemen hem de navigation öncesi
    Keyboard.dismiss();
    
    // Eğer zaten yükleniyorsa tekrar tıklamayı engelle
    if (loadingConversationId) {
      console.log('⚠️ Conversation zaten yükleniyor, tekrar tıklama engellendi');
      return;
    }
    
    console.log('📥 Geçmiş sohbetten conversation seçiliyor:', conversationId);
    setLoadingConversationId(conversationId);
    
    try {
      // CRITICAL FIX: selectConversation'ı await et - mesajların yüklendiğinden emin ol
      await selectConversation(conversationId);
      
      // State update'in tamamlanması için kısa bir delay (cache'den yükleme durumunda)
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.log("✅ Conversation ChatContext'te seçildi:", conversationId);

      // CRITICAL FIX: onSelectConversation callback'ini çağırmadan önce conversation'ın yüklendiğinden emin ol
      if (onSelectConversation) {
        onSelectConversation(conversationId);
      }

      // onBack() çağrılmadan önce state'in güncellenmesini bekle ve klavyeyi tekrar kapat
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Navigation öncesi klavyeyi tekrar kapat (garanti için)
      Keyboard.dismiss();
      
      // CRITICAL FIX: onBack() çağrılmadan önce conversation'ın tamamen yüklendiğinden emin ol
      onBack();
    } catch (error: any) {
      console.error('❌ Conversation seçilirken hata:', error);
      Alert.alert('Sohbet açılamadı', error?.message || 'Sohbet açılırken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      // CRITICAL FIX: Loading state'ini temizle ama biraz gecikmeyle (UI feedback için)
      setTimeout(() => {
        setLoadingConversationId(null);
      }, 300);
    }
  }, [loadingConversationId, selectConversation, onSelectConversation, onBack]);

  const handleDeleteConversation = useCallback((conversationId: string, conversationTitle: string) => {
    Alert.alert(
      'Sohbeti Sil',
      `"${conversationTitle}" sohbetini silmek istediğinizden emin misiniz?`,
      [
        {
          text: 'İptal',
          style: 'cancel',
        },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: () => deleteConversation(conversationId),
        },
      ]
    );
  }, [deleteConversation]);

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      setVisibleConversationCount(MAX_CONVERSATIONS_DISPLAY);
      const refreshStart = Date.now();
      await loadConversations({ reset: true, limit: MAX_CONVERSATIONS_DISPLAY });
      const elapsed = Date.now() - refreshStart;
      if (elapsed < REFRESH_MIN_DURATION) {
        await new Promise(resolve => setTimeout(resolve, REFRESH_MIN_DURATION - elapsed));
      }
    } catch (error) {
      console.error('❌ Konuşmalar yenilenirken hata:', error);
    } finally {
      setIsRefreshing(false);
      setIsInitialLoading(false);
    }
  };

  const handleLoadMore = async () => {
    if (isLoadingMore || isLoadingConversations) {
      return;
    }

    setIsLoadingMore(true);
    try {
      if (!hasMoreLocalConversations && hasMoreConversations) {
        await loadConversations({ limit: MAX_CONVERSATIONS_DISPLAY });
      }

      setVisibleConversationCount(prev => prev + MAX_CONVERSATIONS_DISPLAY);
    } catch (error) {
      console.error('❌ Daha fazla konuşma yüklenirken hata:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  return (
    <View style={styles.chatHistoryContainer} {...panResponder.panHandlers}>
      <TouchableWithoutFeedback onPress={handleScreenPress} accessible={false}>
        <LinearGradient
          colors={['#02020A', '#16163C']}
          locations={[0.1827, 1.0]}
          style={styles.chatHistoryGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        >
        {/* Header */}
        <Header
          onBackPress={onBack}
          showBackButton={true}
          showChatButton={false}
          showLogo={false}
          showSearch={true}
          searchValue={searchText}
          onSearchChange={setSearchText}
          searchPlaceholder="Ara"
          reverseLayout={true}
        />

        {/* Chat History Content */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.chatHistoryContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={true}
          contentContainerStyle={[
            isKeyboardVisible && {
              paddingBottom: keyboardHeight > 0 ? keyboardHeight * 0.3 : 0,
            },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={false} // Varsayılan loading'i gizle - manuel loading göstergesi kullanılıyor
              onRefresh={handleRefresh}
              tintColor="transparent" // iOS'ta loading rengini transparent yap
              colors={['transparent']} // Android'de loading rengini transparent yap
            />
          }
        >
          {isRefreshing && (
            <View style={styles.refreshIndicatorContainer}>
              <ActivityIndicator size="large" color="#00DDA5" />
              <Text allowFontScaling={false} style={styles.refreshIndicatorText}>Güncelleniyor...</Text>
              <Text allowFontScaling={false} style={styles.refreshHintText}>Yeni sohbetler aranıyor</Text>
            </View>
          )}
          {/* NirMind Section */}
          <View style={styles.historySection}>
            <View style={styles.sectionItem}>
              <SvgXml 
                xml={nirmindLogoIcon}
                width="120"
                height="20"
              />
            </View>
          </View>

          {/* Past Chats Section */}
          <View style={styles.historySection}>
            <View style={styles.sectionItem}>
              <SvgXml 
                xml={documentsIcon}
                width="21"
                height="18"
              />
              <Text allowFontScaling={false} style={styles.sectionText}>Geçmiş Sohbetler</Text>
            </View>
          </View>

          {/* Chat List */}
          <View style={styles.chatList}>
            {isInitialLoading && conversationsForDisplay.length === 0 ? (
              <SkeletonLoader count={6} />
            ) : displayedConversations.length > 0 ? (
              displayedConversations.map((conversation) => (
                <ConversationItem
                  key={conversation.id}
                  conversation={conversation}
                  onSelect={handleConversationSelect}
                  onDelete={handleDeleteConversation}
                  isLoading={!!loadingConversationId}
                />
              ))
            ) : (
              <View style={styles.emptyStateContainer}>
                <Text allowFontScaling={false} style={styles.emptyStateText}>Henüz sohbet bulunmuyor.</Text>
              </View>
            )}
          </View>
          
          {/* Devam Et Butonu */}
          {!isInitialLoading && conversationsForDisplay.length > 0 && shouldShowLoadMoreButton && (
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={handleLoadMore}
              activeOpacity={0.7}
              disabled={isLoadingMore || isLoadingConversations}
            >
              <View style={styles.viewAllButtonContent}>
                {(isLoadingMore || isLoadingConversations) && (
                  <ActivityIndicator size="small" color="#7E7AE9" />
                )}
                <Text allowFontScaling={false} style={styles.viewAllButtonText}>
                  {(() => {
                    const remaining = Math.max(conversationsForDisplay.length - visibleConversationCount, 0);
                    return remaining > 0
                      ? `Devam Et (${remaining} sohbet daha)`
                      : 'Devam Et';
                  })()}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        </ScrollView>


        {/* Additional Bottom Section */}
        <View style={styles.additionalBottomSection}>
          <TouchableOpacity 
            style={styles.additionalContent}
            activeOpacity={1}
            onPress={onOpenProfile}
          >
            <View style={styles.profileRow}>
              <View style={styles.profileContainer}>
                {user?.profileImageUrl ? (
                  <Image 
                    source={{ uri: user.profileImageUrl }} 
                    style={styles.profileImageSource}
                    resizeMode="cover"
                  />
                ) : (
                  <Text allowFontScaling={false} style={styles.profileInitials}>{getInitials()}</Text>
                )}
              </View>
              <Text allowFontScaling={false} style={styles.profileName}>{fullName}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </LinearGradient>
      </TouchableWithoutFeedback>
    </View>
  );
};

const styles = StyleSheet.create({
  chatHistoryContainer: {
    flex: 1,
    width: width,
    height: height,
    backgroundColor: '#16163C',
  },
  chatHistoryGradient: {
    flex: 1,
    position: 'relative',
  },
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 30,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#FFFFFF',
  },
  chatHistoryContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  refreshIndicatorContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 24,
    borderRadius: 20,
    marginBottom: 16,
  },
  refreshIndicatorText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  refreshHintText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#7E7AE9',
    opacity: 0.85,
  },
  historySection: {
    marginBottom: 20,
  },
  sectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  sectionText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  chatList: {
    gap: 8,
  },
  conversationItem: {
    marginBottom: 16,
  },
  emptyStateContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    fontWeight: '400',
    color: '#9CA3AF',
  },
  chatItem: {
    paddingVertical: 12,
    paddingHorizontal: 0,
  },
  chatItemContent: {
    paddingLeft: 33, // İkon genişliği (21) + gap (12) = 33px
  },
  viewAllButton: {
    marginTop: 16,
    marginBottom: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewAllButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  viewAllButtonText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    fontWeight: '500',
    color: '#7E7AE9',
  },
  chatText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    fontWeight: '400',
    color: '#FFFFFF',
    lineHeight: 20,
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 40,
  },
  userProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#7E7AE9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInitials: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  userName: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  additionalBottomSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 40,
  },
  additionalContent: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 30,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  additionalText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    fontWeight: '400',
    color: '#FFFFFF',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profileContainer: {
    width: 52,
    height: 52,
    borderRadius: 46,
    backgroundColor: '#16163C',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 14,
    gap: 10,
    overflow: 'hidden',
  },
  profileImageSource: {
    width: 52,
    height: 52,
    borderRadius: 46,
  },
  profileInitials: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  profileName: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  chatItemSkeleton: {
    opacity: 0.7,
  },
  skeletonTitle: {
    height: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 8,
    width: '70%',
    marginLeft: 33,
  },
});

export default ChatHistoryScreen;
