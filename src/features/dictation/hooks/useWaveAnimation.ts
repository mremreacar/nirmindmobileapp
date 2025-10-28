import { useRef, useEffect } from 'react';
import { Animated, Easing } from 'react-native';
import { WaveAnimation } from '../types';

export const useWaveAnimation = (isActive: boolean): WaveAnimation => {
  const waveAnimations = useRef([
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
  ]).current;

  const startAnimations = () => {
    const createWaveAnimation = (index: number) => {
      // Gerçekçi ses dalgaları için farklı frekanslar
      const frequencies = [0.8, 1.2, 0.6, 1.4, 0.9, 1.1, 0.7, 1.3, 0.5]; // Farklı ses seviyeleri
      const frequency = frequencies[index] || 1.0;
      
      // Her wave için farklı timing (ses frekansına göre)
      const baseDelay = index * 80; // Daha hızlı başlangıç
      const duration = 600 + (index * 100); // Daha hızlı animasyon
      const scale = 0.8 + (frequency * 0.8); // Frekansa göre scale
      
      return Animated.loop(
        Animated.sequence([
          Animated.delay(baseDelay),
          Animated.timing(waveAnimations[index], {
            toValue: scale,
            duration: duration,
            easing: Easing.bezier(0.25, 0.46, 0.45, 0.94), // Daha doğal easing
            useNativeDriver: true,
          }),
          Animated.timing(waveAnimations[index], {
            toValue: 1,
            duration: duration,
            easing: Easing.bezier(0.55, 0.06, 0.68, 0.19), // Daha doğal easing
            useNativeDriver: true,
          }),
        ])
      );
    };

    const animations = waveAnimations.map((_, index) => createWaveAnimation(index));
    animations.forEach(animation => animation.start());
    
    return animations;
  };

  const stopAnimations = () => {
    waveAnimations.forEach(anim => anim.stop());
  };

  const resetAnimations = () => {
    waveAnimations.forEach(anim => anim.setValue(1));
  };

  useEffect(() => {
    if (isActive) {
      const animations = startAnimations();
      
      return () => {
        animations.forEach(animation => animation.stop());
      };
    } else {
      resetAnimations();
    }
  }, [isActive]);

  return {
    animations: waveAnimations,
    startAnimations,
    stopAnimations,
    resetAnimations,
  };
};
