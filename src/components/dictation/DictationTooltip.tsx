import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const DICTATION_TOOLTIP_KEY = '@nirmind:dictation_tooltip_shown';

interface DictationTooltipProps {
  onDismiss: () => void;
  buttonPosition?: { x: number; y: number; width: number; height: number };
}

const DictationTooltip: React.FC<DictationTooltipProps> = ({ onDismiss, buttonPosition }) => {
  const [visible, setVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    checkAndShowTooltip();
  }, []);

  const checkAndShowTooltip = async () => {
    try {
      const hasShown = await AsyncStorage.getItem(DICTATION_TOOLTIP_KEY);
      if (!hasShown) {
        setVisible(true);
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      }
    } catch (error) {
      console.error('Tooltip kontrol hatası:', error);
    }
  };

  const handleDismiss = async () => {
    try {
      await AsyncStorage.setItem(DICTATION_TOOLTIP_KEY, 'true');
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 20,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setVisible(false);
        onDismiss();
      });
    } catch (error) {
      console.error('Tooltip kaydetme hatası:', error);
      setVisible(false);
      onDismiss();
    }
  };

  if (!visible) return null;

  // Buton pozisyonuna göre tooltip konumu
  const tooltipTop = buttonPosition 
    ? buttonPosition.y - 80 // Butonun üstünde
    : 100; // Varsayılan konum
  const tooltipLeft = buttonPosition
    ? buttonPosition.x + (buttonPosition.width / 2) - 120 // Butonun ortası
    : width / 2 - 120; // Ekranın ortası

  return (
    <Animated.View
      style={[
        styles.tooltipContainer,
        {
          top: tooltipTop,
          left: Math.max(16, Math.min(tooltipLeft, width - 256)), // Ekran sınırları içinde
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <LinearGradient
        colors={['rgba(126, 122, 233, 0.95)', 'rgba(59, 56, 189, 0.95)']}
        style={styles.tooltipGradient}
      >
        <Text style={styles.tooltipTitle}>🎤 Sesli Mesaj</Text>
        <Text style={styles.tooltipText}>
          Mikrofon butonuna basarak sesli mesaj gönderebilirsiniz. Konuşurken metin otomatik olarak yazılacak.
        </Text>
        <TouchableOpacity style={styles.dismissButton} onPress={handleDismiss}>
          <Text style={styles.dismissButtonText}>Anladım</Text>
        </TouchableOpacity>
      </LinearGradient>
      {/* Ok işareti */}
      <View style={[styles.arrow, { left: buttonPosition ? (buttonPosition.width / 2) - 8 : 120 }]} />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  tooltipContainer: {
    position: 'absolute',
    width: 240,
    zIndex: 10000,
    shadowColor: '#7E7AE9',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 12,
  },
  tooltipGradient: {
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  tooltipTitle: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  tooltipText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 13,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 12,
    opacity: 0.95,
  },
  dismissButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  dismissButtonText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  arrow: {
    position: 'absolute',
    bottom: -8,
    width: 16,
    height: 16,
    backgroundColor: 'rgba(126, 122, 233, 0.95)',
    transform: [{ rotate: '45deg' }],
  },
});

export default DictationTooltip;

