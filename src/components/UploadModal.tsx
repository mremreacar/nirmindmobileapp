/**
 * UploadModal Component
 * 
 * @description
 * Bu component, fotoğraf ve dosya yükleme işlemlerini yöneten modal bir arayüzdür.
 * Kullanıcının cihazından fotoğraf seçmesine, dosya yüklemesine ve bu dosyaları
 * yönetmesine olanak tanır. Modal animasyonları ve pan gesture desteği içerir.
 * 
 * @features
 * - Fotoğraf seçme ve görüntüleme (ImagePicker)
 * - Dosya seçme ve görüntüleme (DocumentPicker)
 * - Seçilen dosyaları silme
 * - Modal animasyonları (translateY)
 * - Pan gesture desteği (sürükleyerek kapatma)
 * - Drag handle ile modal kontrolü
 * 
 * @dependencies
 * - expo-image-picker: Fotoğraf seçimi için
 * - expo-document-picker: Dosya seçimi için
 * - react-native-svg: SVG ikonlar için
 * - react-native: Animasyon ve UI bileşenleri
 * 
 * @usage
 * ```tsx
 * <UploadModal
 *   visible={showModal}
 *   translateY={translateY}
 *   panHandlers={panResponder.panHandlers}
 *   selectedImages={selectedImages}
 *   selectedFiles={selectedFiles}
 *   onPickImage={handlePickImage}
 *   onPickDocument={handlePickDocument}
 *   onRemoveImage={handleRemoveImage}
 *   onRemoveFile={handleRemoveFile}
 *   onRequestClose={handleCloseModal}
 * />
 * ```
 * 
 * 
 * @version 1.0.0
 * @created 2024
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  Image,
  Animated,
  ProgressBarAndroid,
  Platform,
  Modal,
  FlatList,
  Keyboard,
} from 'react-native';
import { SvgXml } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';
import type { ChatSelectedFile } from '@/src/types/chat';

// Conditional import for expo-media-library (not available in Expo Go)
// Lazy loading: Module will only be loaded when needed
let MediaLibrary: any = null;
let mediaLibraryLoadingAttempted = false;

const loadMediaLibraryModule = (): any => {
  if (MediaLibrary !== null) {
    return MediaLibrary;
  }
  
  if (mediaLibraryLoadingAttempted) {
    return null;
  }
  
  mediaLibraryLoadingAttempted = true;
  
  try {
    const expoMediaLibraryModule = require('expo-media-library');
    if (expoMediaLibraryModule && typeof expoMediaLibraryModule.getAssetsAsync === 'function') {
      MediaLibrary = expoMediaLibraryModule;
      console.log('✅ Expo MediaLibrary modülü başarıyla yüklendi');
      return MediaLibrary;
    }
  } catch (error: any) {
    const errorMessage = error?.message || 'Unknown error';
    if (errorMessage.includes('Cannot find native module') || errorMessage.includes('ExpoMediaLibrary')) {
      console.log('ℹ️ Expo MediaLibrary modülü mevcut değil (Development build gerekli: npx expo run:ios veya npx expo run:android)');
    } else {
      console.warn('⚠️ Expo MediaLibrary modülü yüklenemedi:', errorMessage);
    }
  }
  
  return null;
};
import { formatFileSize, getFileTypeIcon } from '../utils/fileValidation';

const { width, height } = Dimensions.get('window');

// Responsive calculations for iOS devices
const isSmallScreen = height < 700;
const isLargeScreen = height > 800;
const isTablet = width > 600;
const isIOS = Platform.OS === 'ios';
const isAndroid = Platform.OS === 'android';

// Responsive functions
const getResponsiveModalHeight = () => {
  if (isTablet) return height * 0.9;
  if (isSmallScreen) return height * 0.8;
  return height * 0.85;
};

const getResponsivePhotoSize = () => {
  if (isTablet) return 100;
  if (isSmallScreen) return 75;
  return 85;
};

const getResponsiveFileSize = () => {
  if (isTablet) return 140;
  if (isSmallScreen) return 100;
  return 120;
};

const getResponsivePadding = () => {
  if (isTablet) return 24;
  if (isSmallScreen) return 16;
  return 20;
};

const getResponsiveGap = () => {
  if (isTablet) return 16;
  if (isSmallScreen) return 8;
  return 12;
};

const cameraIcon = `<svg width="36" height="31" viewBox="0 0 36 31" fill="none" xmlns="http://www.w3.org/2000/svg">
<g clip-path="url(#clip0_30_336)">
<path d="M25.6852 3.68789C27.8164 3.83084 30.0179 3.35944 32.0374 4.18481C34.2685 5.09698 35.7195 7.29343 35.8829 9.67481C36.2295 14.7206 35.7065 20.2838 35.7683 25.3592C35.2566 28.1439 32.903 30.2445 30.0809 30.4901H5.90628C2.72165 30.1889 0.323815 27.711 0.104283 24.5139C-0.227568 19.6791 0.358985 14.4671 0.108821 9.59256C0.289212 7.02171 2.04887 4.72825 4.51875 3.96925C6.32152 3.4156 8.43005 3.84445 10.3015 3.68789C10.9907 1.901 12.1309 0.316623 14.1991 0.126589C16.125 -0.0503983 19.7618 -0.0316786 21.7041 0.122051C23.8279 0.289961 24.9744 1.85165 25.6846 3.68789H25.6852ZM14.3977 1.89476C13.5264 2.01956 12.9807 2.44274 12.5393 3.17735C12.098 3.91196 11.7866 5.3687 10.8874 5.45152C7.26545 5.78393 2.78462 4.35556 1.93769 9.50123C2.23607 14.4319 1.55138 19.8107 1.93769 24.6881C2.12148 27.0088 4.23682 28.7378 6.5178 28.7457C14.0539 28.4014 21.9798 29.191 29.4711 28.7457C31.8774 28.6028 33.6768 27.2005 34.0467 24.7709C33.7551 19.8147 34.4392 14.4041 34.0512 9.50123C33.923 7.87828 32.734 6.36028 31.2285 5.78053C29.449 5.09584 26.9961 5.6251 25.1014 5.45152C24.7282 5.41748 24.5971 5.34771 24.3782 5.04025C23.403 3.66803 23.588 2.04281 21.3569 1.86696C19.1293 1.69168 16.6514 1.98382 14.3988 1.89476H14.3977Z" fill="#16163C"/>
<path d="M11.655 22.5165C7.22526 18.0573 8.70356 10.4411 14.4727 7.98941C21.4347 5.02998 28.6101 11.4134 26.5668 18.6875C24.7458 25.1713 16.4195 27.3128 11.655 22.5165ZM17.6267 9.0502C12.173 9.32135 9.03654 15.4444 11.9716 20.0631C14.7557 24.4447 21.2997 24.4106 24.0504 20.0103C27.1153 15.1075 23.3742 8.76487 17.6267 9.05077V9.0502Z" fill="#16163C"/>
</g>
<defs>
<clipPath id="clip0_30_336">
<rect width="36.0021" height="30.49" fill="white"/>
</clipPath>
</defs>
</svg>`;

const fileIcon = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.89 22 5.99 22H18C19.1 22 20 21.1 20 20V8L14 2Z" stroke="#7E7AE9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M14 2V8H20" stroke="#7E7AE9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const uploadIcon = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M10 2L10 14M10 2L6 6M10 2L14 6" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M3 12L3 16C3 16.5523 3.44772 17 4 17L16 17C16.5523 17 17 16.5523 17 16L17 12" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;


const nireyaHubIcon = `<svg width="27" height="21" viewBox="0 0 27 21" fill="none" xmlns="http://www.w3.org/2000/svg">
<g clip-path="url(#clip0_30_344)">
<path d="M11.0442 3.72199C11.8373 3.95733 12.7241 3.66226 13.1992 2.94001C13.7776 2.06074 13.5279 0.882838 12.6411 0.308917C11.7543 -0.264609 10.5663 -0.0170042 9.98745 0.86227C9.62762 1.40929 9.58852 2.07142 9.82349 2.63189C9.03043 2.39655 8.14362 2.69162 7.6685 3.41387C7.09006 4.29314 7.33978 5.47104 8.22659 6.04496C9.1134 6.61849 10.3014 6.37088 10.8802 5.49161C11.2401 4.94459 11.2792 4.28246 11.0442 3.72199Z" fill="white"/>
<path d="M8.50864 16.2997C7.71079 16.0801 6.83036 16.3934 6.37001 17.1251C5.80952 18.0159 6.08398 19.1886 6.98235 19.7444C7.88073 20.3001 9.06354 20.028 9.62403 19.1372C9.97229 18.5831 9.99782 17.9206 9.75129 17.3644C10.5491 17.584 11.4296 17.2707 11.8899 16.539C12.4504 15.6482 12.176 14.4754 11.2776 13.9197C10.3792 13.364 9.19639 13.6361 8.6359 14.5269C8.28764 15.081 8.2621 15.7435 8.50864 16.2997Z" fill="white"/>
<path d="M3.80372 12.1204C3.65692 11.3123 2.99071 10.6616 2.12585 10.5679C1.07309 10.454 0.126438 11.2075 0.0115476 12.2513C-0.103343 13.2951 0.656608 14.2337 1.70937 14.3476C2.364 14.4184 2.97715 14.1538 3.37528 13.6926C3.52208 14.5007 4.18829 15.1514 5.05315 15.2451C6.10592 15.359 7.05256 14.6055 7.16745 13.5617C7.28234 12.5179 6.52239 11.5793 5.46963 11.4654C4.815 11.3946 4.20185 11.6592 3.80372 12.1204Z" fill="white"/>
<path d="M4.92909 5.88236C5.52508 5.31279 5.70101 4.40187 5.29929 3.63691C4.81021 2.70542 3.65253 2.34351 2.71306 2.82843C1.7736 3.31336 1.40858 4.4612 1.89766 5.39269C2.20164 5.97175 2.76453 6.3305 3.37249 6.40249C2.77649 6.97206 2.60057 7.88297 3.00228 8.64794C3.49137 9.57942 4.64904 9.94134 5.58851 9.45641C6.52798 8.97149 6.89299 7.82364 6.40391 6.89216C6.09993 6.3131 5.53705 5.95435 4.92909 5.88236Z" fill="white"/>
<path d="M25.0656 6.95196C24.9049 6.95196 24.7493 6.97372 24.5997 7.0105L24.6025 7.0018C20.0368 8.48347 16.3384 6.29933 15.3135 5.59607C15.2285 5.5225 15.1372 5.45644 15.0403 5.3983C15.0339 5.39316 15.0299 5.39039 15.0299 5.39039C15.0299 5.39039 15.0299 5.39079 15.0295 5.39197C14.7399 5.22071 14.4028 5.12024 14.041 5.12024C12.9726 5.12024 12.1066 5.97895 12.1066 7.03819C12.1066 8.09743 12.9726 8.95614 14.041 8.95614C14.1499 8.95614 14.256 8.94506 14.3601 8.92805C14.3601 8.92845 14.3601 8.92964 14.3601 8.92964C14.3657 8.92845 14.3713 8.92726 14.3768 8.92568C14.4606 8.91105 14.5428 8.89285 14.6226 8.86793C20.3388 7.57532 23.6363 10.1629 23.6363 10.1629L23.6371 10.1601C23.9909 10.545 24.4992 10.7883 25.0656 10.7883C26.1339 10.7883 26.9996 9.92955 26.9996 8.87031C26.9996 7.81106 26.1335 6.95236 25.0656 6.95236V6.95196Z" fill="white"/>
</g>
<defs>
<clipPath id="clip0_30_344">
<rect width="27" height="20.0323" fill="white"/>
</clipPath>
</defs>
</svg>`;

const progressIcon = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18Z" stroke="#7E7AE9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M10 6V10L13 13" stroke="#7E7AE9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

/**
 * UploadModal Props Interface
 * 
 * @interface UploadModalProps
 * @description UploadModal component'inin props tanımları
 */
interface UploadModalProps {
  /** Modal'ın görünürlük durumu */
  visible: boolean;
  /** Modal'ın Y eksenindeki animasyon değeri */
  translateY: Animated.Value;
  /** Pan gesture handler'ları (sürükleme için) */
  panHandlers: any;
  /** Seçilen resimlerin URI listesi */
  selectedImages: string[];
  /** Seçilen dosyaların listesi */
  selectedFiles: ChatSelectedFile[];
  /** Fotoğraf seçme callback fonksiyonu */
  onPickImage: () => void;
  /** Son fotoğraflardan seçim callback fonksiyonu */
  onSelectRecentPhoto?: (photoUri: string) => void;
  /** Dosya seçme callback fonksiyonu */
  onPickDocument: () => void;
  /** Resim silme callback fonksiyonu (index parametresi ile) */
  onRemoveImage: (index: number) => void;
  /** Dosya silme callback fonksiyonu (index parametresi ile) */
  onRemoveFile: (index: number) => void;
  /** Modal kapatma callback fonksiyonu */
  onRequestClose: () => void;
  /** Dosya yükleme sonrası soru sorma callback fonksiyonu */
  onAskAboutFile?: (fileName: string, fileType: string) => void;
  /** Tüm dosyaları görüntüleme callback fonksiyonu */
  onViewAllFiles?: () => void;
  /** Yükleme progress bilgileri */
  uploadProgress?: Array<{
    fileId: string;
    fileName: string;
    progress: number;
    status: 'pending' | 'uploading' | 'completed' | 'error' | 'cancelled';
    error?: string;
  }>;
  /** Yükleme durumu */
  isUploading?: boolean;
  /** Toplam progress */
  totalProgress?: number;
}

/**
 * UploadModal Component
 * 
 * @component
 * @param {UploadModalProps} props - Component props
 * @returns {JSX.Element | null} Modal component veya null (visible=false ise)
 * 
 * @example
 * ```tsx
 * const [showModal, setShowModal] = useState(false);
 * const translateY = useRef(new Animated.Value(height)).current;
 * 
 * const handlePickImage = () => {
 *   // Fotoğraf seçme logic'i
 * };
 * 
 * return (
 *   <UploadModal
 *     visible={showModal}
 *     translateY={translateY}
 *     panHandlers={panResponder.panHandlers}
 *     selectedImages={selectedImages}
 *     selectedFiles={selectedFiles}
 *     onPickImage={handlePickImage}
 *     onPickDocument={handlePickDocument}
 *     onRemoveImage={handleRemoveImage}
 *     onRemoveFile={handleRemoveFile}
 *     onRequestClose={() => setShowModal(false)}
 *   />
 * );
 * ```
 */
const UploadModal: React.FC<UploadModalProps> = ({
  visible,
  translateY,
  panHandlers,
  selectedImages,
  selectedFiles,
  onPickImage,
  onSelectRecentPhoto,
  onPickDocument,
  onRemoveImage,
  onRemoveFile,
  onRequestClose,
  onAskAboutFile,
  onViewAllFiles,
  uploadProgress = [],
  isUploading = false,
  totalProgress = 0,
}) => {
  // Fotoğraf büyütme modalı state'i
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  
  // Loading state'leri - çakışma önleme
  const [isPickingImage, setIsPickingImage] = useState(false);
  const [isPickingDocument, setIsPickingDocument] = useState(false);
  
  // Son 10 fotoğraf state'i
  const [recentPhotos, setRecentPhotos] = useState<any[]>([]);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(false);

  // Son 10 fotoğrafı yükle
  const loadRecentPhotos = async () => {
    const mediaLibraryModule = loadMediaLibraryModule();
    if (!mediaLibraryModule) {
      console.log('ℹ️ MediaLibrary modülü mevcut değil, son fotoğraflar yüklenemiyor');
      setIsLoadingPhotos(false);
      return;
    }

    try {
      console.log('🔄 Son fotoğraflar yükleniyor...');
      setIsLoadingPhotos(true);
      
      // İzin kontrolü ve isteme
      const { status } = await mediaLibraryModule.requestPermissionsAsync();
      console.log('📱 Medya kütüphanesi izni:', status);
      
      if (status === 'granted') {
        console.log('✅ Medya kütüphanesi izni verildi, fotoğraflar yükleniyor...');
        
        // Tüm fotoğrafları al
        const assets = await mediaLibraryModule.getAssetsAsync({
          first: 20,
          mediaType: 'photo',
          sortBy: 'creationTime',
        });
        
        if (__DEV__) {
          console.log('📸 Toplam fotoğraf sayısı:', assets.assets.length);
        }
        
        // Her fotoğraf için gerçek URI'yı al
        const photosWithRealUri = await Promise.all(
          assets.assets.slice(0, 10).map(async (asset: any) => {
            try {
              const assetInfo = await mediaLibraryModule.getAssetInfoAsync(asset);
              const isHEIC = asset.filename?.toLowerCase().includes('heic') || asset.filename?.toLowerCase().includes('heif');

              // React Native otomatik olarak HEIC'leri destekler
              // Sadece gerçek URI'yı kullan, dönüştürme yapmıyoruz
              const finalUri = assetInfo.localUri || assetInfo.uri || asset.uri;

              return {
                ...asset,
                uri: finalUri
              };
            } catch (error) {
              console.log('❌ Asset info alınamadı:', error);
              return asset;
            }
          })
        );
        
        if (__DEV__) {
          console.log('📸 Son fotoğraflar yüklendi:', photosWithRealUri.length);
        }
        setRecentPhotos(photosWithRealUri);
      } else {
        console.log('❌ Medya kütüphanesi izni verilmedi:', status);
        setRecentPhotos([]);
      }
    } catch (error) {
      console.error('❌ Son fotoğraflar yüklenirken hata:', error);
      setRecentPhotos([]);
    } finally {
      setIsLoadingPhotos(false);
    }
  };

  // HEIC formatını JPEG'e dönüştürme fonksiyonu
  const convertHEICToJPEG = async (uri: string): Promise<string> => {
    try {
      // Eğer HEIC formatı ise, ImagePicker ile yeniden işle
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.9,
        exif: false, // HEIC'i JPEG'e çevir
        base64: false,
        presentationStyle: ImagePicker.UIImagePickerPresentationStyle.FULL_SCREEN
      });

      if (!result.canceled && result.assets?.[0]) {
        return result.assets[0].uri;
      }
      return uri; // Dönüştürme başarısız olursa orijinal URI'yı döndür
    } catch (error) {
      console.log('❌ HEIC dönüştürme hatası:', error);
      return uri; // Hata durumunda orijinal URI'yı döndür
    }
  };

  // Modal açıldığında son fotoğrafları yükle ve klavyeyi kapat
  useEffect(() => {
    if (visible) {
      // Klavyeyi kapat
      Keyboard.dismiss();
      loadRecentPhotos();
    }
  }, [visible]);

  // Modal görünür değilse hiçbir şey render etme
  if (!visible) {
    return null;
  }

  // Fotoğraf büyütme fonksiyonu
  const openImageModal = (index: number) => {
    setSelectedImageIndex(index);
    setShowImageModal(true);
  };

  // Fotoğraf büyütme modalını kapatma
  const closeImageModal = () => {
    setShowImageModal(false);
  };

  // Fotoğraf büyütme modalında silme işlemi
  const deleteImageFromModal = (index: number) => {
    onRemoveImage(index);
    // Eğer son fotoğraf silindiyse modalı kapat
    if (selectedImages.length === 1) {
      setShowImageModal(false);
    } else if (index === selectedImages.length - 1) {
      // Eğer son fotoğraf silindiyse bir öncekine git
      setSelectedImageIndex(Math.max(0, index - 1));
    }
  };

  return (
    <TouchableOpacity 
      style={styles.modalOverlay}
      activeOpacity={1}
      onPress={onRequestClose}
    >
      {/* 
        Modal içeriği - Animated.View ile translateY animasyonu uygulanır
        Pan gesture handler'ları sürükleme özelliği için eklenir
      */}
      <TouchableOpacity 
        activeOpacity={1}
        onPress={(e) => e.stopPropagation()}
      >
        <Animated.View 
          style={[styles.modalContent, { transform: [{ translateY }] }]}
          {...panHandlers}
        >
        <ScrollView style={styles.modalBody}>
          {/* 
            Drag Handle - Modal'ı sürüklemek için görsel ipucu
            Kullanıcı bu alanı kullanarak modal'ı aşağı çekebilir
          */}
          <View style={styles.dragHandle} />
          
          {/* 
            FOTOĞRAFLAR BÖLÜMÜ
            - Solda kamera iconu, sağda son fotoğraflar slider
            - Seçilen fotoğrafları gösterir
            - Expo ImagePicker ve MediaLibrary kullanılır
          */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Fotoğraflar</Text>
            </View>
            
            <View style={styles.photosContainer}>
              {/* Kamera butonu ve yazısı */}
              <View style={styles.cameraSection}>
                <TouchableOpacity style={styles.cameraButton} onPress={onPickImage}>
                  <SvgXml 
                    xml={cameraIcon}
                    width="36"
                    height="30"
                  />
                </TouchableOpacity>
                <Text style={styles.cameraButtonText}>Kamera</Text>
              </View>
              
              {/* Son fotoğraflar slider */}
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.recentPhotosSlider}
                contentContainerStyle={styles.recentPhotosSliderContent}
              >
                {isLoadingPhotos ? (
                  <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>Yükleniyor...</Text>
                  </View>
                ) : recentPhotos.length === 0 ? (
                  <View style={styles.noPhotosContainer}>
                    <Text style={styles.noPhotosText}>Fotoğraf bulunamadı</Text>
                  </View>
                ) : (
                  recentPhotos.map((photo, index) => {
                    // HEIC formatı için özel URI oluştur
                    const isHEIC = photo.filename?.toLowerCase().includes('heic') || photo.filename?.toLowerCase().includes('heif');
                    // HEIC formatı için doğrudan URI kullan, React Native otomatik dönüştürür
                    const imageUri = photo.uri;
                    
                    return (
                      <TouchableOpacity
                        key={photo.id}
                        style={styles.recentPhotoItem}
                        onPress={async () => {
                          // Fotoğrafı seçilen fotoğraflara ekle
                          if (selectedImages.length < 10) {
                            console.log('📸 Son fotoğraflardan seçildi:', photo.uri, 'Format:', photo.filename);
                            
                            // HEIC formatı ise JPEG'e dönüştür
                            if (isHEIC) {
                              console.log('🔄 HEIC dönüştürülüyor...');
                              try {
                                const convertedUri = await convertHEICToJPEG(photo.uri);
                                console.log('✅ HEIC JPEG\'e dönüştürüldü:', convertedUri);
                                // Dönüştürülen URI ile parent component'e callback gönder
                                onSelectRecentPhoto?.(convertedUri);
                              } catch (error) {
                                console.log('❌ HEIC dönüştürme hatası:', error);
                                // Hata durumunda normal callback gönder
                                onSelectRecentPhoto?.(photo.uri);
                              }
                            } else {
                              // Normal fotoğraf için direkt callback gönder
                              onSelectRecentPhoto?.(photo.uri);
                            }
                          }
                        }}
                      >
                        <Image 
                          source={{ uri: imageUri }} 
                          style={styles.recentPhoto}
                          onLoad={() => {
                            console.log('✅ Fotoğraf yüklendi:', imageUri);
                          }}
                          onError={(error) => {
                            console.log('❌ Fotoğraf yükleme hatası:', error.nativeEvent.error, 'URI:', imageUri);
                          }}
                        />
                        {selectedImages.includes(photo.uri) && (
                          <View style={styles.selectedIndicator}>
                            <Text style={styles.selectedIndicatorText}>✓</Text>
                          </View>
                        )}
                        {/* HEIC formatı göstergesi */}
                        {isHEIC && (
                          <View style={styles.formatIndicator}>
                            <Text style={styles.formatIndicatorText}>HEIC</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>
            </View>
            
          </View>


          {/* 
            AKSIYON BUTONLARI BÖLÜMÜ
            - Nireya HUB: Özel hub özelliğine yönlendirme (şu anda placeholder)
            - Dosya Yükle: DocumentPicker'ı tetikler ve dosya seçimini başlatır
            - Sadece Dosyaları Gönder: Seçilen dosyaları mesaj olmadan gönderir
            - Her buton SVG ikon ve metin içerir
            - onPickDocument callback'i ile dosya seçimi gerçekleştirilir
          */}
          <View style={styles.actionSection}>
            {/* Nireya HUB Butonu - özel hub özelliği */}
            <TouchableOpacity style={styles.actionItem}>
              <View style={styles.actionIcon}>
                <SvgXml 
                  xml={nireyaHubIcon}
                  width="24"
                  height="18"
                />
              </View>
              <Text style={styles.actionText}>Nireya HUB</Text>
            </TouchableOpacity>
            
            {/* Dosya Yükle Butonu - DocumentPicker'ı tetikler */}
            <TouchableOpacity style={styles.actionItem} onPress={onPickDocument}>
              <View style={styles.uploadIconContainer}>
                <SvgXml 
                  xml={uploadIcon}
                  width="18"
                  height="16"
                />
              </View>
              <Text style={styles.actionText}>Dosya Yükle</Text>
            </TouchableOpacity>

          </View>
        </ScrollView>
        </Animated.View>
      </TouchableOpacity>

      {/* Fotoğraf Büyütme Modalı */}
      <Modal
        visible={showImageModal}
        transparent={true}
        animationType="fade"
        onRequestClose={closeImageModal}
      >
        <View style={styles.imageModalOverlay}>
          {/* Kapatma Butonu */}
          <TouchableOpacity 
            style={styles.imageModalCloseButton}
            onPress={closeImageModal}
          >
            <Text style={styles.imageModalCloseText}>✕</Text>
          </TouchableOpacity>
          
          {/* Silme Butonu */}
          <TouchableOpacity 
            style={styles.imageModalDeleteButton}
            onPress={() => deleteImageFromModal(selectedImageIndex)}
          >
            <Text style={styles.imageModalDeleteText}>🗑️</Text>
          </TouchableOpacity>
          
          <FlatList
            data={selectedImages}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={selectedImageIndex}
            onMomentumScrollEnd={(event) => {
              const index = Math.round(event.nativeEvent.contentOffset.x / width);
              setSelectedImageIndex(index);
            }}
            getItemLayout={(data, index) => ({
              length: width,
              offset: width * index,
              index,
            })}
            renderItem={({ item, index }) => (
              <View style={styles.imageModalContainer}>
                <Image 
                  source={{ uri: item }} 
                  style={styles.imageModalPhoto}
                  resizeMode="contain"
                />
                <View style={styles.imageModalInfo}>
                  <Text style={styles.imageModalInfoText}>
                    Fotoğraf {index + 1} / {selectedImages.length}
                  </Text>
                </View>
              </View>
            )}
            keyExtractor={(item, index) => index.toString()}
          />
        </View>
      </Modal>
    </TouchableOpacity>
  );
};

/**
 * StyleSheet Tanımları
 * 
 * @description UploadModal component'inin görsel stillerini tanımlar
 * Tüm UI bileşenlerinin renk, boyut, pozisyon ve animasyon özelliklerini içerir
 */
const styles = StyleSheet.create({
  // Modal overlay - arka plan görünümü
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#16163C',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    maxHeight: getResponsiveModalHeight(),
    paddingTop: isIOS ? 20 : 10,
    paddingBottom: isIOS ? 50 : 40,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -5,
    },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 20,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#7E7AE9',
    borderRadius: 100,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 20,
    paddingVertical: 8,
    paddingHorizontal: 15,
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionContainer: {
    marginBottom: isTablet ? 40 : 30,
    paddingLeft: getResponsivePadding(),
    paddingRight: getResponsivePadding(),
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingHorizontal: 0,
  },
  sectionTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 14,
    letterSpacing: 0,
    width: 142,
    height: 21,
  },
  viewAllText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    fontWeight: '400',
    color: '#7E7AE9',
    lineHeight: 14,
    letterSpacing: 0,
    textAlign: 'right',
    width: 142,
    height: 21,
  },
  // Photo Scroll Styles
  photoScrollContainer: {
    flexDirection: 'row',
    paddingTop: isIOS ? 15 : 10,
    paddingBottom: isIOS ? 15 : 10,
  },
  photoScrollContent: {
    paddingRight: getResponsivePadding(),
    paddingTop: isIOS ? 15 : 10,
    paddingBottom: isIOS ? 15 : 10,
    gap: getResponsiveGap(),
  },
  addPhotoButton: {
    width: getResponsivePhotoSize(),
    height: getResponsivePhotoSize(),
    borderRadius: isTablet ? 20 : 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0,
    borderColor: 'transparent',
    borderStyle: 'solid',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  photoPlaceholder: {
    width: getResponsivePhotoSize(),
    height: getResponsivePhotoSize(),
    borderRadius: isTablet ? 20 : 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  photoPlaceholderText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  photoContainer: {
    position: 'relative',
  },
  selectedPhoto: {
    width: getResponsivePhotoSize(),
    height: getResponsivePhotoSize(),
    borderRadius: isTablet ? 20 : 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#7E7AE9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#16163C',
    shadowColor: '#7E7AE9',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  removePhotoText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  actionSection: {
    gap: isIOS ? 12 : 8,
    paddingBottom: isIOS ? 40 : 30,
    paddingRight: getResponsivePadding(),
    paddingLeft: getResponsivePadding(),
    marginTop: 0,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'transparent',
    borderRadius: 0,
    paddingHorizontal: 0,
    paddingVertical: 8,
    gap: 0,
    borderWidth: 0,
    borderColor: 'transparent',
    shadowColor: 'transparent',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  actionIcon: {
    width: 24,
    height: 18,
    borderRadius: 0,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0,
    borderColor: 'transparent',
    shadowColor: 'transparent',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  uploadIconContainer: {
    width: 18,
    height: 16,
    borderRadius: 0,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0,
    borderColor: 'transparent',
    shadowColor: 'transparent',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  actionText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    fontWeight: '400',
    color: '#FFFFFF',
    letterSpacing: 0,
    lineHeight: 16,
    width: 142,
    height: 21,
    marginLeft: 12,
  },
  // File Styles
  fileScrollContainer: {
    flexDirection: 'row',
    paddingTop: 10,
    paddingBottom: 10,
  },
  fileScrollContent: {
    paddingRight: 20,
    paddingTop: 10,
    paddingBottom: 10,
    gap: 12,
  },
  fileContainer: {
    position: 'relative',
    width: getResponsiveFileSize(),
    marginRight: getResponsiveGap(),
  },
  fileItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    minHeight: 80,
    justifyContent: 'center',
  },
  fileName: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 4,
  },
  fileSize: {
    fontFamily: 'Poppins-Regular',
    fontSize: 10,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  removeFileButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#7E7AE9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#16163C',
    shadowColor: '#7E7AE9',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  removeFileText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  addFileButton: {
    width: getResponsiveFileSize(),
    height: isTablet ? 100 : 80,
    borderRadius: isTablet ? 16 : 12,
    backgroundColor: 'rgba(126, 122, 233, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#7E7AE9',
    borderStyle: 'dashed',
    marginRight: getResponsiveGap(),
  },
  addFileText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
    color: '#7E7AE9',
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '500',
  },
  // Photos Container Styles
  photosContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    marginTop: 10,
  },
  cameraSection: {
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
  },
  cameraButton: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cameraButtonText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
    color: '#16163C',
    fontWeight: '500',
  },
  recentPhotosSlider: {
    flex: 1,
    height: 80,
    marginLeft: 16,
    marginTop: 0,
  },
  recentPhotosSliderContent: {
    paddingRight: 20,
    gap: 8,
    alignItems: 'flex-start',
    paddingTop: 0,
  },
  recentPhotoItem: {
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  recentPhoto: {
    width: '100%',
    height: '100%',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#7E7AE9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedIndicatorText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  loadingContainer: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
  },
  loadingText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
  },
  noPhotosContainer: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
  },
  noPhotosText: {
    color: '#9CA3AF',
    fontSize: 10,
    fontFamily: 'Poppins-Regular',
    textAlign: 'center',
  },
  selectedPhotosContainer: {
    marginTop: 0,
  },
  selectedPhotosTitle: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  selectedPhotosScroll: {
    flexDirection: 'row',
  },
  selectedPhotoContainer: {
    position: 'relative',
    marginRight: 8,
  },
  // HEIC Format Indicator
  formatIndicator: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  formatIndicatorText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontFamily: 'Poppins-Medium',
    fontWeight: '600',
  },
  // Image Modal Styles
  imageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  imageModalCloseText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  imageModalDeleteButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 107, 107, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  imageModalDeleteText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  imageModalContainer: {
    width: width,
    height: height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalPhoto: {
    width: width * 0.9,
    height: height * 0.7,
  },
  imageModalInfo: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  imageModalInfoText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
});

/**
 * UploadModal Component Export
 * 
 * @description
 * UploadModal component'i default export olarak dışa aktarılır.
 * Bu component fotoğraf ve dosya yükleme işlemlerini yöneten modal arayüzdür.
 * 
 * @exports UploadModal
 */
export default UploadModal;
