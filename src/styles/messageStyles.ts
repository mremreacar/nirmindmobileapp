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
    position: 'relative',
  },
  userMessage: {
    justifyContent: 'flex-end',
  },
  aiMessage: {
    justifyContent: 'flex-start',
  },
  messageWrapper: {
    maxWidth: '90%',
    // CRITICAL FIX: Kısa mesajlar için minimum genişlik ekle
    // Böylece çok kısa mesajlarda balon çok küçük olmaz
    // Flexbox sayesinde mesaj uzunluğuna göre otomatik genişler (içeriğe göre)
    minWidth: 80, // Minimum 80px genişlik (kısa mesajlar için)
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
  aiBubble: {
    backgroundColor: '#3532A8', // Koyu mor - tema rengi
    borderBottomLeftRadius: 4,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
  },
  messageText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 15,
    lineHeight: 22,
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  userMessageTextContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: 6,
  },
  userMessageTextContainerInline: {
    // Kısa mesajlar için: saat bilgisi yanında
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  userMessageTextContainerBlock: {
    // Uzun mesajlar için: saat bilgisi altında
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  aiMessageText: {
    color: '#FFFFFF',
  },
  inlineTimeContainer: {
    alignSelf: 'flex-end',
    marginTop: 2,
    marginLeft: 4,
  },
  inlineTimeContainerAI: {
    alignSelf: 'flex-start',
    marginTop: 2,
    marginRight: 4,
  },
  footerTimeContainer: {
    // Uzun mesajlarda saat bilgisi alt satırda (user mesajları için)
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
    paddingRight: 4,
  },
  footerTimeContainerAI: {
    // Uzun mesajlarda saat bilgisi alt satırda (AI mesajları için)
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: 4,
    paddingLeft: 4,
  },
  messageTime: {
    fontSize: 10,
    opacity: 0.8,
    lineHeight: 14,
  },
  userMessageTime: {
    color: '#FFFFFF',
    textAlign: 'right',
  },
  aiMessageTime: {
    color: '#FFFFFF',
    textAlign: 'left',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  userMessageFooter: {
    justifyContent: 'flex-end',
    gap: 8,
  },
  aiMessageFooter: {
    justifyContent: 'flex-start',
    gap: 8,
  },
  copyButton: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 32,
    minHeight: 32,
  },
  copyButtonIcon: {
    width: 16,
    height: 16,
    tintColor: '#FFFFFF',
  },
  successIconContainer: {
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successIcon: {
    fontSize: 14,
    color: '#00DDA5',
    fontWeight: 'bold',
  },
  // Seçim modu stilleri
  fullScreenBlurOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 5,
    elevation: 5, // Android için
  },
  selectedMessageContainer: {
    position: 'relative',
    zIndex: 15,
    elevation: 15, // Android için
  },
  messageBlurOverlay: {
    position: 'absolute',
    top: -6,
    left: -10,
    right: -10,
    bottom: -6,
    zIndex: 5,
    borderRadius: 20,
    overflow: 'hidden',
  },
  selectedActionsContainer: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 20,
    elevation: 20, // Android için
    position: 'relative',
  },
  selectedCopyButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#7E7AE9',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
    flex: 1,
  },
  selectedCopyButtonText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    color: '#FFFFFF',
  },
  selectedDeleteButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
    flex: 1,
  },
  selectedDeleteButtonText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    color: '#FFFFFF',
  },
  // Thinking state styles - Temaya uygun
  thinkingContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 10,
    position: 'relative',
    backgroundColor: 'transparent', // Gri renk kaldırıldı - ana balon rengi kullanılacak
    paddingHorizontal: 0, // Ana balon zaten padding'e sahip
    paddingVertical: 0,
  },
  thinkingText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    lineHeight: 24,
    color: '#FFFFFF', // Beyaz renk (gri balon üzerinde)
    opacity: 1,
    letterSpacing: 0.2,
    marginTop: 0, // Padding zaten var
  },
  // Thinking steps kaldırıldı - artık kullanılmıyor
  // thinkingStepsContainer, thinkingStepItem, thinkingStepLabel, thinkingStepContent,
  // thinkingStepsOverlay, thinkingHeader, thinkingHeaderText, thinkingDivider kaldırıldı
  // Mesaj içeriği wrapper - thinking steps ve mesaj arasında ayrım için
  messageContentWrapper: {
    width: '100%',
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    flexWrap: 'wrap',
    gap: 6,
  },
  messageSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  messageSeparatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  messageSeparatorText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginHorizontal: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  // Tamamlanmış mesaj için gri stil (sorun-çözüm formatı)
  completedMessageBubble: {
    backgroundColor: '#4A5568', // Gri-mavi ton
    opacity: 0.95,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  completedMessageContent: {
    opacity: 0.98,
  },
  // completedMarkdown kaldırıldı - StyleSheet içinde nested object desteklenmiyor
  // Markdown stilleri component içinde inline olarak tanımlanmalı
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
  // Action Menu Styles - Temaya uygun
  actionMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  actionMenuContainer: {
    width: '100%',
    maxWidth: width - 40,
    gap: 12,
  },
  actionMenuContent: {
    backgroundColor: '#1A1A2E',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  actionMenuTitle: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    textAlign: 'center',
  },
  actionMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'transparent',
  },
  actionMenuItemDanger: {
    // Silme butonu için özel stil
  },
  actionMenuIcon: {
    fontSize: 20,
    marginRight: 12,
    width: 24,
    textAlign: 'center',
  },
  actionMenuText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    color: '#FFFFFF',
    flex: 1,
  },
  actionMenuTextDanger: {
    color: '#FF6B6B',
  },
  actionMenuDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 20,
  },
  actionMenuCancel: {
    backgroundColor: '#1A1A2E',
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  actionMenuCancelText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    color: '#FFFFFF',
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

