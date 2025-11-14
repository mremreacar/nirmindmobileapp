import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Image,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useFonts } from 'expo-font';
import { useAuth } from '../contexts/AuthContext';
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
  const baseFontSize = Math.min(width * 0.05, height * 0.03); // Küçültüldü: 0.06 -> 0.05, 0.035 -> 0.03
  if (isSmallScreen) return Math.max(baseFontSize * 0.85, 18); // Küçültüldü: 0.9 -> 0.85, 20 -> 18
  if (isLargeScreen) return Math.max(baseFontSize * 1.0, 22); // Küçültüldü: 1.2 -> 1.0, 26 -> 22
  return Math.max(baseFontSize, 20); // Küçültüldü: 22 -> 20
};

const getResponsiveAssistantFontSize = () => {
  const baseFontSize = Math.min(width * 0.03, height * 0.018); // Küçültüldü: 0.035 -> 0.03, 0.02 -> 0.018
  if (isSmallScreen) return Math.max(baseFontSize * 0.85, 12); // Küçültüldü: 0.9 -> 0.85, 14 -> 12
  if (isLargeScreen) return Math.max(baseFontSize * 1.0, 15); // Küçültüldü: 1.2 -> 1.0, 18 -> 15
  return Math.max(baseFontSize, 14); // Küçültüldü: 16 -> 14
};

interface HeroSectionProps {
  animationProgress?: Animated.Value;
  isKeyboardVisible?: boolean;
}

const HeroSection: React.FC<HeroSectionProps> = ({ animationProgress, isKeyboardVisible = false }) => {
  const { user } = useAuth();
  // imageLoaded state'ini useRef ile koru - klavye açıldığında resetlenmesin
  const imageLoadedRef = useRef(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [shouldLoadImage, setShouldLoadImage] = useState(false);
  const [useFallback, setUseFallback] = useState(false);

  // Kullanıcı adını formatla
  const getUserName = () => {
    if (!user) return 'Kullanıcı';
    
    // İsim varsa kullan, yoksa "Kullanıcı"
    const firstName = user.firstName?.trim() || '';
    if (firstName) {
      // İlk harf büyük, geri kalan küçük
      return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
    }
    
    return 'Kullanıcı';
  };

  const displayName = getUserName();

  let [fontsLoaded] = useFonts({
    'Poppins-Regular': require('@assets/fonts/Poppins-Regular .ttf'),
    'Poppins-Medium': require('@assets/fonts/Poppins-Medium.ttf'),
  });

  const heroAnimatedStyle = useMemo(() => {
    // Klavye açıksa animasyon yok, direkt gizle
    if (isKeyboardVisible) {
      return { opacity: 0 };
    }
    
    if (!animationProgress) {
      return null;
    }
    return {
      opacity: animationProgress.interpolate({
        inputRange: [0, 0.35, 1],
        outputRange: [0, 0.4, 1],
        extrapolate: 'clamp',
      }),
      transform: [
        {
          translateY: animationProgress.interpolate({
            inputRange: [0, 1],
            outputRange: [24, 0],
            extrapolate: 'clamp',
          }),
        },
      ],
    };
  }, [animationProgress, isKeyboardVisible]);

  // Görseli hemen yükle - optimizasyon için mount'ta direkt başlat
  useEffect(() => {
    // Görseli hemen yüklemeye başla (delay yok)
    setShouldLoadImage(true);
  }, []);

  // Klavye kapandığında görseli anında göster (zaten yüklüyse)
  // Görsel zaten yüklüyse (`imageLoaded` true), klavye kapandığında anında görünür
  // Çünkü `shouldLoadImage` zaten true ve `imageLoaded` true ise opacity 1 olacak

  // Fallback timeout - if image doesn't load in 10 seconds, try fallback
  useEffect(() => {
    if (!shouldLoadImage) return;
    
    const fallbackTimer = setTimeout(() => {
      if (!imageLoaded && !imageError) {
        console.log('Image loading timeout, trying fallback');
        setUseFallback(true);
      }
    }, 10000);

    return () => {
      clearTimeout(fallbackTimer);
    };
  }, [shouldLoadImage, imageLoaded, imageError]);

  const handleImageLoad = useCallback(() => {
    imageLoadedRef.current = true;
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

  // Klavye açıksa HeroSection'ı tamamen gizle (animasyon yok, anında)
  if (isKeyboardVisible) {
    return null;
  }

  return (
    <Animated.View style={[styles.heroSection, heroAnimatedStyle || undefined]}>
      <View style={styles.gifContainer}>
        {/* Loading indicator sadece görsel hiç yüklenmemişse göster */}
        {!imageLoadedRef.current && !imageLoaded && !imageError && shouldLoadImage && (
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
              // Görsel zaten yüklüyse (ref'te veya state'te) anında göster
              { opacity: (imageLoadedRef.current || imageLoaded) ? 1 : 0 }
            ]}
            resizeMode="contain"
            onLoad={handleImageLoad}
            onError={handleImageError}
            fadeDuration={0}
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
      
      <Text allowFontScaling={false} style={styles.greetingText}>
        Merhaba{displayName ? `, ${displayName}` : ''}
      </Text>
      <Text allowFontScaling={false} style={styles.assistantText}>
        Ben dijital asistanınız NirMind,{"\n"}size nasıl yardımcı olabilirim?
      </Text>
    </Animated.View>
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
