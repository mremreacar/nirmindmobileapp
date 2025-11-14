import React, { useCallback, useEffect, useMemo, useRef, useState, memo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  Easing,
  Alert,
  Platform,
  KeyboardAvoidingView,
  PanResponder,
  TouchableWithoutFeedback,
  Modal,
  ScrollView,
  Image,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useFonts } from "expo-font";
import HeroSection from "../components/HeroSection";
import Header from "../components/Header";
import MessageList from "../components/chat/MessageList";
import ChatInputSection from "../components/chat/ChatInputSection";
import UploadModal from "../components/UploadModal";
import { useChat } from "../lib/context/ChatContext";
import { useQuickSuggestions } from "../hooks/useQuickSuggestions";
import { useDictation, useWaveAnimation } from "../features/dictation";
import { useFilePermissions, usePermissionDialogs } from "../lib/permissions";
import { useKeyboardHandling } from "../hooks/useKeyboardHandling";
import { useChatUploadModal } from "../hooks/useChatUploadModal";
import { useChatAttachments } from "../hooks/useChatAttachments";
import { useChatMessaging } from "../hooks/useChatMessaging";
import { useChatMessages } from "../hooks/useChatMessages";
import { HomeScreenProps, QuickSuggestion } from "../types/homeScreen";
import HomeQuickSuggestionsModal from "../components/home/HomeQuickSuggestionsModal";
import {
  getKeyboardAwarePaddingBottom,
  getResponsiveGap,
  getResponsivePadding,
  getResponsiveWidth,
  getResponsivePaddingBottom,
} from "../constants";

const { width, height } = Dimensions.get("window");

const AnimatedKeyboardAvoidingView = Animated.createAnimatedComponent(KeyboardAvoidingView);

// AsyncStorage key for last conversation
const LAST_CONVERSATION_ID_KEY = '@nirmind_last_conversation_id';

const HomeScreen: React.FC<HomeScreenProps> = ({
  onOpenChatHistory,
  selectedConversationId,
  onConversationSelected,
}) => {
  const { createNewConversation, selectConversation, currentConversation, loadingMessagesConversationIds, conversations } = useChat();
  const { isLoading, isStreaming, sendMessage, cancelStreamingResponse } = useChatMessages();
  const {
    showQuickSuggestions,
    setShowQuickSuggestions,
    currentSuggestions,
    isLoadingSuggestions,
    handleOnerilerPress,
  } = useQuickSuggestions();
  const [createdConversationId, setCreatedConversationId] = useState<
    string | undefined
  >();
  const [plusButtonPressed, setPlusButtonPressed] = useState(false);
  const [inputText, setInputText] = useState("");
  const [arastirmaModu, setArastirmaModu] = useState(false);
  const inputClearedRef = useRef(false);
  const messagesScrollViewRef = useRef<ScrollView | null>(null);
  const lastConversationLoadedRef = useRef(false); // Son conversation yükleme flag'i
  const previousSelectedConversationIdRef = useRef<string | undefined>(undefined); // Önceki selectedConversationId'yi takip et
  
  // Memoize messages array to prevent unnecessary re-renders (ChatScreen'deki gibi)
  const messagesArray = useMemo(() => {
    if (currentConversation?.messages && Array.isArray(currentConversation.messages)) {
      return currentConversation.messages;
    }
    return [];
  }, [currentConversation?.messages]);

  // Memoize messagesToShow - conversations array'inden direkt al (daha güncel)
  // Bu sayede currentConversation güncellemesi gecikse bile mesajlar hemen görünür
  // selectedConversationId'yi de kontrol et - ChatHistoryScreen'den seçilen conversation için
  // CRITICAL: conversations array'inin içindeki mesajların referansını da dependency array'e ekle
  // Çünkü conversations array'i güncelleniyor ama conversationFromArray.messages referansı değişmeyebiliyor
  const conversationIdToUse = selectedConversationId || createdConversationId;
  const conversationFromArray = useMemo(() => {
    if (!conversationIdToUse) return null;
    const found = conversations.find(conv => conv.id === conversationIdToUse);
    
    // Debug: conversationFromArray bulunuyor mu kontrol et
    if (!found && conversationIdToUse) {
      console.warn('⚠️ [HomeScreen] conversationFromArray bulunamadı:', {
        conversationId: conversationIdToUse,
        conversationsCount: conversations.length,
        conversationIds: conversations.map(c => c.id),
        selectedConversationId,
        createdConversationId
      });
    }
    
    return found;
  }, [conversationIdToUse, conversations, selectedConversationId, createdConversationId]);
  
  const messagesToShow = useMemo(() => {
    if (!conversationIdToUse) {
      return [];
    }
    
    // CRITICAL FIX: Önce conversations array'inden bul - daha güncel olabilir
    // currentConversation güncellemesi gecikebilir, conversations array daha hızlı güncellenir
    const conversation = conversations.find(conv => conv.id === conversationIdToUse);
    if (conversation && conversation.messages && Array.isArray(conversation.messages)) {
      // Yeni array referansı döndür - React'in değişikliği algılaması için
      return [...conversation.messages];
    }
    
    // Fallback: currentConversation'dan al (yeni conversation için)
    // CRITICAL FIX: Yeni conversation oluşturulduğunda currentConversation daha güncel olabilir
    if (currentConversation && currentConversation.id === conversationIdToUse && currentConversation.messages) {
      // Sadece sorun durumunda log (mesaj sayısı beklenenden azsa veya streaming mesajı varsa)
      if (currentConversation.messages.length > 0) {
        const lastMessage = currentConversation.messages[currentConversation.messages.length - 1];
        // Sadece streaming mesajı varsa veya beklenmeyen durum varsa log
        if (lastMessage?.isStreaming && !lastMessage?.text) {
          console.log('🤔 [HomeScreen] Streaming mesajı var ama text yok:', {
            conversationId: conversationIdToUse,
            messageId: lastMessage.id,
            messageCount: currentConversation.messages.length
          });
        }
      }
      // Yeni array referansı döndür - React'in değişikliği algılaması için
      return [...currentConversation.messages];
    }
    
    
    // Debug: Hiçbir kaynaktan mesaj bulunamadı
    if (conversationIdToUse) {
      console.warn('⚠️ [HomeScreen] messagesToShow boş - hiçbir kaynaktan mesaj bulunamadı:', {
        conversationId: conversationIdToUse,
        hasConversationFromArray: !!conversationFromArray,
        hasConversationFromArrayMessages: !!(conversationFromArray?.messages),
        conversationFromArrayMessagesLength: conversationFromArray?.messages?.length || 0,
        hasCurrentConversation: !!currentConversation,
        currentConversationId: currentConversation?.id,
        currentConversationMessagesLength: currentConversation?.messages?.length || 0,
        conversationsCount: conversations.length,
        foundInConversations: !!conversations.find(c => c.id === conversationIdToUse)
      });
    }
    
    return [];
  }, [
    conversationIdToUse, 
    conversations, // CRITICAL: conversations array'ini direkt dependency olarak kullan
    // CRITICAL FIX: conversations array'indeki ilgili conversation'ın messages array'ini de dependency olarak ekle
    // Bu sayede mesajlar eklendiğinde/güncellendiğinde messagesToShow yeniden hesaplanır
    conversations.find(conv => conv.id === conversationIdToUse)?.messages,
    conversations.find(conv => conv.id === conversationIdToUse)?.messages?.length,
    currentConversation, 
    currentConversation?.id, // currentConversation ID değiştiğinde algıla
    currentConversation?.messages, // currentConversation messages array'i değiştiğinde algıla
    currentConversation?.messages?.length // Array length değiştiğinde algıla
  ]);
  
  // Check if conversation data is loading
  const isConversationDataLoading = useMemo(() => {
    const conversationIdToUse = selectedConversationId || createdConversationId;
    if (!conversationIdToUse) {
      return false;
    }
    return loadingMessagesConversationIds.includes(conversationIdToUse);
  }, [selectedConversationId, createdConversationId, loadingMessagesConversationIds]);

  // Keyboard handling
  const {
    keyboardHeight,
    isKeyboardVisible,
    isInputFocused,
    setIsInputFocused,
    getKeyboardAwarePaddingBottom: getKeyboardPadding,
    textInputRef,
    dismissKeyboard,
    handleScreenPress,
    keyboardAnimationDuration,
  } = useKeyboardHandling();

  // Başlangıç padding değerini hook'tan al (klavye kapalıyken)
  const initialPadding = useMemo(() => getKeyboardPadding(), [getKeyboardPadding]);
  
  const bottomPadding = useRef(new Animated.Value(initialPadding)).current;
  const lastPaddingRef = useRef<number>(initialPadding);
  
  // Bottom position animasyonu - klavye açıldığında bottom section yukarı hareket etsin
  const bottomPosition = useRef(new Animated.Value(0)).current;
  
  // MessageList container paddingBottom animasyonu - klavye durumuna göre smooth geçiş
  const messagesListPaddingBottom = useRef(new Animated.Value(180)).current; // Başlangıç: input section yüksekliği

  // Dikte feature hooks
  const { dictationState, toggleDictation: originalToggleDictation } = useDictation({
    onTextUpdate: (text: string, replacePrevious?: boolean) => {
      setInputText((prev) => {
        let newText: string;
        if (replacePrevious) {
          // Önceki metni çıkar (düzeltme durumu)
          if (text === '') {
            // Önceki metni çıkar (düzeltme için)
            newText = '';
          } else {
            // Önceki metni çıkar ve yeni metni ekle
            newText = text;
          }
        } else {
          // Normal ekleme
          newText = prev + text;
        }
        if (newText.length > 0) {
          inputClearedRef.current = false;
        }
        return newText;
      });
    },
    onError: (error: string) => {
      Alert.alert("Bilgi", error, [{ text: "Tamam" }]);
    },
    onStart: () => {
      setInputText('');
      inputClearedRef.current = true;
    },
    onStop: () => {},
  });

  const toggleDictation = useCallback(async () => {
    await originalToggleDictation();
  }, [originalToggleDictation]);

  const { animations: waveAnimations } = useWaveAnimation(dictationState.isDictating);

  // Permission hooks
  const { mediaLibrary, documents } = useFilePermissions();
  const { showPermissionDialog } = usePermissionDialogs();

  // Upload modal
  const {
    showUploadModal,
    openUploadModal,
    closeUploadModal,
    translateY,
    panHandlers,
  } = useChatUploadModal({
    initialVisible: false,
    dismissKeyboard,
    textInputRef,
    setIsInputFocused,
    isKeyboardVisible, // Klavye durumunu geçir
  });

  // Attachments
  const {
    selectedImages,
    setSelectedImages,
    selectedFiles,
    setSelectedFiles,
    pickImage,
    pickDocument,
    removeImage,
    removeFile,
  } = useChatAttachments({
    mediaLibraryPermission: mediaLibrary,
    documentsPermission: documents,
    showPermissionDialog,
    onCloseUploadModal: closeUploadModal,
    onOpenUploadModal: openUploadModal,
    textInputRef,
    setInputText,
  });

  const heroReveal = useRef(new Animated.Value(1)).current;

  // Conversation değiştiğinde veya olmadığında input section'ı temizle
  const previousConversationIdRef = useRef<string | undefined | null>(undefined);
  useEffect(() => {
    // HomeScreen'de aktif conversation ID'yi belirle
    const currentId = selectedConversationId || createdConversationId || currentConversation?.id || null;
    const previousId = previousConversationIdRef.current;
    
    // Eğer conversation değiştiyse, yoksa (null) veya ilk mount ise temizle
    const shouldCleanup = previousId === undefined || // İlk mount
                          previousId !== currentId;   // Conversation değişti veya null oldu
    
    if (shouldCleanup) {
      console.log('🧹 [HomeScreen] Conversation değişti veya yok, input section temizleniyor...', {
        previousId,
        currentId,
        selectedConversationId,
        createdConversationId,
        currentConversationId: currentConversation?.id,
        isFirstMount: previousId === undefined,
        conversationChanged: previousId !== undefined && previousId !== currentId,
        conversationIsNull: currentId === null
      });
      
      // Input section'ı temizle
      setInputText('');
      inputClearedRef.current = true;
      setSelectedImages([]);
      setSelectedFiles([]);
      setArastirmaModu(false);
      
      // Dikte durdur (eğer aktifse)
      if (dictationState.isDictating || dictationState.isListening) {
        console.log('🛑 [HomeScreen] Dikte durduruluyor (conversation change/null)');
        originalToggleDictation();
      }
      
      // Streaming durdur (eğer aktifse)
      if (isStreaming) {
        console.log('🛑 [HomeScreen] Streaming durduruluyor (conversation change/null)');
        cancelStreamingResponse();
      }
      
      // Klavyeyi kapat
      dismissKeyboard();
      
      // Upload modal'ı kapat
      if (showUploadModal) {
        closeUploadModal();
      }
      
      console.log('✅ [HomeScreen] Input section temizlendi');
      
      // Mevcut ID'yi kaydet
      previousConversationIdRef.current = currentId;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversationId, createdConversationId, currentConversation?.id]); // Conversation ID'leri değiştiğinde çalışsın

  const [fontsLoaded, fontError] = useFonts({
    "Poppins-Regular": require("@assets/fonts/Poppins-Regular .ttf"),
    "Poppins-Medium": require("@assets/fonts/Poppins-Medium.ttf"),
    "SpaceGrotesk-Regular": require("@assets/fonts/SpaceGrotesk-Regular.ttf"),
  });

  // Font loading error handling
  if (fontError) {
    console.error("Font loading error:", fontError);
    // Continue with fallback fonts instead of blocking UI
  }

  // PanResponder for swipe gesture - soldan sağa çekme ile chat history açma (memoized)
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: (evt) => {
          // Sol kenardan başlayan dokunuşları yakala (ilk 30px içinde)
          const startX = evt.nativeEvent.pageX;
          return startX < 30;
        },
        onMoveShouldSetPanResponder: (evt, gestureState) => {
          // Sol kenardan başlayan ve sağa doğru hareket eden gesture'ları algıla
          const startX = evt.nativeEvent.pageX - gestureState.dx;
          const isFromLeftEdge = startX < 30;
          const isRightwardSwipe = gestureState.dx > 20; // Daha düşük threshold
          const isMostlyHorizontal = Math.abs(gestureState.dy) < Math.abs(gestureState.dx) * 2;
          
          return isFromLeftEdge && isRightwardSwipe && isMostlyHorizontal;
        },
        onPanResponderGrant: () => {
          // Swipe gesture başladı
        },
        onPanResponderMove: (evt, gestureState) => {
          // Hareket sırasında herhangi bir animasyon yapma
          // Sadece gesture'ı takip et
        },
        onPanResponderRelease: (evt, gestureState) => {
          // Eğer yeterince sağa çekildiyse chat history'yi aç
          // Threshold'u düşürdük - daha kolay tetiklenir
          if (gestureState.dx > 50) {
            onOpenChatHistory();
          }
        },
      }),
    [onOpenChatHistory]
  );

  const openModal = useCallback(async () => {
    // "+" butonuna basıldığında boş bir conversation oluştur
    
    // Eğer aktif bir streaming varsa, önce durdur
    if (isStreaming) {
      console.log('🛑 [HomeScreen] Yeni conversation açılıyor, eski streaming durduruluyor');
      cancelStreamingResponse();
    }
    
    setPlusButtonPressed(true);
    
    // Boş bir conversation oluştur
    const conversationId = await createNewConversation("Yeni Sohbet", "");
    setCreatedConversationId(conversationId);
  }, [createNewConversation, isStreaming, cancelStreamingResponse]);

  const openChatScreen = useCallback(async () => {
    // Header'daki chat butonuna veya logo'ya basıldığında:
    // 1. Home ekranını sıfır haliyle göster (HeroSection)
    // 2. Yeni sohbet hazırlığı başlat - conversation'ı sıfırla
    // 3. Conversation hazırlığı başlar ama backend'e yollamak için ilk mesajı bekler
    // 4. İlk mesaj gönderildiğinde conversation oluşturulacak ve backend'e kaydedilecek
    
    // Eğer aktif bir streaming varsa, önce durdur
    if (isStreaming) {
      console.log('🛑 [HomeScreen] Yeni sohbet açılıyor, eski streaming durduruluyor');
      cancelStreamingResponse();
    }
    
    // selectedConversationId'yi sıfırla - ChatHistoryScreen'den seçilen conversation'ı temizle
    if (onConversationSelected) {
      onConversationSelected();
    }
    
    // Mevcut conversation'ı sıfırla (Chat history'de zaten var)
    setCreatedConversationId(undefined);
    
    // Local storage'dan son conversation ID'yi temizle (yeni sohbet açıldığı için)
    try {
      await AsyncStorage.removeItem(LAST_CONVERSATION_ID_KEY);
    } catch (error) {
      console.error('❌ Son conversation ID silinirken hata:', error);
    }
    
    // Flag'i reset et - yeni sohbet açıldığı için
    lastConversationLoadedRef.current = false;
    previousSelectedConversationIdRef.current = undefined;
    
    // currentConversation'ı da sıfırla - yeni sohbet için hazırlık
    // selectConversation(null) çağırmıyoruz çünkü bu conversation seçmek değil,
    // sadece yeni sohbet hazırlığı yapıyoruz
    // currentConversation zaten yeni conversation oluşturulduğunda güncellenecek
    
    // Input'u temizle
    setInputText("");
    setSelectedImages([]);
    setSelectedFiles([]);
    setArastirmaModu(false);
    
    // Klavyeyi kapat
    dismissKeyboard();
    
    // HeroSection otomatik olarak gösterilecek çünkü createdConversationId undefined olacak
    // Bu sayede yeni sohbet için hazırlık yapılmış olacak
    // İlk mesaj gönderildiğinde conversation oluşturulacak ve backend'e kaydedilecek
  }, [dismissKeyboard, onConversationSelected, isStreaming, cancelStreamingResponse]);


  const handleArastirmaPress = useCallback(() => {
    setArastirmaModu((prev) => !prev);
  }, []);

  // Handle send message from home - creates conversation, sends message, and shows messages in hero area
  // Mesaj gönderme işleminin duplicate çağrılmasını önlemek için ref
  const isSendingMessageRef = useRef(false);

  const handleSendMessage = useCallback(async () => {
    console.log('📤 [HomeScreen] handleSendMessage çağrıldı:', {
      inputText: inputText.substring(0, 50),
      inputTextLength: inputText.length,
      hasImages: selectedImages.length > 0,
      hasFiles: selectedFiles.length > 0,
      isLoading,
      isStreaming,
      isSendingMessage: isSendingMessageRef.current,
      createdConversationId,
      currentConversationId: currentConversation?.id
    });
    
    // Eğer zaten bir mesaj gönderiliyorsa, duplicate çağrıyı engelle
    if (isSendingMessageRef.current) {
      console.log('⚠️ [HomeScreen] Zaten bir mesaj gönderiliyor, duplicate çağrı engellendi');
      return;
    }

    if (!inputText.trim() && selectedImages.length === 0 && selectedFiles.length === 0) {
      console.log('⚠️ [HomeScreen] Mesaj gönderilemedi: içerik yok');
      return;
    }

    // Mesaj gönderme flag'ini set et
    isSendingMessageRef.current = true;
    console.log('✅ [HomeScreen] Mesaj gönderme başlatılıyor...');

    try {
      let conversationId = createdConversationId;
      
      // Eğer conversation yoksa (yeni sohbet modu), ilk mesaj gönderildiğinde oluştur
      // Bu sayede Chat ikonuna basıldığında sadece hazırlık yapılır, conversation oluşturulmaz
      // Conversation sadece ilk mesaj gönderildiğinde backend'e kaydedilir
      if (!conversationId) {
        // Yeni conversation oluşturulmadan önce, eski conversation'daki streaming'i durdur
        if (isStreaming) {
          console.log('🛑 [HomeScreen] Yeni conversation oluşturuluyor, eski streaming durduruluyor');
          cancelStreamingResponse();
        }
        
        const title = inputText.trim().length > 30 
          ? inputText.trim().substring(0, 30) + "..." 
          : inputText.trim() || "Yeni Sohbet";
        
        // İlk mesaj gönderildiğinde conversation oluştur ve backend'e kaydet
        // createNewConversation zaten currentConversation'ı set ediyor, bu yüzden
        // selectConversation çağrısına gerek yok
        conversationId = await createNewConversation(title);
        setCreatedConversationId(conversationId);
        
        // React state güncellemelerinin tamamlanması için kısa bir bekleme
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      // Mesaj gönder (conversation artık var, yeni mesajlar bu conversation içinde tutulacak)
      if (conversationId) {
        console.log('📤 [HomeScreen] sendMessage çağrılıyor:', {
          messageText: inputText.trim().substring(0, 50),
          conversationId,
          arastirmaModu,
          imagesCount: selectedImages.length,
          filesCount: selectedFiles.length
        });
        await sendMessage(
          inputText.trim(),
          conversationId,
          arastirmaModu,
          selectedImages,
          selectedFiles
        );
        console.log('✅ [HomeScreen] sendMessage tamamlandı');
        
        // Mesaj gönderildikten sonra currentConversation'ın güncellenmesi için kısa bir bekleme
        // sendMessage zaten addMessage çağırıyor ve currentConversation'ı güncelliyor
        await new Promise(resolve => setTimeout(resolve, 100));
      } else {
        console.error('❌ [HomeScreen] conversationId yok, mesaj gönderilemedi:', {
          createdConversationId,
          currentConversationId: currentConversation?.id,
          conversationId
        });
        Alert.alert("Hata", "Konuşma oluşturulamadı. Lütfen tekrar deneyin.");
      }
      
      // Clear input ve focus'u kapat
      setInputText("");
      setSelectedImages([]);
      setSelectedFiles([]);
      setIsInputFocused(false);
      
      // Mesaj gönderildikten sonra klavyeyi kapat (kullanıcı odaklı)
      // Kısa bir delay ile kapat - mesaj gönderilme animasyonu tamamlansın
      setTimeout(() => {
        dismissKeyboard();
      }, 100);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      // İnternet bağlantısı hatası zaten Alert gösterildi, tekrar gösterme
      const isInternetError = errorMessage.includes('İnternet bağlantısı') || 
                             errorMessage.includes('internet bağlantısı') ||
                             errorMessage.includes('internet');
      
      if (!isInternetError) {
        console.error("❌ [HomeScreen] Mesaj gönderme hatası:", {
          error: errorMessage,
          errorName: error instanceof Error ? error.name : undefined,
          stack: errorStack,
          inputText: inputText.substring(0, 50),
          inputTextLength: inputText.length,
          conversationId: createdConversationId || currentConversation?.id,
          hasCreatedConversationId: !!createdConversationId,
          hasCurrentConversation: !!currentConversation,
          isLoading,
          isStreaming
        });
        
        // Hata mesajını kullanıcıya göster (internet hatası değilse)
        const userFriendlyMessage = errorMessage || "Mesaj gönderilirken bir hata oluştu.";
        Alert.alert("Hata", userFriendlyMessage);
      } else {
        // İnternet hatası - zaten Alert gösterildi, sadece log
        console.warn("⚠️ [HomeScreen] İnternet bağlantısı hatası (Alert zaten gösterildi):", errorMessage);
      }
    } finally {
      // Mesaj gönderme flag'ini reset et
      isSendingMessageRef.current = false;
      console.log('✅ [HomeScreen] Mesaj gönderme flag\'i resetlendi');
    }
  }, [inputText, selectedImages, selectedFiles, createdConversationId, createNewConversation, sendMessage, arastirmaModu, dismissKeyboard, setIsInputFocused, currentConversation, selectConversation]);

  const handleQuickSuggestionSelect = useCallback(async (suggestion: QuickSuggestion) => {
    try {
      setShowQuickSuggestions(false);

      // Öneri seçildiğinde, eğer conversation yoksa yeni conversation oluştur
      // (Chat ikonuna basıldığında conversation sıfırlanmış olabilir)
      const title = suggestion.question.length > 30 ? suggestion.question.substring(0, 30) + '...' : suggestion.question;
      
      let conversationId = createdConversationId;
      
      // Eğer conversation yoksa (yeni sohbet modu), öneri seçildiğinde conversation oluştur
      // Bu sayede öneri seçimi de ilk mesaj gönderme gibi davranır
      if (!conversationId) {
        // Yeni conversation oluşturulmadan önce, eski conversation'daki streaming'i durdur
        if (isStreaming) {
          console.log('🛑 [HomeScreen] Öneri ile yeni conversation oluşturuluyor, eski streaming durduruluyor');
          cancelStreamingResponse();
        }
        
        // createNewConversation zaten currentConversation'ı set ediyor, bu yüzden
        // selectConversation çağrısına gerek yok
        conversationId = await createNewConversation(title);
        setCreatedConversationId(conversationId);
        
        // React state güncellemelerinin tamamlanması için kısa bir bekleme
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      // Mesaj gönder (Home ekranında mesajlaşma alanında gösterilecek)
      // Sonraki mesajlar bu conversation içinde tutulacak
      if (conversationId) {
        await sendMessage(
          suggestion.question,
          conversationId,
          false, // arastirmaModu
          [], // selectedImages
          [], // selectedFiles
          suggestion.promptType
        );
      } else {
        console.error('❌ Konuşma oluşturulamadı');
      }
    } catch (error) {
      console.error('❌ Öneri seçim hatası:', error);
      Alert.alert("Hata", "Öneri seçilirken bir hata oluştu.");
    }
  }, [createdConversationId, createNewConversation, sendMessage, isStreaming, cancelStreamingResponse]);

  // Handle selected conversation - ChatHistoryScreen'den seçilen conversation'ı kullan
  useEffect(() => {
    // Duplicate çağrıları önle - aynı conversation zaten seçiliyse tekrar işlem yapma
    if (selectedConversationId && previousSelectedConversationIdRef.current === selectedConversationId) {
      return; // Zaten işlenmiş, tekrar işleme
    }
    
    if (selectedConversationId) {
      // Yeni conversation seçildi - ChatHistoryScreen'den geldi
      console.log('📥 HomeScreen: selectedConversationId değişti, conversation seçiliyor:', selectedConversationId);
      
      // Eğer farklı bir conversation seçildiyse ve aktif streaming varsa, durdur
      const previousId = previousSelectedConversationIdRef.current;
      if (previousId !== undefined && previousId !== selectedConversationId && isStreaming) {
        console.log('🛑 [HomeScreen] Farklı conversation seçildi, eski streaming durduruluyor');
        cancelStreamingResponse();
      }
      
      // createdConversationId'yi hemen set et - render'ın hemen mesajlaşma alanını göstermesi için
      // selectConversation async olduğu için state güncellemesi gecikebilir
      setCreatedConversationId(selectedConversationId);
      lastConversationLoadedRef.current = true;
      previousSelectedConversationIdRef.current = selectedConversationId;
      
      // CRITICAL FIX: selectConversation'ı sadece bir kez çağır
      // ChatHistoryScreen'de zaten çağrılmış olabilir, bu yüzden duplicate çağrıyı önle
      // selectConversation içinde deduplication var ama yine de gereksiz çağrıyı önle
      const selectPromise = selectConversation(selectedConversationId);
      
      // Promise'i bekle ama hata durumunda da devam et
      selectPromise
        .then(() => {
          console.log('✅ HomeScreen: Conversation seçildi ve mesajlar yüklendi:', selectedConversationId);
          
          // Local storage'a kaydet
          AsyncStorage.setItem(LAST_CONVERSATION_ID_KEY, selectedConversationId).catch(error => {
            console.error('❌ Son conversation ID kaydedilirken hata:', error);
          });
        })
        .catch((error) => {
          console.error('❌ HomeScreen: Conversation seçilirken hata:', error);
          // Hata durumunda createdConversationId zaten set edilmiş, sorun yok
        });
    } else if (selectedConversationId === undefined && previousSelectedConversationIdRef.current !== undefined) {
      // selectedConversationId undefined oldu ve daha önce bir conversation seçilmişti
      // Bu, Chat History'den geri dönüldüğünde ve conversation seçilmediğinde olur
      // Eğer createdConversationId yoksa, son conversation'ı restore et
      const restoreConversation = async () => {
        // Eğer zaten bir conversation varsa, restore etme
        if (createdConversationId) {
          previousSelectedConversationIdRef.current = undefined; // Flag'i reset et
          return;
        }

        try {
          const lastConversationId = await AsyncStorage.getItem(LAST_CONVERSATION_ID_KEY);
          
          if (lastConversationId) {
            console.log('📱 Chat History\'den geri dönüldü, conversation restore ediliyor:', lastConversationId);
            
            lastConversationLoadedRef.current = true;
            
            try {
              await selectConversation(lastConversationId);
              setCreatedConversationId(lastConversationId);
              console.log('✅ Conversation restore edildi:', lastConversationId);
            } catch (error) {
              console.error('❌ Conversation restore edilirken hata:', error);
              lastConversationLoadedRef.current = false;
            }
          }
          
          previousSelectedConversationIdRef.current = undefined; // Flag'i reset et
        } catch (error) {
          console.error('❌ Local storage okuma hatası:', error);
          previousSelectedConversationIdRef.current = undefined; // Flag'i reset et
        }
      };

      restoreConversation();
    } else if (selectedConversationId === undefined) {
      // İlk mount veya selectedConversationId zaten undefined
      previousSelectedConversationIdRef.current = undefined;
    }
  }, [selectedConversationId, selectConversation, isStreaming, cancelStreamingResponse, createdConversationId]); // Streaming durdurma için isStreaming ve cancelStreamingResponse eklendi

  // createdConversationId değiştiğinde local storage'a kaydet (yeni conversation oluşturulduğunda)
  // Ancak sadece manuel olarak değiştirildiğinde kaydet (yükleme sırasında değil)
  useEffect(() => {
    if (createdConversationId && lastConversationLoadedRef.current) {
      // Yeni conversation oluşturulduğunda veya mevcut conversation seçildiğinde kaydet
      // lastConversationLoadedRef.current true ise, bu manuel bir değişiklik (yükleme değil)
      AsyncStorage.setItem(LAST_CONVERSATION_ID_KEY, createdConversationId).catch(error => {
        console.error('❌ Son conversation ID kaydedilirken hata:', error);
      });
    }
  }, [createdConversationId]);

  // Uygulama açıldığında son conversation'ı yükle (sadece bir kez)
  useEffect(() => {
    const loadLastConversation = async () => {
      // Eğer zaten yüklendiyse veya selectedConversationId varsa, tekrar yükleme
      if (lastConversationLoadedRef.current || selectedConversationId) {
        return;
      }

      try {
        // Local storage'dan son conversation ID'yi oku
        const lastConversationId = await AsyncStorage.getItem(LAST_CONVERSATION_ID_KEY);
        
        if (lastConversationId) {
          console.log('📱 Son conversation yükleniyor:', lastConversationId);
          
          // Flag'i set et - yükleme başladı
          lastConversationLoadedRef.current = true;
          
          // Son conversation'ı seç ve mesajları yükle
          try {
            await selectConversation(lastConversationId);
            setCreatedConversationId(lastConversationId);
            console.log('✅ Son conversation yüklendi:', lastConversationId);
          } catch (error) {
            console.error('❌ Son conversation yüklenirken hata:', error);
            // Hata durumunda local storage'dan temizle
            await AsyncStorage.removeItem(LAST_CONVERSATION_ID_KEY);
            lastConversationLoadedRef.current = false; // Hata durumunda flag'i reset et
          }
        } else {
          // Son conversation yok, flag'i set et
          lastConversationLoadedRef.current = true;
        }
      } catch (error) {
        console.error('❌ Local storage okuma hatası:', error);
        lastConversationLoadedRef.current = true; // Hata olsa bile flag'i set et (tekrar deneme)
      }
    };

    loadLastConversation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Sadece mount'ta çalışmalı

  // Conversation oluşturulduğunda createNewConversation zaten currentConversation'ı set ediyor,
  // conversations array'inde arama yapmaya gerek yok
  
  // Yeni conversation oluşturulduğunda conversations array'ine eklenmesini bekle
  // Eğer conversationFromArray bulunamıyorsa, currentConversation'ı kullan
  useEffect(() => {
    if (createdConversationId && !conversationFromArray && currentConversation && currentConversation.id === createdConversationId) {
      // Yeni conversation oluşturuldu ama conversations array'inde henüz yok
      // currentConversation'ı kullan - createNewConversation zaten set ediyor
      console.log('🔄 [HomeScreen] Yeni conversation oluşturuldu, currentConversation kullanılıyor:', {
        conversationId: createdConversationId,
        hasCurrentConversation: !!currentConversation,
        messagesCount: currentConversation.messages?.length || 0
      });
    }
  }, [createdConversationId, conversationFromArray, currentConversation]);
  
  // Mesaj gönderildikten sonra currentConversation'ın güncellenmesini bekle
  useEffect(() => {
    if (createdConversationId && currentConversation && currentConversation.id === createdConversationId) {
      // Conversation seçili ve doğru, mesajlar yüklenecek
      // Log kaldırıldı - gereksiz render log'u
    }
  }, [createdConversationId, currentConversation]);

  // HeroSection animasyonu - her zaman görünür
  useEffect(() => {
    const animation = Animated.timing(heroReveal, {
      toValue: 1,
      duration: 500,
      delay: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });

    animation.start();

    return () => {
      animation.stop();
    };
  }, [heroReveal]);

  // Bottom padding ve position - klavye ile tam senkronize, animasyon yok direkt set
  useEffect(() => {
    const targetPadding = getKeyboardPadding();
    const targetBottom = isKeyboardVisible ? keyboardHeight : 0;
    
    // Klavye ile senkronize hareket için animasyon yok, direkt set et
    // Bu sayede klavye ile birlikte anında hareket eder
    bottomPadding.setValue(targetPadding);
    bottomPosition.setValue(targetBottom);
    lastPaddingRef.current = targetPadding;
  }, [keyboardHeight, isKeyboardVisible, getKeyboardPadding, bottomPadding, bottomPosition]);

  // MessageList container paddingBottom - klavye ile senkronize, animasyon yok direkt set
  useEffect(() => {
    const inputSectionHeight = 180;
    const targetPadding = isKeyboardVisible 
      ? inputSectionHeight + keyboardHeight 
      : inputSectionHeight;
    
    // Klavye ile senkronize hareket için animasyon yok, direkt set et
    // Bu sayede klavye ile birlikte anında hareket eder, kasma olmaz
    messagesListPaddingBottom.setValue(targetPadding);
    
    // Padding güncellendiğinde mesajları da anında son mesaja scroll et
    // Bu sayede padding ve scroll aynı anda güncellenir, tam senkronize olur
    if (messagesScrollViewRef.current && messagesArray.length > 0) {
      // Önce direkt scroll (en hızlı)
      messagesScrollViewRef.current.scrollToEnd({ animated: false });
      
      // Sonra bir sonraki frame'de tekrar scroll (layout güncellemeleri için)
      requestAnimationFrame(() => {
        if (messagesScrollViewRef.current) {
          messagesScrollViewRef.current.scrollToEnd({ animated: false });
        }
      });
    }
  }, [isKeyboardVisible, keyboardHeight, messagesListPaddingBottom, messagesArray.length]);

  // İlk render'da padding değerini doğru set et
  useEffect(() => {
    const currentPadding = getKeyboardPadding();
    if (lastPaddingRef.current !== currentPadding) {
      bottomPadding.setValue(currentPadding);
      lastPaddingRef.current = currentPadding;
    }
  }, []);

  // Hero görselini önceden yükle - daha hızlı görünmesi için
  useEffect(() => {
    // Görseli önceden yüklemek için Image.prefetch kullan
    // Bu sayede HeroSection render edildiğinde görsel zaten cache'de olur
    const preloadImage = async () => {
      try {
        const imageSource = require('@assets/videos/gif.png');
        // React Native Image component'i otomatik olarak cache kullanır
        if (Image.prefetch && imageSource) {
          const resolvedSource = Image.resolveAssetSource(imageSource);
          if (resolvedSource?.uri) {
            await Image.prefetch(resolvedSource.uri);
            console.log('✅ Hero görseli önceden yüklendi');
          }
        }
      } catch (error) {
        // Prefetch hatası önemli değil, normal yükleme yapılacak
        console.log('⚠️ Hero görsel prefetch hatası (normal yükleme yapılacak):', error);
      }
    };
    
    // Home ekranı mount olduğunda görseli önceden yükle
    preloadImage();
  }, []);

  // Show loading while fonts are loading
  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={styles.container}>
      <AnimatedKeyboardAvoidingView
        style={styles.container}
        behavior={undefined}
        keyboardVerticalOffset={0}
        enabled={false}
        {...panResponder.panHandlers}
      >
      <TouchableWithoutFeedback onPress={handleScreenPress} accessible={false}>
        <LinearGradient
          colors={["#02020A", "#16163C"]}
          locations={[0.1827, 1.0]}
          style={styles.container}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        >
          {/* Header */}
          <Header
            onBackPress={onOpenChatHistory}
            onChatPress={openChatScreen}
            onLogoPress={openChatScreen}
            showBackButton={true}
            showChatButton={true}
          />

          {/* Hero Section veya Mesajlaşma Alanı */}
          {(() => {
            // Orta kısım bottom section (input alanı) durumuna göre değişir
            const hasInputContent = inputText.trim().length > 0 || selectedImages.length > 0 || selectedFiles.length > 0;
            
            // Conversation oluşturulduysa (createdConversationId varsa) veya ChatHistoryScreen'den seçildiyse (selectedConversationId varsa) mesajlaşma alanını göster
            // Bu sayede mesaj gönderildikten sonra input temizlense bile conversation var olduğu için mesajlaşma alanı görünmeye devam eder
            // Input içeriği sadece conversation oluşturulmadan önce önemli (yeni conversation başlatılacaksa)
            // Eğer conversation yoksa ama input içeriği varsa, mesajlaşma alanını göster (yeni conversation oluşturulacak)
            const shouldShowMessages = (selectedConversationId || createdConversationId)
              ? true // Conversation varsa (seçilmiş veya oluşturulmuş) her zaman mesajlaşma alanını göster
              : hasInputContent; // Conversation yoksa sadece input içeriği varsa göster
            
            if (shouldShowMessages) {
              // Mesajlaşma alanı (conversation var)
              // messagesToShow zaten useMemo ile optimize edilmiş ve conversations array'inden alınıyor
              // Bu sayede mesajlar gecikme olmadan ekrana yansır
              
              return (
                <TouchableWithoutFeedback onPress={handleScreenPress} accessible={false}>
                  <Animated.View 
                    style={[
                      styles.messagesListContainer, 
                      { paddingBottom: messagesListPaddingBottom }
                    ]}
                  >
                    <MessageList
                      messages={messagesToShow}
                      isLoading={isLoading}
                      scrollViewRef={messagesScrollViewRef}
                      isKeyboardVisible={isKeyboardVisible}
                      keyboardHeight={keyboardHeight}
                      conversationId={selectedConversationId || createdConversationId}
                      isDataLoading={isConversationDataLoading && (!currentConversation?.messages || currentConversation.messages.length === 0)}
                      aiBubbleColor="#00DDA5"
                      onScrollToEnd={() => {
                        // Optional: Additional scroll handling
                      }}
                      onScrollBeginDrag={() => {
                        // Scroll başladığında klavye kapat (kullanıcı mesajları okumak istiyor)
                        if (isKeyboardVisible) {
                          dismissKeyboard();
                        }
                      }}
                    />
                  </Animated.View>
                </TouchableWithoutFeedback>
              );
            } else {
              // HeroSection (conversation yoksa veya input boşsa)
              // Klavye açıksa HeroSection'ı tamamen render etme - layout hesaplamalarını etkilemesin
              if (isKeyboardVisible) {
                return null;
              }
              
              return (
                <TouchableWithoutFeedback onPress={handleScreenPress} accessible={false}>
                  <View style={styles.heroSectionWrapper}>
                    <HeroSection animationProgress={heroReveal} isKeyboardVisible={isKeyboardVisible} />
                  </View>
                </TouchableWithoutFeedback>
              );
            }
          })()}

          {/* Input Section - Fixed at bottom */}
          <ChatInputSection
            inputText={inputText}
            setInputText={setInputText}
            isInputFocused={isInputFocused}
            setIsInputFocused={setIsInputFocused}
            onSendMessage={handleSendMessage}
            onDictate={toggleDictation}
            onOpenUploadModal={openUploadModal}
            onInputAreaPress={handleScreenPress}
            onSuggestions={handleOnerilerPress}
            onResearch={handleArastirmaPress}
            isLoading={isLoading}
            isStreaming={isStreaming}
            onCancelStreaming={cancelStreamingResponse}
            isResearchMode={arastirmaModu}
            isDictating={dictationState.isDictating}
            isProcessing={dictationState.isProcessing}
            selectedImages={selectedImages}
            selectedFiles={selectedFiles}
            onRemoveImage={removeImage}
            onRemoveFile={removeFile}
            textInputRef={textInputRef}
            placeholder="Herhangi bir şey sor"
            multiline={true} // Home ekranında multiline aktif - satır satır yazabilmek için
            maxLength={1000}
            autoCorrect={true}
            autoCapitalize="sentences"
            returnKeyType="default" // Multiline aktifken "default" kullan (yeni satır için)
            keyboardType="default"
            secureTextEntry={false}
            editable={true}
            selectTextOnFocus={false}
            clearButtonMode="while-editing"
            autoFocus={false}
            blurOnSubmit={false} // Multiline aktifken blur yapma
            onSubmitEditing={undefined} // Multiline aktifken onSubmitEditing'i devre dışı bırak
            testID="home-input"
            accessibilityLabel="Soru girişi"
            accessibilityHint="AI asistanınıza soru yazın veya sesli yazma kullanın"
            accessibilityRole="textbox"
            waveAnimations={waveAnimations}
            containerStyle={styles.inputSectionContainer}
            animatedPaddingBottom={bottomPadding}
            animatedBottom={bottomPosition}
          />


          <HomeQuickSuggestionsModal
            visible={showQuickSuggestions}
            onClose={() => setShowQuickSuggestions(false)}
            isLoading={isLoadingSuggestions}
            suggestions={currentSuggestions}
            onSelectSuggestion={handleQuickSuggestionSelect}
          />

          {/* Upload Modal */}
          <Modal
            visible={showUploadModal}
            animationType="slide"
            transparent={true}
            onRequestClose={() => closeUploadModal()}
          >
            <UploadModal
              visible={showUploadModal}
              translateY={translateY}
              panHandlers={panHandlers}
              selectedImages={selectedImages}
              selectedFiles={selectedFiles}
              onPickImage={pickImage}
              onSelectRecentPhoto={(photoUri) => {
                setSelectedImages((prev) => [...prev, photoUri]);
                closeUploadModal(true);
              }}
              onPickDocument={pickDocument}
              onRemoveImage={removeImage}
              onRemoveFile={removeFile}
              onRequestClose={closeUploadModal}
            />
          </Modal>
        </LinearGradient>
      </TouchableWithoutFeedback>
      </AnimatedKeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width,
    height,
  },
  heroSectionWrapper: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "center",
  },
  messagesListContainer: {
    flex: 1,
    minHeight: 0, // Important for ScrollView to work properly (ChatScreen'deki gibi)
    backgroundColor: "transparent",
    position: "relative",
    // paddingBottom dinamik olarak ayarlanacak (klavye durumuna göre)
  },
  inputSectionContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "column",
    justifyContent: "flex-start",
    alignItems: "flex-start",
    paddingHorizontal: getResponsivePadding(),
    paddingTop: 20,
    width: '100%', // Tam genişlik kullan - büyük ekranlarda sınır yok
    maxWidth: '100%', // Maksimum genişlik sınırı yok
    gap: getResponsiveGap(),
    alignSelf: "center",
    backgroundColor: "transparent",
    zIndex: 1000,
  },
});

export default memo(HomeScreen);
