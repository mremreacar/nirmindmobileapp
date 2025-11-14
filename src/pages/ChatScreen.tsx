import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Modal,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  TouchableWithoutFeedback,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useChat } from '@/src/lib/context/ChatContext';
import { ChatMessage } from '@/src/lib/mock/types';
import Header from '@/src/components/Header';
import UploadModal from '@/src/components/UploadModal';
import MessageList from '@/src/components/chat/MessageList';
import ChatInputSection from '@/src/components/chat/ChatInputSection';
import QuickSuggestionsModal from '@/src/components/chat/QuickSuggestionsModal';
import ErrorBoundary from '@/src/components/ErrorBoundary';
import { useChatMessages } from '@/src/hooks/useChatMessages';
import { useKeyboardHandling } from '@/src/hooks/useKeyboardHandling';
import { useQuickSuggestions } from '@/src/hooks/useQuickSuggestions';
import { CHAT_CONSTANTS } from '@/src/constants/chatConstants';
import { useDictation, useWaveAnimation } from '@/src/features/dictation';
import { useFilePermissions, usePermissionDialogs } from '@/src/lib/permissions';
import { useChatUploadModal } from '@/src/hooks/useChatUploadModal';
import { useChatAttachments } from '@/src/hooks/useChatAttachments';
import { useChatMessaging } from '@/src/hooks/useChatMessaging';
import type { ChatScreenProps } from '@/src/types/chat';

const ChatScreen: React.FC<ChatScreenProps> = ({
  translateX,
  onClose,
  onOpenChatHistory,
  initialMessage,
  initialImages = [],
  initialFiles = [],
  conversationId,
  initialArastirmaModu = false,
  initialUploadModalOpen = false,
  initialPromptType,
}) => {
  const {
    currentConversation,
    addMessage,
    selectConversation,
    updateResearchMode,
    loadingMessagesConversationIds,
  } = useChat();
  const { isLoading, isStreaming, sendMessage, sendQuickSuggestion, cancelStreamingResponse } = useChatMessages();
  const activeConversationId = useMemo(() => currentConversation?.id || conversationId || null, [currentConversation?.id, conversationId]);
  const isConversationDataLoading = useMemo(() => {
    if (!activeConversationId) {
      return false;
    }
    return loadingMessagesConversationIds.includes(activeConversationId);
  }, [activeConversationId, loadingMessagesConversationIds]);
  
  // Memoize messages array to prevent unnecessary re-renders
  const messagesArray = useMemo(() => {
    if (currentConversation?.messages && Array.isArray(currentConversation.messages)) {
      return currentConversation.messages;
    }
    return [];
  }, [currentConversation?.messages]);
  const { 
    keyboardHeight, 
    isKeyboardVisible, 
    isInputFocused, 
    setIsInputFocused,
    getKeyboardAwarePaddingBottom,
    textInputRef,
    focusInput,
    blurInput,
    dismissKeyboard,
    handleScreenPress,
    handleKeyPress,
    getScrollOffset,
    getAccessibilityProps,
    keyboardAnimationDuration,
    keyboardAnimationEasing,
    isSmallScreen,
    isLargeScreen,
    isTablet,
    isAndroid,
    isIOS
  } = useKeyboardHandling();

  // Klavyeyi sadece yeni conversation oluşturulduğunda veya initialMessage varsa aç
  // Geçmiş mesajlardan açıldığında klavyeyi açma
  // Performans için: Klavye açılmasını mesaj render'ından sonraya ertele
  const focusTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (initialUploadModalOpen) {
      return;
    }

    // Önceki timeout'u temizle
    if (focusTimeoutRef.current) {
      clearTimeout(focusTimeoutRef.current);
    }

    // Eğer initialMessage varsa (yeni mesaj gönderilecek) veya conversation yoksa (yeni conversation) klavyeyi aç
    // Ama eğer conversation zaten yüklenmişse ve initialMessage yoksa (geçmiş mesajlardan açıldıysa) klavyeyi açma
    const shouldFocus = initialMessage && initialMessage.trim().length > 0;
    
    if (shouldFocus) {
      // Mesajlar render edildikten sonra klavyeyi aç - performans için delay artırıldı
      focusTimeoutRef.current = setTimeout(() => {
        focusInput();
      }, 300);

      return () => {
        if (focusTimeoutRef.current) {
          clearTimeout(focusTimeoutRef.current);
        }
      };
    } else {
      // Geçmiş mesajlardan açıldıysa klavyeyi kapat
      dismissKeyboard();
    }
  }, [focusInput, initialUploadModalOpen, initialMessage, dismissKeyboard]);
  const {
    showQuickSuggestions,
    setShowQuickSuggestions,
    currentSuggestions,
    handleOnerilerPress,
    handleSuggestionSelect
  } = useQuickSuggestions();

  const [inputText, setInputText] = useState(initialMessage || "");
  const [arastirmaModu, setArastirmaModu] = useState(initialArastirmaModu);
  
  // Input temizleme kontrolü için ref
  const inputClearedRef = useRef(false);
  // Önceki conversation ID'yi takip et (input section temizleme için)
  const previousConversationIdRef = useRef<string | null | undefined>(undefined);

  // Dikte feature hooks
  const { dictationState, toggleDictation: originalToggleDictation } = useDictation({
    onTextUpdate: (text: string, replacePrevious?: boolean) => {
      // Hızlı text güncelleme - functional update kullan (closure sorununu önler)
      setInputText((prev) => {
        let newText: string;
        if (replacePrevious) {
          // Önceki metni çıkar (düzeltme durumu)
          // Metin değiştiğinde, önceki metni input'tan çıkar ve yeni metni ekle
          // Basit yaklaşım: Eğer text tam metin ise, önceki dikte metnini çıkar ve yeni metni ekle
          // lastReceivedTextRef kullanarak son eklenen metni takip edemeyiz (hook içinde)
          // Bu yüzden: replacePrevious=true ise, text'i direkt kullan (önceki metin zaten çıkarılmış olmalı)
          newText = text;
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
      console.error('❌ [ChatScreen] Chat dikte hatası:', error);
      // Kullanıcıya bilgilendirme mesajı göster
      Alert.alert('Bilgi', error, [{ text: 'Tamam' }]);
    },
    onStart: () => {
      // Yeni dikte başladığında input alanını temizle (önceki dikte metnini kaldır)
      setInputText('');
      inputClearedRef.current = true;
    },
    onStop: () => {
    },
  });

  // Dikte tuşuna basma wrapper
  const toggleDictation = useCallback(async () => {
    await originalToggleDictation();
  }, [originalToggleDictation]);

  const { animations: waveAnimations } = useWaveAnimation(dictationState.isDictating);

  // Permission hooks
  const { mediaLibrary, documents } = useFilePermissions();
  
  const { showPermissionDialog, showRequiredPermissionsDialog } = usePermissionDialogs();

  // Refs
  const scrollViewRef = useRef<ScrollView | null>(null);

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

  const {
    selectedImages,
    setSelectedImages,
    selectedFiles,
    setSelectedFiles,
    pickImage,
    pickDocument,
    handleAskAboutFile,
    handleViewAllFiles,
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

  const { handleSendMessage, handleSendFilesOnly } = useChatMessaging({
    conversationId,
    currentConversation,
    selectedImages,
    setSelectedImages,
    selectedFiles,
    setSelectedFiles,
    inputText,
    setInputText,
    arastirmaModu,
    isLoading,
    sendMessage,
    closeUploadModal,
    inputClearedRef,
  });

  // Header'dan yeni sohbete geçildiğinde veya home'a dönüldüğünde input alanını temizle
  const cleanupInputState = useCallback(() => {
    console.log('🧹 [ChatScreen] Input state temizleniyor (header butonu tıklandı)');
    
    // 1. Input text'i temizle
    setInputText('');
    inputClearedRef.current = true;
    
    // 2. Dikte durdur (eğer aktifse)
    if (dictationState.isDictating || dictationState.isListening) {
      console.log('🛑 [ChatScreen] Dikte durduruluyor (cleanup)');
      originalToggleDictation(); // Dikte aktifse durdur
    }
    
    // 3. Streaming'i durdur (eğer aktifse) - kesin olarak temizle
    if (isStreaming || isLoading) {
      console.log('🛑 [ChatScreen] Streaming durduruluyor (cleanup)', { isStreaming, isLoading });
      const cancelled = cancelStreamingResponse();
      // Eğer cancel başarısız olduysa bile state'leri temizle
      if (!cancelled) {
        console.log('⚠️ [ChatScreen] Streaming cancel başarısız, state\'ler manuel temizleniyor');
      }
    }
    
    // 4. Klavyeyi kapat
    dismissKeyboard();
    
    // 5. Upload modal'ı kapat (eğer açıksa)
    if (showUploadModal) {
      closeUploadModal();
    }
    
    // 6. Selected images/files'ı temizle
    setSelectedImages([]);
    setSelectedFiles([]);
    
    // 7. Araştırma modunu sıfırla
    setArastirmaModu(false);
    
    console.log('✅ [ChatScreen] Input state temizlendi');
  }, [
    dictationState.isDictating,
    dictationState.isListening,
    originalToggleDictation,
    isStreaming,
    cancelStreamingResponse,
    dismissKeyboard,
    showUploadModal,
    closeUploadModal,
    setSelectedImages,
    setSelectedFiles,
  ]);

  // ChatScreen mount olduğunda, conversation değiştiğinde veya olmadığında input section'ı temizle
  useEffect(() => {
    const currentId = activeConversationId;
    const previousId = previousConversationIdRef.current;
    
    // Eğer conversation değiştiyse, yoksa (null) veya ilk mount ise temizle
    // İlk mount: previousId === undefined
    // Conversation değişti: previousId !== currentId
    // Conversation null oldu: currentId === null (ve previousId !== null)
    // Yeni conversation açıldı: previousId === null && currentId !== null
    const shouldCleanup = previousId === undefined || // İlk mount
                          previousId !== currentId;   // Conversation değişti veya null oldu
    
    if (shouldCleanup) {
      console.log('🧹 [ChatScreen] Conversation değişti veya yok, input section temizleniyor...', {
        previousId,
        currentId,
        conversationId,
        currentConversationId: currentConversation?.id,
        isFirstMount: previousId === undefined,
        conversationChanged: previousId !== undefined && previousId !== currentId,
        conversationIsNull: currentId === null
      });
      
      // Input section'ı temizle (home'dan geçişte, yeni sohbet açıldığında veya conversation değiştiğinde)
      setInputText('');
      inputClearedRef.current = true;
      setSelectedImages([]);
      setSelectedFiles([]);
      setArastirmaModu(initialArastirmaModu || false);
      
      // Dikte durdur (eğer aktifse)
      if (dictationState.isDictating || dictationState.isListening) {
        console.log('🛑 [ChatScreen] Dikte durduruluyor (conversation change/null)');
        originalToggleDictation();
      }
      
      // Streaming durdur (eğer aktifse)
      if (isStreaming) {
        console.log('🛑 [ChatScreen] Streaming durduruluyor (conversation change/null)');
        cancelStreamingResponse();
      }
      
      // Klavyeyi kapat
      dismissKeyboard();
      
      // Upload modal'ı kapat
      if (showUploadModal) {
        closeUploadModal();
      }
      
      console.log('✅ [ChatScreen] Input section temizlendi');
      
      // Mevcut ID'yi kaydet
      previousConversationIdRef.current = currentId;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversationId, currentConversation?.id]); // activeConversationId veya currentConversation?.id değiştiğinde çalışsın

  // Initialize with initial message - sadece conversation yoksa set et
  useEffect(() => {
    // Eğer conversation varsa ve initial message varsa, mesaj otomatik gönderilecek
    // Bu yüzden input'u sadece conversation yoksa, input boşsa ve input temizlenmemişse set edelim
    if (initialMessage && !currentConversation && !inputText.trim() && !inputClearedRef.current) {
      setInputText(initialMessage);
    }
  }, [initialMessage, currentConversation, inputText]);

  // Initialize UploadModal if needed
  useEffect(() => {
    if (initialUploadModalOpen) {
      console.log('📁 UploadModal başlangıçta açık olarak ayarlanıyor');
      openUploadModal();
    }
  }, [initialUploadModalOpen, openUploadModal]);

  // Chat ekranı açıldığında otomatik klavye açılmasını engelle
  // Kullanıcı manuel olarak input'a dokunmalı

  // Auto-send initial message from HomeScreen - sadece bir kez çalışsın
  const initialMessageSentRef = useRef<string | null>(null); // conversationId'yi sakla
  const initialMessageContentRef = useRef<string | null>(null); // initialMessage içeriğini sakla
  const isSendingRef = useRef<boolean>(false); // Mesaj gönderimi devam ediyor mu kontrolü
  const useEffectRanRef = useRef<boolean | string>(false); // useEffect'in bir kez çalıştığını garanti etmek için
  const conversationLoadedRef = useRef<string | null>(null); // Hangi conversation yüklendi
  
  useEffect(() => {
    // conversationId prop'u varsa onu kullan, yoksa currentConversation.id'yi kullan
    const targetConversationId = conversationId || currentConversation?.id;
    
    // Initial message kontrolü - boş string'leri filtrele
    const trimmedInitialMessage = initialMessage?.trim() || '';
    if (!trimmedInitialMessage || !targetConversationId) {
      return;
    }
    
    // Bu conversation için zaten gönderildi mi kontrol et (EN ERKEN KONTROL)
    const messageKey = `${targetConversationId}-${trimmedInitialMessage}`;
    if (initialMessageSentRef.current === messageKey) {
      console.log('⚠️ Bu conversation için bu mesaj zaten gönderildi (erken kontrol)');
      return;
    }
    
    // Mesaj gönderimi devam ediyor mu kontrol et
    if (isSendingRef.current) {
      console.log('⚠️ Mesaj gönderimi devam ediyor, yeni gönderim engellendi');
      return;
    }
    
    // useEffect'in bu prop kombinasyonu için zaten çalıştığını kontrol et
    const effectKey = `${targetConversationId}-${trimmedInitialMessage}-${initialArastirmaModu}-${initialPromptType}`;
    if (useEffectRanRef.current === effectKey) {
      console.log('⚠️ Bu useEffect zaten çalıştı, tekrar çalıştırma engellendi');
      return;
    }
    
    // Conversation'da zaten mesaj varsa initial message gönderme
    if (currentConversation?.messages && currentConversation.messages.length > 0) {
      const hasSameMessage = currentConversation.messages.some(
        msg => msg.isUser && msg.text.trim() === trimmedInitialMessage
      );
      if (hasSameMessage) {
        console.log('⚠️ Conversation\'da zaten bu mesaj var, initial message gönderilmedi');
        initialMessageSentRef.current = messageKey;
        useEffectRanRef.current = effectKey;
        return;
      }
    }
    
    console.log('🔍 Initial message check:', {
      initialMessage: trimmedInitialMessage,
      conversationId,
      currentConversationId: currentConversation?.id,
      targetConversationId,
      alreadySent: initialMessageSentRef.current,
      hasCurrentConversation: !!currentConversation,
      hasMessages: currentConversation?.messages?.length || 0,
      previousMessage: initialMessageContentRef.current,
      conversationResearchMode: currentConversation?.isResearchMode,
      initialArastirmaModu,
      finalResearchMode: currentConversation?.isResearchMode !== undefined 
        ? currentConversation.isResearchMode 
        : initialArastirmaModu
    });
    
    // Conversation henüz yüklenmemişse bekle, ama initialArastirmaModu varsa bekleme
    // Çünkü initialArastirmaModu prop'u zaten geçerli (Home ekranından geldiğinde)
    // Eğer initialArastirmaModu undefined ise (geçmiş konuşmalardan geldiğinde), conversation yüklenene kadar bekle
    if (!currentConversation && conversationId) {
      if (initialArastirmaModu === undefined) {
        console.log('⏳ Conversation henüz yüklenmedi ve initialArastirmaModu yok, bekleniyor...');
        return;
      } else {
        console.log('✅ initialArastirmaModu prop\'u var, conversation yüklenmeden mesaj gönderilebilir');
      }
    }
    
    // Mesaj gönderildi flag'ini set et (async fonksiyon çağrılmadan önce)
    initialMessageSentRef.current = messageKey;
    initialMessageContentRef.current = trimmedInitialMessage;
    isSendingRef.current = true; // Gönderim başladı flag'i
    useEffectRanRef.current = effectKey; // useEffect çalıştı flag'i
    
    console.log('📤 Initial message gönderiliyor:', {
      message: trimmedInitialMessage,
      conversationId: targetConversationId,
      researchMode: initialArastirmaModu,
      conversationResearchMode: currentConversation?.isResearchMode,
      willUseResearchMode: initialArastirmaModu || currentConversation?.isResearchMode
    });
    
    // Send initial message automatically
    const sendInitialMessage = async () => {
      const maxRetries = 3;
      let retryCount = 0;
      
      while (retryCount < maxRetries) {
        try {
          // Conversation'ın database'e kaydedilmesi için kısa bir gecikme
          // İlk denemede daha kısa delay (200ms), sonraki denemelerde artır
          if (retryCount > 0) {
            await new Promise(resolve => setTimeout(resolve, 300 * retryCount));
          } else {
            // İlk denemede çok kısa delay (sadece conversation oluşturulması için)
            await new Promise(resolve => setTimeout(resolve, 200));
          }
          
          // Araştırma modu aktifse RESEARCH promptType kullan
          // Öncelik sırası:
          // 1. initialPromptType (Quick suggestion'dan geldiğinde) - en yüksek öncelik
          // 2. initialArastirmaModu prop'u (Home ekranından geldiğinde)
          // 3. currentConversation?.isResearchMode (Conversation yüklendiğinde)
          // 4. false (varsayılan)
          const researchMode = initialArastirmaModu === true || initialArastirmaModu === false
            ? initialArastirmaModu  // Home ekranından geçirilmişse (true veya false) onu kullan
            : (currentConversation?.isResearchMode === true || currentConversation?.isResearchMode === false
                ? currentConversation.isResearchMode  // Conversation'dan yüklendiğinde onu kullan
                : false);  // Hiçbiri yoksa false
          const promptType = initialPromptType || (researchMode ? 'RESEARCH' : undefined);
          
          console.log('🔍 Prompt type kontrolü:', {
            initialPromptType,
            conversationResearchMode: currentConversation?.isResearchMode,
            initialArastirmaModu,
            finalResearchMode: researchMode,
            finalPromptType: promptType,
            willUseInitialPromptType: !!initialPromptType,
            willUseInitialArastirmaModu: initialArastirmaModu === true || initialArastirmaModu === false,
            willUseConversationMode: currentConversation?.isResearchMode !== undefined
          });
          
          await sendMessage(
            trimmedInitialMessage,
            targetConversationId,
            researchMode,
            initialImages,
            initialFiles,
            promptType
          );
          // Input'u temizle
          setInputText("");
          console.log('✅ Initial message başarıyla gönderildi');
          isSendingRef.current = false; // Gönderim tamamlandı
          return; // Başarılı oldu, çık
        } catch (error: any) {
          retryCount++;
          console.error(`❌ Initial mesaj gönderme hatası (deneme ${retryCount}/${maxRetries}):`, error);
          
          // Eğer conversation not found hatası ise ve retry hakkı varsa tekrar dene
          if (retryCount < maxRetries && error?.message?.includes('Conversation not found')) {
            console.log(`🔄 Retry ${retryCount}/${maxRetries}...`);
            continue;
          }
          
          // Retry hakkı bitti veya farklı bir hata
          initialMessageSentRef.current = null; // Retry için flag'i reset et
          initialMessageContentRef.current = null;
          isSendingRef.current = false; // Gönderim hatası ile sonlandı
          useEffectRanRef.current = false; // Hata durumunda flag'i reset et
          return;
        }
      }
    };
    
    sendInitialMessage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMessage, conversationId, initialArastirmaModu, initialPromptType]); // currentConversation ve isLoading dependency'den kaldırıldı

  // Initialize conversation when component mounts or conversationId changes - NON-BLOCKING
  // Bu useEffect initialMessage'dan bağımsız çalışmalı
  useEffect(() => {
    if (conversationId && conversationLoadedRef.current !== conversationId) {
      console.log('📥 ChatScreen: Conversation seçiliyor:', conversationId);
      
      // Yeni conversation seçildiğinde streaming state'ini temizle
      if (isStreaming) {
        console.log('🧹 [ChatScreen] Yeni conversation seçiliyor, streaming durduruluyor...');
        cancelStreamingResponse();
      }
      
      // Conversation yüklemesini paralel yap, mesaj gönderimini bloklamasın
      conversationLoadedRef.current = conversationId; // Flag'i set et
      
      // selectConversation'ı await et - cache'den yükleme durumunda state'in güncellenmesini bekle
      selectConversation(conversationId)
        .then(() => {
          // State update'in tamamlanması için kısa bir delay
          setTimeout(() => {
            console.log('✅ ChatScreen: Conversation başarıyla seçildi:', conversationId);
          }, 50);
        })
        .catch((error: any) => {
          console.error('❌ ChatScreen: Conversation seçilirken hata:', error);
          conversationLoadedRef.current = null; // Hata durumunda flag'i reset et
        });
    } else if (!conversationId) {
      // conversationId yoksa flag'i temizle ve streaming'i durdur
      conversationLoadedRef.current = null;
      if (isStreaming) {
        console.log('🧹 [ChatScreen] Conversation ID yok, streaming durduruluyor...');
        cancelStreamingResponse();
      }
    }
  }, [conversationId, selectConversation, isStreaming, cancelStreamingResponse]);

  // Load research mode from conversation when conversation changes
  // Eğer conversation'dan isResearchMode gelmiyorsa initialArastirmaModu prop'unu kullan
  useEffect(() => {
    if (currentConversation?.isResearchMode !== undefined) {
      setArastirmaModu(currentConversation.isResearchMode);
    } else if (initialArastirmaModu !== undefined) {
      // Conversation henüz yüklenmemişse initial prop'u kullan
      setArastirmaModu(initialArastirmaModu);
    }
  }, [currentConversation?.isResearchMode, initialArastirmaModu]);

  // Yeni conversation oluşturulduğunda veya seçildiğinde streaming state'ini temizle
  useEffect(() => {
    // currentConversation değiştiğinde ve yeni bir conversation ise streaming'i temizle
    if (currentConversation?.id && activeConversationId === currentConversation.id) {
      // Eğer streaming aktifse ve bu conversation'a ait değilse, temizle
      if (isStreaming) {
        // activeStreamRef'i kontrol etmek için cancelStreamingResponse'u çağır
        // Eğer bu conversation'a ait değilse zaten temizlenecek
        const wasCancelled = cancelStreamingResponse();
        if (!wasCancelled) {
          // Eğer cancel başarısız olduysa (stream bu conversation'a ait değilse), 
          // sadece state'leri temizle (güvenlik için)
          console.log('🧹 [ChatScreen] Yeni conversation açıldı, streaming state temizleniyor...');
        }
      }
    }
  }, [currentConversation?.id, activeConversationId, isStreaming, cancelStreamingResponse]);

  // AI response is handled by useChatMessages hook - no need for duplicate logic

  // AI response is handled by useChatMessages hook - no duplicate logic needed


  // Auto scroll to bottom when messages change - MessageList zaten scroll yapıyor
  // ChatScreen'deki scroll mantığını kaldırdık - çakışmayı önlemek için
  // MessageList kendi scroll mantığını yönetiyor (debounce ile optimize edilmiş)


  const handleQuickSuggestionSelect = async (suggestion: {question: string, promptType: string}) => {
    const selectedSuggestion = handleSuggestionSelect(suggestion);
    await sendQuickSuggestion(selectedSuggestion);
  };



  const handleResearch = async () => {
    const newResearchMode = !arastirmaModu;
    setArastirmaModu(newResearchMode);
    
    // Backend'e araştırma modunu kaydet
    if (currentConversation?.id) {
      await updateResearchMode(currentConversation.id, newResearchMode);
    }
  };

  // Enhanced keyboard handling - only for input area
  const handleInputAreaPress = useCallback(() => {
    try {
      // Only dismiss keyboard if it's visible
      if (isKeyboardVisible || isInputFocused) {
        console.log('🔽 Klavye kapatılıyor...');
        Keyboard.dismiss();
        setIsInputFocused(false);
      }
    } catch (error) {
      console.error('Klavye kapatma hatası:', error);
    }
  }, [isKeyboardVisible, isInputFocused]);

  const handleEnhancedKeyPress = (key: string) => {
    handleKeyPress(key, handleSendMessage);
  };

  const handleInputFocus = useCallback(() => {
    // Auto-scroll to input when focused - MessageList zaten scroll yapıyor
    // Burada scroll yapmaya gerek yok, çakışmayı önlemek için kaldırıldı
  }, []);

  const handleInputBlur = useCallback(() => {
    // Optional: Keep focus state for better UX
    // setIsInputFocused(false);
  }, []);



  return (
    <ErrorBoundary>
      <Animated.View 
        style={[
          styles.chatContainer,
          { transform: [{ translateX }] }
        ]}
      >
      <KeyboardAvoidingView 
        style={styles.chatGradient}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        enabled={Platform.OS === 'ios'}
      >
        <LinearGradient
          colors={['#02020A', '#16163C']}
          locations={[0.1827, 1.0]}
          style={styles.chatGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        >
        {/* Header */}
        <Header 
          onBackPress={() => {
            console.log('🔙 Chat ekranında geri butonu tıklandı');
            cleanupInputState(); // Input state'i temizle
            onOpenChatHistory?.();
          }}
          onChatPress={() => {
            cleanupInputState(); // Input state'i temizle
            onClose();
          }}
          onLogoPress={() => {
            console.log('🏠 Chat ekranından Home ekranına gidiliyor');
            cleanupInputState(); // Input state'i temizle
            onClose();
          }}
          showBackButton={true}
          showChatButton={true}
        />

        {/* Messages List */}
        <View style={styles.messagesListContainer}>
          <MessageList
            messages={messagesArray}
            isLoading={isLoading}
            scrollViewRef={scrollViewRef}
            isKeyboardVisible={isKeyboardVisible}
            keyboardHeight={keyboardHeight}
            conversationId={currentConversation?.id || conversationId}
            isDataLoading={isConversationDataLoading && messagesArray.length === 0}
            onScrollToEnd={() => {
              // Optional: Additional scroll handling
            }}
          />
        </View>

        {/* Bottom Section Container */}
        <ChatInputSection
          inputText={inputText}
          setInputText={setInputText}
          isInputFocused={isInputFocused}
          setIsInputFocused={setIsInputFocused}
          onSendMessage={handleSendMessage}
          onDictate={toggleDictation}
          onOpenUploadModal={openUploadModal}
          onInputAreaPress={handleInputAreaPress}
          onSuggestions={handleOnerilerPress}
          onResearch={handleResearch}
          isLoading={isLoading}
          isResearchMode={arastirmaModu}
          isDictating={dictationState.isDictating}
          isProcessing={dictationState.isProcessing}
          isStreaming={isStreaming}
          onCancelStreaming={cancelStreamingResponse}
          selectedImages={selectedImages}
          selectedFiles={selectedFiles}
          onRemoveImage={removeImage}
          onRemoveFile={removeFile}
          textInputRef={textInputRef}
          getKeyboardAwarePaddingBottom={getKeyboardAwarePaddingBottom}
          onKeyPress={handleEnhancedKeyPress}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          placeholder="İstediğinizi sorun"
          multiline={false}
          maxLength={1000}
          autoCorrect={true}
          autoCapitalize="sentences"
          returnKeyType="send"
          keyboardType="default"
          secureTextEntry={false}
          editable={true}
          selectTextOnFocus={false}
          clearButtonMode="while-editing"
          autoFocus={false}
          blurOnSubmit={true}
          onSubmitEditing={handleSendMessage}
          testID="chat-input"
          accessibilityLabel="Soru girişi"
          accessibilityHint="AI asistanınıza soru yazın veya sesli yazma kullanın"
          accessibilityRole="textbox"
          waveAnimations={waveAnimations}
          inputClearedRef={inputClearedRef}
        />

        </LinearGradient>

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
            console.log('📸 Son fotoğraflardan seçildi:', photoUri);
            setSelectedImages((prev) => [...prev, photoUri]);
            // Seçim tamamlandı, modal'ı otomatik kapat ve input'a focus yap
            closeUploadModal(true);
          }}
          onPickDocument={pickDocument}
          onRemoveImage={removeImage}
          onRemoveFile={removeFile}
          onRequestClose={closeUploadModal}
          onAskAboutFile={handleAskAboutFile}
          onViewAllFiles={handleViewAllFiles}
        />
      </Modal>

      {/* Quick Suggestions Modal */}
      <QuickSuggestionsModal
        visible={showQuickSuggestions}
        onClose={() => setShowQuickSuggestions(false)}
        onSelectSuggestion={handleQuickSuggestionSelect}
        suggestions={currentSuggestions}
      />
      </KeyboardAvoidingView>
      </Animated.View>
    </ErrorBoundary>
  );
};


const styles = StyleSheet.create({
  chatContainer: {
    flex: 1,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: CHAT_CONSTANTS.COLORS.BACKGROUND,
  },
  chatGradient: {
    flex: 1,
  },
  messagesListContainer: {
    flex: 1,
    minHeight: 0, // Important for ScrollView to work properly
    backgroundColor: 'transparent',
    position: 'relative',
    paddingBottom: 180, // Input section yüksekliği kadar padding (ActionButtons + InputComponent + padding'ler)
  },
  devMessagesAreaBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    // bottom değeri dinamik olarak ayarlanacak (input section yüksekliği kadar)
    borderWidth: 3,
    borderColor: '#FF69B4', // Pembe border
    borderStyle: 'solid',
    borderRadius: 8,
    zIndex: 10000,
    pointerEvents: 'none',
  },
  devIndicator: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  devIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    marginRight: 6,
  },
  devIndicatorText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default ChatScreen;

