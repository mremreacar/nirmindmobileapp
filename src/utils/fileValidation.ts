/**
 * File Validation Utilities
 * 
 * @description
 * Dosya türü, boyut ve güvenlik validasyonları için utility fonksiyonları.
 * Senior seviye dosya yükleme işlemleri için gerekli validasyonları sağlar.
 */

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  warning?: string;
}

export interface FileValidationConfig {
  maxSizeInMB: number;
  allowedMimeTypes: string[];
  allowedExtensions: string[];
  maxImageDimensions?: {
    width: number;
    height: number;
  };
}

// Varsayılan validasyon konfigürasyonu
export const DEFAULT_VALIDATION_CONFIG: FileValidationConfig = {
  maxSizeInMB: 50, // 50MB maksimum dosya boyutu
  allowedMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/zip',
    'application/x-rar-compressed',
    'application/json',
    'application/xml',
    'text/csv',
  ],
  allowedExtensions: [
    '.jpg', '.jpeg', '.png', '.gif', '.webp',
    '.pdf', '.txt', '.doc', '.docx', '.xls', '.xlsx', 
    '.ppt', '.pptx', '.zip', '.rar', '.json', '.xml', '.csv'
  ],
  maxImageDimensions: {
    width: 4096,
    height: 4096
  }
};

/**
 * Dosya boyutunu kontrol eder
 */
export const validateFileSize = (
  fileSize: number, 
  maxSizeInMB: number = DEFAULT_VALIDATION_CONFIG.maxSizeInMB
): FileValidationResult => {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  
  if (fileSize > maxSizeInBytes) {
    return {
      isValid: false,
      error: `Dosya boyutu çok büyük. Maksimum ${maxSizeInMB}MB olabilir.`
    };
  }

  // Büyük dosyalar için uyarı
  if (fileSize > (maxSizeInMB * 0.8 * 1024 * 1024)) {
    return {
      isValid: true,
      warning: `Dosya boyutu yüksek (${(fileSize / 1024 / 1024).toFixed(1)}MB). Yükleme uzun sürebilir.`
    };
  }

  return { isValid: true };
};

/**
 * Dosya türünü kontrol eder
 */
export const validateFileType = (
  mimeType: string | null,
  fileName: string,
  config: FileValidationConfig = DEFAULT_VALIDATION_CONFIG
): FileValidationResult => {
  // MIME type kontrolü
  if (mimeType && !config.allowedMimeTypes.includes(mimeType)) {
    return {
      isValid: false,
      error: `Desteklenmeyen dosya türü: ${mimeType}`
    };
  }

  // Dosya uzantısı kontrolü
  const fileExtension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
  if (!config.allowedExtensions.includes(fileExtension)) {
    return {
      isValid: false,
      error: `Desteklenmeyen dosya uzantısı: ${fileExtension}`
    };
  }

  return { isValid: true };
};

/**
 * Resim boyutlarını kontrol eder
 */
export const validateImageDimensions = async (
  imageUri: string,
  maxDimensions = DEFAULT_VALIDATION_CONFIG.maxImageDimensions
): Promise<FileValidationResult> => {
  if (!maxDimensions) {
    return { isValid: true };
  }

  try {
    // Resim boyutlarını almak için Image component'i kullanacağız
    return new Promise((resolve) => {
      const Image = require('react-native').Image;
      
      Image.getSize(imageUri, (width: number, height: number) => {
        if (width > maxDimensions!.width || height > maxDimensions!.height) {
          resolve({
            isValid: false,
            error: `Resim boyutu çok büyük. Maksimum ${maxDimensions!.width}x${maxDimensions!.height} piksel olabilir.`
          });
        } else {
          resolve({ isValid: true });
        }
      }, (error: any) => {
        resolve({
          isValid: true,
          warning: 'Resim boyutu kontrol edilemedi.'
        });
      });
    });
  } catch (error) {
    return {
      isValid: true,
      warning: 'Resim boyutu kontrol edilemedi.'
    };
  }
};

/**
 * Kapsamlı dosya validasyonu
 */
export const validateFile = async (
  file: {
    name: string;
    size?: number;
    mimeType?: string | null;
    uri?: string;
  },
  config: FileValidationConfig = DEFAULT_VALIDATION_CONFIG
): Promise<FileValidationResult> => {
  // Dosya boyutu kontrolü
  if (file.size) {
    const sizeValidation = validateFileSize(file.size, config.maxSizeInMB);
    if (!sizeValidation.isValid) {
      return sizeValidation;
    }
  }

  // Dosya türü kontrolü
  const typeValidation = validateFileType(file.mimeType || null, file.name, config);
  if (!typeValidation.isValid) {
    return typeValidation;
  }

  // Resim boyutu kontrolü (eğer resim ise)
  if (file.mimeType?.startsWith('image/') && file.uri) {
    const imageValidation = await validateImageDimensions(file.uri, config.maxImageDimensions);
    if (!imageValidation.isValid) {
      return imageValidation;
    }
  }

  return { isValid: true };
};

/**
 * Toplu dosya validasyonu
 */
export const validateFiles = async (
  files: Array<{
    name: string;
    size?: number;
    mimeType?: string | null;
    uri?: string;
  }>,
  config: FileValidationConfig = DEFAULT_VALIDATION_CONFIG
): Promise<{
  validFiles: typeof files;
  invalidFiles: Array<{ file: typeof files[0]; error: string }>;
  warnings: Array<{ file: typeof files[0]; warning: string }>;
}> => {
  const validFiles: typeof files = [];
  const invalidFiles: Array<{ file: typeof files[0]; error: string }> = [];
  const warnings: Array<{ file: typeof files[0]; warning: string }> = [];

  for (const file of files) {
    const validation = await validateFile(file, config);
    
    if (validation.isValid) {
      validFiles.push(file);
      if (validation.warning) {
        warnings.push({ file, warning: validation.warning });
      }
    } else {
      invalidFiles.push({ file, error: validation.error! });
    }
  }

  return { validFiles, invalidFiles, warnings };
};

/**
 * Dosya türüne göre ikon döndürür
 */
export const getFileTypeIcon = (mimeType: string | null, fileName: string): string => {
  if (!mimeType) {
    const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    switch (extension) {
      case '.pdf': return '📄';
      case '.doc':
      case '.docx': return '📝';
      case '.xls':
      case '.xlsx': return '📊';
      case '.ppt':
      case '.pptx': return '📋';
      case '.zip':
      case '.rar': return '🗜️';
      case '.txt': return '📄';
      case '.json': return '🔧';
      case '.xml': return '⚙️';
      case '.csv': return '📈';
      default: return '📁';
    }
  }

  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType.startsWith('video/')) return '🎥';
  if (mimeType.startsWith('audio/')) return '🎵';
  if (mimeType.includes('pdf')) return '📄';
  if (mimeType.includes('word')) return '📝';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '📋';
  if (mimeType.includes('zip') || mimeType.includes('rar')) return '🗜️';
  
  return '📁';
};

/**
 * Dosya boyutunu okunabilir formata çevirir
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
