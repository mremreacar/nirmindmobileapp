export const CHAT_CONSTANTS = {
  // UI Constants
  INPUT_HEIGHT: 64,
  BORDER_RADIUS: 46,
  MESSAGE_BORDER_RADIUS: 20,
  ACTION_BUTTON_HEIGHT: 42,
  
  // Animation Constants
  ANIMATION_DURATION: 300,
  SPRING_TENSION: 100,
  SPRING_FRICTION: 8,
  
  // Responsive Constants
  SMALL_SCREEN_HEIGHT: 700,
  LARGE_SCREEN_HEIGHT: 800,
  TABLET_WIDTH: 600,
  
  // Padding Constants
  PADDING_SMALL: 16,
  PADDING_MEDIUM: 20,
  PADDING_LARGE: 24,
  PADDING_XLARGE: 28,
  
  // Colors
  COLORS: {
    PRIMARY: '#7E7AE9',
    SECONDARY: '#3532A8',
    BACKGROUND: '#1A1A2E',
    TEXT_PRIMARY: '#FFFFFF',
    TEXT_SECONDARY: '#9CA3AF',
    BORDER: 'rgba(255, 255, 255, 0.2)',
    OVERLAY: 'rgba(0, 0, 0, 0.5)',
  },
  
  // Message Limits
  MAX_MESSAGE_LENGTH: 1000,
  MAX_SUGGESTION_LENGTH: 30,
  
  // API Constants
  API_TIMEOUT: 30000,
  MAX_RETRIES: 3,
} as const;

export const CHAT_ERRORS = {
  NETWORK_ERROR: 'Bağlantı hatası. Lütfen internet bağlantınızı kontrol edin.',
  GENERIC_ERROR: 'Bir hata oluştu. Lütfen tekrar deneyin.',
  TIMEOUT_ERROR: 'İstek zaman aşımına uğradı. Lütfen tekrar deneyin.',
  VALIDATION_ERROR: 'Geçersiz mesaj. Lütfen tekrar deneyin.',
} as const;

export type ChatConstants = typeof CHAT_CONSTANTS;
export type ChatErrors = typeof CHAT_ERRORS;












