/**
 * Permission Constants
 * 
 * @description
 * Bu dosya, permission sistemi için kullanılan sabitleri ve konfigürasyonları içerir.
 * Senior seviyede maintainability ve scalability için optimize edilmiştir.
 * 
 * @version 1.0.0
 * @created 2024
 */

import { PermissionType, PermissionRequest } from './types';

export const PERMISSION_MESSAGES: Record<PermissionType, PermissionRequest> = {
  [PermissionType.CAMERA]: {
    type: PermissionType.CAMERA,
    title: 'Kamera İzni',
    message: 'NirMind uygulaması fotoğraf çekmek için kamera erişimi gerektirir.',
    rationale: 'Fotoğraf çekerek AI analizi yapabilmek için kamera erişimi gereklidir.'
  },
  [PermissionType.MEDIA_LIBRARY]: {
    type: PermissionType.MEDIA_LIBRARY,
    title: 'Galeri İzni',
    message: 'NirMind uygulaması fotoğraflarınıza erişmek için galeri izni gerektirir.',
    rationale: 'Galeri fotoğraflarını seçerek AI analizi yapabilmek için galeri erişimi gereklidir.'
  },
  [PermissionType.DOCUMENTS]: {
    type: PermissionType.DOCUMENTS,
    title: 'Dosya İzni',
    message: 'NirMind uygulaması dosyalarınıza erişmek için dosya izni gerektirir.',
    rationale: 'Dosyalarınızı seçerek AI analizi yapabilmek için dosya erişimi gereklidir.'
  },
  [PermissionType.STORAGE]: {
    type: PermissionType.STORAGE,
    title: 'Depolama İzni',
    message: 'NirMind uygulaması dosyalarınızı kaydetmek için depolama izni gerektirir.',
    rationale: 'Dosyalarınızı güvenli şekilde kaydetmek için depolama erişimi gereklidir.'
  },
  [PermissionType.MICROPHONE]: {
    type: PermissionType.MICROPHONE,
    title: 'Mikrofon İzni',
    message: 'NirMind uygulaması ses kaydı yapmak için mikrofon izni gerektirir.',
    rationale: 'Ses kaydı ve dikte özelliklerini kullanabilmek için mikrofon erişimi gereklidir.'
  },
  [PermissionType.LOCATION]: {
    type: PermissionType.LOCATION,
    title: 'Konum İzni',
    message: 'NirMind uygulaması konum bilgisi için izin gerektirir.',
    rationale: 'Konum tabanlı özellikler için konum erişimi gereklidir.'
  },
  [PermissionType.NOTIFICATIONS]: {
    type: PermissionType.NOTIFICATIONS,
    title: 'Bildirim İzni',
    message: 'NirMind uygulaması bildirim göndermek için izin gerektirir.',
    rationale: 'Önemli güncellemeler için bildirim erişimi gereklidir.'
  }
};

export const PERMISSION_PRIORITIES: Record<PermissionType, number> = {
  [PermissionType.MEDIA_LIBRARY]: 1,
  [PermissionType.DOCUMENTS]: 2,
  [PermissionType.CAMERA]: 3,
  [PermissionType.STORAGE]: 4,
  [PermissionType.MICROPHONE]: 5,
  [PermissionType.LOCATION]: 6,
  [PermissionType.NOTIFICATIONS]: 7
};

export const REQUIRED_PERMISSIONS: PermissionType[] = [
  PermissionType.MEDIA_LIBRARY,
  PermissionType.DOCUMENTS,
  PermissionType.STORAGE
];

export const OPTIONAL_PERMISSIONS: PermissionType[] = [
  PermissionType.CAMERA,
  PermissionType.MICROPHONE,
  PermissionType.LOCATION,
  PermissionType.NOTIFICATIONS
];

export const PERMISSION_TIMEOUTS = {
  REQUEST_TIMEOUT: 30000, // 30 saniye
  CHECK_INTERVAL: 5000,   // 5 saniye
  CACHE_DURATION: 300000  // 5 dakika
} as const;
