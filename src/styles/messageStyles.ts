import { StyleSheet, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

/**
 * Message List Component Styles
 * Mesaj balonları ve mesaj listesi için tüm stiller
 */
export const messageStyles = StyleSheet.create({
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 20,
    backgroundColor: 'transparent',
  },
  messagesContent: {
    paddingBottom: 20,
    paddingTop: 10,
    flexGrow: 1,
    minHeight: '100%',
  },
  messageContainer: {
    marginVertical: 6,
    flexDirection: 'row',
    width: '100%',
  },
  userMessage: {
    justifyContent: 'flex-end',
  },
  aiMessage: {
    justifyContent: 'flex-start',
  },
  messageWrapper: {
    maxWidth: '90%',
    minWidth: 'auto',
  },
  userMessageWrapper: {
    alignItems: 'flex-end',
  },
  aiMessageWrapper: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    marginBottom: 4,
  },
  userBubble: {
    backgroundColor: '#7E7AE9',
    borderBottomRightRadius: 4,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 20,
  },
  devUserDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#7E7AE9',
    zIndex: 10,
  },
  aiBubble: {
    backgroundColor: '#3532A8',
    borderBottomLeftRadius: 4,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
  },
  messageText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    lineHeight: 24,
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  aiMessageText: {
    color: '#FFFFFF',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
    opacity: 0.7,
  },
  userMessageTime: {
    color: '#FFFFFF',
    textAlign: 'right',
  },
  aiMessageTime: {
    color: '#FFFFFF',
    textAlign: 'left',
  },
  // Thinking state styles - Temaya uygun
  thinkingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    position: 'relative',
  },
  thinkingText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    lineHeight: 24,
    color: '#FFFFFF',
    opacity: 0.9,
    letterSpacing: 0.2,
  },
  devAiTextWrapper: {
    position: 'relative',
    width: '100%',
  },
  devAiAnimationOverlay: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    backgroundColor: 'rgba(255, 0, 0, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 0, 0.5)',
    borderStyle: 'dashed',
    borderRadius: 4,
    zIndex: 1,
    pointerEvents: 'none',
  },
  imagesContainer: {
    marginBottom: 8,
    gap: 8,
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    minHeight: 200,
  },
  filesContainer: {
    marginBottom: 8,
    gap: 10,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#7F8C8D',
    gap: 12,
    minHeight: 64,
  },
  fileIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileIcon: {
    fontSize: 24,
  },
  fileInfoContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  fileName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Poppins-Medium',
    lineHeight: 20,
  },
  fileSize: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    lineHeight: 16,
  },
  fileArrowContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileArrow: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 20,
    fontWeight: '300',
  },
  // Dosya Önizleme Modal Stilleri
  previewModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewModalCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  previewModalCloseText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  previewModalHeader: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 70,
    zIndex: 1000,
  },
  previewModalFileName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  previewModalContent: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
    paddingBottom: 50,
  },
  previewImage: {
    width: width * 0.9,
    height: height * 0.7,
    borderRadius: 12,
  },
  previewWebView: {
    width: width * 0.9,
    height: height * 0.7,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  previewUnsupportedContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  previewUnsupportedText: {
    fontSize: 64,
    marginBottom: 20,
  },
  previewUnsupportedLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
    marginBottom: 30,
    textAlign: 'center',
  },
  previewOpenButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  previewOpenButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
  },
});

/**
 * Markdown Styles for Message Content
 * Mesaj içeriğindeki markdown formatlaması için stiller
 */
export const markdownStyles = StyleSheet.create({
  body: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    lineHeight: 24,
    color: '#FFFFFF',
  },
  heading1: {
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
    lineHeight: 32,
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  heading2: {
    fontFamily: 'Poppins-Bold',
    fontSize: 20,
    lineHeight: 28,
    color: '#FFFFFF',
    marginTop: 14,
    marginBottom: 6,
  },
  heading3: {
    fontFamily: 'Poppins-Bold',
    fontSize: 18,
    lineHeight: 26,
    color: '#FFFFFF',
    marginTop: 12,
    marginBottom: 6,
  },
  heading4: {
    fontFamily: 'Poppins-Bold',
    fontSize: 16,
    lineHeight: 24,
    color: '#FFFFFF',
    marginTop: 10,
    marginBottom: 4,
  },
  paragraph: {
    marginTop: 8,
    marginBottom: 8,
    color: '#FFFFFF',
  },
  strong: {
    fontFamily: 'Poppins-Bold',
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  em: {
    fontStyle: 'italic',
    color: '#FFFFFF',
  },
  link: {
    color: '#FFFFFF',
    textDecorationLine: 'underline',
  },
  listItem: {
    marginTop: 4,
    marginBottom: 4,
    color: '#FFFFFF',
  },
  bullet_list: {
    marginTop: 8,
    marginBottom: 8,
  },
  ordered_list: {
    marginTop: 8,
    marginBottom: 8,
  },
  code_inline: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    fontFamily: 'monospace',
    fontSize: 14,
    color: '#FFFFFF',
  },
  fence: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  code_block: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  blockquote: {
    borderLeftWidth: 4,
    borderLeftColor: 'rgba(255, 255, 255, 0.3)',
    paddingLeft: 12,
    marginTop: 8,
    marginBottom: 8,
    color: '#FFFFFF',
  },
  hr: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    height: 1,
    marginTop: 16,
    marginBottom: 16,
  },
});

