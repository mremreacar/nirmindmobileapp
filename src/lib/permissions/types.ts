/**
 * Permission Types
 * 
 * @description
 * Bu dosya, uygulama genelinde kullanılan permission türlerini ve interface'lerini tanımlar.
 * Senior seviyede type safety ve performans için optimize edilmiştir.
 * 
 * @version 1.0.0
 * @created 2024
 */

export enum PermissionType {
  CAMERA = 'camera',
  MEDIA_LIBRARY = 'mediaLibrary',
  DOCUMENTS = 'documents',
  STORAGE = 'storage',
  MICROPHONE = 'microphone',
  LOCATION = 'location',
  NOTIFICATIONS = 'notifications',
}

export enum PermissionStatus {
  GRANTED = 'granted',
  DENIED = 'denied',
  UNDETERMINED = 'undetermined',
  RESTRICTED = 'restricted',
}

export interface PermissionResult {
  status: PermissionStatus;
  canAskAgain: boolean;
  expires?: Date;
  reason?: string;
}

export interface PermissionRequest {
  type: PermissionType;
  title: string;
  message: string;
  rationale?: string;
}

export interface PermissionConfig {
  requests: PermissionRequest[];
  required: PermissionType[];
  optional: PermissionType[];
  onPermissionChange?: (type: PermissionType, status: PermissionStatus) => void;
}

export interface PermissionState {
  permissions: Record<PermissionType, PermissionResult>;
  isInitialized: boolean;
  lastChecked: Date;
}

export interface PermissionService {
  checkPermission(type: PermissionType): Promise<PermissionResult>;
  requestPermission(type: PermissionType): Promise<PermissionResult>;
  requestMultiplePermissions(types: PermissionType[]): Promise<Record<PermissionType, PermissionResult>>;
  openSettings(): Promise<void>;
  getPermissionState(): PermissionState;
  hasRequiredPermissions(): boolean;
  getMissingPermissions(): PermissionType[];
}
