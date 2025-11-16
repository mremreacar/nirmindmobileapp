/**
 * Network utility functions for checking internet connectivity
 */

import { API_BASE_URL } from '../config/api';

/**
 * Checks if the device has internet connectivity
 * @returns Promise<boolean> - true if connected, false otherwise
 */
export const checkInternetConnection = async (): Promise<boolean> => {
  try {
    // Backend API health endpoint'ini kontrol et
    // Basit bir HEAD request ile bağlantıyı test et
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 saniye timeout
    
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'HEAD',
      signal: controller.signal,
      cache: 'no-cache',
    });
    
    clearTimeout(timeoutId);
    
    // Herhangi bir response alındıysa (200-599 arası), internet bağlantısı var demektir
    return response.status >= 200 && response.status < 600;
  } catch (error: any) {
    // Network hatası veya timeout - internet bağlantısı yok
    console.log('🌐 İnternet bağlantısı kontrolü:', {
      error: error?.message || error?.name,
      isAbortError: error?.name === 'AbortError',
      isNetworkError: error?.message?.includes('Network') || error?.message?.includes('Failed to fetch')
    });
    return false;
  }
};

/**
 * Checks internet connection with a simple fetch to a reliable endpoint
 * Falls back to checking if fetch is available
 */
export const hasInternetConnection = async (): Promise<boolean> => {
  try {
    // Google DNS veya Cloudflare DNS ile basit bir kontrol
    // Bu daha güvenilir çünkü backend'e bağımlı değil
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 saniye timeout
    
    // Backend API health endpoint'ini kontrol et
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'HEAD',
      signal: controller.signal,
      cache: 'no-cache',
      headers: {
        'Cache-Control': 'no-cache',
      },
    });
    
    clearTimeout(timeoutId);
    return response.ok || response.status < 500; // 200-499 arası bağlantı var demektir
  } catch (error: any) {
    // AbortError = timeout (muhtemelen internet yok)
    // Network request failed = internet yok
    if (error?.name === 'AbortError' || 
        error?.message?.includes('Network') || 
        error?.message?.includes('Failed to fetch') ||
        error?.message?.includes('timeout')) {
      return false;
    }
    // Diğer hatalar için de false döndür (güvenli tarafta kal)
    return false;
  }
};

