import React, { memo, useCallback } from 'react';
import { Alert } from 'react-native';
import { ChatMessage } from '@/src/lib/mock/types';

interface DeleteActionProps {
  message: ChatMessage;
  onDelete: (message: ChatMessage) => void;
}

/**
 * Mesaj silme işlemi
 * Long press'te native Alert gösterir
 */
export const useDeleteAction = (message: ChatMessage, onDelete: (message: ChatMessage) => void) => {
  const handleLongPress = useCallback(() => {
    Alert.alert(
      'Mesajı Sil',
      'Bu mesajı silmek istediğinize emin misiniz?',
      [
        {
          text: 'İptal',
          style: 'cancel'
        },
        {
          text: 'Sil',
          onPress: () => onDelete(message),
          style: 'destructive'
        }
      ],
      { cancelable: true }
    );
  }, [message, onDelete]);

  return handleLongPress;
};



