import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  memo,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  TextInput,
  Animated,
  Easing,
  Modal,
  Alert,
  Platform,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Keyboard,
  PanResponder,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useFonts } from "expo-font";
import { SvgXml } from "react-native-svg";
import ChatScreen from "@src/pages/ChatScreen";
import HeroSection from "../components/HeroSection";
import Header from "../components/Header";
import InputComponent from "../components/common/InputComponent";
import ActionButtons from "../components/chat/ActionButtons";
import { useChat } from "../lib/context/ChatContext";
import { useChatMessages } from "../hooks/useChatMessages";
import { useQuickSuggestions } from "../hooks/useQuickSuggestions";
import { useDictation, useWaveAnimation } from "../features/dictation";
import { useFilePermissions, usePermissionDialogs } from "../lib/permissions";
import {
  isSmallScreen,
  getResponsivePadding,
  getResponsiveWidth,
  getResponsiveGap,
  getResponsivePaddingBottom,
  getKeyboardAwarePaddingBottom,
  getResponsiveHeaderPaddingTop,
  getResponsiveHeaderPaddingBottom,
} from "../constants";

const { width, height } = Dimensions.get("window");

const AnimatedKeyboardAvoidingView = Animated.createAnimatedComponent(KeyboardAvoidingView);

interface HomeScreenProps {
  onOpenChatHistory: () => void;
  selectedConversationId?: string;
  onConversationSelected: () => void;
}

// Memoized components for performance
const MemoizedSvgIcon = memo(
  ({
    xml,
    width,
    height,
    style,
  }: {
    xml: string;
    width: number;
    height: number;
    style?: any;
  }) => <SvgXml xml={xml} width={width} height={height} style={style} />
);

const HomeScreen: React.FC<HomeScreenProps> = ({
  onOpenChatHistory,
  selectedConversationId,
  onConversationSelected,
}) => {
  const { createNewConversation, selectConversation, updateResearchMode } = useChat();
  const { sendMessage, sendQuickSuggestion } = useChatMessages();
  const {
    showQuickSuggestions,
    setShowQuickSuggestions,
    currentSuggestions,
    handleOnerilerPress,
    isLoadingSuggestions
  } = useQuickSuggestions();
  const [showChatScreen, setShowChatScreen] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  const [pendingInitialMessage, setPendingInitialMessage] = useState<string>("");
  const [pendingPromptType, setPendingPromptType] = useState<string | undefined>(undefined);
  const [createdConversationId, setCreatedConversationId] = useState<
    string | undefined
  >();
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [arastirmaModu, setArastirmaModu] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [plusButtonPressed, setPlusButtonPressed] = useState(false);
  const translateY = useRef(new Animated.Value(height)).current;
  const translateXChat = useRef(new Animated.Value(-width)).current;
  const textInputRef = useRef<TextInput>(null);
  const chatBackdropOpacity = useRef(new Animated.Value(0)).current;
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
      Animated.spring(homeScale, {
        toValue: 0.97,
        speed: 16,
        bounciness: 4,
        useNativeDriver: true,
      }),
    ]).start();
  }, [chatBackdropOpacity, homeScale, translateXChat]);

  const runChatExit = useCallback(
    (onComplete?: () => void) => {
      Animated.parallel([
        Animated.timing(translateXChat, {
          toValue: -width,
          duration: 180,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(chatBackdropOpacity, {
          toValue: 0,
          duration: 200,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(homeScale, {
          toValue: 1,
          speed: 18,
          bounciness: 0,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          onComplete?.();
        }
      });
    },
    [chatBackdropOpacity, homeScale, translateXChat]
  );

  // Dikte feature hooks
  const { dictationState, toggleDictation } = useDictation({
    onTextUpdate: (text: string) => {
      // Hızlı text güncelleme - console log'ları kaldırdık
      setInputText((prev) => prev + text);
    },
    onError: (error: string) => {
      console.error("Dikte hatası:", error);
      // Kullanıcıya bilgilendirme mesajı göster
      Alert.alert("Bilgi", error, [{ text: "Tamam" }]);
    },
    onStart: () => {
      console.log("Dikte başlatıldı");
    },
    onStop: () => {
      console.log("Dikte durduruldu");
    },
  });

  const { animations: waveAnimations } = useWaveAnimation(
    dictationState.isDictating
  );

  // Permission hooks
  const {
    mediaLibrary,
    documents,
    storage,
    camera,
    hasFilePermissions,
    hasAllPermissions,
    requestFilePermissions,
    requestAllPermissions
  } = useFilePermissions();
  
  const { showPermissionDialog, showRequiredPermissionsDialog } = usePermissionDialogs();

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

  // Keyboard event listeners - Optimized with useCallback
  const handleKeyboardShow = useCallback((e: any) => {
    setKeyboardHeight(e.endCoordinates.height);
    setIsKeyboardVisible(true);
  }, []);

  const handleKeyboardHide = useCallback(() => {
    setKeyboardHeight(0);
    setIsKeyboardVisible(false);
  }, []);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardDidShow",
      handleKeyboardShow
    );

    const keyboardDidHideListener = Keyboard.addListener(
      "keyboardDidHide",
      handleKeyboardHide
    );

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, [handleKeyboardShow, handleKeyboardHide]);

  // Input focus handlers
  const handleInputFocus = useCallback(() => {
    setIsInputFocused(true);
    // Chat ekranını otomatik açma - sadece focus state'i güncelle
  }, []);

  const handleInputBlur = useCallback(() => {
    setIsInputFocused(false);
  }, []);

  const handleTextChange = useCallback((text: string) => {
    // Sadece text'i güncelle, chat ekranını açma
    setInputText(text);
  }, []);

  const handleScreenPress = useCallback(() => {
    // Ekranda bir yere basınca klavye açılma özelliği devre dışı
    // Sadece klavye kapatma işlevi aktif
    if (isKeyboardVisible || isInputFocused) {
      // Klavye açıksa veya input focus'taysa klavyeyi kapat
      textInputRef.current?.blur();
      setIsInputFocused(false);
    }
    // Klavye açma özelliği kaldırıldı
  }, [isKeyboardVisible, isInputFocused]);

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
    // Home input'undaki odağı kaldır ve klavyeyi kapat
    textInputRef.current?.blur();
    setIsInputFocused(false);
    Keyboard.dismiss();
    
    // Boş bir conversation oluştur
    const conversationId = await createNewConversation("Yeni Sohbet", "");
    setCreatedConversationId(conversationId);
    setShowChatScreen(true);
    runChatEntrance();
  }, [createNewConversation, runChatEntrance, textInputRef]);

  const openChatScreen = useCallback(async () => {
    // Header'daki chat butonuna basıldığında yeni mesaj sayfası aç
    console.log("💬 Header chat butonu tıklandı - yeni mesaj açılıyor");

    // Home input'undaki odağı kaldır ve klavyeyi kapat
    textInputRef.current?.blur();
    setIsInputFocused(false);
    Keyboard.dismiss();

    // Boş bir conversation oluştur
    const conversationId = await createNewConversation("Yeni Sohbet", "");
    setCreatedConversationId(conversationId);
    setShowChatScreen(true);
    runChatEntrance();
  }, [createNewConversation, runChatEntrance, textInputRef]);

  const closeChatScreen = useCallback(() => {
    runChatExit(() => {
      setShowChatScreen(false);
      setCreatedConversationId(undefined);
      setInputText("");
      setPendingInitialMessage("");
      setPendingPromptType(undefined);
      setSelectedImages([]);
      setSelectedFiles([]);
      setArastirmaModu(false);
      setIsInputFocused(false);
      setPlusButtonPressed(false);
      Keyboard.dismiss();
      onConversationSelected();
    });
  }, [onConversationSelected, runChatExit]);

  const handleArastirmaPress = useCallback(() => {
    setArastirmaModu((prev) => !prev);
  }, []);

  const handleQuickSuggestionSelect = useCallback(async (suggestion: {question: string, promptType: string}) => {
    console.log('🎯 Öneri seçildi:', suggestion);
    
    try {
      setShowQuickSuggestions(false);

      // Dismiss keyboard
      textInputRef.current?.blur();

      // Home ekranından geldiğinde her zaman yeni konuşma oluştur
      const title = suggestion.question.length > 30 ? suggestion.question.substring(0, 30) + '...' : suggestion.question;
      console.log('📝 Yeni konuşma oluşturuluyor:', title);
      
      const conversationId = await createNewConversation(title);
      console.log('✅ Konuşma oluşturuldu:', conversationId);
      
      // Yeni konuşmayı seç
      if (conversationId) {
        // Conversation'ı seç (await et)
        console.log('🔍 Konuşma seçiliyor:', conversationId);
        await selectConversation(conversationId);
        setCreatedConversationId(conversationId);
        
        // Mesajı pendingInitialMessage'e kaydet (ChatScreen'de initialMessage prop'u ile otomatik gönderilecek)
        // Bu sayede mesaj sadece bir kez gönderilecek
        setPendingInitialMessage(suggestion.question);
        setPendingPromptType(suggestion.promptType); // promptType'ı da kaydet
        
        // ChatScreen'e geçiş yap
        console.log('💬 ChatScreen açılıyor...');
        setShowChatScreen(true);
        runChatEntrance();
        
        setInputText("");
        console.log('✅ Öneri işlemi tamamlandı, mesaj ChatScreen\'de gönderilecek');
      } else {
        console.error('❌ Konuşma oluşturulamadı');
      }
    } catch (error) {
      console.error('❌ Öneri seçim hatası:', error);
      // Hata durumunda modal'ı tekrar aç
      setShowQuickSuggestions(true);
    }
  }, [createNewConversation, runChatEntrance, selectConversation]);


  const handleSendFilesOnly = useCallback(async () => {
    try {
      // En az bir dosya veya resim seçilmiş olmalı
      if (selectedImages.length === 0 && selectedFiles.length === 0) {
        console.log("⚠️ Gönderilecek dosya/resim yok");
        return;
      }

      console.log("📤 Dosyalar direkt OpenAI'ye gönderiliyor:", {
        images: selectedImages.length,
        files: selectedFiles.length,
      });

      // Basit mesaj oluştur - sistem analizi yok
      let fileMessage = "Dosya/resim gönderildi. Lütfen analiz edin.";

      // Create new conversation with the file message
      const title = "Dosya/Resim Gönderildi";
      const conversationId = await createNewConversation(title, fileMessage);

      setCreatedConversationId(conversationId);
      setInputText("");
      setSelectedImages([]); // Seçili resimleri temizle
      setSelectedFiles([]); // Seçili dosyaları temizle

      // Yeni mesajlaşma süreci başlat - Chat ekranına smooth geçiş
      setShowChatScreen(true);
      runChatEntrance();
    } catch (error) {
      console.error("❌ Dosya gönderme hatası:", error);
      Alert.alert("Hata", "Dosyalar gönderilirken bir hata oluştu.");
    }
  }, [createNewConversation, runChatEntrance, selectedFiles, selectedImages]);

  const handleSendMessage = useCallback(async () => {
    // Herhangi bir içerik varsa (text, resim, dosya, dikte) mesaj gönder
    if (
      inputText.trim() ||
      selectedImages.length > 0 ||
      selectedFiles.length > 0 ||
      dictationState.isDictating ||
      dictationState.isProcessing
    ) {
      // Dismiss keyboard
      textInputRef.current?.blur();

      let finalMessage = inputText.trim();

      const title =
        finalMessage.length > 30
          ? finalMessage.substring(0, 30) + "..."
          : finalMessage || "Dosya gönderildi";
      
      // Conversation oluştur ama initialMessage gönderme - ChatScreen'de gönderilecek
      const conversationId = await createNewConversation(title);

      // Araştırma modunu backend'e kaydet
      if (conversationId && arastirmaModu) {
        console.log('🔍 Home ekranında araştırma modu aktif, backend\'e kaydediliyor...', {
          conversationId,
          arastirmaModu
        });
        await updateResearchMode(conversationId, true);
        console.log('✅ Araştırma modu backend\'e kaydedildi');
      } else {
        console.log('🔍 Home ekranında araştırma modu kontrolü:', {
          conversationId,
          arastirmaModu,
          willSave: conversationId && arastirmaModu
        });
      }

      setCreatedConversationId(conversationId);
      
      // Mesajı pendingInitialMessage'e kaydet (ChatScreen'de kullanılacak)
      setPendingInitialMessage(finalMessage);

      console.log('📤 Home ekranından ChatScreen\'e geçiliyor:', {
        conversationId,
        initialMessage: finalMessage,
        initialArastirmaModu: arastirmaModu,
        pendingInitialMessage: finalMessage
      });

      // Chat ekranına geç - mesaj orada gönderilecek (inputText henüz temizlenmedi)
      setShowChatScreen(true);
      runChatEntrance();
      
      // Input'u hemen temizle (pendingInitialMessage korunacak)
      setInputText("");
      setSelectedImages([]);
      setSelectedFiles([]);
      // Araştırma modunu kapatma - ChatScreen'de conversation'a bağlı olacak
      // setArastirmaModu(false); // Kaldırıldı - ChatScreen'de conversation'dan yüklenecek
      Keyboard.dismiss();
    }
  }, [
    inputText,
    selectedImages,
    selectedFiles,
    dictationState.isDictating,
    dictationState.isProcessing,
    createNewConversation,
    updateResearchMode,
    arastirmaModu,
    runChatEntrance,
  ]);

  // Handle selected conversation - Optimized with smooth transition
  const handleConversationSelect = useCallback(async () => {
    if (selectedConversationId) {
      console.log('📥 Geçmiş sohbetten conversation seçildi:', selectedConversationId);
      
      // Conversation'ı ChatContext'te seç
      await selectConversation(selectedConversationId);
      
      // Chat ekranını aç
      setShowChatScreen(true);
      runChatEntrance();
      
      console.log('✅ Chat ekranı açıldı, conversation yüklendi');
    }
  }, [runChatEntrance, selectConversation, selectedConversationId]);

  useEffect(() => {
    if (selectedConversationId) {
      handleConversationSelect();
    }
  }, [selectedConversationId, handleConversationSelect]);

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
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        {...panResponder.panHandlers}
      >
      <TouchableWithoutFeedback onPress={handleScreenPress}>
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
            onLogoPress={() => {
              console.log('🏠 Home ekranında logo tıklandı - zaten home ekranındayız');
              // Home ekranında zaten olduğumuz için özel bir işlem yapmaya gerek yok
            }}
            showBackButton={true}
            showChatButton={true}
          />

          {/* Hero Section - Koşullu gösterim */}
          {!isInputFocused && (
            <View style={styles.heroSectionWrapper}>
              <HeroSection animationProgress={heroReveal} />
            </View>
          )}

          {/* Bottom Section Container - Fixed at bottom */}
          <View
            style={[
              styles.bottomSectionContainer,
              {
                paddingBottom: getKeyboardAwarePaddingBottom(
                  keyboardHeight,
                  isKeyboardVisible
                ),
              },
            ]}
          >
            {/* Action Buttons */}
            <ActionButtons
              onSuggestions={handleOnerilerPress}
              onResearch={handleArastirmaPress}
              isLoading={false}
              isResearchMode={arastirmaModu}
            />

            {/* Input Section */}
            <InputComponent
              inputText={inputText}
              setInputText={setInputText}
              onSendMessage={handleSendMessage}
              onDictate={toggleDictation}
              onOpenUploadModal={openModal}
              isDictating={dictationState.isDictating}
              isProcessing={dictationState.isProcessing}
              isInputFocused={isInputFocused}
              setIsInputFocused={setIsInputFocused}
              textInputRef={textInputRef}
              hasSelectedFiles={
                selectedImages.length > 0 || selectedFiles.length > 0
              }
              selectedFilesCount={selectedFiles.length}
              selectedImagesCount={selectedImages.length}
              showSelectedFilesIndicator={true}
              selectedImages={selectedImages}
              selectedFiles={selectedFiles}
              onRemoveImage={(index) => {
                setSelectedImages((prev) => prev.filter((_, i) => i !== index));
              }}
              onRemoveFile={(index) => {
                setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
              }}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              onTextChange={handleTextChange}
              placeholder="İstediğinizi sorun"
              multiline={false}
              autoCorrect={true}
              autoCapitalize="sentences"
              returnKeyType="send"
              keyboardType="default"
              onSubmitEditing={handleSendMessage}
              waveAnimations={waveAnimations}
            />
          </View>


          {/* Chat Screen Modal */}
          <Modal
            visible={showChatScreen}
            animationType="none"
            transparent={true}
            onRequestClose={closeChatScreen}
          >
            <View style={styles.chatModalContainer}>
              <Animated.View
                pointerEvents="none"
                style={[styles.chatBackdrop, { opacity: chatBackdropOpacity }]}
              />
            <ChatScreen
              translateX={translateXChat}
              onClose={closeChatScreen}
              onOpenChatHistory={onOpenChatHistory}
              conversationId={selectedConversationId || createdConversationId}
              initialArastirmaModu={arastirmaModu}
              initialUploadModalOpen={plusButtonPressed}
              initialMessage={pendingInitialMessage} // Sadece pendingInitialMessage kullan, inputText kullanma
              initialPromptType={pendingPromptType} // Quick suggestion'dan gelen promptType
              initialImages={selectedImages}
              initialFiles={selectedFiles}
            />
            </View>
          </Modal>

          {/* Hızlı Öneriler Modal */}
          <Modal
            visible={showQuickSuggestions}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setShowQuickSuggestions(false)}
          >
            <TouchableOpacity
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => setShowQuickSuggestions(false)}
            >
              <TouchableOpacity
                style={styles.quickSuggestionsModal}
                activeOpacity={1}
                onPress={(e) => e.stopPropagation()}
              >
                <View style={styles.modalHeader}>
                  <Text allowFontScaling={false} style={styles.modalTitle}>Hızlı Öneriler</Text>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setShowQuickSuggestions(false)}
                  >
                    <Text allowFontScaling={false} style={styles.closeButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.suggestionsList}>
                  {isLoadingSuggestions ? (
                    <Text allowFontScaling={false} style={styles.loadingText}>Öneriler yükleniyor...</Text>
                  ) : currentSuggestions.length > 0 ? (
                    currentSuggestions.map((suggestion, index) => (
                      <TouchableOpacity
                        key={`${suggestion.question}-${index}`}
                        style={styles.suggestionItem}
                        onPress={() => handleQuickSuggestionSelect(suggestion)}
                      >
                        <Text allowFontScaling={false} style={styles.suggestionText}>{suggestion.question}</Text>
                      </TouchableOpacity>
                    ))
                  ) : (
                    <Text allowFontScaling={false} style={styles.loadingText}>Öneri bulunamadı</Text>
                  )}
                </View>
              </TouchableOpacity>
            </TouchableOpacity>
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
    width: width,
    height: height,
  },
  chatModalContainer: {
    flex: 1,
    backgroundColor: "transparent",
  },
  chatBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(2, 2, 10, 0.68)",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: getResponsiveHeaderPaddingTop(),
    paddingBottom: getResponsiveHeaderPaddingBottom(),
    position: "relative",
  },
  headerButton: {
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  arrowButton: {
    width: 48,
    height: 48,
    borderRadius: 100,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.3)",
    paddingTop: 17,
    paddingRight: 12,
    paddingBottom: 12,
    paddingLeft: 12,
  },
  arrowText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "bold",
    marginTop: -6,
  },
  headerCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontFamily: "SpaceGrotesk-Regular",
    fontSize: 18,
    fontWeight: "400",
    color: "#FFFFFF",
  },
  chatButton: {
    width: 48,
    height: 48,
    borderRadius: 100,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.3)",
    paddingTop: 17,
    paddingRight: 12,
    paddingBottom: 12,
    paddingLeft: 12,
  },
  chatIcon: {
    fontSize: 20,
    marginTop: -7,
  },
  bottomSectionContainer: {
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
  logoStyle: {
    transform: [{ rotate: "0deg" }],
    opacity: 1,
  },
  heroSectionWrapper: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "center",
  },
  sendButton: {
    width: isSmallScreen ? 80 : 90,
    height: isSmallScreen ? 52 : 58,
    borderRadius: isSmallScreen ? 26 : 29,
    borderWidth: 1.8,
    borderColor: "rgba(255, 255, 255, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
    overflow: "hidden",
    marginLeft: 8,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonGradient: {
    width: "100%",
    height: "100%",
    borderRadius: isSmallScreen ? 26 : 29,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonText: {
    color: "white",
    fontSize: isSmallScreen ? 14 : 16,
    fontFamily: "Poppins-Medium",
    fontWeight: "600",
  },
  // Hızlı Öneriler Modal Stilleri
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  quickSuggestionsModal: {
    backgroundColor: "#1A1A2E",
    borderRadius: 20,
    width: width * 0.9,
    maxHeight: height * 0.7,
    borderWidth: 1,
    borderColor: "#FFFFFF30",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#FFFFFF30",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    fontFamily: "Poppins-Medium",
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#3B38BD",
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  suggestionsList: {
    maxHeight: height * 0.5,
  },
  suggestionItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#2A2A3E",
  },
  suggestionText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Poppins-Regular",
    lineHeight: 22,
  },
  loadingText: {
    color: "#999999",
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    textAlign: "center",
    padding: 20,
  },
});

export default memo(HomeScreen);
