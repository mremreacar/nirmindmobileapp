import React, { useCallback, useEffect, useRef } from 'react';
import { TouchableOpacity, Text, StyleSheet, Animated, View, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SvgXml } from 'react-native-svg';
import { SVG_ICONS } from '../../../constants';

interface DictationButtonProps {
  isDictating: boolean;
  isProcessing?: boolean; // Yeni: deşifre durumu
  isStopping?: boolean; // CRITICAL: Durdurma animasyonu için
  hasError?: boolean; // CRITICAL: Hata durumu
  errorMessage?: string; // CRITICAL: Hata mesajı
  audioLevel?: number; // CRITICAL: Gerçek zamanlı ses seviyesi (0-1)
  duration?: number; // CRITICAL: Konuşma süresi (saniye)
  onPress: () => void;
  onRetry?: () => void; // CRITICAL: Retry butonu için
  waveAnimations: Animated.Value[];
  style?: any;
}

const DictationButton: React.FC<DictationButtonProps> = ({
  isDictating,
  isProcessing = false,
  isStopping = false, // CRITICAL: Durdurma animasyonu için
  hasError = false, // CRITICAL: Hata durumu
  errorMessage, // CRITICAL: Hata mesajı
  audioLevel = 0, // CRITICAL: Gerçek zamanlı ses seviyesi
  duration = 0, // CRITICAL: Konuşma süresi
  onPress,
  onRetry, // CRITICAL: Retry butonu için
  waveAnimations,
  style,
}) => {
  // CRITICAL: Belirgin görsel durumlar için animasyonlar
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  
  // CRITICAL: Başlatma animasyonu
  useEffect(() => {
    if (isDictating && !isStopping) {
      // Scale animasyonu: 1.0 -> 1.1 -> 1.0
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.1,
          duration: 200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1.0,
          duration: 200,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
      
      // Pulse animasyonu (sürekli)
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1.0,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      
      return () => {
        pulse.stop();
      };
    } else {
      scaleAnim.setValue(1);
      pulseAnim.setValue(1);
    }
  }, [isDictating, isStopping, scaleAnim, pulseAnim]);
  
  // CRITICAL: Durdurma animasyonu
  useEffect(() => {
    if (isStopping) {
      // Fade out animasyonu
      Animated.timing(fadeAnim, {
        toValue: 0.6,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(1);
    }
  }, [isStopping, fadeAnim]);
  
  // Buton durumları
  const isDisabled = isProcessing || isStopping;
  const buttonColors: [string, string] = hasError
    ? ['#EF4444', '#DC2626'] // CRITICAL: Hata durumunda kırmızı
    : isDictating && !isStopping
    ? ['#7E7AE9', '#7E7AE9'] // Açıkken tek renk
    : isStopping
    ? ['#9CA3AF', '#6B7280'] // CRITICAL: Durduruluyor - gri
    : isProcessing 
    ? ['#9CA3AF', '#6B7280'] 
    : ['#5B57D2', '#2F2D6C']; // Kapalıyken gradient

  const handlePress = useCallback(() => {
    console.log('🎤 [DictationButton] Dikte butonuna basıldı', {
      isDictating,
      isProcessing,
      isDisabled,
      timestamp: new Date().toISOString()
    });
    onPress();
  }, [onPress, isDictating, isProcessing, isDisabled]);

  // CRITICAL: Ses seviyesine göre buton boyutu (0.95 - 1.1 arası)
  const audioScale = audioLevel > 0 
    ? 0.95 + (audioLevel * 0.15) // 0.95 - 1.1 arası
    : 1.0;
  
  // CRITICAL: micButton stilindeki border'ı kaldır - dictationButton kendi border'ını kullanacak
  const cleanedStyle = style ? { 
    ...style, 
    borderWidth: 0, 
    borderColor: 'transparent' 
  } : undefined;
  
  return (
    <TouchableOpacity
      style={[
        cleanedStyle, // Önce dış stil (micButton) - border'ı kaldırılmış
        styles.dictationButton, // Sonra dictationButton stili - border burada
        isDisabled && styles.disabledButton,
        hasError && styles.errorButton, // CRITICAL: Hata durumu stili
      ]}
      onPress={isDisabled ? undefined : handlePress}
      disabled={isDisabled}
      accessible={true}
      accessibilityLabel={
        hasError ? "Dikte hatası - tekrar denemek için dokunun" :
        isStopping ? "Dikte durduruluyor" :
        isDictating ? "Dikteyi durdur" : 
        isProcessing ? "Deşifre ediliyor" : 
        "Dikteyi başlat"
      }
      accessibilityHint={
        hasError ? errorMessage || "Dikte başlatılamadı, tekrar denemek için dokunun" :
        isStopping ? "Dikte durduruluyor, lütfen bekleyin" :
        isDictating ? "Dikteyi durdurmak için dokunun" : 
        isProcessing ? "Ses deşifre ediliyor, lütfen bekleyin" : 
        "Sesli mesaj göndermek için dokunun"
      }
      accessibilityRole="button"
    >
      <Animated.View
        style={{
          transform: [
            { scale: Animated.multiply(scaleAnim, pulseAnim) },
            { scale: audioScale }, // CRITICAL: Ses seviyesine göre scale
          ],
          opacity: fadeAnim,
        }}
      >
        <LinearGradient
          colors={buttonColors}
          style={[
            styles.dictationButtonGradient,
            isDictating && !isStopping && styles.dictationButtonListening,
            isStopping && styles.dictationButtonStopping, // CRITICAL: Durdurma stili
            isProcessing && styles.dictationButtonProcessing,
            hasError && styles.dictationButtonError, // CRITICAL: Hata stili
          ]}
        >
        {hasError ? (
          // CRITICAL: Hata durumu - X ikonu
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>✕</Text>
          </View>
        ) : isStopping ? (
          // CRITICAL: Durduruluyor - fade out animasyonu ile wave'ler
          <Animated.View style={[styles.waveContainer, { opacity: fadeAnim }]}>
            {waveAnimations.map((anim, index) => (
              <Animated.View
                key={index}
                style={[
                  styles.wave,
                  {
                    transform: [{ scale: anim }],
                    opacity: anim.interpolate({
                      inputRange: [1, 1.8],
                      outputRange: [0.05, 0.2], // CRITICAL: Daha soluk
                    }),
                  },
                ]}
              />
            ))}
            <SvgXml xml={SVG_ICONS.mic} width={28} height={28} />
          </Animated.View>
        ) : isDictating && waveAnimations.length > 0 ? (
          <Animated.View style={styles.waveContainer}>
            {waveAnimations.map((anim, index) => (
              <Animated.View
                key={index}
                style={[
                  styles.wave,
                  {
                    transform: [{ scale: anim }],
                    opacity: anim.interpolate({
                      inputRange: [1, 1.8],
                      outputRange: [0.05, 0.4],
                    }),
                  },
                ]}
              />
            ))}
            <SvgXml xml={SVG_ICONS.mic} width={28} height={28} />
          </Animated.View>
        ) : isProcessing ? (
          <Animated.View style={styles.processingContainer}>
            <View style={styles.loadingDots}>
              <View style={[styles.dot, styles.dot1]} />
              <View style={[styles.dot, styles.dot2]} />
              <View style={[styles.dot, styles.dot3]} />
            </View>
          </Animated.View>
        ) : (
          <SvgXml xml={SVG_ICONS.mic} width={28} height={28} />
        )}
        
      </LinearGradient>
      </Animated.View>
      
      {/* CRITICAL: Gerçek zamanlı feedback - süre göstergesi (beyaz border'a kadar yayılmalı) */}
      {isDictating && !isStopping && duration > 0 && (
        <View style={styles.durationContainer}>
          <Text style={styles.durationText}>
            {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  dictationButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    // CRITICAL: Beyaz border container'da - renkler border'a kadar uzanmalı
    borderWidth: 1.8,
    borderColor: 'rgba(255, 255, 255, 0.75)',
    overflow: 'hidden', // CRITICAL: Gradient border'a kadar uzanır
    shadowColor: '#7E7AE9',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  dictationButtonGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    // CRITICAL: Border container'da olduğu için gradient tam genişlik/yükseklik
  },
  dictationButtonListening: {
    borderColor: '#7E7AE9',
    borderWidth: 2,
    shadowColor: '#7E7AE9',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
  waveContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  wave: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(126, 122, 233, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(126, 122, 233, 0.3)',
    shadowColor: '#7E7AE9',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  disabledButton: {
    opacity: 0.6,
  },
  dictationButtonProcessing: {
    borderColor: '#9CA3AF',
    borderWidth: 2,
    shadowColor: '#9CA3AF',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  dictationButtonStopping: {
    // CRITICAL: Durdurma animasyonu stili
    borderColor: '#9CA3AF',
    borderWidth: 2,
    shadowColor: '#9CA3AF',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
    opacity: 0.7,
  },
  dictationButtonError: {
    // CRITICAL: Hata durumu stili
    borderColor: '#EF4444',
    borderWidth: 2,
    shadowColor: '#EF4444',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 8,
  },
  errorButton: {
    // CRITICAL: Hata butonu stili
    borderColor: '#EF4444',
    borderWidth: 2,
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorIcon: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  durationContainer: {
    position: 'absolute',
    bottom: -20,
    left: -1.8, // CRITICAL: Beyaz border genişliği kadar dışarı çık (border'a kadar yay)
    right: -1.8, // CRITICAL: Beyaz border genişliği kadar dışarı çık (border'a kadar yay)
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#7E7AE9', // CRITICAL: Mor background - siyahlık olmasın
    borderRadius: 0, // CRITICAL: Elips şeklini kaldır - düz dikdörtgen
    overflow: 'hidden',
    minHeight: 18, // CRITICAL: Minimum yükseklik garantisi
    paddingVertical: 2, // CRITICAL: Padding ekle
  },
  durationText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
    backgroundColor: 'transparent', // CRITICAL: Container'da background var, burada transparent
    paddingHorizontal: 6,
    paddingVertical: 2,
    width: '100%', // CRITICAL: Container genişliğine kadar yay
    textAlign: 'center',
  },
  processingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 2,
  },
  dot1: {
    opacity: 0.4,
  },
  dot2: {
    opacity: 0.7,
  },
  dot3: {
    opacity: 1,
  },
});

export default DictationButton;
