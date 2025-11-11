import React, { useCallback } from 'react';
import { TouchableOpacity, Text, StyleSheet, Animated, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SvgXml } from 'react-native-svg';
import { SVG_ICONS } from '../../../constants';

interface DictationButtonProps {
  isDictating: boolean;
  isProcessing?: boolean; // Yeni: desifre durumu
  onPress: () => void;
  waveAnimations: Animated.Value[];
  style?: any;
}

const DictationButton: React.FC<DictationButtonProps> = ({
  isDictating,
  isProcessing = false,
  onPress,
  waveAnimations,
  style,
}) => {
  // Buton durumları
  const isDisabled = isProcessing;
  const buttonColors = isDictating 
    ? ['#7E7AE9', '#7E7AE9'] // Açıkken tek renk
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

  return (
    <TouchableOpacity
      style={[
        styles.dictationButton, 
        style,
        isDisabled && styles.disabledButton
      ]}
      onPress={isDisabled ? undefined : handlePress}
      disabled={isDisabled}
      accessible={true}
      accessibilityLabel={
        isDictating ? "Dikteyi durdur" : 
        isProcessing ? "Desifre ediliyor" : 
        "Dikteyi başlat"
      }
      accessibilityHint={
        isDictating ? "Dikteyi durdurmak için dokunun" : 
        isProcessing ? "Ses desifre ediliyor, lütfen bekleyin" : 
        "Sesli mesaj göndermek için dokunun"
      }
      accessibilityRole="button"
    >
      <LinearGradient
        colors={buttonColors}
        style={[
          styles.dictationButtonGradient,
          isDictating && styles.dictationButtonListening,
          isProcessing && styles.dictationButtonProcessing
        ]}
      >
        {isDictating && waveAnimations.length > 0 ? (
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
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  dictationButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
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
