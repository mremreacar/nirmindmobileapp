import { Platform } from 'react-native';
import { screenWidth, screenHeight, isSmallScreen, isLargeScreen, isTablet, isAndroid, isIOS } from './deviceConfig';

// Responsive calculation functions
export const getResponsivePadding = () => {
  if (isTablet) return 24;
  if (isSmallScreen) return isAndroid ? 16 : 12;
  return isAndroid ? 20 : 17;
};

export const getResponsiveWidth = () => {
  if (isTablet) return Math.min(screenWidth * 0.8, 600);
  return Math.min(screenWidth * 0.95, 400);
};

export const getResponsiveGap = () => {
  if (isSmallScreen) return isAndroid ? 10 : 8;
  if (isLargeScreen) return isAndroid ? 18 : 16;
  return isAndroid ? 14 : 12;
};

export const getResponsivePaddingBottom = () => {
  if (isSmallScreen) return isAndroid ? 25 : 20;
  if (isLargeScreen) return isAndroid ? 45 : 40;
  return isAndroid ? 35 : 30;
};

// Keyboard-aware responsive padding
export const getKeyboardAwarePaddingBottom = (keyboardHeight: number, isKeyboardVisible: boolean) => {
  if (!isKeyboardVisible) {
    return getResponsivePaddingBottom();
  }
  
  // Keyboard açıkken daha az padding kullan
  const basePadding = getResponsivePaddingBottom();
  const keyboardAwarePadding = Math.max(basePadding * 0.3, 8); // Minimum 8px
  
  return keyboardAwarePadding;
};

export const getResponsiveBottomMarginTop = () => {
  if (isSmallScreen) return isAndroid ? screenHeight * 0.38 : screenHeight * 0.36;
  if (isLargeScreen) return isAndroid ? screenHeight * 0.48 : screenHeight * 0.46;
  return isAndroid ? screenHeight * 0.45 : screenHeight * 0.41;
};

export const getResponsiveHeaderPaddingTop = () => {
  return isAndroid ? 50 : 60;
};

export const getResponsiveHeaderPaddingBottom = () => {
  return isAndroid ? 15 : 20;
};

export const getResponsiveInputBorderRadius = () => {
  if (isSmallScreen) return isAndroid ? 40 : 45;
  return isAndroid ? 45 : 50;
};

export const getResponsiveInputPaddingVertical = () => {
  if (isSmallScreen) return isAndroid ? 8 : 6;
  return isAndroid ? 10 : 8;
};

export const getResponsiveInputMinHeight = () => {
  if (isSmallScreen) return isAndroid ? 46 : 44;
  return isAndroid ? 50 : 48;
};

// Mesaj container yüksekliği hesaplama - artık kullanılmıyor, flex kullanıyoruz
export const getResponsiveMessageContainerHeight = (keyboardVisible: boolean) => {
  const headerHeight = isAndroid ? 65 : 80; // Header yüksekliği
  const bottomSectionHeight = isSmallScreen ? 120 : 140; // Bottom section yüksekliği
  const keyboardHeight = keyboardVisible ? (Platform.OS === 'ios' ? 300 : 250) : 0;
  
  const availableHeight = screenHeight - headerHeight - bottomSectionHeight - keyboardHeight;
  return Math.max(availableHeight, 300); // Minimum 300px yükseklik - daha fazla mesaj görünsün
};

