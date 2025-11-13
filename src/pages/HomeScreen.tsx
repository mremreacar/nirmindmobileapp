import React, { useCallback, useEffect, useMemo, useRef, useState, memo } from "react";
import {
  View,
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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useFonts } from "expo-font";
import HeroSection from "../components/HeroSection";
import Header from "../components/Header";
import InputComponent from "../components/common/InputComponent";
import MessageList from "../components/chat/MessageList";
import ActionButtons from "../components/chat/ActionButtons";
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
import HomeChatModal from "../components/home/HomeChatModal";
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

const HomeScreen: React.FC<HomeScreenProps> = ({
  onOpenChatHistory,
  selectedConversationId,
  onConversationSelected,
}) => {
  const { createNewConversation, selectConversation, currentConversation, loadingMessagesConversationIds } = useChat();
  const { isLoading, sendMessage } = useChatMessages();
  const {
    showQuickSuggestions,
    setShowQuickSuggestions,
    currentSuggestions,
    isLoadingSuggestions,
    handleOnerilerPress,
  } = useQuickSuggestions();
  const [showChatScreen, setShowChatScreen] = useState(false);
  const [createdConversationId, setCreatedConversationId] = useState<
    string | undefined
  >();
  const [plusButtonPressed, setPlusButtonPressed] = useState(false);
  const [inputText, setInputText] = useState("");
  const [arastirmaModu, setArastirmaModu] = useState(false);
  const inputClearedRef = useRef(false);
  const messagesScrollViewRef = useRef<ScrollView | null>(null);
  
  // Memoize messages array to prevent unnecessary re-renders (ChatScreen'deki gibi)
  const messagesArray = useMemo(() => {
    if (currentConversation?.messages && Array.isArray(currentConversation.messages)) {
      return currentConversation.messages;
    }
    return [];
  }, [currentConversation?.messages]);
  
  // Check if conversation data is loading
  const isConversationDataLoading = useMemo(() => {
    if (!createdConversationId) {
      return false;
    }
    return loadingMessagesConversationIds.includes(createdConversationId);
  }, [createdConversationId, loadingMessagesConversationIds]);

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

  // Dikte feature hooks
  const { dictationState, toggleDictation: originalToggleDictation } = useDictation({
    onTextUpdate: (text: string) => {
      setInputText((prev) => {
        const newText = prev + text;
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

  const translateXChat = useRef(new Animated.Value(-width)).current;
  const chatBackdropOpacity = useRef(new Animated.Value(0)).current;
  const chatScreenOpacity = useRef(new Animated.Value(1)).current; // ChatScreen opacity için
  const homeScale = useRef(new Animated.Value(1)).current;
  const heroReveal = useRef(new Animated.Value(1)).current;
  const homeDimOpacity = useMemo(
    () =>
      homeScale.interpolate({
        inputRange: [0.94, 1],
        outputRange: [0.82, 1],
        extrapolate: "clamp",
      }),
    [homeScale]
  );

  const runChatEntrance = useCallback(() => {
    // ChatScreen opacity'yi 1'e set et (görünür)
    chatScreenOpacity.setValue(1);
    
    Animated.parallel([
      Animated.timing(translateXChat, {
        toValue: 0,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(chatBackdropOpacity, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(chatScreenOpacity, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(homeScale, {
        toValue: 0.97,
        speed: 16,
        bounciness: 4,
        useNativeDriver: true,
      }),
    ]).start();
  }, [chatBackdropOpacity, homeScale, translateXChat, chatScreenOpacity]);

  const runChatExit = useCallback(
    (onComplete?: () => void) => {
      // Smooth, fark edilmeyen geçiş için:
      // 1. translateX'i arka planda sessizce yap (kullanıcı fark etmez)
      // 2. Fade out kullan (opacity) - ana geçiş efekti
      // 3. Home scale'i yumuşak yap
      // Animasyon sürelerini optimize ettik - kasma olmaması için
      Animated.parallel([
        // translateX'i arka planda sessizce yap - kullanıcı fark etmez (fade out ile maskelenmiş)
        Animated.timing(translateXChat, {
          toValue: -width,
          duration: 250, // 200'den 250'ye çıkarıldı - daha smooth, kasma yok
          easing: Easing.bezier(0.25, 0.1, 0.25, 1), // Daha yumuşak bezier curve
          useNativeDriver: true,
        }),
        // ChatScreen fade out - ana geçiş efekti (kullanıcı bunu görür)
        Animated.timing(chatScreenOpacity, {
          toValue: 0,
          duration: 250, // 200'den 250'ye çıkarıldı - daha smooth
          easing: Easing.bezier(0.25, 0.1, 0.25, 1), // Daha yumuşak bezier curve
          useNativeDriver: true,
        }),
        // Backdrop fade out - senkronize
        Animated.timing(chatBackdropOpacity, {
          toValue: 0,
          duration: 250, // 200'den 250'ye çıkarıldı - senkronize
          easing: Easing.bezier(0.25, 0.1, 0.25, 1), // Daha yumuşak bezier curve
          useNativeDriver: true,
        }),
        // Home scale - yumuşak geri dönüş
        Animated.spring(homeScale, {
          toValue: 1,
          speed: 16, // 18'den 16'ya düşürüldü - daha yumuşak
          bounciness: 0,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          // Opacity'yi reset et
          chatScreenOpacity.setValue(1);
          onComplete?.();
        }
      });
    },
    [chatBackdropOpacity, homeScale, translateXChat, chatScreenOpacity]
  );

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
        onMoveShouldSetPanResponder: (evt, gestureState) => {
          // Sadece soldan sağa çekme hareketini algıla
          return gestureState.dx > 50 && Math.abs(gestureState.dy) < 100;
        },
        onPanResponderGrant: () => {
          console.log("👆 Swipe gesture başladı - soldan sağa çekme");
        },
        onPanResponderMove: (evt, gestureState) => {
          // Hareket sırasında herhangi bir animasyon yapma
          // Sadece gesture'ı takip et
        },
        onPanResponderRelease: (evt, gestureState) => {
          console.log("👆 Swipe gesture bitti:", gestureState.dx);
          
          // Eğer yeterince sağa çekildiyse chat history'yi aç
          if (gestureState.dx > 100) {
            console.log("📱 Soldan sağa çekme ile chat history açılıyor");
            onOpenChatHistory();
          }
        },
      }),
    [onOpenChatHistory]
  );

  const openModal = useCallback(async () => {
    // "+" butonuna basıldığında direkt Chat ekranını aç
    console.log("💬 Plus butonu tıklandı - Chat ekranı açılıyor");
    
    // Plus butonuna basıldığını işaretle
    setPlusButtonPressed(true);
    
    // Boş bir conversation oluştur
    const conversationId = await createNewConversation("Yeni Sohbet", "");
    setCreatedConversationId(conversationId);
    setShowChatScreen(true);
    runChatEntrance();
  }, [createNewConversation, runChatEntrance]);

  const openChatScreen = useCallback(async () => {
    // Header'daki chat butonuna basıldığında Home ekranını sıfırla (ilk kez açılıyormuş gibi)
    console.log("💬 Header chat butonu tıklandı - Home ekranı sıfırlanıyor");

    // Eğer chat ekranı açıksa kapat
    if (showChatScreen) {
      runChatExit(() => {
        setShowChatScreen(false);
      });
    }

    // Conversation'ı temizle - Home ekranı başlangıç durumuna dönsün
    setCreatedConversationId(undefined);
    
    // Input'u temizle
    setInputText("");
    setSelectedImages([]);
    setSelectedFiles([]);
    setArastirmaModu(false);
    
    // Klavyeyi kapat
    dismissKeyboard();
    
    // HeroSection otomatik olarak gösterilecek çünkü createdConversationId undefined olacak
    // Bu sayede Home ekranı ilk kez açılıyormuş gibi görünecek
  }, [dismissKeyboard, showChatScreen, runChatExit]);

  const closeChatScreen = useCallback(() => {
    runChatExit(() => {
      setShowChatScreen(false);
      setCreatedConversationId(undefined);
      setPlusButtonPressed(false);
      onConversationSelected();
    });
  }, [onConversationSelected, runChatExit]);

  const handleArastirmaPress = useCallback(() => {
    setArastirmaModu((prev) => !prev);
  }, []);

  // Handle send message from home - creates conversation, sends message, and shows messages in hero area
  // Mesaj gönderme işleminin duplicate çağrılmasını önlemek için ref
  const isSendingMessageRef = useRef(false);

  const handleSendMessage = useCallback(async () => {
    // Eğer zaten bir mesaj gönderiliyorsa, duplicate çağrıyı engelle
    if (isSendingMessageRef.current) {
      console.log('⚠️ Mesaj zaten gönderiliyor, duplicate çağrı engellendi');
      return;
    }

    if (!inputText.trim() && selectedImages.length === 0 && selectedFiles.length === 0) {
      return;
    }

    // Mesaj gönderme flag'ini set et
    isSendingMessageRef.current = true;

    try {
      let conversationId = createdConversationId;
      
      // Eğer conversation yoksa oluştur
      if (!conversationId) {
        const title = inputText.trim().length > 30 
          ? inputText.trim().substring(0, 30) + "..." 
          : inputText.trim() || "Yeni Sohbet";
        
        conversationId = await createNewConversation(title);
        setCreatedConversationId(conversationId);
        
        // Conversation'ı seç ve mesajların yüklenmesini bekle
        await selectConversation(conversationId);
        
        // Mesajların yüklenmesi için kısa bir bekleme
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Mesaj gönder
      if (conversationId) {
        console.log('📤 Home ekranından mesaj gönderiliyor:', {
          conversationId,
          messageText: inputText.trim().substring(0, 50),
          hasImages: selectedImages.length > 0,
          hasFiles: selectedFiles.length > 0,
        });
        
        await sendMessage(
          inputText.trim(),
          conversationId,
          arastirmaModu,
          selectedImages,
          selectedFiles
        );
        
        console.log('✅ Mesaj gönderildi');
        
        // Mesaj gönderildikten sonra currentConversation'ın güncellenmesi için kısa bir bekleme
        // sendMessage zaten addMessage çağırıyor ve currentConversation'ı güncelliyor
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Clear input ve focus'u kapat
      setInputText("");
      setSelectedImages([]);
      setSelectedFiles([]);
      setIsInputFocused(false);
      dismissKeyboard();
    } catch (error) {
      console.error("❌ Mesaj gönderme hatası:", error);
      Alert.alert("Hata", "Mesaj gönderilirken bir hata oluştu.");
    } finally {
      // Mesaj gönderme flag'ini reset et
      isSendingMessageRef.current = false;
    }
  }, [inputText, selectedImages, selectedFiles, createdConversationId, createNewConversation, selectConversation, sendMessage, arastirmaModu, dismissKeyboard, setIsInputFocused, currentConversation]);

  const handleQuickSuggestionSelect = useCallback(async (suggestion: QuickSuggestion) => {
    console.log('🎯 Öneri seçildi:', suggestion);
    
    try {
      setShowQuickSuggestions(false);

      // Home ekranından geldiğinde her zaman yeni konuşma oluştur
      const title = suggestion.question.length > 30 ? suggestion.question.substring(0, 30) + '...' : suggestion.question;
      console.log('📝 Yeni konuşma oluşturuluyor:', title);
      
      let conversationId = createdConversationId;
      
      // Eğer conversation yoksa oluştur
      if (!conversationId) {
        conversationId = await createNewConversation(title);
        console.log('✅ Konuşma oluşturuldu:', conversationId);
        setCreatedConversationId(conversationId);
        
        // Conversation'ı seç ve mesajların yüklenmesini bekle
        await selectConversation(conversationId);
        
        // Mesajların yüklenmesi için kısa bir bekleme
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Mesaj gönder (Home ekranında mesajlaşma alanında gösterilecek)
      if (conversationId) {
        console.log('📤 Öneri mesajı gönderiliyor:', suggestion.question);
        await sendMessage(
          suggestion.question,
          conversationId,
          false, // arastirmaModu
          [], // selectedImages
          [], // selectedFiles
          suggestion.promptType
        );
        console.log('✅ Öneri işlemi tamamlandı - Home ekranında mesajlaşma alanında gösterilecek');
      } else {
        console.error('❌ Konuşma oluşturulamadı');
      }
    } catch (error) {
      console.error('❌ Öneri seçim hatası:', error);
      Alert.alert("Hata", "Öneri seçilirken bir hata oluştu.");
    }
  }, [createdConversationId, createNewConversation, selectConversation, sendMessage]);

  // Handle selected conversation - ChatHistoryScreen zaten selectConversation çağırdığı için
  // burada sadece chat ekranını açıyoruz, duplicate selectConversation çağrısı yapmıyoruz
  useEffect(() => {
    if (selectedConversationId) {
      console.log('📥 Geçmiş sohbetten conversation seçildi (HomeScreen):', selectedConversationId);
      
      // ChatHistoryScreen zaten selectConversation çağırmış, burada sadece chat ekranını aç
      // Duplicate selectConversation çağrısı yapmıyoruz - bu request deduplication ile önlendi
      setShowChatScreen(true);
      runChatEntrance();
      
      console.log('✅ Chat ekranı açıldı, conversation ChatHistoryScreen tarafından zaten yüklendi');
    }
  }, [selectedConversationId, runChatEntrance]);

  // Conversation oluşturulduğunda veya mesaj gönderildiğinde currentConversation'ı kontrol et
  useEffect(() => {
    if (createdConversationId) {
      if (!currentConversation) {
        // Conversation oluşturuldu ama henüz seçilmedi, seç
        selectConversation(createdConversationId);
      } else if (currentConversation.id !== createdConversationId) {
        // Farklı bir conversation seçilmiş, doğru conversation'ı seç
        selectConversation(createdConversationId);
      }
    }
  }, [createdConversationId, currentConversation, selectConversation]);
  
  // Mesaj gönderildikten sonra currentConversation'ın güncellenmesini bekle
  useEffect(() => {
    if (createdConversationId && currentConversation && currentConversation.id === createdConversationId) {
      // Conversation seçili ve doğru, mesajlar yüklenecek
      console.log('✅ Home ekranında conversation seçili, mesaj sayısı:', currentConversation.messages?.length || 0);
    }
  }, [createdConversationId, currentConversation]);

  useEffect(() => {
    const isChatVisible = showChatScreen;
    const animation = Animated.timing(heroReveal, {
      toValue: isChatVisible ? 0 : 1,
      duration: isChatVisible ? 160 : 500,
      delay: isChatVisible ? 0 : 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });

    animation.start();

    return () => {
      animation.stop();
    };
  }, [heroReveal, showChatScreen]);

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

  // İlk render'da padding değerini doğru set et
  useEffect(() => {
    const currentPadding = getKeyboardPadding();
    if (lastPaddingRef.current !== currentPadding) {
      bottomPadding.setValue(currentPadding);
      lastPaddingRef.current = currentPadding;
    }
  }, []);

  // Show loading while fonts are loading
  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={styles.container}>
      <AnimatedKeyboardAvoidingView
        style={[
          styles.container,
          {
            transform: [{ scale: homeScale }],
            opacity: homeDimOpacity,
          },
        ]}
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
            const shouldShowMessages = createdConversationId && (hasInputContent || (currentConversation?.messages && currentConversation.messages.length > 0));
            
            // Debug log
            console.log('🔍 Home ekranı render kontrolü (bottom section bağlı):', {
              isInputFocused,
              hasInputContent,
              inputTextLength: inputText.trim().length,
              selectedImagesCount: selectedImages.length,
              selectedFilesCount: selectedFiles.length,
              createdConversationId,
              shouldShowMessages,
              hasCurrentConversation: !!currentConversation,
              messagesCount: currentConversation?.messages?.length || messagesArray.length,
            });
            
            if (shouldShowMessages) {
              // Mesajlaşma alanı (conversation var ve input içeriği var veya mesajlar var)
              const messagesToShow = currentConversation?.messages || messagesArray || [];
              console.log('📱 Mesajlaşma alanı gösteriliyor (bottom section durumuna göre):', {
                conversationId: createdConversationId,
                messagesCount: messagesToShow.length,
                hasInputContent,
              });
              
              return (
                <TouchableWithoutFeedback onPress={handleScreenPress} accessible={false}>
                  <View style={styles.messagesListContainer}>
                    <MessageList
                      messages={messagesToShow}
                      isLoading={isLoading}
                      scrollViewRef={messagesScrollViewRef}
                      isKeyboardVisible={isKeyboardVisible}
                      keyboardHeight={keyboardHeight}
                      conversationId={createdConversationId}
                      isDataLoading={isConversationDataLoading && (!currentConversation?.messages || currentConversation.messages.length === 0)}
                      onScrollToEnd={() => {
                        // Optional: Additional scroll handling
                      }}
                    />
                  </View>
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
          <Animated.View style={[
            styles.inputSectionContainer,
            { 
              paddingBottom: bottomPadding,
              bottom: bottomPosition
            }
          ]}>
              <ActionButtons
                onSuggestions={handleOnerilerPress}
                onResearch={handleArastirmaPress}
                isLoading={isLoading}
                isResearchMode={arastirmaModu}
              />

              <InputComponent
                inputText={inputText}
                setInputText={setInputText}
                onSendMessage={handleSendMessage}
                onDictate={toggleDictation}
                onOpenUploadModal={openUploadModal}
                isDictating={dictationState.isDictating}
                isProcessing={dictationState.isProcessing}
                isLoading={isLoading}
                isInputFocused={isInputFocused}
                setIsInputFocused={setIsInputFocused}
                textInputRef={textInputRef}
                hasSelectedFiles={selectedImages.length > 0 || selectedFiles.length > 0}
                selectedFilesCount={selectedFiles.length}
                selectedImagesCount={selectedImages.length}
                showSelectedFilesIndicator={true}
                selectedImages={selectedImages}
                selectedFiles={selectedFiles}
                onRemoveImage={removeImage}
                onRemoveFile={removeFile}
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
                testID="home-input"
                accessibilityLabel="Soru girişi"
                accessibilityHint="AI asistanınıza soru yazın veya sesli yazma kullanın"
                accessibilityRole="textbox"
                waveAnimations={waveAnimations}
              />
          </Animated.View>

          <HomeChatModal
            visible={showChatScreen}
            onRequestClose={closeChatScreen}
            chatBackdropOpacity={chatBackdropOpacity}
            chatScreenOpacity={chatScreenOpacity}
            translateX={translateXChat}
            onOpenChatHistory={onOpenChatHistory}
            conversationId={selectedConversationId || createdConversationId}
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
    paddingBottom: getResponsivePaddingBottom(),
    paddingTop: 20,
    width: getResponsiveWidth(),
    gap: getResponsiveGap(),
    alignSelf: "center",
    backgroundColor: "transparent",
    zIndex: 1000,
  },
});

export default memo(HomeScreen);
