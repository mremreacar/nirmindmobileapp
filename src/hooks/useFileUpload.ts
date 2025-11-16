/**
 * File Upload Hook
 * 
 * @description
 * Dosya yükleme işlemleri için progress tracking ve state management hook'u.
 * Senior seviye dosya yükleme özellikleri sağlar.
 */

import { useState, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { validateFiles, FileValidationConfig, DEFAULT_VALIDATION_CONFIG } from '../utils/fileValidation';

export interface UploadProgress {
  fileId: string;
  fileName: string;
  progress: number; // 0-100
  status: 'pending' | 'uploading' | 'completed' | 'error' | 'cancelled';
  error?: string;
  startTime?: number;
  endTime?: number;
}

export interface FileUploadState {
  uploads: Map<string, UploadProgress>;
  isUploading: boolean;
  totalProgress: number;
  completedCount: number;
  errorCount: number;
}

export interface FileUploadOptions {
  validationConfig?: FileValidationConfig;
  maxConcurrentUploads?: number;
  retryAttempts?: number;
  retryDelay?: number;
  onProgress?: (progress: UploadProgress) => void;
  onComplete?: (fileId: string, result: any) => void;
  onError?: (fileId: string, error: string) => void;
  onAllComplete?: () => void;
}

const useFileUpload = (options: FileUploadOptions = {}) => {
  const {
    validationConfig = DEFAULT_VALIDATION_CONFIG,
    maxConcurrentUploads = 3,
    retryAttempts = 3,
    retryDelay = 1000,
    onProgress,
    onComplete,
    onError,
    onAllComplete
  } = options;

  const [state, setState] = useState<FileUploadState>({
    uploads: new Map(),
    isUploading: false,
    totalProgress: 0,
    completedCount: 0,
    errorCount: 0
  });

  const uploadQueue = useRef<Array<{ file: any; fileId: string }>>([]);
  const activeUploads = useRef<Map<string, AbortController>>(new Map());
  const retryCounts = useRef<Map<string, number>>(new Map());

  /**
   * Yeni dosya yükleme işlemi başlatır
   */
  const startUpload = useCallback(async (files: Array<any>) => {
    if (files.length === 0) return;

    // Dosya validasyonu
    const validation = await validateFiles(files, validationConfig);
    
    if (validation.invalidFiles.length > 0) {
      const errorMessages = validation.invalidFiles.map(({ file, error }) => 
        `${file.name}: ${error}`
      ).join('\n');
      
      Alert.alert(
        'Geçersiz Dosyalar',
        errorMessages,
        [{ text: 'Tamam' }]
      );
    }

    if (validation.warnings.length > 0) {
      const warningMessages = validation.warnings.map(({ file, warning }) => 
        `${file.name}: ${warning}`
      ).join('\n');
      
      Alert.alert(
        'Uyarılar',
        warningMessages,
        [
          { 
            text: 'İptal', 
            style: 'cancel',
            onPress: () => {} // İptal edildi
          },
          { 
            text: 'Devam Et', 
            style: 'default',
            onPress: () => processValidFiles(validation.validFiles)
          }
        ]
      );
    } else {
      processValidFiles(validation.validFiles);
    }
  }, [validationConfig]);

  /**
   * Geçerli dosyaları işleme kuyruğuna ekler
   */
  const processValidFiles = useCallback((files: Array<any>) => {
    const newUploads = new Map(state.uploads);
    
    files.forEach((file, index) => {
      const fileId = `upload_${Date.now()}_${index}`;
      
      newUploads.set(fileId, {
        fileId,
        fileName: file.name,
        progress: 0,
        status: 'pending',
        startTime: Date.now()
      });

      uploadQueue.current.push({ file, fileId });
    });

    setState(prev => ({
      ...prev,
      uploads: newUploads,
      isUploading: true
    }));

    // Kuyruktaki dosyaları işlemeye başla
    processQueue();
  }, [state.uploads]);

  /**
   * Yükleme kuyruğunu işler
   */
  const processQueue = useCallback(async () => {
    while (uploadQueue.current.length > 0 && activeUploads.current.size < maxConcurrentUploads) {
      const { file, fileId } = uploadQueue.current.shift()!;
      await uploadFile(file, fileId);
    }
  }, [maxConcurrentUploads]);

  /**
   * Tek dosya yükleme işlemi
   */
  const uploadFile = useCallback(async (file: any, fileId: string) => {
    const abortController = new AbortController();
    activeUploads.current.set(fileId, abortController);

    try {
      // Progress güncellemesi
      updateProgress(fileId, { status: 'uploading', progress: 0 });
      onProgress?.(state.uploads.get(fileId)!);

      // Simüle edilmiş yükleme işlemi (gerçek implementasyonda API call olacak)
      await simulateUpload(file, fileId, abortController.signal);

      // Başarılı yükleme
      updateProgress(fileId, { 
        status: 'completed', 
        progress: 100,
        endTime: Date.now()
      });
      
      onComplete?.(fileId, { success: true });
      checkAllComplete();

    } catch (error: any) {
      const currentRetryCount = retryCounts.current.get(fileId) || 0;
      
      if (error.name === 'AbortError') {
        updateProgress(fileId, { status: 'cancelled' });
        onError?.(fileId, 'Yükleme iptal edildi');
      } else if (currentRetryCount < retryAttempts) {
        // Retry logic
        retryCounts.current.set(fileId, currentRetryCount + 1);
        setTimeout(() => {
          uploadQueue.current.push({ file, fileId });
          processQueue();
        }, retryDelay * (currentRetryCount + 1));
        
        updateProgress(fileId, { 
          status: 'pending', 
          progress: 0 
        });
      } else {
        // Maksimum retry sayısına ulaşıldı
        updateProgress(fileId, { 
          status: 'error', 
          error: error.message || 'Yükleme başarısız'
        });
        
        onError?.(fileId, error.message || 'Yükleme başarısız');
        checkAllComplete();
      }
    } finally {
      activeUploads.current.delete(fileId);
      processQueue(); // Kuyruktaki diğer dosyaları işle
    }
  }, [retryAttempts, retryDelay, onProgress, onComplete, onError]);

  /**
   * Simüle edilmiş yükleme işlemi
   */
  const simulateUpload = async (file: any, fileId: string, signal: AbortSignal): Promise<void> => {
    return new Promise((resolve, reject) => {
      let progress = 0;
      const interval = setInterval(() => {
        if (signal.aborted) {
          clearInterval(interval);
          reject(new Error('AbortError'));
          return;
        }

        progress += Math.random() * 15;
        if (progress > 100) progress = 100;

        updateProgress(fileId, { progress });

        if (progress >= 100) {
          clearInterval(interval);
          resolve();
        }
      }, 200);

      // Rastgele hata simülasyonu (%10 şans)
      if (Math.random() < 0.1) {
        setTimeout(() => {
          clearInterval(interval);
          reject(new Error('Ağ hatası simülasyonu'));
        }, 1000);
      }
    });
  };

  /**
   * Progress güncellemesi
   */
  const updateProgress = useCallback((fileId: string, updates: Partial<UploadProgress>) => {
    setState(prev => {
      const newUploads = new Map(prev.uploads);
      const current = newUploads.get(fileId);
      
      if (current) {
        newUploads.set(fileId, { ...current, ...updates });
      }

      // Toplam progress hesaplama
      const totalProgress = Array.from(newUploads.values())
        .reduce((sum, upload) => sum + upload.progress, 0) / newUploads.size || 0;

      const completedCount = Array.from(newUploads.values())
        .filter(upload => upload.status === 'completed').length;

      const errorCount = Array.from(newUploads.values())
        .filter(upload => upload.status === 'error').length;

      return {
        ...prev,
        uploads: newUploads,
        totalProgress,
        completedCount,
        errorCount
      };
    });
  }, []);

  /**
   * Tüm yüklemelerin tamamlanıp tamamlanmadığını kontrol eder
   */
  const checkAllComplete = useCallback(() => {
    setState(prev => {
      const allUploads = Array.from(prev.uploads.values());
      const isAllComplete = allUploads.every(upload => 
        upload.status === 'completed' || upload.status === 'error' || upload.status === 'cancelled'
      );

      if (isAllComplete && prev.isUploading) {
        setTimeout(() => {
          onAllComplete?.();
        }, 100);
      }

      return {
        ...prev,
        isUploading: !isAllComplete
      };
    });
  }, [onAllComplete]);

  /**
   * Yükleme işlemini iptal eder
   */
  const cancelUpload = useCallback((fileId: string) => {
    const controller = activeUploads.current.get(fileId);
    if (controller) {
      controller.abort();
    }
    
    updateProgress(fileId, { status: 'cancelled' });
  }, [updateProgress]);

  /**
   * Tüm yüklemeleri iptal eder
   */
  const cancelAllUploads = useCallback(() => {
    activeUploads.current.forEach(controller => controller.abort());
    
    setState(prev => {
      const newUploads = new Map(prev.uploads);
      newUploads.forEach((upload, fileId) => {
        if (upload.status === 'pending' || upload.status === 'uploading') {
          newUploads.set(fileId, { ...upload, status: 'cancelled' });
        }
      });

      return {
        ...prev,
        uploads: newUploads,
        isUploading: false
      };
    });
  }, []);

  /**
   * Yükleme durumunu temizler
   */
  const clearUploads = useCallback(() => {
    setState({
      uploads: new Map(),
      isUploading: false,
      totalProgress: 0,
      completedCount: 0,
      errorCount: 0
    });
    
    uploadQueue.current = [];
    activeUploads.current.clear();
    retryCounts.current.clear();
  }, []);

  /**
   * Belirli bir yüklemeyi yeniden dener
   */
  const retryUpload = useCallback((fileId: string) => {
    const upload = state.uploads.get(fileId);
    if (upload && upload.status === 'error') {
      // Retry count'u sıfırla
      retryCounts.current.set(fileId, 0);
      
      // Dosyayı tekrar kuyruğa ekle
      uploadQueue.current.push({ 
        file: { name: upload.fileName }, // Gerçek implementasyonda dosya referansını saklamak gerekir
        fileId 
      });
      
      updateProgress(fileId, { status: 'pending', progress: 0 });
      processQueue();
    }
  }, [state.uploads, updateProgress, processQueue]);

  return {
    ...state,
    startUpload,
    cancelUpload,
    cancelAllUploads,
    clearUploads,
    retryUpload,
    uploads: Array.from(state.uploads.values()),
    getUpload: (fileId: string) => state.uploads.get(fileId),
    hasActiveUploads: activeUploads.current.size > 0,
    queueLength: uploadQueue.current.length
  };
};

export default useFileUpload;
