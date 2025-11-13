import React, { useRef, useEffect, memo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Animated, Dimensions, Platform, Easing, Image, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SvgXml } from 'react-native-svg';
import { DictationButton } from '../../features/dictation';

const { width, height } = Dimensions.get('window');
const isSmallScreen = height < 700;
const isLargeScreen = height > 800;
const isTablet = width > 600;
const isAndroid = Platform.OS === 'android';

// Responsive font size function
const getResponsiveFontSize = (baseSize: number): number => {
  if (isSmallScreen) return baseSize * 0.9;
  if (isLargeScreen) return baseSize * 1.1;
  return baseSize;
};

// SVG Icons
const SVG_ICONS = {
  mic: `<svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M13.9798 2.33337C11.1588 2.33337 8.8887 4.68672 8.8887 7.61103V11.1585C8.8887 14.0828 11.1588 16.4389 13.9798 16.4389H14.0209C16.8419 16.4389 19.112 14.0842 19.112 11.1585V7.61103C19.112 4.68668 16.8418 2.33337 14.0209 2.33337H13.9798ZM21.238 13.3142C20.8828 13.3342 20.5752 13.573 20.4568 13.9199C19.5263 16.6882 16.9758 18.7054 13.9952 18.7054C11.016 18.7054 8.46268 16.6883 7.53362 13.9199C7.37276 13.4516 6.87728 13.2035 6.423 13.3649C5.96743 13.529 5.72548 14.0426 5.87993 14.5162C7.04975 18.0022 10.2541 20.5265 13.9954 20.5265C17.7366 20.5265 20.9462 18.0117 22.1184 14.5244C22.1943 14.2963 22.1802 14.0455 22.0798 13.828C21.9781 13.6106 21.7966 13.4438 21.5766 13.3651C21.4685 13.3251 21.3525 13.3076 21.238 13.3142ZM14.0015 21.9259C12.4649 21.9259 10.0556 22.6997 10.0556 23.8563C10.0556 25.1824 11.7389 25.6667 14.0015 25.6667C16.2639 25.6667 17.946 25.1824 17.946 23.8563C17.946 22.6997 15.5382 21.9259 14.0015 21.9259Z" fill="white"/>
</svg>`,
  send: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M22 2L11 13" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`,
  stop: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect x="2" y="2" width="18" height="18" rx="5" fill="rgba(255,255,255,0.16)" stroke="white" stroke-width="1.5"/>
<rect x="6.5" y="6.5" width="9" height="9" rx="2" fill="white"/>
</svg>`,
} as const;

// Responsive functions
const getResponsiveInputBorderRadius = () => {
  if (isSmallScreen) return isAndroid ? 40 : 45;
  return isAndroid ? 45 : 50;
};

const getResponsiveInputPaddingVertical = () => {
  if (isSmallScreen) return isAndroid ? 10 : 8; // 2px artırıldı (daha dengeli)
  return isAndroid ? 12 : 10; // 2px artırıldı (daha dengeli)
};

const getResponsiveInputMinHeight = () => {
  if (isSmallScreen) return isAndroid ? 56 : 54; // 10px artırıldı (daha dengeli)
  return isAndroid ? 60 : 58; // 10px artırıldı (daha dengeli)
};

interface InputComponentProps {
  // Core props
  inputText: string;
  setInputText: (text: string) => void;
  onSendMessage: () => void;
  onDictate: () => void;
  onOpenUploadModal: () => void;
  
  // State props
  isDictating: boolean;
  isProcessing?: boolean; // Yeni prop: desifre durumu
  isLoading?: boolean; // Loading state
  isStreaming?: boolean;
  isInputFocused: boolean;
  setIsInputFocused: (focused: boolean) => void;
  
  // File handling
  hasSelectedFiles?: boolean;
  selectedFilesCount?: number;
  selectedImagesCount?: number;
  showSelectedFilesIndicator?: boolean;
  
  // Attachment preview
  selectedImages?: string[];
  selectedFiles?: any[];
  onRemoveImage?: (index: number) => void;
  onRemoveFile?: (index: number) => void;
  
  // TextInput props
  textInputRef?: React.RefObject<TextInput | null>;
  placeholder?: string;
  multiline?: boolean;
  maxLength?: number;
  autoCorrect?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  returnKeyType?: 'done' | 'go' | 'next' | 'search' | 'send' | 'default';
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
  secureTextEntry?: boolean;
  editable?: boolean;
  selectTextOnFocus?: boolean;
  clearButtonMode?: 'never' | 'while-editing' | 'unless-editing' | 'always';
  autoFocus?: boolean;
  blurOnSubmit?: boolean;
  
  // Event handlers
  onFocus?: () => void;
  onBlur?: () => void;
  onKeyPress?: (key: string) => void;
  onSubmitEditing?: () => void;
  onTextChange?: (text: string) => void;
  onContentSizeChange?: (event: any) => void;
  onSelectionChange?: (event: any) => void;
  onTextInput?: (event: any) => void;
  onScroll?: (event: any) => void;
  onLayout?: (event: any) => void;
  onCancelStreaming?: () => void;
  
  // Accessibility
  testID?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: string;
  
  // Custom styling
  containerStyle?: any;
  inputContainerStyle?: any;
  textInputStyle?: any;
  buttonStyle?: any;
  
  // Wave animation for dictation (optional)
  waveAnimations?: Animated.Value[];
}

const InputComponent: React.FC<InputComponentProps> = ({
  // Core props
  inputText,
  setInputText,
  onSendMessage,
  onDictate,
  onOpenUploadModal,
  
  // State props
  isDictating,
  isProcessing = false, // Default değer
  isLoading = false, // Loading state
  isStreaming = false,
  isInputFocused,
  setIsInputFocused,
  
  // File handling
  hasSelectedFiles = false,
  selectedFilesCount = 0,
  selectedImagesCount = 0,
  showSelectedFilesIndicator = true,
  
  // Attachment preview
  selectedImages = [],
  selectedFiles = [],
  onRemoveImage,
  onRemoveFile,
  
  // TextInput props
  textInputRef: externalTextInputRef,
  placeholder = "İstediğinizi sorun",
  multiline = false,
  maxLength = 1000,
  autoCorrect = true,
  autoCapitalize = 'sentences',

  editable = true,

  
  // Event handlers
  onFocus,
  onBlur,
  onKeyPress,
  onSubmitEditing,
  onTextChange,
  onContentSizeChange,
  onSelectionChange,
  onTextInput,
  onScroll,
  onLayout,
  onCancelStreaming = () => {},
  
  // Accessibility
  testID = 'input-component',
  accessibilityLabel = 'Soru girişi',
  accessibilityHint = 'AI asistanınıza soru yazın veya sesli yazma kullanın',
  accessibilityRole = 'textbox' as any,
  
  // Custom styling
  containerStyle,
  inputContainerStyle,
  textInputStyle,
  buttonStyle,
  
  // Wave animation
  waveAnimations,
}) => {
  const internalTextInputRef = useRef<TextInput | null>(null);
  const textInputRef = externalTextInputRef || internalTextInputRef;
  
  // Separate animated values to avoid conflicts
  const pulseAnim = useRef(new Animated.Value(1)).current;
  // animatedHeight kaldırıldı - direkt state kullanılıyor
  
  // Dynamic height state
  const [inputHeight, setInputHeight] = useState(getResponsiveInputMinHeight());
  const [isScrollable, setIsScrollable] = useState(false);
  const scrollViewRef = useRef<ScrollView | null>(null);
  const [contentHeight, setContentHeight] = useState(0);
  const [visibleHeight, setVisibleHeight] = useState(0);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  
  // Constants for dynamic sizing - Daha iyi genişleme
  const MIN_INPUT_HEIGHT = getResponsiveInputMinHeight() + 10; // 10px daha yüksek (daha dengeli)
  const MAX_INPUT_HEIGHT = isTablet ? 260 : (isLargeScreen ? 220 : 200);
  const SCROLL_THRESHOLD = MAX_INPUT_HEIGHT - 16;

  useEffect(() => {
    if (!inputText.trim()) {
      setInputHeight(MIN_INPUT_HEIGHT);
      setIsScrollable(false);
      setCanScrollUp(false);
      setCanScrollDown(false);
    }
  }, [inputText, MIN_INPUT_HEIGHT]);

  useEffect(() => {
    if (!isScrollable) {
      setCanScrollUp(false);
      setCanScrollDown(false);
      return;
    }

    const hasScrollableContent = contentHeight > visibleHeight + 20;
    setCanScrollDown(hasScrollableContent);
  }, [contentHeight, visibleHeight, isScrollable]);

  // Dikte animasyonu - Native driver kullan
  useEffect(() => {
    if (isDictating) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.03,
            duration: 1200,
            easing: Easing.bezier(0.4, 0.0, 0.2, 1),
            useNativeDriver: true, // Transform için native driver kullan
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1200,
            easing: Easing.bezier(0.4, 0.0, 0.2, 1),
            useNativeDriver: true, // Transform için native driver kullan
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isDictating, pulseAnim]);

  const handleFocus = () => {
    setIsInputFocused(true);
    onFocus?.();
  };

  const handleBlur = () => {
    setIsInputFocused(false);
    onBlur?.();
  };

  const handleKeyPress = (e: any) => {
    const key = e.nativeEvent.key;
    
    // Enter tuşu kontrolü
    if (key === 'Enter') {
      // Shift+Enter kontrolü - yeni satır ekle
      if (e.nativeEvent.shiftKey) {
        // Shift+Enter: Yeni satır ekle, mesaj gönderme
        return;
      } else {
        // Sadece Enter: Mesaj gönder
        e.preventDefault();
        if (inputText.trim() || hasSelectedFiles) {
          handleSendPress();
        }
        return;
      }
    }
    
    onKeyPress?.(key);
  };

  const handleSubmitEditing = () => {
    if (onSubmitEditing) {
      onSubmitEditing();
    } else {
      onSendMessage();
    }
  };

  const handleSendPress = () => {
    // Loading guard - eğer mesaj işleniyorsa gönderme
    if (isLoading || isStreaming) {
      console.log('⚠️ Mesaj işleniyor, yeni mesaj gönderilemiyor');
      return;
    }
    
    // Çift gönderimi engelle - eğer input boşsa gönderme
    if (!inputText.trim() && !hasSelectedFiles) {
      console.log('⚠️ Input boş, mesaj gönderilemiyor');
      return;
    }
    
    // Input'u temizleme - ChatScreen'de yapılacak
    // Send message - ChatScreen input'u temizleyecek
    onSendMessage();
  };

  const handleTextChange = (text: string) => {
    // React state'i güncelle
    setInputText(text);
    onTextChange?.(text);
    
    // Native state'i de senkronize et (özellikle temizleme için önemli)
    if (text === '' && textInputRef.current) {
      try {
        textInputRef.current.setNativeProps({ text: '' });
      } catch (error) {
        // Hata durumunda sessizce devam et
      }
    }
  };

  const handleContentSizeChange = (event: any) => {
    const { height } = event.nativeEvent.contentSize;
    const adjustedHeight = height + 22; // Alt satırın kesilmemesi için fazladan boşluk
    const boundedHeight = Math.max(MIN_INPUT_HEIGHT, Math.min(Math.ceil(adjustedHeight), MAX_INPUT_HEIGHT));
    setInputHeight(boundedHeight);
    setIsScrollable(adjustedHeight >= SCROLL_THRESHOLD);
    setContentHeight(adjustedHeight);
    onContentSizeChange?.(event);
  };

  // Enhanced scroll handling - Son yazıları göstermek için
  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset?.y || 0;
    const layoutHeight = event.nativeEvent.layoutMeasurement?.height || 0;
    const totalHeight = event.nativeEvent.contentSize?.height || 0;
    setCanScrollUp(offsetY > 4);
    setCanScrollDown(offsetY + layoutHeight < totalHeight - 18);
    onScroll?.(event);
  };

  // Input text değiştiğinde son yazıları göstermek için ve native state'i senkronize et
  useEffect(() => {
    if (!textInputRef.current) return;
    
    if (inputText.length > 0) {
      // Kısa bir gecikme ile cursor'ı sona taşı
      setTimeout(() => {
        if (textInputRef.current) {
          textInputRef.current.setNativeProps({
            selection: { start: inputText.length, end: inputText.length }
          });
        }
      }, 50);
    } else {
      // Input temizlendiğinde TextInput'un native state'ini de temizle
      // Bu React Native'de native state ile React state senkronizasyonu için gerekli
      // Hemen temizle (gecikme yok)
      try {
        textInputRef.current.setNativeProps({
          text: ''
        });
        // Selection'ı da sıfırla
        textInputRef.current.setNativeProps({
          selection: { start: 0, end: 0 }
        });
      } catch (error) {
        // Hata durumunda sessizce devam et
        // Native state zaten React state'e bağlı, bu sadece bir optimizasyon
      }
    }
  }, [inputText]);

  // Smart scroll to bottom - Geliştirilmiş versiyon
  const scrollToBottom = useCallback(() => {
    if (!scrollViewRef.current) return;

    scrollViewRef.current.scrollTo({
      y: Number.MAX_SAFE_INTEGER,
      animated: true,
    });

    if (textInputRef.current) {
      try {
        textInputRef.current.setNativeProps({
          selection: { start: inputText.length, end: inputText.length },
        });
      } catch (error) {
        console.log('Scroll to bottom error:', error);
      }
    }
  }, [inputText.length]);

  // Auto scroll to bottom when typing - Geliştirilmiş versiyon
  useEffect(() => {
    if (inputText.length > 0 && isScrollable) {
      const timer = setTimeout(() => {
        scrollToBottom();
      }, 50); // Gecikme azaltıldı (100ms -> 50ms)
      return () => clearTimeout(timer);
    }
  }, [inputText, isScrollable, scrollToBottom]);


  const shouldShowSendButton = !isStreaming && (inputText.trim() || hasSelectedFiles);

  return (
    <View style={[styles.inputSectionContainer, containerStyle]}>
      <Animated.View style={[
        styles.inputContainer,
        inputContainerStyle,
        {
          height: inputHeight, // animatedHeight yerine inputHeight kullan
          maxHeight: MAX_INPUT_HEIGHT,
        },
        // Attachment'lar seçildiğinde genişlik artır
        (selectedImages.length > 0 || selectedFiles.length > 0) && {
          minHeight: Math.max(200, inputHeight), // Daha yüksek alan
          paddingVertical: 16, // Daha fazla padding
        },
        isDictating && {
          transform: [{ scale: pulseAnim }],
          borderColor: '#7E7AE9',
          borderWidth: 2,
          shadowColor: '#7E7AE9',
          shadowOffset: {
            width: 0,
            height: 0,
          },
          shadowOpacity: 0.4,
          shadowRadius: 8,
          elevation: 8,
        }
      ]}>
        {/* Plus Button - Sabit Konum */}
        <TouchableOpacity 
          style={styles.plusButtonFixed}
          onPress={onOpenUploadModal}
          accessible={true}
          accessibilityLabel="Dosya yükle"
          accessibilityHint="Fotoğraf ve dosya yüklemek için dokunun"
          accessibilityRole="button"
        >
          <Text style={styles.plusIcon}>+</Text>
        </TouchableOpacity>

        {/* Input İçi İki Bölüm */}
        <View style={styles.inputContentContainer}>
          {/* Üst Bölüm - Attachment'lar */}
          {(selectedImages.length > 0 || selectedFiles.length > 0) && (
            <View style={styles.attachmentSection}>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.attachmentGridInside}
                contentContainerStyle={styles.attachmentGridContent}
                removeClippedSubviews={true}
                scrollEventThrottle={16}
              >
                {/* Seçilen Fotoğraflar */}
                {selectedImages.map((imageUri, index) => (
                  <View 
                    key={`image-${imageUri}-${index}`} 
                    style={styles.attachmentCard}
                  >
                    <TouchableOpacity 
                      style={styles.attachmentImageWrapper}
                      onPress={() => {
                        // TODO: Büyük önizleme modalı aç
                        console.log('Fotoğraf önizleme:', imageUri);
                      }}
                      activeOpacity={0.7}
                    >
                      <Image 
                        source={{ uri: imageUri }} 
                        style={styles.attachmentImage}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.removeAttachmentButton}
                      onPress={() => onRemoveImage?.(index)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.removeAttachmentIcon}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                
                {/* Seçilen Dosyalar */}
                {selectedFiles.map((file, index) => (
                  <View 
                    key={`file-${file.name || index}-${index}`} 
                    style={styles.attachmentCard}
                  >
                    <TouchableOpacity 
                      style={styles.attachmentFileWrapper}
                      onPress={() => {
                        // TODO: Dosya önizleme modalı aç
                        console.log('Dosya önizleme:', file.name);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.attachmentFileIcon}>
                        <Text style={styles.attachmentFileIconText}>📄</Text>
                      </View>
                      <View style={styles.attachmentFileInfo}>
                        <Text style={styles.attachmentFileName} numberOfLines={1}>
                          {file.name || `Dosya ${index + 1}`}
                        </Text>
                        <Text style={styles.attachmentFileSize}>
                          {file.size ? `${(file.size / 1024).toFixed(1)} KB` : 'Dosya'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.removeAttachmentButton}
                      onPress={() => onRemoveFile?.(index)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.removeAttachmentIcon}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Alt Bölüm - Mesaj Yazma Alanı */}
          <View
            style={styles.messageSection}
            onLayout={(event) => {
              setVisibleHeight(event.nativeEvent.layout.height);
            }}
          >
            {/* Text Input, Processing, or Dictating */}
            {isProcessing ? (
              <Animated.View style={[styles.processingContainer, { transform: [{ scale: pulseAnim }] }]}>
                <Text style={styles.processingText}>Desifre ediliyor...</Text>
              </Animated.View>
            ) : isDictating ? (
              <Animated.View style={[styles.dictatingContainer, { transform: [{ scale: pulseAnim }] }]}>
                <View style={styles.waveContainer}>
                  {waveAnimations && waveAnimations.length > 0 ? (
                    <View style={styles.waveRow}>
                      {waveAnimations.map((anim, index) => (
                        <Animated.View
                          key={index}
                          style={[
                            styles.inputWave,
                            {
                              transform: [{ scale: anim }],
                              opacity: anim.interpolate({
                                inputRange: [1, 2.2],
                                outputRange: [0.2, 0.8],
                              }),
                              backgroundColor: anim.interpolate({
                                inputRange: [1, 2.2],
                                outputRange: ['rgba(126, 122, 233, 0.3)', 'rgba(126, 122, 233, 0.7)'],
                              }),
                            },
                          ]}
                        />
                      ))}
                    </View>
                  ) : null}
                </View>
              </Animated.View>
            ) : (
              <>
                <ScrollView
                  ref={scrollViewRef}
                  style={styles.textScrollView}
                  contentContainerStyle={styles.textScrollViewContent}
                  scrollEnabled={isScrollable}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled={true}
                  onScroll={handleScroll}
                  scrollEventThrottle={16}
                >
              <TextInput
                ref={textInputRef}
                style={[
                  styles.textInput, 
                  textInputStyle,
                  {
                        minHeight: MIN_INPUT_HEIGHT,
                        paddingRight: isScrollable ? 12 : 8,
                        opacity: isProcessing ? 0.6 : 1,
                  },
                  isDictating && {
                    color: '#7E7AE9',
                    fontWeight: '600',
                  },
                ]}
                placeholder={placeholder}
                placeholderTextColor="#9CA3AF"
                value={inputText}
                onChangeText={handleTextChange}
                onContentSizeChange={handleContentSizeChange}
                onKeyPress={handleKeyPress}
                onFocus={handleFocus}
                onBlur={handleBlur}
                editable={editable && !isDictating}
                multiline={true}
                maxLength={maxLength}
                returnKeyType="default"
                autoCorrect={autoCorrect}
                autoCapitalize={autoCapitalize}
                onSubmitEditing={handleSubmitEditing}
                underlineColorAndroid="transparent"
                selectionColor="#7E7AE9"
                cursorColor="#7E7AE9"
                textAlignVertical="top"
                keyboardType="default"
                blurOnSubmit={false}
                enablesReturnKeyAutomatically={false}
              />
                </ScrollView>

                {isScrollable && canScrollUp && (
                  <LinearGradient
                    pointerEvents="none"
                    colors={["rgba(2, 2, 10, 0.85)", "rgba(2, 2, 10, 0)"]}
                    style={[styles.scrollFade, styles.scrollFadeTop]}
                  >
                    <Text style={styles.scrollHintArrow}>⌃</Text>
                  </LinearGradient>
                )}

                {isScrollable && canScrollDown && (
                  <LinearGradient
                    pointerEvents="none"
                    colors={["rgba(2, 2, 10, 0)", "rgba(2, 2, 10, 0.85)"]}
                    style={[styles.scrollFade, styles.scrollFadeBottom]}
                  >
                    <Text style={styles.scrollHintArrow}>⌄</Text>
                  </LinearGradient>
                )}
              </>
            )}
          </View>
        </View>

      </Animated.View>


      {/* Microphone/Send Button */}
      {/* Öncelik sırası: 1. Dikte aktifse dikte butonu, 2. AI cevap yazıyorsa AI durdurma butonu, 3. Mesaj gönderilebilir durumda gönder butonu, 4. Değilse dikte başlatma butonu */}
      {isDictating || isProcessing ? (
        // Dikte aktifse veya işleniyorsa → Dikte butonu (durdurma/başlatma)
        <DictationButton
          isDictating={isDictating}
          isProcessing={isProcessing}
          onPress={onDictate}
          waveAnimations={waveAnimations || []}
          style={[styles.micButton, buttonStyle]}
        />
      ) : isStreaming ? (
        // AI cevap yazıyorsa → AI cevabını durdurma butonu
        <TouchableOpacity
          style={[styles.cancelButton, buttonStyle]}
          onPress={onCancelStreaming}
          accessible={true}
          accessibilityLabel="Yanıtı durdur"
          accessibilityHint="Devam eden AI yanıtını durdurmak için dokunun"
          accessibilityRole="button"
        >
          <LinearGradient
            colors={["#7E7AE9", "#4C46B3"]}
            locations={[0, 1]}
            style={styles.cancelButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          >
            <SvgXml 
              xml={SVG_ICONS.stop}
              width="22"
              height="22"
            />
          </LinearGradient>
        </TouchableOpacity>
      ) : shouldShowSendButton ? (
        // Mesaj gönderilebilir durumda → Gönder butonu
        <TouchableOpacity
          style={[styles.micButton, buttonStyle]}
          onPress={handleSendPress}
          accessible={true}
          accessibilityLabel="Mesaj gönder"
          accessibilityHint="Mesajı göndermek için dokunun"
          accessibilityRole="button"
        >
          <LinearGradient
            colors={["#7E7AE9", "#3532A8"]}
            locations={[0, 1]}
            style={styles.micButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          >
            <SvgXml 
              xml={SVG_ICONS.send}
              width="24"
              height="24"
            />
            {/* Dev Mode: Gönderme butonuna beyaz nokta ekle */}
            {__DEV__ && (
              <View style={styles.devSendDot} />
            )}
          </LinearGradient>
        </TouchableOpacity>
      ) : (
        // Mesaj gönderilemez durumda → Dikte başlatma butonu
        <DictationButton
          isDictating={isDictating}
          isProcessing={isProcessing}
          onPress={onDictate}
          waveAnimations={waveAnimations || []}
          style={[styles.micButton, buttonStyle]}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  inputSectionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12, // 16px'den 12px'e azaltıldı (daha dengeli)
    width: '100%',
    paddingHorizontal: 2, // 4px'den 2px'e azaltıldı
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF0D',
    borderRadius: getResponsiveInputBorderRadius(),
    paddingLeft: 10, // 12px'den 10px'e azaltıldı
    paddingRight: 16, // 20px'den 16px'e azaltıldı
    paddingVertical: getResponsiveInputPaddingVertical(),
    gap: 10, // 12px'den 10px'e azaltıldı
    flex: 1,
    borderWidth: 0, // Hayalet çizgi kaldırıldı
    borderColor: 'transparent', // Border rengi şeffaf
    minHeight: getResponsiveInputMinHeight(),
  },
  plusButton: {
    width: isSmallScreen ? 44 : 48,
    height: isSmallScreen ? 44 : 48,
    borderRadius: isSmallScreen ? 24 : 28,
    backgroundColor: '#16163C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  plusIcon: {
    color: '#FFFFFF',
    fontSize: 40,
    fontWeight: '200',
    marginTop: -5,
  },
  selectedFilesIndicator: {
    backgroundColor: 'rgba(126, 122, 233, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#7E7AE9',
  },
  selectedFilesText: {
    fontSize: 12,
    color: '#7E7AE9',
    fontWeight: '500',
    textAlign: 'center',
  },
  textInput: {
    flex: 1,
    fontFamily: 'Poppins-Regular',
    fontSize: 17, // 18px'den 17px'e azaltıldı (daha dengeli)
    color: '#FFFFFF',
    paddingVertical: 12, // 16px'den 12px'e azaltıldı
    textAlignVertical: 'top', // Uzun mesajlarda üstten başlat
    minHeight: 50, // 60px'den 50px'e azaltıldı
    paddingBottom: 12, // 8px'den 12px'e artırıldı (son yazıları göstermek için)
    paddingLeft: 0, // Plus'a çok yakın yerden başlat
    lineHeight: 22, // 24px'den 22px'e azaltıldı
    // marginTop kaldırıldı - attachment'lardan bağımsız
    // Uzun mesajlarda daha iyi okunabilirlik için
    textAlign: 'left',
    includeFontPadding: false, // Android'de font padding'i kaldır
  },
  micButton: {
    width: isSmallScreen ? 52 : 58,
    height: isSmallScreen ? 52 : 58,
    borderRadius: isSmallScreen ? 38 : 42,
    borderWidth: 1.8,
    borderColor: 'rgba(255, 255, 255, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  micButtonGradient: {
    width: '100%',
    height: '100%',
    borderRadius: isSmallScreen ? 38 : 42,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  devSendDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#7E7AE9',
  },
  cancelButton: {
    width: isSmallScreen ? 52 : 58,
    height: isSmallScreen ? 52 : 58,
    borderRadius: 16,
    borderWidth: 1.6,
    borderColor: 'rgba(126, 122, 233, 0.6)',
    overflow: 'hidden',
  },
  cancelButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
  // Attachment Preview Styles
  attachmentPreview: {
    backgroundColor: 'rgba(126, 122, 233, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(126, 122, 233, 0.3)',
  },
  attachmentTitle: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
    color: '#7E7AE9',
    marginBottom: 8,
    fontWeight: '600',
  },
  attachmentList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    maxWidth: 120,
    gap: 6,
  },
  attachmentImageContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(126, 122, 233, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachmentImageText: {
    fontSize: 12,
  },
  attachmentFileContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(126, 122, 233, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachmentFileText: {
    fontSize: 12,
  },
  attachmentText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 11,
    color: '#FFFFFF',
    flex: 1,
  },
  removeAttachmentText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  processingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  processingText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    color: '#7E7AE9',
    textAlign: 'center',
    opacity: 0.8,
  },
  dictatingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  waveContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: 40,
  },
  waveRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 40,
  },
  inputWave: {
    width: 4,
    height: 20,
    borderRadius: 2,
    backgroundColor: '#7E7AE9',
    marginHorizontal: 1.5,
    shadowColor: '#7E7AE9',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 2,
  },
  
  // Inline Attachment Preview Styles
  attachmentPreviewInline: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginHorizontal: 4,
    backgroundColor: 'rgba(126, 122, 233, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(126, 122, 233, 0.2)',
  },
  attachmentListInline: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  attachmentItemInline: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(126, 122, 233, 0.15)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginRight: 4,
    marginBottom: 2,
    borderWidth: 1,
    borderColor: 'rgba(126, 122, 233, 0.3)',
  },
  attachmentImageContainerInline: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(126, 122, 233, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  attachmentImageTextInline: {
    fontSize: 8,
    color: '#7E7AE9',
  },
  attachmentFileContainerInline: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(126, 122, 233, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  attachmentFileTextInline: {
    fontSize: 8,
    color: '#7E7AE9',
  },
  attachmentTextInline: {
    fontSize: 10,
    color: '#7E7AE9',
    fontFamily: 'Poppins-Medium',
    maxWidth: 60,
  },
  removeAttachmentButtonInline: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(126, 122, 233, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  removeAttachmentTextInline: {
    color: '#7E7AE9',
    fontSize: 8,
    fontWeight: 'bold',
  },
  // Top Attachment Preview Styles (Kare Şeklinde)
  attachmentPreviewTop: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(126, 122, 233, 0.05)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(126, 122, 233, 0.1)',
  },
  attachmentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  attachmentSquare: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: 'rgba(126, 122, 233, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(126, 122, 233, 0.2)',
    position: 'relative',
    overflow: 'hidden',
  },
  attachmentOverlay: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  attachmentIcon: {
    fontSize: 10,
    color: '#FFFFFF',
  },
  attachmentFileSquare: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  removeAttachmentButtonSquare: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  removeAttachmentTextSquare: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  // Input İçi Attachment Preview Styles
  attachmentPreviewInside: {
    flex: 1,
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachmentGridInside: {
    maxHeight: 90, // Tek satır yüksekliği
    overflow: 'hidden', // Taşan içeriği gizle
    paddingHorizontal: 4,
    width: '100%',
  },
  attachmentGridContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  attachmentSquareInside: {
    width: 50,
    height: 50,
    borderRadius: 6,
    backgroundColor: 'rgba(126, 122, 233, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(126, 122, 233, 0.2)',
    position: 'relative',
    overflow: 'hidden',
  },
  attachmentImageInside: {
    width: '100%',
    height: '100%',
    borderRadius: 5,
  },
  attachmentOverlayInside: {
    position: 'absolute',
    top: 2,
    left: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 3,
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  attachmentIconInside: {
    fontSize: 8,
    color: '#FFFFFF',
  },
  attachmentFileSquareInside: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
  },
  attachmentFileIconInside: {
    fontSize: 16,
    marginBottom: 1,
  },
  attachmentFileNameInside: {
    fontSize: 7,
    color: '#7E7AE9',
    fontFamily: 'Poppins-Medium',
    textAlign: 'center',
    maxWidth: 40,
  },
  removeAttachmentButtonInside: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  removeAttachmentTextInside: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  
  // Yeni Profesyonel Attachment Styles
  attachmentCard: {
    backgroundColor: 'rgba(126, 122, 233, 0.1)',
    borderRadius: 4, // Dikdörtgen köşeler
    borderWidth: 1,
    borderColor: 'rgba(126, 122, 233, 0.3)',
    padding: 4,
    marginBottom: 0, // Tek satır için margin kaldırıldı
    position: 'relative',
    width: 70, // Küçültüldü - daha fazla sığsın
    height: 50, // Küçültüldü
    overflow: 'visible', // Remove button'un tamamen görünmesi için
    shadowColor: '#7E7AE9',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
    marginHorizontal: 2, // Yan boşluklar
    marginVertical: 2, // Üst-alt boşluklar
    flexShrink: 0, // Küçülmesin
  },
  attachmentImageWrapper: {
    width: '100%',
    height: 35,
    borderRadius: 2, // Dikdörtgen köşeler
    overflow: 'hidden',
    backgroundColor: 'rgba(126, 122, 233, 0.05)',
  },
  attachmentImage: {
    width: '100%',
    height: '100%',
  },
  attachmentFileWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 1,
    height: 35,
  },
  attachmentFileIcon: {
    width: 24,
    height: 24,
    borderRadius: 2, // Dikdörtgen köşeler
    backgroundColor: 'rgba(126, 122, 233, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  attachmentFileIconText: {
    fontSize: 12,
    color: '#7E7AE9',
  },
  attachmentFileInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  attachmentFileName: {
    fontSize: 9,
    color: '#FFFFFF',
    fontFamily: 'Poppins-Medium',
    marginBottom: 1,
  },
  attachmentFileSize: {
    fontSize: 8,
    color: '#9CA3AF',
    fontFamily: 'Poppins-Regular',
  },
  removeAttachmentButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 18,
    height: 18,
    borderRadius: 4, // Dikdörtgen köşeler
    backgroundColor: '#7E7AE9', // Mavi renk
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    shadowColor: '#7E7AE9',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
    zIndex: 10,
  },
  removeAttachmentIcon: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  // TextInput Container Styles
  textInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  textInputContainerWithAttachments: {
    marginTop: 8, // Attachment'lar olduğunda üstten boşluk
    width: '100%',
  },
  // Plus ve Attachment Container
  plusAndAttachmentsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  // Sabit Plus Button
  plusButtonFixed: {
    width: isSmallScreen ? 40 : 44,
    height: isSmallScreen ? 40 : 44,
    borderRadius: isSmallScreen ? 20 : 22,
    backgroundColor: 'rgba(126, 122, 233, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(126, 122, 233, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    shadowColor: '#7E7AE9',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  // Input İçi İki Bölüm Container
  inputContentContainer: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'flex-end', // Alt kısma hizala
  },
  // Üst Bölüm - Attachment'lar
  attachmentSection: {
    minHeight: 90,
    paddingVertical: 12,
    // Alt çizgi kaldırıldı - attachment'lar seçildiğinde çizgi yok
    marginBottom: 0, // Boşluk kaldırıldı
    flexDirection: 'column', // Dikey düzen
    maxHeight: 90, // Tek satır yüksekliği
    overflow: 'visible', // Taşan içeriği göster
    width: '100%', // Tam genişlik
    alignSelf: 'flex-start', // Üst kısma hizala
  },
  // Alt Bölüm - Mesaj Yazma
  messageSection: {
    flex: 1,
    minHeight: 40,
    alignSelf: 'stretch', // Tam genişlik
    position: 'relative',
    justifyContent: 'center',
    // paddingTop ve marginTop kaldırıldı - attachment'lardan bağımsız
    // Çizgi kaldırıldı - ortadan bölen çizgi yok
  },
  textScrollView: {
    maxHeight: 320,
  },
  textScrollViewContent: {
    paddingRight: 6,
    paddingVertical: 2,
    paddingBottom: 8,
  },
  scrollFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollFadeTop: {
    top: 0,
  },
  scrollFadeBottom: {
    bottom: 0,
  },
  scrollHintArrow: {
    color: '#FFFFFF',
    fontSize: 12,
    opacity: 0.6,
  },
});

export default memo(InputComponent);

