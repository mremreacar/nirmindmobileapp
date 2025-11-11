import { useCallback, useState } from 'react';
import { Alert, type TextInput } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { PermissionType } from '@/src/lib/permissions';
import type { ChatSelectedFile } from '@/src/types/chat';

// Conditional import for expo-document-picker (not available in Expo Go)
// Lazy loading: Module will only be loaded when needed
let DocumentPicker: any = null;
let documentPickerLoadingAttempted = false;

const loadDocumentPickerModule = (): any => {
  if (DocumentPicker !== null) {
    return DocumentPicker;
  }
  
  if (documentPickerLoadingAttempted) {
    return null;
  }
  
  documentPickerLoadingAttempted = true;
  
  try {
    const expoDocumentPickerModule = require('expo-document-picker');
    if (expoDocumentPickerModule && typeof expoDocumentPickerModule.getDocumentAsync === 'function') {
      DocumentPicker = expoDocumentPickerModule;
      console.log('✅ Expo DocumentPicker modülü başarıyla yüklendi');
      return DocumentPicker;
    }
  } catch (error: any) {
    const errorMessage = error?.message || 'Unknown error';
    if (errorMessage.includes('Cannot find native module') || errorMessage.includes('ExpoDocumentPicker')) {
      console.log('ℹ️ Expo DocumentPicker modülü mevcut değil (Development build gerekli: npx expo run:ios veya npx expo run:android)');
    } else {
      console.warn('⚠️ Expo DocumentPicker modülü yüklenemedi:', errorMessage);
    }
  }
  
  return null;
};

interface PermissionHookResult {
  isGranted: boolean;
}

interface UseChatAttachmentsOptions {
  mediaLibraryPermission: PermissionHookResult;
  documentsPermission: PermissionHookResult;
  showPermissionDialog: (type: PermissionType) => Promise<boolean>;
  onCloseUploadModal: (shouldFocusInput?: boolean) => void;
  onOpenUploadModal: () => void;
  textInputRef: React.RefObject<TextInput | null>;
  setInputText: (value: string) => void;
}

interface UseChatAttachmentsResult {
  selectedImages: string[];
  setSelectedImages: React.Dispatch<React.SetStateAction<string[]>>;
  selectedFiles: ChatSelectedFile[];
  setSelectedFiles: React.Dispatch<React.SetStateAction<ChatSelectedFile[]>>;
  isPickingImage: boolean;
  isPickingDocument: boolean;
  pickImage: () => Promise<void>;
  pickDocument: () => Promise<void>;
  handleAskAboutFile: (fileName: string, fileType: string) => Promise<void>;
  handleViewAllFiles: () => void;
  handleSelectFile: () => Promise<void>;
  removeImage: (index: number) => void;
  removeFile: (index: number) => void;
}

const SUPPORTED_FILE_EXTENSIONS = [
  'pdf', 'doc', 'docx', 'txt', 'jpg', 'jpeg', 'png', 'gif', 'mp4', 'mp3', 'wav',
  'c', 'cpp', 'cs', 'css', 'csv', 'go', 'html', 'java', 'js', 'json', 'md',
  'php', 'py', 'rb', 'rs', 'sql', 'ts', 'xml', 'yaml', 'yml'
];

const MAX_FILE_SIZE_MB = 10;

const createFileSizeMessage = (size?: number) => {
  if (!size) {
    return 'N/A';
  }
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
};

export const useChatAttachments = ({
  mediaLibraryPermission,
  documentsPermission,
  showPermissionDialog,
  onCloseUploadModal,
  onOpenUploadModal,
  textInputRef,
  setInputText,
}: UseChatAttachmentsOptions): UseChatAttachmentsResult => {
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<ChatSelectedFile[]>([]);
  const [isPickingImage, setIsPickingImage] = useState(false);
  const [isPickingDocument, setIsPickingDocument] = useState(false);

  const pickImage = useCallback(async () => {
    if (isPickingImage || isPickingDocument) {
      console.log('⚠️ Başka bir seçim işlemi devam ediyor, bekleyin...');
      return;
    }

    try {
      setIsPickingImage(true);
      console.log('📸 Resim seçimi başlatılıyor...');

      if (!mediaLibraryPermission.isGranted) {
        console.log('🔐 Galeri izni gerekli, permission isteniyor...');
        const granted = await showPermissionDialog(PermissionType.MEDIA_LIBRARY);
        if (!granted) {
          console.log('❌ Galeri izni reddedildi');
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.9,
        allowsEditing: false,
        exif: false,
        base64: false,
        presentationStyle: ImagePicker.UIImagePickerPresentationStyle.FULL_SCREEN,
      });

      if (!result.canceled && result.assets?.length) {
        const validImages = result.assets
          .map(asset => asset.uri)
          .filter((uri): uri is string => Boolean(uri))
          .filter((uri) => {
            if (uri.toLowerCase().includes('.heic') || uri.toLowerCase().includes('.heif')) {
              console.log('⚠️ HEIC dosyası filtrelendi:', uri);
              return false;
            }
            return true;
          });

        if (validImages.length > 0) {
          setSelectedImages(prev => [...prev, ...validImages]);
          console.log(`📸 ${validImages.length} resim seçildi`);

          onCloseUploadModal(true);

          if (validImages.length < result.assets.length) {
            Alert.alert(
              'Desteklenmeyen Format',
              'HEIC dosya formatı desteklenmiyor. Lütfen JPEG, PNG, GIF veya WEBP formatında resim seçin.',
              [{ text: 'Tamam', style: 'default' }]
            );
          }
        } else {
          Alert.alert(
            'Desteklenmeyen Format',
            'HEIC dosya formatı desteklenmiyor. Lütfen JPEG, PNG, GIF veya WEBP formatında resim seçin.',
            [{ text: 'Tamam', style: 'default' }]
          );
        }
      }
    } catch (error) {
      console.error('❌ Resim seçimi hatası:', error);
      Alert.alert('Hata', 'Resim seçilirken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsPickingImage(false);
    }
  }, [isPickingDocument, isPickingImage, mediaLibraryPermission.isGranted, onCloseUploadModal, showPermissionDialog]);

  const pickDocument = useCallback(async () => {
    if (isPickingDocument || isPickingImage) {
      console.log('⚠️ Başka bir seçim işlemi devam ediyor, bekleyin...');
      return;
    }

    try {
      setIsPickingDocument(true);
      console.log('📁 Dosya seçimi başlatılıyor...');

      if (!documentsPermission.isGranted) {
        console.log('🔐 Dosya izni gerekli, permission isteniyor...');
        const granted = await showPermissionDialog(PermissionType.DOCUMENTS);
        if (!granted) {
          console.log('❌ Dosya izni reddedildi');
          return;
        }
      }

      const documentPickerModule = loadDocumentPickerModule();
      if (!documentPickerModule) {
        console.warn('⚠️ Expo DocumentPicker modülü mevcut değil (Development build gerekli)');
        Alert.alert(
          'Özellik Mevcut Değil',
          'Dosya seçme özelliği için development build gereklidir. Lütfen npx expo run:ios veya npx expo run:android komutunu kullanın.',
          [{ text: 'Tamam' }]
        );
        return;
      }

      const result = await documentPickerModule.getDocumentAsync({
        type: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain',
          'image/jpeg',
          'image/png',
          'image/gif',
          'video/mp4',
          'audio/mpeg',
          'audio/wav',
        ],
        copyToCacheDirectory: true,
        multiple: true,
      });

      if (!result.canceled && result.assets?.length) {
        const supportedFiles = result.assets.filter((asset) => {
          const extension = asset.name?.split('.').pop()?.toLowerCase();
          if (!extension) {
            return false;
          }

          if (extension === 'pages') {
            console.log(`⚠️ .pages dosyası desteklenmiyor: ${asset.name}`);
            return false;
          }

          const isSupported = SUPPORTED_FILE_EXTENSIONS.includes(extension);
          if (!isSupported) {
            console.log(`⚠️ Desteklenmeyen dosya türü: ${asset.name} (${extension})`);
          }
          return isSupported;
        });

        if (supportedFiles.length > 0) {
          const maxSizeBytes = MAX_FILE_SIZE_MB * 1024 * 1024;
          const validFiles = supportedFiles.filter(asset => {
            if (asset.size && asset.size > maxSizeBytes) {
              console.log(`⚠️ Dosya çok büyük: ${asset.name} (${createFileSizeMessage(asset.size)})`);
              return false;
            }
            return true;
          });

          if (validFiles.length > 0) {
            const newFiles = validFiles.map<ChatSelectedFile>((asset) => {
              let safeUri = asset.uri;
              try {
                safeUri = decodeURIComponent(asset.uri).replace(/[^\w\s\-\.\/:]/g, '');
              } catch (error) {
                console.warn('⚠️ Dosya yolu encoding hatası, orijinal URI kullanılıyor:', error);
                safeUri = asset.uri;
              }

              return {
                name: asset.name || 'Bilinmeyen Dosya',
                uri: safeUri,
                size: asset.size,
                mimeType: asset.mimeType,
              };
            });

            setSelectedFiles(prev => [...prev, ...newFiles]);
            console.log(`📁 ${validFiles.length} dosya seçildi`);

            onCloseUploadModal(true);

            if (validFiles.length < supportedFiles.length) {
              const oversizedCount = supportedFiles.length - validFiles.length;
              Alert.alert(
                'Bazı Dosyalar Çok Büyük',
                `${oversizedCount} dosya 10MB'dan büyük olduğu için seçilmedi. Lütfen daha küçük dosyalar seçin.`,
                [{ text: 'Tamam', style: 'default' }]
              );
            }
          } else {
            Alert.alert(
              'Dosyalar Çok Büyük',
              'Seçilen dosyalar 10MB\'dan büyük. Lütfen daha küçük dosyalar seçin.',
              [{ text: 'Tamam', style: 'default' }]
            );
          }

          if (supportedFiles.length < result.assets.length) {
            const unsupportedCount = result.assets.length - supportedFiles.length;
            Alert.alert(
              'Bazı Dosyalar Desteklenmiyor',
              `${unsupportedCount} dosya desteklenmeyen türde olduğu için seçilmedi.\n\n📄 **Pages dosyaları** yakında desteklenecek!\n\nDesteklenen türler: ${SUPPORTED_FILE_EXTENSIONS.join(', ')}`,
              [{ text: 'Tamam', style: 'default' }]
            );
          }
        } else {
          Alert.alert(
            'Desteklenmeyen Dosya Türü',
            'Seçilen dosyalar desteklenmiyor. Lütfen PDF, DOC, DOCX, TXT, JPG, PNG, MP4, MP3 veya WAV dosyası seçin.',
            [{ text: 'Tamam', style: 'default' }]
          );
        }
      } else if (result.canceled) {
        console.log('📁 Dosya seçimi iptal edildi');
      } else {
        console.log('📁 Hiç dosya seçilmedi');
        Alert.alert('Dosya Seçilmedi', 'Lütfen bir dosya seçin.', [{ text: 'Tamam', style: 'default' }]);
      }
    } catch (error) {
      console.error('❌ Dosya seçimi hatası:', error);

      let errorMessage = 'Dosya seçilirken bir hata oluştu. Lütfen tekrar deneyin.';

      if (error instanceof Error) {
        if (error.message.includes('file://')) {
          errorMessage = 'Dosya yolu hatası. Lütfen farklı bir dosya seçin.';
        } else if (error.message.includes('encoding')) {
          errorMessage = 'Dosya adı encoding hatası. Lütfen dosya adını değiştirin.';
        } else if (error.message.includes('permission')) {
          errorMessage = 'Dosya erişim izni hatası. Lütfen ayarlardan izin verin.';
        }
      }

      Alert.alert('Dosya Seçimi Hatası', errorMessage, [{ text: 'Tamam', style: 'default' }]);
    } finally {
      setIsPickingDocument(false);
    }
  }, [
    documentsPermission.isGranted,
    isPickingDocument,
    isPickingImage,
    onCloseUploadModal,
    showPermissionDialog,
  ]);

  const handleAskAboutFile = useCallback(
    async (fileName: string, fileType: string) => {
      try {
        let question = '';
        const lowerType = fileType.toLowerCase();

        if (lowerType.includes('pdf')) {
          question = `Bu PDF dosyasının içeriğini analiz eder misin? (${fileName})`;
        } else if (lowerType.includes('image') || lowerType.includes('jpeg') || lowerType.includes('png')) {
          question = `Bu görseli analiz eder misin? (${fileName})`;
        } else if (lowerType.includes('text') || lowerType.includes('document')) {
          question = `Bu belgenin içeriğini özetler misin? (${fileName})`;
        } else if (lowerType.includes('excel') || lowerType.includes('spreadsheet')) {
          question = `Bu Excel dosyasındaki verileri analiz eder misin? (${fileName})`;
        } else {
          question = `Bu dosya hakkında ne söyleyebilirsin? (${fileName})`;
        }

        setInputText(question);
        onCloseUploadModal();

        setTimeout(() => {
          textInputRef.current?.focus();
        }, 300);

        console.log('📁 Dosya hakkında soru hazırlandı:', question);
      } catch (error) {
        console.error('❌ Dosya sorusu hazırlama hatası:', error);
        Alert.alert('Hata', 'Dosya sorusu hazırlanırken bir hata oluştu.');
      }
    },
    [onCloseUploadModal, setInputText, textInputRef]
  );

  const handleViewAllFiles = useCallback(() => {
    try {
      if (selectedFiles.length === 0) {
        Alert.alert('Bilgi', 'Henüz dosya seçilmedi.');
        return;
      }

      const fileList = selectedFiles
        .map((file, index) => `${index + 1}. ${file.name} (${createFileSizeMessage(file.size)})`)
        .join('\n');

      Alert.alert(
        'Seçilen Dosyalar',
        fileList,
        [
          { text: 'Tamam', style: 'default' },
          {
            text: 'Dosya Ekle',
            style: 'default',
            onPress: () => {
              onCloseUploadModal();
              setTimeout(() => {
                pickDocument();
              }, 300);
            },
          },
        ],
        { cancelable: true }
      );

      console.log('📁 Tüm dosyalar görüntülendi:', selectedFiles.length);
    } catch (error) {
      console.error('❌ Dosya listesi görüntüleme hatası:', error);
      Alert.alert('Hata', 'Dosya listesi görüntülenirken bir hata oluştu.');
    }
  }, [onCloseUploadModal, pickDocument, selectedFiles]);

  const handleSelectFile = useCallback(async () => {
    try {
      const documentPickerModule = loadDocumentPickerModule();
      if (!documentPickerModule) {
        console.warn('⚠️ Expo DocumentPicker modülü mevcut değil (Development build gerekli)');
        Alert.alert(
          'Özellik Mevcut Değil',
          'Dosya seçme özelliği için development build gereklidir. Lütfen npx expo run:ios veya npx expo run:android komutunu kullanın.',
          [{ text: 'Tamam' }]
        );
        return;
      }

      const result = await documentPickerModule.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets?.length) {
        const newFiles = result.assets.map<ChatSelectedFile>((asset) => ({
          name: asset.name || 'Bilinmeyen Dosya',
          uri: asset.uri,
          size: asset.size,
          mimeType: asset.mimeType,
        }));

        setSelectedFiles(prev => [...prev, ...newFiles]);

        const file = newFiles[0];
        const type = file.mimeType?.toLowerCase() || '';
        let question = '';

        if (type.includes('pdf')) {
          question = `Bu PDF dosyasının içeriğini analiz eder misin? (${file.name})`;
        } else if (type.includes('image') || type.includes('jpeg') || type.includes('png')) {
          question = `Bu görseli analiz eder misin? (${file.name})`;
        } else if (type.includes('text') || type.includes('document')) {
          question = `Bu belgenin içeriğini özetler misin? (${file.name})`;
        } else if (type.includes('excel') || type.includes('spreadsheet')) {
          question = `Bu Excel dosyasındaki verileri analiz eder misin? (${file.name})`;
        } else {
          question = `Bu dosya hakkında ne söyleyebilirsin? (${file.name})`;
        }

        setInputText(question);

        setTimeout(() => {
          textInputRef.current?.focus();
        }, 300);

        console.log('📁 Dosya seçildi ve soru hazırlandı:', question);
      } else {
        onOpenUploadModal();
      }
    } catch (error) {
      console.error('❌ Dosya seçimi hatası:', error);
      Alert.alert('Hata', 'Dosya seçilirken bir hata oluştu.');
      onOpenUploadModal();
    }
  }, [onOpenUploadModal, setInputText, textInputRef]);

  const removeImage = useCallback((index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  }, []);

  const removeFile = useCallback((index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  return {
    selectedImages,
    setSelectedImages,
    selectedFiles,
    setSelectedFiles,
    isPickingImage,
    isPickingDocument,
    pickImage,
    pickDocument,
    handleAskAboutFile,
    handleViewAllFiles,
    handleSelectFile,
    removeImage,
    removeFile,
  };
};


