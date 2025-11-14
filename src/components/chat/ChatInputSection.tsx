import React from 'react';
import { View, Text, StyleSheet, TouchableWithoutFeedback, Animated } from 'react-native';
import ActionButtons from '@/src/components/chat/ActionButtons';
import InputComponent from '@/src/components/common/InputComponent';

interface ChatInputSectionProps {
  // Input state
  inputText: string;
  setInputText: (text: string) => void;
  isInputFocused: boolean;
  setIsInputFocused: (focused: boolean) => void;
  
  // Handlers
  onSendMessage: () => void;
  onDictate: () => void;
  onOpenUploadModal: () => void;
  onInputAreaPress?: () => void;
  
  // Action buttons
  onSuggestions: () => void;
  onResearch: () => void;
  isLoading: boolean;
  isResearchMode: boolean;
  
  // Dictation state
  isDictating: boolean;
  isProcessing?: boolean;
  
  // Streaming state
  isStreaming?: boolean;
  onCancelStreaming?: () => void;
  
  // File handling
  selectedImages: string[];
  selectedFiles: any[];
  onRemoveImage: (index: number) => void;
  onRemoveFile: (index: number) => void;
  
  // Input ref
  textInputRef?: React.RefObject<any>;
  
  // Keyboard handling
  getKeyboardAwarePaddingBottom?: () => number;
  
  // Additional InputComponent props
  onKeyPress?: (key: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
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
  onSubmitEditing?: () => void;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: string;
  waveAnimations?: any[];
  
  // Container style (for animated padding/position)
  containerStyle?: any;
  animatedPaddingBottom?: Animated.Value | number;
  animatedBottom?: Animated.Value | number;
  
  // Input cleared ref (for ChatScreen specific behavior)
  inputClearedRef?: React.MutableRefObject<boolean>;
}

const ChatInputSection: React.FC<ChatInputSectionProps> = ({
  inputText,
  setInputText,
  isInputFocused,
  setIsInputFocused,
  onSendMessage,
  onDictate,
  onOpenUploadModal,
  onInputAreaPress,
  onSuggestions,
  onResearch,
  isLoading,
  isResearchMode,
  isDictating,
  isProcessing,
  isStreaming,
  onCancelStreaming,
  selectedImages,
  selectedFiles,
  onRemoveImage,
  onRemoveFile,
  textInputRef,
  getKeyboardAwarePaddingBottom,
  onKeyPress,
  onFocus,
  onBlur,
  placeholder = "İstediğinizi sorun",
  multiline = false,
  maxLength = 1000,
  autoCorrect = true,
  autoCapitalize = "sentences",
  returnKeyType = "send",
  keyboardType = "default",
  secureTextEntry = false,
  editable = true,
  selectTextOnFocus = false,
  clearButtonMode = "while-editing",
  autoFocus = false,
  blurOnSubmit = true,
  onSubmitEditing,
  testID,
  accessibilityLabel = "Soru girişi",
  accessibilityHint = "AI asistanınıza soru yazın veya sesli yazma kullanın",
  accessibilityRole = "textbox",
  waveAnimations,
  containerStyle,
  animatedPaddingBottom,
  animatedBottom,
  inputClearedRef,
}) => {
  // Handle input text change with inputClearedRef support
  const handleSetInputText = (text: string) => {
    if (inputClearedRef && text.length > 0) {
      inputClearedRef.current = false;
    }
    setInputText(text);
  };

  // Determine if we need Animated.View (if animatedBottom or animatedPaddingBottom is Animated.Value)
  const needsAnimatedView = animatedBottom instanceof Animated.Value || animatedPaddingBottom instanceof Animated.Value;
  const Container = needsAnimatedView ? Animated.View : View;

  // Build container style - merge base style with custom containerStyle
  const containerStyleProps: any = {
    ...styles.bottomSectionContainer,
  };

  // Merge containerStyle if provided (but don't override paddingBottom/bottom from animated values)
  if (containerStyle) {
    Object.keys(containerStyle).forEach(key => {
      if (key !== 'paddingBottom' && key !== 'bottom') {
        containerStyleProps[key] = containerStyle[key];
      }
    });
  }

  // Add padding bottom (animated or static) - this overrides containerStyle paddingBottom
  if (animatedPaddingBottom) {
    containerStyleProps.paddingBottom = animatedPaddingBottom;
  } else if (getKeyboardAwarePaddingBottom) {
    containerStyleProps.paddingBottom = getKeyboardAwarePaddingBottom();
  } else if (containerStyle?.paddingBottom !== undefined) {
    containerStyleProps.paddingBottom = containerStyle.paddingBottom;
  } else {
    containerStyleProps.paddingBottom = 20;
  }

  // Add bottom position if animated - this overrides containerStyle bottom
  if (animatedBottom) {
    containerStyleProps.bottom = animatedBottom;
  } else if (containerStyle?.bottom !== undefined) {
    containerStyleProps.bottom = containerStyle.bottom;
  }

  const containerProps = {
    style: containerStyleProps,
  };

  return (
    <TouchableWithoutFeedback onPress={onInputAreaPress}>
      <Container {...containerProps}>

        <ActionButtons
          onSuggestions={onSuggestions}
          onResearch={onResearch}
          isLoading={isLoading}
          isResearchMode={isResearchMode}
        />

        <InputComponent
          inputText={inputText}
          setInputText={handleSetInputText}
          onSendMessage={onSendMessage}
          onDictate={onDictate}
          onOpenUploadModal={onOpenUploadModal}
          isDictating={isDictating}
          isProcessing={isProcessing}
          isLoading={isLoading}
          isStreaming={isStreaming}
          onCancelStreaming={onCancelStreaming}
          isInputFocused={isInputFocused}
          setIsInputFocused={setIsInputFocused}
          textInputRef={textInputRef}
          hasSelectedFiles={selectedImages.length > 0 || selectedFiles.length > 0}
          selectedFilesCount={selectedFiles.length}
          selectedImagesCount={selectedImages.length}
          showSelectedFilesIndicator={true}
          selectedImages={selectedImages}
          selectedFiles={selectedFiles}
          onRemoveImage={onRemoveImage}
          onRemoveFile={onRemoveFile}
          onKeyPress={onKeyPress}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder={placeholder}
          multiline={multiline !== undefined ? multiline : true} // Varsayılan olarak true (her zaman multiline aktif)
          maxLength={maxLength}
          autoCorrect={autoCorrect}
          autoCapitalize={autoCapitalize}
          returnKeyType={returnKeyType}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          editable={editable}
          selectTextOnFocus={selectTextOnFocus}
          clearButtonMode={clearButtonMode}
          autoFocus={autoFocus}
          blurOnSubmit={blurOnSubmit}
          onSubmitEditing={onSubmitEditing || onSendMessage}
          testID={testID}
          accessibilityLabel={accessibilityLabel}
          accessibilityHint={accessibilityHint}
          accessibilityRole={accessibilityRole}
          waveAnimations={waveAnimations}
        />
      </Container>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  bottomSectionContainer: {
    flexDirection: 'column',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    paddingHorizontal: 12, // Kenarlara göre optimize edildi: 17 -> 12
    paddingBottom: 20,
    gap: 8,
    width: '100%', // Tam genişlik kullan
    maxWidth: '100%', // Maksimum genişlik sınırı yok
  },
  devIndicatorInput: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10001,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FF0000',
  },
  devIndicatorDotInput: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF0000',
    marginRight: 6,
  },
  devIndicatorTextInput: {
    color: '#000000',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default ChatInputSection;

