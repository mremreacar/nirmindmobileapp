import React, { memo, useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, TouchableWithoutFeedback, Animated, StyleSheet, Dimensions } from 'react-native';
import { ChatMessage } from '@/src/lib/mock/types';

const { width, height } = Dimensions.get('window');

interface MessageActionMenuProps {
  visible: boolean;
  onClose: () => void;
  message: ChatMessage;
  onCopy?: () => Promise<boolean> | void;
  onDelete: () => void;
  position?: { x: number; y: number };
}

/**
 * Mesaj işlemleri menüsü
 * Kopyala ve Sil seçenekleri ile
 */
export const MessageActionMenu = memo<MessageActionMenuProps>(({
  visible,
  onClose,
  message,
  onCopy,
  onDelete,
  position
}) => {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [copyStatus, setCopyStatus] = useState<'idle' | 'success' | 'error'>('idle');

  React.useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
      // Menü açıldığında copyStatus'u sıfırla
      setCopyStatus('idle');
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, fadeAnim]);

  const handleCopy = useCallback(async () => {
    if (onCopy) {
      try {
        const result = await onCopy();
        // onCopy boolean döndürüyorsa onu kullan, yoksa başarılı kabul et
        const success = typeof result === 'boolean' ? result : true;
        setCopyStatus(success ? 'success' : 'error');
        
        // 1.5 saniye sonra menüyü kapat
        setTimeout(() => {
          onClose();
        }, 1500);
      } catch (error) {
        setCopyStatus('error');
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } else {
      onClose();
    }
  }, [onCopy, onClose]);

  const handleDelete = useCallback(() => {
    onDelete();
    onClose();
  }, [onDelete, onClose]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          {position ? (
            <Animated.View
              style={[
                styles.menuContainer,
                {
                  position: 'absolute',
                  left: position.x,
                  top: position.y,
                  opacity: fadeAnim,
                  transform: [
                    {
                      scale: fadeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.9, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleCopy}
                activeOpacity={0.6}
                disabled={copyStatus !== 'idle'}
              >
                <View style={styles.menuItemContent}>
                  {copyStatus === 'success' ? (
                    <Text style={[styles.menuItemText, styles.successText]}>✓ Kopyalandı</Text>
                  ) : copyStatus === 'error' ? (
                    <Text style={[styles.menuItemText, styles.errorText]}>✗ Hata</Text>
                  ) : (
                    <Text style={styles.menuItemText}>Kopyala</Text>
                  )}
                </View>
              </TouchableOpacity>
              
              <View style={styles.separator} />
              
              <TouchableOpacity
                style={[styles.menuItem, styles.deleteMenuItem]}
                onPress={handleDelete}
                activeOpacity={0.6}
              >
                <View style={styles.menuItemContent}>
                  <Text allowFontScaling={false} style={[styles.menuItemText, styles.deleteMenuItemText]}>Sil</Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          ) : (
            <Animated.View
              style={[
                styles.menuContainer,
                {
                  position: 'absolute',
                  bottom: 100,
                  alignSelf: 'center',
                  opacity: fadeAnim,
                  transform: [
                    {
                      translateY: fadeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleCopy}
                activeOpacity={0.6}
                disabled={copyStatus !== 'idle'}
              >
                <View style={styles.menuItemContent}>
                  {copyStatus === 'success' ? (
                    <Text style={[styles.menuItemText, styles.successText]}>✓ Kopyalandı</Text>
                  ) : copyStatus === 'error' ? (
                    <Text style={[styles.menuItemText, styles.errorText]}>✗ Hata</Text>
                  ) : (
                    <Text style={styles.menuItemText}>Kopyala</Text>
                  )}
                </View>
              </TouchableOpacity>
              
              <View style={styles.separator} />
              
              <TouchableOpacity
                style={[styles.menuItem, styles.deleteMenuItem]}
                onPress={handleDelete}
                activeOpacity={0.6}
              >
                <View style={styles.menuItemContent}>
                  <Text allowFontScaling={false} style={[styles.menuItemText, styles.deleteMenuItemText]}>Sil</Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
});

MessageActionMenu.displayName = 'MessageActionMenu';

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  menuContainer: {
    backgroundColor: '#2A2A3E', // Koyu mor ton - tema rengi
    borderRadius: 16,
    paddingVertical: 2,
    minWidth: 140,
    maxWidth: width * 0.6,
    borderWidth: 1,
    borderColor: 'rgba(126, 122, 233, 0.2)', // Açık mor border - tema rengi
    shadowColor: '#3532A8', // Koyu mor gölge
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
    overflow: 'hidden',
  },
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    minHeight: 44,
  },
  menuItemContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 15,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  deleteMenuItem: {
    // Sil butonu için özel stil
  },
  deleteMenuItemText: {
    color: '#FF6B6B',
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(126, 122, 233, 0.15)', // Açık mor separator - tema rengi
    marginVertical: 1,
    marginHorizontal: 12,
  },
  successText: {
    color: '#00DDA5',
  },
  errorText: {
    color: '#FF6B6B',
  },
});

