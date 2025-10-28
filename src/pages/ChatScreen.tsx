import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  TextInput,
  Modal,
  ScrollView,
  PanResponder,
  Alert,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  TouchableWithoutFeedback,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SvgXml } from 'react-native-svg';
import { useChat } from '@/src/lib/context/ChatContext';
import { ChatMessage } from '@/src/lib/mock/types';
import * as Speech from 'expo-speech';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import Header from '@/src/components/Header';
import UploadModal from '@/src/components/UploadModal';
import MessageList from '@/src/components/chat/MessageList';
import ActionButtons from '@/src/components/chat/ActionButtons';
import InputComponent from '@/src/components/common/InputComponent';
import QuickSuggestionsModal from '@/src/components/chat/QuickSuggestionsModal';
import ErrorBoundary from '@/src/components/ErrorBoundary';
import { useChatMessages } from '@/src/hooks/useChatMessages';
import { useKeyboardHandling } from '@/src/hooks/useKeyboardHandling';
import { useQuickSuggestions } from '@/src/hooks/useQuickSuggestions';
import { CHAT_CONSTANTS, CHAT_ERRORS } from '@/src/constants/chatConstants';
import { speechService } from '@/src/services/speechService';
import { fileService, FileAnalysisResult } from '@/src/services/fileService';
import { useDictation, useWaveAnimation } from '@/src/features/dictation';
import { useFilePermissions, usePermissionDialogs } from '@/src/lib/permissions';

const { width, height } = Dimensions.get('window');

// Responsive calculations - artık custom hook'ta


const chatIcon = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M12.5 2.01175C12.3344 2.00395 12.1677 2 12 2C6.47778 2 2 6.28357 2 11.5667C2 14.1051 3.03333 16.4115 4.71889 18.1231C5.09 18.5 5.33778 19.0148 5.23778 19.5448C5.07275 20.4112 4.69874 21.2194 4.15111 21.893C5.59195 22.161 7.09014 21.9197 8.37499 21.2364C8.82918 20.9949 9.05627 20.8741 9.21653 20.8496C9.37678 20.8251 9.60633 20.8682 10.0654 20.9545C10.7032 21.0742 11.3507 21.1343 12 21.1334C17.5222 21.1334 22 16.8499 22 11.5667C22 11.3765 21.9942 11.1875 21.9827 11" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M15 5.5H22M18.5 2V9" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M11.9955 12H12.0045M15.991 12H16M8 12H8.00897" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

// Icons moved to individual components


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

interface ChatScreenProps {
  translateX: Animated.Value;
  onClose: () => void;
  onOpenChatHistory?: () => void;
  initialMessage?: string;
  initialImages?: string[];
  initialFiles?: any[];
  conversationId?: string;
  initialArastirmaModu?: boolean;
  initialUploadModalOpen?: boolean;
}

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
}) => {
  const { currentConversation, addMessage } = useChat();
  const { isLoading, sendMessage, sendQuickSuggestion } = useChatMessages();
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
  const {
    showQuickSuggestions,
    setShowQuickSuggestions,
    currentSuggestions,
    handleOnerilerPress,
    handleSuggestionSelect
  } = useQuickSuggestions();

  // Local state
  const [inputText, setInputText] = useState(initialMessage || "");
  const [showUploadModal, setShowUploadModal] = useState(initialUploadModalOpen);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<any[]>([]);
  const [arastirmaModu, setArastirmaModu] = useState(initialArastirmaModu);
  const [isPickingDocument, setIsPickingDocument] = useState(false);
  const [isPickingImage, setIsPickingImage] = useState(false);

  // Dikte feature hooks
  const { dictationState, toggleDictation } = useDictation({
    onTextUpdate: (text: string) => {
      // Hızlı text güncelleme - console log'ları kaldırdık
      setInputText(prev => prev + text);
    },
    onError: (error: string) => {
      console.error('Chat dikte hatası:', error);
    },
    onStart: () => {
      console.log('Chat dikte başlatıldı');
    },
    onStop: () => {
      console.log('Chat dikte durduruldu');
    },
  });

  const { animations: waveAnimations } = useWaveAnimation(dictationState.isDictating);

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

  // Refs
  const scrollViewRef = useRef<ScrollView | null>(null);
  const translateY = useRef(new Animated.Value(initialUploadModalOpen ? 0 : height)).current;

  // Initialize with initial message
  useEffect(() => {
    if (initialMessage && currentConversation) {
      setInputText(initialMessage);
    }
  }, [initialMessage, currentConversation]);

  // Initialize UploadModal if needed
  useEffect(() => {
    if (initialUploadModalOpen) {
      console.log('📁 UploadModal başlangıçta açık olarak ayarlanıyor');
      setShowUploadModal(true);
    }
  }, [initialUploadModalOpen]);

  // Chat ekranına geçerken input'u otomatik focus'la
  useEffect(() => {
    const timer = setTimeout(() => {
      if (textInputRef.current) {
        textInputRef.current.focus();
      }
    }, 300); // Kısa bir gecikme ile focus'la

    return () => clearTimeout(timer);
  }, []);

  // Auto-send initial message from HomeScreen - sadece bir kez çalışsın
  const initialMessageSentRef = useRef(false);
  
  useEffect(() => {
    console.log('🔍 Initial mesaj useEffect kontrolü:', {
      initialMessage,
      hasConversation: !!currentConversation,
      isLoading,
      messageSent: initialMessageSentRef.current
    });
    
    if (initialMessage && currentConversation && !isLoading && !initialMessageSentRef.current) {
      console.log('📤 Initial mesaj otomatik gönderiliyor:', initialMessage);
      
      // Mesaj gönderildi flag'ini set et
      initialMessageSentRef.current = true;
      
      // Send initial message automatically
      const sendInitialMessage = async () => {
        try {
          await sendMessage(
            initialMessage,
            currentConversation.id,
            initialArastirmaModu,
            initialImages,
            initialFiles
          );
          console.log('✅ Initial mesaj başarıyla gönderildi');
        } catch (error) {
          console.error('❌ Initial mesaj gönderme hatası:', error);
        }
      };
      
      sendInitialMessage();
    } else {
      console.log('⚠️ Initial mesaj gönderilmedi:', {
        hasMessage: !!initialMessage,
        hasConversation: !!currentConversation,
        isLoading,
        alreadySent: initialMessageSentRef.current
      });
    }
  }, [initialMessage, currentConversation?.id, isLoading]); // Sadece gerekli dependency'ler

  // Initialize conversation when component mounts
  useEffect(() => {
    if (conversationId) {
      // selectConversation will be handled by the custom hook
      console.log('Conversation ID:', conversationId);
    }
  }, [conversationId]);

  // AI response is handled by useChatMessages hook - no need for duplicate logic

  // AI response is handled by useChatMessages hook - no duplicate logic needed


  // Auto scroll to bottom when messages change
  useEffect(() => {
    if (currentConversation?.messages.length) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [currentConversation?.messages.length]);



  const openUploadModal = () => {
    setShowUploadModal(true);
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      tension: CHAT_CONSTANTS.SPRING_TENSION,
      friction: CHAT_CONSTANTS.SPRING_FRICTION,
    }).start();
  };

  const closeUploadModal = () => {
    Animated.timing(translateY, {
      toValue: height,
      duration: CHAT_CONSTANTS.ANIMATION_DURATION,
      useNativeDriver: true,
    }).start(() => {
      setShowUploadModal(false);
    });
  };

  const pickImage = async () => {
    // Çakışma kontrolü
    if (isPickingImage || isPickingDocument) {
      console.log('⚠️ Başka bir seçim işlemi devam ediyor, bekleyin...');
      return;
    }

    try {
      setIsPickingImage(true);
      console.log('📸 Resim seçimi başlatılıyor...');
      
      // Permission kontrolü
      if (!mediaLibrary.isGranted) {
        console.log('🔐 Galeri izni gerekli, permission isteniyor...');
        const granted = await showPermissionDialog('mediaLibrary' as any);
        if (!granted) {
          console.log('❌ Galeri izni reddedildi');
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.9, // Yüksek kalite
        allowsEditing: false,
        exif: false, // HEIC dosyalarını JPEG'e çevir
        base64: false,
        presentationStyle: ImagePicker.UIImagePickerPresentationStyle.FULL_SCREEN,
      });

      if (!result.canceled && result.assets?.length) {
        // HEIC dosyalarını filtrele
        const validImages = result.assets
          .map(asset => asset.uri)
          .filter((uri): uri is string => Boolean(uri))
          .filter((uri) => {
            if (uri.toLowerCase().includes(".heic") || uri.toLowerCase().includes(".heif")) {
              console.log("⚠️ HEIC dosyası filtrelendi:", uri);
              return false;
            }
            return true;
          });

        if (validImages.length > 0) {
          setSelectedImages(prev => [...prev, ...validImages]);
          console.log(`📸 ${validImages.length} resim seçildi`);
          
          // Seçim tamamlandı, modal'ı otomatik kapat
          closeUploadModal();
          
          if (validImages.length < result.assets.length) {
            Alert.alert(
              "Desteklenmeyen Format",
              "HEIC dosya formatı desteklenmiyor. Lütfen JPEG, PNG, GIF veya WEBP formatında resim seçin.",
              [{ text: "Tamam", style: "default" }]
            );
          }
        } else {
          Alert.alert(
            "Desteklenmeyen Format",
            "HEIC dosya formatı desteklenmiyor. Lütfen JPEG, PNG, GIF veya WEBP formatında resim seçin.",
            [{ text: "Tamam", style: "default" }]
          );
        }
      }
    } catch (error) {
      console.error('❌ Resim seçimi hatası:', error);
      Alert.alert("Hata", "Resim seçilirken bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setIsPickingImage(false);
    }
  };

  const pickDocument = async () => {
    // Çakışma kontrolü
    if (isPickingDocument || isPickingImage) {
      console.log('⚠️ Başka bir seçim işlemi devam ediyor, bekleyin...');
      return;
    }

    try {
      setIsPickingDocument(true);
      console.log('📁 Dosya seçimi başlatılıyor...');
      
      // Permission kontrolü
      if (!documents.isGranted) {
        console.log('🔐 Dosya izni gerekli, permission isteniyor...');
        const granted = await showPermissionDialog('documents' as any);
        if (!granted) {
          console.log('❌ Dosya izni reddedildi');
          return;
        }
      }
      
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "text/plain",
          "image/jpeg",
          "image/png",
          "image/gif",
          "video/mp4",
          "audio/mpeg",
          "audio/wav",
        ],
        copyToCacheDirectory: true,
        multiple: true,
      });

      if (!result.canceled && result.assets?.length) {
        // Desteklenen dosya türlerini filtrele
        const supportedFiles = result.assets.filter((asset) => {
          const fileExtension = asset.name?.split(".").pop()?.toLowerCase();
          const supportedExtensions = [
            "pdf", "doc", "docx", "txt", "jpg", "jpeg", "png", "gif", "mp4", "mp3", "wav",
            "c", "cpp", "cs", "css", "csv", "go", "html", "java", "js", "json", "md", 
            "php", "py", "rb", "rs", "sql", "ts", "xml", "yaml", "yml"
          ];

          // .pages dosyasını özel olarak filtrele
          const isPagesFile = fileExtension === "pages";
          if (isPagesFile) {
            console.log(`⚠️ .pages dosyası desteklenmiyor: ${asset.name}`);
            return false;
          }
          
          const isSupported = supportedExtensions.includes(fileExtension || "");
          if (!isSupported) {
            console.log(`⚠️ Desteklenmeyen dosya türü: ${asset.name} (${fileExtension})`);
          }
          return isSupported;
        });

        if (supportedFiles.length > 0) {
          // Dosya boyutu kontrolü (10MB limit)
          const maxSize = 10 * 1024 * 1024; // 10MB
          const validFiles = supportedFiles.filter(asset => {
            if (asset.size && asset.size > maxSize) {
              console.log(`⚠️ Dosya çok büyük: ${asset.name} (${(asset.size / 1024 / 1024).toFixed(1)}MB)`);
              return false;
            }
            return true;
          });

          if (validFiles.length > 0) {
            const newFiles = validFiles.map(asset => {
              // Dosya yolu encoding sorununu çöz
              let safeUri = asset.uri;
              try {
                // URI'yi decode et ve tekrar encode et
                safeUri = decodeURIComponent(asset.uri);
                // Özel karakterleri temizle
                safeUri = safeUri.replace(/[^\w\s\-\.\/:]/g, '');
              } catch (error) {
                console.warn('⚠️ Dosya yolu encoding hatası, orijinal URI kullanılıyor:', error);
                safeUri = asset.uri;
              }
              
              return {
                name: asset.name || 'Bilinmeyen Dosya',
                uri: safeUri,
                size: asset.size,
                mimeType: asset.mimeType,
              };
            });
            setSelectedFiles(prev => [...prev, ...newFiles]);
            console.log(`📁 ${validFiles.length} dosya seçildi`);
            
            // Seçim tamamlandı, modal'ı otomatik kapat
            closeUploadModal();
            
            if (validFiles.length < supportedFiles.length) {
              const oversizedCount = supportedFiles.length - validFiles.length;
              Alert.alert(
                "Bazı Dosyalar Çok Büyük",
                `${oversizedCount} dosya 10MB'dan büyük olduğu için seçilmedi. Lütfen daha küçük dosyalar seçin.`,
                [{ text: "Tamam", style: "default" }]
              );
            }
          } else {
            Alert.alert(
              "Dosyalar Çok Büyük",
              "Seçilen dosyalar 10MB'dan büyük. Lütfen daha küçük dosyalar seçin.",
              [{ text: "Tamam", style: "default" }]
            );
          }
          
          if (supportedFiles.length < result.assets.length) {
            const unsupportedCount = result.assets.length - supportedFiles.length;
            Alert.alert(
              "Bazı Dosyalar Desteklenmiyor",
              `${unsupportedCount} dosya desteklenmeyen türde olduğu için seçilmedi.\n\n📄 **Pages dosyaları** yakında desteklenecek!\n\nDesteklenen türler: PDF, DOC, DOCX, TXT, JPG, PNG, MP4, MP3, WAV, ve daha fazlası`,
              [{ text: "Tamam", style: "default" }]
            );
          }
        } else {
          Alert.alert(
            "Desteklenmeyen Dosya Türü",
            "Seçilen dosyalar desteklenmiyor. Lütfen PDF, DOC, DOCX, TXT, JPG, PNG, MP4, MP3 veya WAV dosyası seçin.",
            [{ text: "Tamam", style: "default" }]
          );
        }
      } else if (result.canceled) {
        console.log("📁 Dosya seçimi iptal edildi");
      } else {
        console.log("📁 Hiç dosya seçilmedi");
        Alert.alert("Dosya Seçilmedi", "Lütfen bir dosya seçin.", [
          { text: "Tamam", style: "default" },
        ]);
      }
    } catch (error) {
      console.error('❌ Dosya seçimi hatası:', error);
      
      // Özel hata mesajları
      let errorMessage = "Dosya seçilirken bir hata oluştu. Lütfen tekrar deneyin.";
      
      if (error instanceof Error) {
        if (error.message.includes('file://')) {
          errorMessage = "Dosya yolu hatası. Lütfen farklı bir dosya seçin.";
        } else if (error.message.includes('encoding')) {
          errorMessage = "Dosya adı encoding hatası. Lütfen dosya adını değiştirin.";
        } else if (error.message.includes('permission')) {
          errorMessage = "Dosya erişim izni hatası. Lütfen ayarlardan izin verin.";
        }
      }
      
      Alert.alert("Dosya Seçimi Hatası", errorMessage, [
        { text: "Tamam", style: "default" }
      ]);
    } finally {
      setIsPickingDocument(false);
    }
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) => {
          return Math.abs(gestureState.dy) > 10;
        },
        onPanResponderGrant: () => {
          translateY.setOffset(0);
          translateY.setValue(0);
        },
        onPanResponderMove: (_, gestureState) => {
          if (gestureState.dy > 0) {
            translateY.setValue(gestureState.dy);
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          translateY.flattenOffset();
          const shouldClose = gestureState.dy > 150 || gestureState.vy > 0.5;

          if (shouldClose) {
            closeUploadModal();
          } else {
            Animated.spring(translateY, {
              toValue: 0,
              useNativeDriver: true,
              tension: CHAT_CONSTANTS.SPRING_TENSION,
              friction: CHAT_CONSTANTS.SPRING_FRICTION,
            }).start();
          }
        },
      }),
    [translateY]
  );


  const handleSendMessage = async () => {
    // Loading guard - çift gönderimi engelle
    if (isLoading) {
      console.log('⚠️ Zaten bir mesaj işleniyor, çift gönderim engellendi');
      return;
    }

    // En az bir içerik olmalı (yazı, dosya veya resim)
    const hasContent = inputText.trim() || selectedImages.length > 0 || selectedFiles.length > 0;
    
    if (!hasContent || !currentConversation) {
      console.log('⚠️ Mesaj gönderilemedi:', { 
        hasText: !!inputText.trim(),
        hasImages: selectedImages.length > 0,
        hasFiles: selectedFiles.length > 0,
        hasContent,
        hasConversation: !!currentConversation 
      });
      return;
    }
    
    console.log('📤 Kullanıcı mesajı gönderiliyor:', {
      text: inputText,
      images: selectedImages.length,
      files: selectedFiles.length
    });
    
    // Sadece kullanıcının yazdığı mesajı kullan, sistem mesajı ekleme
    let finalMessage = inputText.trim();
    
    // Input'u hemen temizle (kullanıcı deneyimi için)
    setInputText("");
    setArastirmaModu(false);
    setSelectedImages([]);
    setSelectedFiles([]);
    
    try {
      await sendMessage(finalMessage, currentConversation.id, arastirmaModu, selectedImages, selectedFiles);
      console.log('✅ Kullanıcı mesajı gönderildi, AI cevap bekleniyor...');
    } catch (error) {
      console.error('❌ Mesaj gönderme hatası:', error);
      // Hata durumunda input'u geri yükle
      setInputText(finalMessage);
    }
  };

  const handleSendFilesOnly = async () => {
    if (isLoading || !currentConversation) {
      console.log('⚠️ Dosyalar gönderilemedi:', { 
        isLoading, 
        hasConversation: !!currentConversation 
      });
      return;
    }

    // En az bir dosya veya resim seçilmiş olmalı
    if (selectedImages.length === 0 && selectedFiles.length === 0) {
      console.log('⚠️ Gönderilecek dosya/resim yok');
      return;
    }
    
    console.log('📤 Sadece dosyalar gönderiliyor:', {
      images: selectedImages.length,
      files: selectedFiles.length
    });
    
    let fileMessage = '';
    
    // Resim bilgisi kaldırıldı - sadece AI analizi yapılacak
    
    // Eğer dosya seçilmişse, önce dosyaları analiz et
    if (selectedFiles.length > 0) {
      try {
        console.log('📄 Dosyalar analiz ediliyor...');
        
        // Her dosya için analiz yap
        for (const file of selectedFiles) {
          if (fileService.isFileTypeSupported(file.name)) {
            console.log(`📄 Analiz ediliyor: ${file.name}`);
            
            const analysisResult = await fileService.uploadAndAnalyzeFile(
              file.uri,
              file.name,
              file.name.split('.').pop() || '',
              (progress) => {
                console.log(`📄 ${file.name} analiz progress: ${progress}%`);
              }
            );
            
            console.log('📄 Dosya analizi tamamlandı:', analysisResult);
            
            // Analiz sonucunu mesaja ekle
            fileMessage += `📄 **${file.name}** analizi:\n\n${analysisResult.text}\n\n`;
          } else {
            console.log(`⚠️ Desteklenmeyen dosya türü: ${file.name}`);
            fileMessage += `⚠️ ${file.name} dosyası desteklenmiyor.\n\n`;
          }
        }
      } catch (error) {
        console.error('❌ Dosya analizi hatası:', error);
        fileMessage += '❌ Dosya analizi sırasında hata oluştu.\n\n';
      }
    }
    
    // Dosya bilgisi ile mesaj oluştur
    // Dosya bilgisi kaldırıldı - sadece AI analizi yapılacak
    const finalMessage = fileMessage;
    
    await sendMessage(finalMessage, currentConversation.id, arastirmaModu, selectedImages, selectedFiles);
    setArastirmaModu(false);
    
    // Dosyaları temizle
    setSelectedImages([]);
    setSelectedFiles([]);
    
    // Modal'ı kapat
    closeUploadModal();
    
    console.log('✅ Dosyalar gönderildi, AI cevap bekleniyor...');
  };

  const handleQuickSuggestionSelect = async (suggestion: string) => {
    const selectedSuggestion = handleSuggestionSelect(suggestion);
    await sendQuickSuggestion(selectedSuggestion);
  };



  const handleResearch = () => {
    setArastirmaModu(!arastirmaModu);
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

  const handleInputFocus = () => {
    // Auto-scroll to input when focused
    if (scrollViewRef.current && isKeyboardVisible) {
      const scrollOffset = getScrollOffset();
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  };

  const handleInputBlur = () => {
    // Optional: Keep focus state for better UX
    // setIsInputFocused(false);
  };



  const handleAskAboutFile = async (fileName: string, fileType: string) => {
    try {
      if (!currentConversation) {
        console.log('❌ Konuşma bulunamadı');
        return;
      }

      // Dosya türüne göre farklı sorular öner
      let question = '';
      
      if (fileType.includes('pdf')) {
        question = `Bu PDF dosyasının içeriğini analiz eder misin? (${fileName})`;
      } else if (fileType.includes('image') || fileType.includes('jpeg') || fileType.includes('png')) {
        question = `Bu görseli analiz eder misin? (${fileName})`;
      } else if (fileType.includes('text') || fileType.includes('document')) {
        question = `Bu belgenin içeriğini özetler misin? (${fileName})`;
      } else if (fileType.includes('excel') || fileType.includes('spreadsheet')) {
        question = `Bu Excel dosyasındaki verileri analiz eder misin? (${fileName})`;
      } else {
        question = `Bu dosya hakkında ne söyleyebilirsin? (${fileName})`;
      }

      // Input alanına soruyu ekle
      setInputText(question);
      
      // Modal'ı kapat
      closeUploadModal();
      
      // Input'a focus yap
      setTimeout(() => {
        textInputRef.current?.focus();
      }, 300);

      console.log('📁 Dosya hakkında soru hazırlandı:', question);
      
    } catch (error) {
      console.error('❌ Dosya sorusu hazırlama hatası:', error);
      Alert.alert('Hata', 'Dosya sorusu hazırlanırken bir hata oluştu.');
    }
  };

  const handleViewAllFiles = () => {
    try {
      if (selectedFiles.length === 0) {
        Alert.alert('Bilgi', 'Henüz dosya seçilmedi.');
        return;
      }

      // Dosya listesini göster
      const fileList = selectedFiles.map((file, index) => 
        `${index + 1}. ${file.name} (${file.size ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : 'N/A'})`
      ).join('\n');

      Alert.alert(
        'Seçilen Dosyalar',
        fileList,
        [
          {
            text: 'Tamam',
            style: 'default'
          },
          {
            text: 'Dosya Ekle',
            style: 'default',
            onPress: () => {
              // Modal'ı kapat ve dosya seçimi başlat
              closeUploadModal();
              setTimeout(() => {
                pickDocument();
              }, 300);
            }
          }
        ]
      );

      console.log('📁 Tüm dosyalar görüntülendi:', selectedFiles.length);
      
    } catch (error) {
      console.error('❌ Dosya listesi görüntüleme hatası:', error);
      Alert.alert('Hata', 'Dosya listesi görüntülenirken bir hata oluştu.');
    }
  };

  const handleSelectFile = async () => {
    try {
      // Önce dosya seçimi yap
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets?.length) {
        const newFiles = result.assets.map(asset => ({
          name: asset.name,
          uri: asset.uri,
          size: asset.size,
          type: asset.mimeType,
        }));
        
        // Dosyayı seçilen dosyalar listesine ekle
        setSelectedFiles(prev => [...prev, ...newFiles]);
        
        // Dosya türüne göre otomatik soru oluştur
        const file = newFiles[0];
        let question = '';
        
        if (file.type?.includes('pdf')) {
          question = `Bu PDF dosyasının içeriğini analiz eder misin? (${file.name})`;
        } else if (file.type?.includes('image') || file.type?.includes('jpeg') || file.type?.includes('png')) {
          question = `Bu görseli analiz eder misin? (${file.name})`;
        } else if (file.type?.includes('text') || file.type?.includes('document')) {
          question = `Bu belgenin içeriğini özetler misin? (${file.name})`;
        } else if (file.type?.includes('excel') || file.type?.includes('spreadsheet')) {
          question = `Bu Excel dosyasındaki verileri analiz eder misin? (${file.name})`;
        } else {
          question = `Bu dosya hakkında ne söyleyebilirsin? (${file.name})`;
        }

        // Input alanına soruyu ekle
        setInputText(question);
        
        // Input'a focus yap
        setTimeout(() => {
          textInputRef.current?.focus();
        }, 300);

        console.log('📁 Dosya seçildi ve soru hazırlandı:', question);
        
      } else {
        // Dosya seçilmezse modal'ı aç
        openUploadModal();
      }
      
    } catch (error) {
      console.error('❌ Dosya seçimi hatası:', error);
      Alert.alert('Hata', 'Dosya seçilirken bir hata oluştu.');
      // Hata durumunda modal'ı aç
      openUploadModal();
    }
  };

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
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
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
            onOpenChatHistory?.();
          }}
          onChatPress={onClose}
          onLogoPress={() => {
            console.log('🏠 Chat ekranından Home ekranına gidiliyor');
            onClose();
          }}
          showBackButton={true}
          showChatButton={true}
        />

        {/* Messages List */}
        <View style={styles.messagesListContainer}>
          <MessageList
            messages={currentConversation?.messages || []}
            isLoading={isLoading}
            scrollViewRef={scrollViewRef}
            isKeyboardVisible={isKeyboardVisible}
            keyboardHeight={keyboardHeight}
            onScrollToEnd={() => {
              // Optional: Additional scroll handling
            }}
          />
        </View>

        {/* Bottom Section Container */}
        <TouchableWithoutFeedback onPress={handleInputAreaPress}>
          <View style={[
            styles.bottomSectionContainer,
            { paddingBottom: getKeyboardAwarePaddingBottom() }
          ]}>
          <ActionButtons
            onSuggestions={handleOnerilerPress}
            onResearch={handleResearch}
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
            onRemoveImage={(index) => {
              setSelectedImages((prev) => prev.filter((_, i) => i !== index));
            }}
            onRemoveFile={(index) => {
              setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
            }}
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
            autoFocus={true}
            blurOnSubmit={true}
            onSubmitEditing={handleSendMessage}
            testID="chat-input"
            accessibilityLabel="Soru girişi"
            accessibilityHint="AI asistanınıza soru yazın veya sesli yazma kullanın"
            accessibilityRole="textbox"
            waveAnimations={waveAnimations}
          />
        </View>
        </TouchableWithoutFeedback>

        </LinearGradient>

      {/* Upload Modal */}
      <Modal
        visible={showUploadModal}
        animationType="slide"
        transparent={true}
        onRequestClose={closeUploadModal}
      >
        <UploadModal
          visible={showUploadModal}
          translateY={translateY}
          panHandlers={panResponder.panHandlers}
          selectedImages={selectedImages}
          selectedFiles={selectedFiles}
          onPickImage={pickImage}
          onSelectRecentPhoto={(photoUri) => {
            console.log('📸 Son fotoğraflardan seçildi:', photoUri);
            setSelectedImages((prev) => [...prev, photoUri]);
            // Seçim tamamlandı, modal'ı otomatik kapat
            closeUploadModal();
          }}
          onPickDocument={pickDocument}
          onRemoveImage={(index) => {
            setSelectedImages((prev) => prev.filter((_, i) => i !== index));
          }}
          onRemoveFile={(index) => {
            setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
          }}
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
  },
  bottomSectionContainer: {
    flexDirection: 'column',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    paddingHorizontal: 17,
    paddingBottom: 20,
    gap: 8,
  },
});

export default ChatScreen;
