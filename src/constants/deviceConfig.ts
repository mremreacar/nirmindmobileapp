import { Platform, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// Device detection constants
export const screenWidth = width;
export const screenHeight = height;
export const isSmallScreen = screenHeight < 700;
export const isLargeScreen = screenHeight > 800;
export const isTablet = screenWidth > 600;
export const isAndroid = Platform.OS === 'android';
export const isIOS = Platform.OS === 'ios';

// Device-specific constants
export const DEVICE_CONFIG = {
  android: {
    statusBarHeight: 24,
    navigationBarHeight: 48,
    keyboardOffset: 0,
  },
  ios: {
    statusBarHeight: 44,
    navigationBarHeight: 0,
    keyboardOffset: 0,
  }
} as const;

