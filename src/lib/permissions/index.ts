/**
 * Permissions Module
 * 
 * @description
 * Bu dosya, permission sistemi için ana export dosyasıdır.
 * Senior seviyede clean architecture ve module organization için optimize edilmiştir.
 * 
 * @version 1.0.0
 * @created 2024
 */

// Types
export type {
  PermissionResult,
  PermissionRequest,
  PermissionConfig,
  PermissionState,
  PermissionService
} from './types';

export {
  PermissionType,
  PermissionStatus
} from './types';

// Constants
export {
  PERMISSION_MESSAGES,
  PERMISSION_PRIORITIES,
  REQUIRED_PERMISSIONS,
  OPTIONAL_PERMISSIONS,
  PERMISSION_TIMEOUTS
} from './constants';

// Service
export { permissionService } from './service';

// Hooks
export {
  usePermissions,
  usePermission,
  useFilePermissions,
  usePermissionDialogs
} from './hooks';
