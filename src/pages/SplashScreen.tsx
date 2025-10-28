import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SvgXml } from 'react-native-svg';
import { useFonts } from 'expo-font';

const { width, height } = Dimensions.get('window');

// Loading fallback component
const LoadingFallback: React.FC = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#FFFFFF" />
  </View>
);

const nirmindLogo = `<?xml version="1.0" encoding="UTF-8"?>
<svg id="Layer_2" data-name="Layer 2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1725.15 282.37">
  <g id="Layer_1-2" data-name="Layer 1">
    <g>
      <path fill="#ffffff" d="M234.58,151.05v-3.3c-18.68-6.2-38.36-7.81-53.88-21.03-9.58-8.16-16.59-20.95-20.68-32.73-2.59-7.46-4.03-20.81-6.91-26.77-.76-1.58-1.27-2.38-3.2-2.01-6.21,29.07-12.8,51.84-39.58,67.84-14.54,8.69-28.45,9.9-44.05,15.19.05,1.43-.51,2,.73,3,4.21,3.37,24.48,7.82,31.23,10.34,20.41,7.62,36.76,20.57,41.82,42.94,19.14,84.53-107.67,102.12-135.03,30.54-8.73-22.85-5.54-41.79,4.92-63.04,23.85-48.43,57.71-95.32,83.23-143.21C116.21-3.96,166.69-9.74,196.89,16.45c9.75,8.45,16.19,20.79,22.87,31.7,23.1,37.71,49.51,81.69,69.66,120.78,11.77,22.84,16.42,42,6.17,66.96-29.52,71.89-154.02,51.23-134.67-31.35,8.5-36.27,42.67-44.24,73.66-53.5Z"/>
      <g>
        <path fill="#ffffff" d="M376.25,276.99V8.13h48.78l109.85,254.27h4.61V8.13h24.58v268.86h-48.78L405.44,22.34h-4.61v254.65h-24.58Z"/>
        <path fill="#ffffff" d="M642.42,58.06c-5.64,0-10.37-1.92-14.21-5.76-3.84-3.84-5.76-8.58-5.76-14.21s1.92-10.69,5.76-14.4c3.84-3.71,8.58-5.57,14.21-5.57s10.69,1.86,14.4,5.57c3.71,3.71,5.57,8.52,5.57,14.4s-1.86,10.37-5.57,14.21c-3.72,3.84-8.52,5.76-14.4,5.76ZM630.9,276.99V90.32h23.05v186.67h-23.05Z"/>
        <path fill="#ffffff" d="M721.54,276.99V90.32h22.28v23.43h4.61c3.58-8.45,8.89-14.6,15.94-18.44,7.04-3.84,16.83-5.76,29.38-5.76h21.89v21.51h-24.58c-14.09,0-25.35,3.97-33.8,11.91-8.45,7.94-12.68,20.36-12.68,37.26v116.76h-23.05Z"/>
        <path fill="#ffffff" d="M854.81,276.99V8.13h94.1l46.47,234.29h6.91l46.48-234.29h94.1v268.86h-49.16V45.38h-6.91l-46.09,231.61h-83.73l-46.09-231.61h-6.91v231.61h-49.16Z"/>
        <path fill="#ffffff" d="M1219.31,64.2c-8.71,0-16.07-2.81-22.08-8.45-6.02-5.63-9.03-13.06-9.03-22.28s3.01-16.64,9.03-22.28c6.01-5.63,13.38-8.45,22.08-8.45s16.38,2.82,22.28,8.45c5.89,5.64,8.83,13.06,8.83,22.28s-2.95,16.65-8.83,22.28c-5.89,5.64-13.32,8.45-22.28,8.45ZM1195.11,276.99V86.48h48.4v190.51h-48.4Z"/>
        <path fill="#ffffff" d="M1297.28,276.99V86.48h47.63v24.97h6.91c3.07-6.66,8.83-12.99,17.28-19.01,8.45-6.01,21.25-9.03,38.41-9.03,14.85,0,27.85,3.4,38.98,10.18,11.14,6.79,19.78,16.13,25.93,28.04,6.15,11.91,9.22,25.8,9.22,41.67v113.69h-48.4v-109.85c0-14.34-3.52-25.09-10.56-32.26-7.05-7.17-17.09-10.75-30.15-10.75-14.85,0-26.38,4.93-34.57,14.79-8.2,9.86-12.29,23.62-12.29,41.29v96.79h-48.4Z"/>
        <path fill="#ffffff" d="M1610.69,282.37c-15.11,0-29.26-3.78-42.44-11.33-13.19-7.55-23.75-18.63-31.69-33.22-7.94-14.6-11.91-32.26-11.91-53v-6.15c0-20.74,3.97-38.41,11.91-53,7.93-14.6,18.44-25.67,31.49-33.22,13.06-7.55,27.27-11.33,42.63-11.33,11.52,0,21.19,1.34,29,4.03,7.81,2.69,14.15,6.09,19.01,10.18,4.86,4.1,8.58,8.45,11.14,13.06h6.91V8.13h48.4v268.86h-47.63v-23.05h-6.91c-4.36,7.17-11.08,13.7-20.16,19.59-9.09,5.89-22.34,8.83-39.75,8.83ZM1625.29,240.12c14.85,0,27.27-4.8,37.26-14.4,9.99-9.6,14.98-23.62,14.98-42.06v-3.84c0-18.44-4.93-32.46-14.79-42.06-9.86-9.6-22.34-14.4-37.45-14.4s-27.27,4.8-37.26,14.4c-9.99,9.6-14.98,23.62-14.98,42.06v3.84c0,18.44,4.99,32.46,14.98,42.06,9.99,9.6,22.4,14.4,37.26,14.4Z"/>
      </g>
    </g>
  </g>
</svg>`;

const SplashScreen: React.FC = () => {
  let [fontsLoaded] = useFonts({
    'Poppins-Regular': require('@src/assets/fonts/Poppins-Regular .ttf'),
    'Poppins-Medium': require('@src/assets/fonts/Poppins-Medium.ttf'),
  });

  // Memoized responsive calculations for performance
  const screenSize = useMemo(() => ({
    isSmall: height < 700,
    isMedium: height >= 700 && height < 900,
    isLarge: height >= 900
  }), [height]);

  // Memoized safe area calculations
  const safeAreaPadding = useMemo(() => {
    if (Platform.OS === 'ios') {
      return height > 800 ? 44 : 20;
    }
    return height > 700 ? 24 : 16;
  }, [height]);

  // Memoized logo size calculations
  const logoSize = useMemo(() => {
    const baseWidth = width * 0.7;
    const maxWidth = 320;
    const minWidth = 200;
    const calculatedWidth = Math.min(Math.max(baseWidth, minWidth), maxWidth);
    const aspectRatio = 289 / 48.02;
    return {
      width: calculatedWidth,
      height: calculatedWidth / aspectRatio
    };
  }, [width]);

  // Memoized footer position
  const footerTop = useMemo(() => {
    return height - 60 - safeAreaPadding;
  }, [height, safeAreaPadding]);

  // Memoized font sizes
  const fontSize = useMemo(() => ({
    small: screenSize.isSmall ? 12 : screenSize.isMedium ? 13 : 14,
    marginTop: screenSize.isSmall ? 2 : 4
  }), [screenSize]);

  if (!fontsLoaded) {
    return <LoadingFallback />;
  }

  return (
    <LinearGradient
      colors={['#16163C', '#3B38BD', '#02020A']}
      locations={[0.1346, 0.5337, 0.9397]}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      {/* Logo Container - Centered and responsive */}
      <View style={[
        styles.logoContainer,
        {
          top: height * 0.45,
          left: (width - logoSize.width) / 2,
          width: logoSize.width,
          height: logoSize.height,
        }
      ]}>
        <View style={styles.logoWithText}>
          <SvgXml 
            xml={nirmindLogo}
            width={logoSize.width}
            height={logoSize.height}
          />
        </View>
      </View>
      
      {/* Footer Container - Always at the bottom */}
      <View style={[
        styles.footerContainer,
        {
          top: footerTop,
          left: (width - 200) / 2, // Center the footer text
          width: 200,
        }
      ]}>
        <Text style={[
          styles.footerText,
          { fontSize: fontSize.small }
        ]}>
          Powered by Nireya
        </Text>
        <Text style={[
          styles.versionText,
          { 
            fontSize: fontSize.small,
            marginTop: fontSize.marginTop
          }
        ]}>
          v.3
        </Text>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: width,
    height: height,
    // Ensure proper rendering on all devices
    ...Platform.select({
      ios: {
        // iOS specific optimizations
        backgroundColor: '#16163C', // Fallback color
      },
      android: {
        // Android specific optimizations
        backgroundColor: '#16163C', // Fallback color
      },
    }),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#16163C',
  },
  logoContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    // Remove fixed positioning - now handled dynamically
  },
  logoWithText: {
    alignItems: 'center',
    justifyContent: 'center',
    // Ensure logo is properly centered
    flex: 1,
  },
  footerContainer: {
    position: 'absolute',
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
    // Remove fixed positioning - now handled dynamically
  },
  footerText: {
    fontFamily: 'Poppins-Regular',
    fontWeight: '400',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0,
    // Dynamic line height based on font size
    ...Platform.select({
      ios: {
        // iOS text rendering optimizations
        includeFontPadding: false,
      },
      android: {
        // Android text rendering optimizations
        includeFontPadding: false,
        textAlignVertical: 'center',
      },
    }),
  },
  versionText: {
    fontFamily: 'Poppins-Regular',
    fontWeight: '400',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0,
    // Dynamic line height based on font size
    ...Platform.select({
      ios: {
        // iOS text rendering optimizations
        includeFontPadding: false,
      },
      android: {
        // Android text rendering optimizations
        includeFontPadding: false,
        textAlignVertical: 'center',
      },
    }),
  },
});

export default SplashScreen;
