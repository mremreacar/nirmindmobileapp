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
  const { createNewConversation, selectConversation } = useChat();
  const { sendMessage } = useChatMessages();
  const [showChatScreen, setShowChatScreen] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  const [createdConversationId, setCreatedConversationId] = useState<
    string | undefined
  >();
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [arastirmaModu, setArastirmaModu] = useState(false);
  const [showQuickSuggestions, setShowQuickSuggestions] = useState(false);
  const [suggestionCycle, setSuggestionCycle] = useState(0);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [plusButtonPressed, setPlusButtonPressed] = useState(false);
  const translateY = useRef(new Animated.Value(height)).current;
  const translateXChat = useRef(new Animated.Value(-width)).current;
  const textInputRef = useRef<TextInput>(null);

  // Dikte feature hooks
  const { dictationState, toggleDictation } = useDictation({
    onTextUpdate: (text: string) => {
      // Hızlı text güncelleme - console log'ları kaldırdık
      setInputText((prev) => prev + text);
    },
    onError: (error: string) => {
      console.error("Dikte hatası:", error);
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
    "Poppins-Regular": require("@src/assets/fonts/Poppins-Regular .ttf"),
    "Poppins-Medium": require("@src/assets/fonts/Poppins-Medium.ttf"),
    "SpaceGrotesk-Regular": require("@src/assets/fonts/SpaceGrotesk-Regular.ttf"),
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

  const openModal = useCallback(() => {
    // "+" butonuna basıldığında direkt Chat ekranını aç
    console.log("💬 Plus butonu tıklandı - Chat ekranı açılıyor");
    
    // Plus butonuna basıldığını işaretle
    setPlusButtonPressed(true);
    
    // Boş bir conversation oluştur
    const conversationId = createNewConversation("Yeni Sohbet", "");
    setCreatedConversationId(conversationId);
    setShowChatScreen(true);

    // Chat ekranını aç - smooth geçiş (senior seviyede)
    Animated.timing(translateXChat, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();

    // Input'u anında focus'la
    if (textInputRef.current) {
      textInputRef.current.focus();
    }
  }, [createNewConversation, translateXChat, textInputRef]);

  const openChatScreen = useCallback(() => {
    // Header'daki chat butonuna basıldığında yeni mesaj sayfası aç
    console.log("💬 Header chat butonu tıklandı - yeni mesaj açılıyor");

    // Boş bir conversation oluştur
    const conversationId = createNewConversation("Yeni Sohbet", "");
    setCreatedConversationId(conversationId);
    setShowChatScreen(true);

    // Chat ekranını aç - smooth geçiş (senior seviyede)
    Animated.timing(translateXChat, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();

    // Input'u anında focus'la
    if (textInputRef.current) {
      textInputRef.current.focus();
    }
  }, [createNewConversation, translateXChat]);

  const closeChatScreen = useCallback(() => {
    // Smooth kapatma - hafif animasyon (senior seviyede)
    Animated.timing(translateXChat, {
      toValue: -width,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setShowChatScreen(false);
      setCreatedConversationId(undefined);
      
      // Input'u tamamen temizle - Chat ekranından geri dönerken
      setInputText("");
      setSelectedImages([]); // Seçili resimleri temizle
      setSelectedFiles([]); // Seçili dosyaları temizle
      setArastirmaModu(false); // Araştırma modunu sıfırla
      setIsInputFocused(false); // Focus'u temizle
      setPlusButtonPressed(false); // Plus buton durumunu sıfırla
      
      // Keyboard'u kapat
      Keyboard.dismiss();
      
      onConversationSelected(); // Clear selected conversation
    });
  }, [onConversationSelected, translateXChat, width]);

  // Hızlı öneriler listesi - Nireya Ekosistem Markaları (memoized)
  const hizliOneriler = useMemo(() => [
    "Nireya ekosistemi nedir?",
    "NirMind uygulamasının özellikleri nelerdir?",
    "Nireya markaları hangileridir?",
    "NirMind nasıl kullanılır?",
    "Nireya ekosisteminin amacı nedir?",
    "NirMind'de hangi özellikler var?",
    "Nireya markalarının ortak özellikleri neler?",
    "NirMind uygulaması ne işe yarar?",
    "Nireya ekosisteminde hangi hizmetler sunuluyor?",
    "NirMind'in diğer uygulamalardan farkı nedir?",
    "NirMind'de hangi AI özellikleri var?",
    "Nireya ekosisteminin vizyonu nedir?",
    "Nireya markalarının misyonu nedir?",
    "Nireya ekosisteminde hangi teknolojiler kullanılıyor?",
    "NirMind'de AI özellikleri nasıl çalışıyor?",
    "Nireya markalarının değerleri nelerdir?",
    "NirMind'de kullanıcı deneyimi nasıl?",
    "NirPax nedir ve ne işe yarar?",
    "NirMind'in özellikleri nelerdir?",
    "NirPay nasıl çalışır?",
    "Nireya ekosisteminde dijital güvenlik nasıl sağlanıyor?",
    "Nireya ekosisteminde lüks yaşam deneyimi nasıl?",
  ], []);

  // Sonsuz döngü algoritması ile 5 farklı soru seç (memoized)
  const getCycleSuggestions = useMemo(() => {
    // Cycle seed oluştur (her basışta farklı)
    const seed = suggestionCycle;

    // 5 farklı soru seç (tekrar yok)
    const selectedSuggestions = [];
    const usedIndices = new Set();
    let attempts = 0;
    const maxAttempts = 100; // Sonsuz döngüyü önlemek için

    for (let i = 0; i < 5 && attempts < maxAttempts; i++) {
      let index;
      let found = false;

      while (!found && attempts < maxAttempts) {
        // Pseudo-random index (cycle tutarlı)
        index =
          (seed + i * 13 + Math.floor(seed / 5) + attempts * 7) %
          hizliOneriler.length;

        if (!usedIndices.has(index)) {
          found = true;
          usedIndices.add(index);
          selectedSuggestions.push(hizliOneriler[index]);
        }

        attempts++;
      }
    }

    // Eğer 5 farklı soru bulunamadıysa, kalan soruları ekle
    if (selectedSuggestions.length < 5) {
      for (
        let i = 0;
        i < hizliOneriler.length && selectedSuggestions.length < 5;
        i++
      ) {
        if (!usedIndices.has(i)) {
          selectedSuggestions.push(hizliOneriler[i]);
          usedIndices.add(i);
        }
      }
    }

    return selectedSuggestions;
  }, [suggestionCycle, hizliOneriler]);

  const handleOnerilerPress = useCallback(() => {
    // Cycle'ı artır ve modalı aç
    setSuggestionCycle((prev) => prev + 1);
    setShowQuickSuggestions(true);
  }, []);

  const handleArastirmaPress = useCallback(() => {
    setArastirmaModu((prev) => !prev);
  }, []);

  const handleQuickSuggestionSelect = useCallback((suggestion: string) => {
    setShowQuickSuggestions(false);

    // Dismiss keyboard
    textInputRef.current?.blur();

    // Create new conversation with the selected suggestion
    const title =
      suggestion.length > 30 ? suggestion.substring(0, 30) + "..." : suggestion;
    const conversationId = createNewConversation(title, suggestion);

    setCreatedConversationId(conversationId);
    setInputText("");

    // Yeni mesajlaşma süreci başlat - Chat ekranına anında geçiş
    setShowChatScreen(true);

    // Anında geçiş - animasyon yok
    translateXChat.setValue(0);
  }, [createNewConversation, translateXChat]);


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
      const conversationId = createNewConversation(title, fileMessage);

      setCreatedConversationId(conversationId);
      setInputText("");
      setSelectedImages([]); // Seçili resimleri temizle
      setSelectedFiles([]); // Seçili dosyaları temizle

      // Yeni mesajlaşma süreci başlat - Chat ekranına smooth geçiş
      setShowChatScreen(true);

      // Smooth geçiş - senior seviyede
      Animated.timing(translateXChat, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } catch (error) {
      console.error("❌ Dosya gönderme hatası:", error);
      Alert.alert("Hata", "Dosyalar gönderilirken bir hata oluştu.");
    }
  }, [selectedImages, selectedFiles, createNewConversation, translateXChat]);

  const handleSendMessage = useCallback(async () => {
    console.log("🚀 handleSendMessage çağrıldı:", {
      inputText: inputText.trim(),
      selectedImages: selectedImages.length,
      selectedFiles: selectedFiles.length,
      isDictating: dictationState.isDictating,
      isProcessing: dictationState.isProcessing,
    });

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

      // Loading state başlat
      // setIsLoading(true);

      let finalMessage = inputText.trim();

      // Sadece kullanıcının yazdığı mesajı kullan, sistem mesajı ekleme
      // finalMessage zaten inputText.trim() olarak ayarlandı

      // Dosya analizi sistemi kaldırıldı - dosyalar direkt OpenAI'ye gönderilecek

      // Create new conversation with the message
      console.log("📝 Final message oluşturuluyor:", {
        inputText: inputText.trim(),
        selectedImagesCount: selectedImages.length,
        selectedFilesCount: selectedFiles.length,
        finalMessage: finalMessage,
      });

      const title =
        finalMessage.length > 30
          ? finalMessage.substring(0, 30) + "..."
          : finalMessage || "Dosya gönderildi";
      const conversationId = createNewConversation(title, finalMessage);

      console.log("💬 Yeni conversation oluşturuldu:", {
        conversationId,
        title,
      });

      setCreatedConversationId(conversationId);

      // Mesajı Home ekranında gönderme - sadece conversation oluştur
      console.log("📤 Conversation oluşturuldu, Chat ekranına geçiliyor:", {
        finalMessage,
        conversationId,
        selectedImages: selectedImages.length,
        selectedFiles: selectedFiles.length,
      });

      // Chat ekranına geç - mesaj orada gönderilecek
      setShowChatScreen(true);
      
      // Input'u Chat ekranına geçtikten sonra temizle
      setTimeout(() => {
        setInputText("");
        setSelectedImages([]); // Seçili resimleri temizle
        setSelectedFiles([]); // Seçili dosyaları temizle
        setArastirmaModu(false); // Araştırma modunu sıfırla
        
        // Keyboard'u kapat
        Keyboard.dismiss();
      }, 100); // Kısa bir gecikme ile temizle

      // Anında geçiş - animasyon yok
      translateXChat.setValue(0);

      console.log("✅ handleSendMessage tamamlandı");
    } else {
      console.log("❌ handleSendMessage: İçerik yok, mesaj gönderilmedi");
    }
  }, [
    inputText,
    selectedImages,
    selectedFiles,
    dictationState.isDictating,
    dictationState.isProcessing,
    createNewConversation,
    translateXChat,
  ]);

  // Handle selected conversation - Optimized with smooth transition
  const handleConversationSelect = useCallback(() => {
    if (selectedConversationId) {
      setShowChatScreen(true);
      // Smooth geçiş - hafif animasyon (senior seviyede)
      Animated.timing(translateXChat, {
        toValue: 0,
        duration: 100, // Çok hızlı ama smooth
        useNativeDriver: true,
      }).start();
    }
  }, [selectedConversationId, translateXChat]);

  useEffect(() => {
    if (selectedConversationId) {
      handleConversationSelect();
    }
  }, [selectedConversationId, handleConversationSelect]);


  // Show loading while fonts are loading
  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
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
              <HeroSection />
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
            <ChatScreen
              translateX={translateXChat}
              onClose={closeChatScreen}
              onOpenChatHistory={onOpenChatHistory}
              conversationId={selectedConversationId || createdConversationId}
              initialArastirmaModu={arastirmaModu} // Araştırma modu korundu
              initialUploadModalOpen={plusButtonPressed} // Upload modal durumu korundu
              initialMessage={inputText.trim()} // Input mesajı korundu
              initialImages={selectedImages} // Resimler korundu
              initialFiles={selectedFiles} // Dosyalar korundu
            />
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
                  <Text style={styles.modalTitle}>Hızlı Öneriler</Text>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setShowQuickSuggestions(false)}
                  >
                    <Text style={styles.closeButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.suggestionsList}>
                  {getCycleSuggestions.map((suggestion, index) => (
                    <TouchableOpacity
                      key={`${suggestion}-${index}`}
                      style={styles.suggestionItem}
                      onPress={() => handleQuickSuggestionSelect(suggestion)}
                    >
                      <Text style={styles.suggestionText}>{suggestion}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </TouchableOpacity>
            </TouchableOpacity>
          </Modal>
        </LinearGradient>
      </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: width,
    height: height,
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
});

export default memo(HomeScreen);
