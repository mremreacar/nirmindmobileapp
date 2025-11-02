import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useFonts } from 'expo-font';
// import { VideoView, useVideoPlayer } from 'expo-video';

const { width, height } = Dimensions.get('window');

// Responsive calculations for HeroSection
const isSmallScreen = height < 700;
const isLargeScreen = height > 800;
const isTablet = width > 600;

const getResponsiveGifSize = () => {
  if (isTablet) return Math.min(width * 0.35, height * 0.35, 280);
  if (isSmallScreen) return Math.min(width * 0.55, height * 0.3, 220);
  if (isLargeScreen) return Math.min(width * 0.6, height * 0.35, 260);
  return Math.min(width * 0.58, height * 0.32, 240);
};

const getResponsiveGifMarginTop = () => {
  if (isSmallScreen) return height * 0.02; // Ekran yüksekliğinin %2'si
  if (isLargeScreen) return height * 0.04; // Ekran yüksekliğinin %4'ü
  return height * 0.03; // Ekran yüksekliğinin %3'ü
};

const getResponsiveGifMarginBottom = () => {
  if (isSmallScreen) return height * 0.04; // Ekran yüksekliğinin %4'ü
  if (isLargeScreen) return height * 0.06; // Ekran yüksekliğinin %6'sı
  return height * 0.05; // Ekran yüksekliğinin %5'i
};

const getResponsiveTextMarginTop = () => {
  if (isSmallScreen) return height * 0.02; // Ekran yüksekliğinin %2'si
  if (isLargeScreen) return height * 0.025; // Ekran yüksekliğinin %2.5'i
  return height * 0.022; // Ekran yüksekliğinin %2.2'si
};

const getResponsiveTextMarginBottom = () => {
  if (isSmallScreen) return height * 0.02; // Ekran yüksekliğinin %2'si
  if (isLargeScreen) return height * 0.03; // Ekran yüksekliğinin %3'ü
  return height * 0.025; // Ekran yüksekliğinin %2.5'i
};

const getResponsiveFontSize = () => {
  const baseFontSize = Math.min(width * 0.06, height * 0.035);
  if (isSmallScreen) return Math.max(baseFontSize * 0.9, 20);
  if (isLargeScreen) return Math.max(baseFontSize * 1.2, 26);
  return Math.max(baseFontSize, 22);
};

const getResponsiveAssistantFontSize = () => {
  const baseFontSize = Math.min(width * 0.035, height * 0.02);
  if (isSmallScreen) return Math.max(baseFontSize * 0.9, 14);
  if (isLargeScreen) return Math.max(baseFontSize * 1.2, 18);
  return Math.max(baseFontSize, 16);
};

const HeroSection: React.FC = () => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [shouldLoadImage, setShouldLoadImage] = useState(false);
  const [useFallback, setUseFallback] = useState(false);

  let [fontsLoaded] = useFonts({
    'Poppins-Regular': require('@assets/fonts/Poppins-Regular .ttf'),
    'Poppins-Medium': require('@assets/fonts/Poppins-Medium.ttf'),
  });

  // Lazy load image after component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      setShouldLoadImage(true);
    }, 50); // Reduced delay for faster loading

    // Fallback timeout - if image doesn't load in 10 seconds, try fallback
    const fallbackTimer = setTimeout(() => {
      if (!imageLoaded && !imageError) {
        console.log('Image loading timeout, trying fallback');
        setUseFallback(true);
      }
    }, 10000);

    return () => {
      clearTimeout(timer);
      clearTimeout(fallbackTimer);
    };
  }, [imageLoaded, imageError]);

  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
    console.log('PNG image loaded successfully');
  }, []);

  const handleImageError = useCallback((error: any) => {
    console.log('PNG image loading error:', error);
    if (!useFallback) {
      console.log('Switching to fallback PNG');
      setUseFallback(true);
      setImageError(false);
    } else {
      console.log('Fallback also failed, showing error');
      setImageError(true);
    }
  }, [useFallback]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={styles.heroSection}>
      <View style={styles.gifContainer}>
        {!imageLoaded && !imageError && shouldLoadImage && (
          <ActivityIndicator 
            size="large" 
            color="#7E7AE9" 
            style={styles.loadingIndicator}
          />
        )}
        {shouldLoadImage && !imageError && !useFallback && (
          <Image
            source={require('@assets/videos/gif.png')}
            style={[
              styles.heroGif,
              { opacity: imageLoaded ? 1 : 0 }
            ]}
            resizeMode="contain"
            onLoad={handleImageLoad}
            onError={handleImageError}
            fadeDuration={200}
          />
        )}
        {useFallback && (
          <Image
            source={require('@assets/videos/gif.png')}
            style={styles.heroGif}
            resizeMode="contain"
          />
        )}
        {imageError && (
          <View style={styles.errorContainer}>
            <Text allowFontScaling={false} style={styles.errorText}>Görsel yüklenemedi</Text>
          </View>
        )}
      </View>
      
      <Text allowFontScaling={false} style={styles.greetingText}>Merhaba, Emre</Text>
      <Text allowFontScaling={false} style={styles.assistantText}>
        Ben dijital asistanınız NirMind,{'\n'}size nasıl yardımcı olabilirim?
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  heroSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: isTablet ? 60 : 40,
    marginTop: getResponsiveGifMarginTop(),
  },
  gifContainer: {
    marginBottom: getResponsiveGifMarginBottom(),
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroGif: {
    width: getResponsiveGifSize(),
    height: getResponsiveGifSize(),
    backgroundColor: 'transparent',
  },
  loadingIndicator: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 1,
  },
  errorContainer: {
    width: getResponsiveGifSize(),
    height: getResponsiveGifSize(),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    textAlign: 'center',
  },
  greetingText: {
    fontFamily: 'Poppins-Medium',
    fontSize: getResponsiveFontSize(),
    fontWeight: '500',
    lineHeight: getResponsiveFontSize() * 1.2,
    letterSpacing: 0,
    textAlign: 'center',
    color: '#FFFFFF',
    width: isTablet ? 500 : Math.min(width * 0.9, 463),
    marginTop: getResponsiveTextMarginTop(),
    marginBottom: getResponsiveTextMarginBottom(),
  },
  assistantText: {
    fontFamily: 'Poppins-Regular',
    fontSize: getResponsiveAssistantFontSize(),
    fontWeight: '400',
    lineHeight: getResponsiveAssistantFontSize() * 1.4,
    letterSpacing: 0,
    textAlign: 'center',
    color: '#FFFFFF',
    width: isTablet ? Math.min(width * 0.6, 400) : Math.min(width * 0.85, 350),
    paddingHorizontal: isSmallScreen ? 10 : 20,
    alignSelf: 'center',
  },
});

export default HeroSection;
