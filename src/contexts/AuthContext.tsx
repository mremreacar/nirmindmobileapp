import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BackendApiService from '../services/BackendApiService';
import { jwtDecode } from 'jwt-decode';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  profileImageUrl?: string;
  nirpaxId?: string;
  address?: string;
  language?: string;
  cardInfo?: string;
  apps?: string[];
  permissions?: any;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
  handleAuthCallback: (token: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const backendApiService = BackendApiService.getInstance();

  // Check for stored auth on mount
  useEffect(() => {
    checkStoredAuth();
  }, []);

  const checkStoredAuth = async () => {
    try {
      console.log('🔍 Nirmind - Stored auth kontrolü başlatılıyor...');
      
      // Development modunda test user bypass (test için)
      if (__DEV__) {
        const bypassTest = false; // Test için true yapın, production'da false olmalı
        if (bypassTest) {
          const testUser = {
            id: 'test-user-id',
            email: 'test@test.com',
            firstName: 'Test',
            lastName: 'User',
            phone: '+905551234567',
            nirpaxId: 'NRP-TEST-001',
            apps: ['nirmind'],
            permissions: {}
          };
          await AsyncStorage.setItem('authToken', 'test-token');
          await AsyncStorage.setItem('user', JSON.stringify(testUser));
          await backendApiService.setAuthToken('test-token');
          setUser(testUser);
          setIsLoading(false);
          console.log('🧪 Test user bypass aktif');
          return;
        }
      }
      
      const token = await AsyncStorage.getItem('authToken');
      const storedUser = await AsyncStorage.getItem('user');

      if (token && storedUser) {
        console.log('✅ Nirmind - Stored auth bulundu, token kontrol ediliyor...');
        await backendApiService.setAuthToken(token);
        
        try {
          // Token'ı decode et ve geçerliliğini kontrol et
          const decoded = jwtDecode(token) as any;
          const currentTime = Math.floor(Date.now() / 1000);
          
          if (decoded && decoded.exp && decoded.exp > currentTime) {
            console.log('✅ Nirmind - Token geçerli, kullanıcı yüklendi');
            const userData = JSON.parse(storedUser);
            setUser(userData);
          } else {
            console.log('❌ Nirmind - Token süresi dolmuş, temizleniyor');
            await clearAuth();
          }
        } catch (decodeError) {
          console.log('❌ Nirmind - Token decode hatası, temizleniyor');
          await clearAuth();
        }
      } else {
        console.log('ℹ️ Nirmind - Stored auth bulunamadı');
      }
    } catch (error) {
      console.error('❌ Nirmind - Stored auth kontrolü hatası:', error);
      await clearAuth();
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthCallback = async (token: string) => {
    try {
      console.log('🔐 Nirmind - Auth callback işleniyor...');
      setIsLoading(true);

      // Save token
      await backendApiService.setAuthToken(token);
      await AsyncStorage.setItem('authToken', token);

      // Token'dan kullanıcı bilgilerini çıkar
      const decoded = jwtDecode(token) as any;
      
      if (decoded && decoded.email) {
        // Nirpax'tan detaylı kullanıcı bilgilerini çek
        const userProfile = await fetchUserProfileFromNirpax(token);
        
        // Güvenli field mapping
        const phone = userProfile?.phone || decoded.phone || 'Belirtilmemiş';
        const address = userProfile?.addresses?.[0]?.address || decoded.address || 'Belirtilmemiş';
        const language = userProfile?.preferences?.language || decoded.language || 'Belirtilmemiş';
        const cardInfo = userProfile?.identityCard?.cardNumber || decoded.card_info || 'Yok';
        const profileImageUrl = userProfile?.profileImageUrl || decoded.profile_image_url;
        
        console.log('📊 Nirpax profil detayları:', {
          phone: userProfile?.phone,
          address: userProfile?.addresses?.[0]?.address,
          language: userProfile?.preferences?.language,
          cardInfo: userProfile?.identityCard?.cardNumber,
          profileImageUrl: userProfile?.profileImageUrl
        });
        
        const userData = {
          id: userProfile?.id || decoded.sub,
          email: userProfile?.email || decoded.email,
          firstName: userProfile?.firstName || decoded.first_name || decoded.firstName,
          lastName: userProfile?.lastName || decoded.last_name || decoded.lastName,
          nirpaxId: userProfile?.nirpaxId || decoded.nirpaxId || decoded.nirpax_id,
          apps: decoded.apps || ['nirmind'],
          permissions: decoded.permissions || {},
          phone,
          address,
          language,
          cardInfo,
          profileImageUrl
        };
        
        console.log('✅ Nirmind - Kullanıcı bilgileri alındı:', userData.email);
        
        // Save user data
        await AsyncStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);

        // Backend'e user'ı kaydet/güncelle
        try {
          console.log('📝 User backend\'e kaydediliyor...');
          await backendApiService.registerUser({
            email: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName,
            phone: userData.phone,
            address: userData.address,
            language: userData.language,
            cardInfo: userData.cardInfo,
            profileImageUrl: userData.profileImageUrl,
            apps: userData.apps,
            permissions: userData.permissions
          });
          console.log('✅ User backend\'e kaydedildi');
        } catch (error) {
          console.error('❌ User backend kaydetme hatası:', error);
          // Hata olsa bile devam et
        }

        console.log('✅ Nirmind - Login başarılı!');
      } else {
        throw new Error('Token geçersiz');
      }
    } catch (error: any) {
      console.error('❌ Nirmind - Auth callback hatası:', error);
      await clearAuth();
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Nirmind'den kullanıcı profil bilgilerini çek
  const fetchUserProfileFromNirpax = async (token: string) => {
    try {
      console.log('🔍 Nirmind\'ten profil bilgileri çekiliyor...');
      
      // Gerçek domain üzerinde test ediliyor
      const backendUrl = 'https://nircore.io/api/nirmind/auth/verify';
      
      const response = await fetch(backendUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Nirpax profil bilgileri alındı:', data);
        return data.data?.user || data.user || data.data;
      } else {
        console.warn('⚠️ Nirpax profil bilgileri alınamadı:', response.status, response.statusText);
        return null;
      }
    } catch (error) {
      console.warn('⚠️ Nirpax profil bilgileri alınamadı:', error);
      return null;
    }
  };

  const logout = async () => {
    try {
      console.log('🚪 Nirmind - Logout işlemi başlatılıyor...');
      
      // Backend'e logout isteği gönder
      try {
        await backendApiService.logout();
      } catch (error) {
        console.warn('⚠️ Backend logout hatası (non-blocking):', error);
      }
      
      await clearAuth();
      console.log('✅ Nirmind - Logout tamamlandı');
    } catch (error) {
      console.error('❌ Nirmind - Logout hatası:', error);
      // Hata olsa bile local logout yap
      await clearAuth();
    }
  };

  const clearAuth = async () => {
    setUser(null);
    await backendApiService.clearAuthToken();
    await AsyncStorage.removeItem('authToken');
    await AsyncStorage.removeItem('user');
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    setUser,
    logout,
    handleAuthCallback,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

