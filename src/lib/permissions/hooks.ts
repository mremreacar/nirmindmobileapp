/**
 * Permission Hooks
 * 
 * @description
 * Bu dosya, permission sistemi için kullanılan React hooks'larını içerir.
 * Senior seviyede performance, memoization ve error handling ile optimize edilmiştir.
 * 
 * @version 1.0.0
 * @created 2024
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import { PermissionType, PermissionStatus, PermissionResult, PermissionState } from './types';
import { permissionService } from './service';
import { PERMISSION_MESSAGES, REQUIRED_PERMISSIONS } from './constants';

/**
 * Permission state'ini yöneten hook
 */
export const usePermissions = () => {
  const [state, setState] = useState<PermissionState>(() => permissionService.getPermissionState());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = permissionService.subscribe((newState) => {
      setState(newState);
    });

    return unsubscribe;
  }, []);

  const checkPermission = useCallback(async (type: PermissionType): Promise<PermissionResult> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await permissionService.checkPermission(type);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Bilinmeyen hata';
      setError(errorMessage);
      console.error(`❌ Permission kontrol hatası (${type}):`, err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const requestPermission = useCallback(async (type: PermissionType): Promise<PermissionResult> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await permissionService.requestPermission(type);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Bilinmeyen hata';
      setError(errorMessage);
      console.error(`❌ Permission istek hatası (${type}):`, err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const requestMultiplePermissions = useCallback(async (types: PermissionType[]): Promise<Record<PermissionType, PermissionResult>> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const results = await permissionService.requestMultiplePermissions(types);
      return results;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Bilinmeyen hata';
      setError(errorMessage);
      console.error('❌ Çoklu permission istek hatası:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const openSettings = useCallback(async (): Promise<void> => {
    try {
      await permissionService.openSettings();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ayarlar açılamadı';
      setError(errorMessage);
      console.error('❌ Ayarlar açma hatası:', err);
      throw err;
    }
  }, []);

  const hasRequiredPermissions = useMemo(() => {
    return permissionService.hasRequiredPermissions();
  }, [state.permissions]);

  const missingPermissions = useMemo(() => {
    return permissionService.getMissingPermissions();
  }, [state.permissions]);

  const getPermissionStatus = useCallback((type: PermissionType): PermissionStatus => {
    return state.permissions[type]?.status || PermissionStatus.UNDETERMINED;
  }, [state.permissions]);

  const isPermissionGranted = useCallback((type: PermissionType): boolean => {
    return getPermissionStatus(type) === PermissionStatus.GRANTED;
  }, [getPermissionStatus]);

  const canRequestPermission = useCallback((type: PermissionType): boolean => {
    const result = state.permissions[type];
    return result?.canAskAgain ?? true;
  }, [state.permissions]);

  return {
    state,
    isLoading,
    error,
    checkPermission,
    requestPermission,
    requestMultiplePermissions,
    openSettings,
    hasRequiredPermissions,
    missingPermissions,
    getPermissionStatus,
    isPermissionGranted,
    canRequestPermission
  };
};

/**
 * Belirli bir permission için özel hook
 */
export const usePermission = (type: PermissionType) => {
  const {
    state,
    isLoading,
    error,
    checkPermission,
    requestPermission,
    getPermissionStatus,
    isPermissionGranted,
    canRequestPermission
  } = usePermissions();

  const status = useMemo(() => getPermissionStatus(type), [getPermissionStatus, type]);
  const isGranted = useMemo(() => isPermissionGranted(type), [isPermissionGranted, type]);
  const canRequest = useMemo(() => canRequestPermission(type), [canRequestPermission, type]);

  const check = useCallback(async (): Promise<PermissionResult> => {
    return await checkPermission(type);
  }, [checkPermission, type]);

  const request = useCallback(async (): Promise<PermissionResult> => {
    return await requestPermission(type);
  }, [requestPermission, type]);

  return {
    status,
    isGranted,
    canRequest,
    isLoading,
    error,
    check,
    request
  };
};

/**
 * Dosya işlemleri için özel permission hook
 */
export const useFilePermissions = () => {
  const mediaLibrary = usePermission(PermissionType.MEDIA_LIBRARY);
  const documents = usePermission(PermissionType.DOCUMENTS);
  const storage = usePermission(PermissionType.STORAGE);
  const camera = usePermission(PermissionType.CAMERA);

  const hasFilePermissions = useMemo(() => {
    return mediaLibrary.isGranted && documents.isGranted && storage.isGranted;
  }, [mediaLibrary.isGranted, documents.isGranted, storage.isGranted]);

  const hasAllPermissions = useMemo(() => {
    return hasFilePermissions && camera.isGranted;
  }, [hasFilePermissions, camera.isGranted]);

  const requestFilePermissions = useCallback(async (): Promise<boolean> => {
    try {
      const results = await Promise.allSettled([
        mediaLibrary.request(),
        documents.request(),
        storage.request()
      ]);

      const allGranted = results.every(result => 
        result.status === 'fulfilled' && result.value.status === PermissionStatus.GRANTED
      );

      return allGranted;
    } catch (error) {
      console.error('❌ Dosya permission istek hatası:', error);
      return false;
    }
  }, [mediaLibrary.request, documents.request, storage.request]);

  const requestAllPermissions = useCallback(async (): Promise<boolean> => {
    try {
      const results = await Promise.allSettled([
        mediaLibrary.request(),
        documents.request(),
        storage.request(),
        camera.request()
      ]);

      const allGranted = results.every(result => 
        result.status === 'fulfilled' && result.value.status === PermissionStatus.GRANTED
      );

      return allGranted;
    } catch (error) {
      console.error('❌ Tüm permission istek hatası:', error);
      return false;
    }
  }, [mediaLibrary.request, documents.request, storage.request, camera.request]);

  return {
    mediaLibrary,
    documents,
    storage,
    camera,
    hasFilePermissions,
    hasAllPermissions,
    requestFilePermissions,
    requestAllPermissions
  };
};

/**
 * Permission dialog'ları için hook
 */
export const usePermissionDialogs = () => {
  const { requestPermission, openSettings } = usePermissions();

  const showPermissionDialog = useCallback(async (type: PermissionType): Promise<boolean> => {
    try {
      const permissionInfo = PERMISSION_MESSAGES[type];
      
      return new Promise((resolve) => {
        Alert.alert(
          permissionInfo.title,
          permissionInfo.message,
          [
            {
              text: 'İptal',
              style: 'cancel',
              onPress: () => resolve(false)
            },
            {
              text: 'Ayarlar',
              style: 'default',
              onPress: async () => {
                try {
                  await openSettings();
                  resolve(false);
                } catch (error) {
                  console.error('❌ Ayarlar açma hatası:', error);
                  resolve(false);
                }
              }
            },
            {
              text: 'İzin Ver',
              style: 'default',
              onPress: async () => {
                try {
                  const result = await requestPermission(type);
                  resolve(result.status === PermissionStatus.GRANTED);
                } catch (error) {
                  console.error('❌ Permission istek hatası:', error);
                  resolve(false);
                }
              }
            }
          ],
          { cancelable: false }
        );
      });
    } catch (error) {
      console.error('❌ Permission dialog hatası:', error);
      return false;
    }
  }, [requestPermission, openSettings]);

  const showRequiredPermissionsDialog = useCallback(async (): Promise<boolean> => {
    try {
      return new Promise((resolve) => {
        Alert.alert(
          'Gerekli İzinler',
          'NirMind uygulaması çalışabilmek için bazı izinlere ihtiyaç duyar. Lütfen gerekli izinleri verin.',
          [
            {
              text: 'İptal',
              style: 'cancel',
              onPress: () => resolve(false)
            },
            {
              text: 'Ayarlar',
              style: 'default',
              onPress: async () => {
                try {
                  await openSettings();
                  resolve(false);
                } catch (error) {
                  console.error('❌ Ayarlar açma hatası:', error);
                  resolve(false);
                }
              }
            },
            {
              text: 'İzinleri Ver',
              style: 'default',
              onPress: async () => {
                try {
                  const results = await permissionService.requestMultiplePermissions(REQUIRED_PERMISSIONS);
                  const allGranted = Object.values(results).every(result => 
                    result.status === PermissionStatus.GRANTED
                  );
                  resolve(allGranted);
                } catch (error) {
                  console.error('❌ Gerekli permission istek hatası:', error);
                  resolve(false);
                }
              }
            }
          ],
          { cancelable: false }
        );
      });
    } catch (error) {
      console.error('❌ Gerekli permission dialog hatası:', error);
      return false;
    }
  }, [openSettings]);

  return {
    showPermissionDialog,
    showRequiredPermissionsDialog
  };
};
