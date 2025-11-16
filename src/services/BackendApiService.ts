import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  isNewUser?: boolean;
  errorName?: string;
  errorCode?: string;
  errorDetails?: any;
  errorStack?: string;
}

interface ConversationData {
  id: string;
  userId: string;
  title: string;
  isResearchMode?: boolean;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

interface MessageData {
  id: string;
  conversationId: string;
  text: string;
  isUser: boolean;
  timestamp: string;
  createdAt: string;
}

interface QuickSuggestion {
  id: string;
  title: string;
  content: string;
  type: string;
  category?: string;
}

class BackendApiService {
  private static instance: BackendApiService;
  private authToken: string | null = null;
  private onUnauthorizedCallback: (() => void) | null = null;

  private constructor() {}

  static getInstance(): BackendApiService {
    if (!BackendApiService.instance) {
      BackendApiService.instance = new BackendApiService();
    }
    return BackendApiService.instance;
  }

  setOnUnauthorizedCallback(callback: () => void) {
    this.onUnauthorizedCallback = callback;
  }

  async setAuthToken(token: string) {
    this.authToken = token;
    await AsyncStorage.setItem('authToken', token);
    
    // Token logları kaldırıldı (açılışta çok fazla log üretiyordu)
  }

  async getAuthToken(): Promise<string | null> {
    if (!this.authToken) {
      this.authToken = await AsyncStorage.getItem('authToken');
    }
    return this.authToken;
  }

  async clearAuthToken() {
    this.authToken = null;
    await AsyncStorage.removeItem('authToken');
  }

  // Logout (optional - backend'e bildirim için)
  async logout(): Promise<ApiResponse<any>> {
    try {
      // Backend'e logout bildirimi gönder (opsiyonel)
      const response = await this.makeRequest('/nirmind/auth/logout', {
        method: 'POST',
      });
      
      // Token'ı temizle
      await this.clearAuthToken();
      
      return response;
    } catch (error: any) {
      // Hata olsa bile token'ı temizle
      await this.clearAuthToken();
      return {
        success: false,
        error: error.message || 'Logout failed',
      };
    }
  }

  private async makeRequest<T = any>(
    endpoint: string,
    options: RequestInit & { timeout?: number; maxRetries?: number } = {}
  ): Promise<ApiResponse<T>> {
    try {
      const token = await this.getAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(options.headers as Record<string, string> || {}),
      };

      // User-Agent ekleme - Cloudflare için gerekli olmayabilir ve sorun yaratabilir
      // React Native fetch otomatik User-Agent ekler

      if (token) {
        // Token'ı temizle (başında/sonunda boşluk varsa kaldır)
        const cleanToken = token.trim();
        headers['Authorization'] = `Bearer ${cleanToken}`;
        
        // Token gönderme logları kaldırıldı (açılışta çok fazla log üretiyordu)
      } else {
        // Token yok uyarısı kaldırıldı (açılışta çok fazla log üretiyordu)
      }

      const fullUrl = `${API_BASE_URL}${endpoint}`;
      
      // Production URL kontrolü - sadece ilk birkaç istekte log göster
      if (endpoint.includes('/profile') || endpoint.includes('/faq') || endpoint.includes('/health')) {
        console.log('🌐 API Request URL:', fullUrl);
      }
      
      // Custom timeout ve retry ayarları
      const requestTimeout = options.timeout || 30000; // Varsayılan 30 saniye
      const maxRetries = options.maxRetries !== undefined ? options.maxRetries : 3; // Varsayılan 3 retry
      
      // Fetch options - Network timeout ve retry için optimize edilmiş
      // timeout ve maxRetries'i options'tan çıkar (RequestInit'te yok)
      const { timeout: _, maxRetries: __, ...fetchOptionsBase } = options;
      const fetchOptions: RequestInit = {
        method: options.method || 'GET',
        headers: headers as HeadersInit,
        ...fetchOptionsBase,
        cache: 'no-cache',
        credentials: 'omit', // CORS için
      };
      
      // Network timeout için AbortController kullan
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), requestTimeout);
      fetchOptions.signal = controller.signal;
      
      let response: Response | undefined;
      let lastError: any = null;
      let rateLimitDetected = false; // Rate limit hatası tespit edildi mi?
      
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          if (attempt > 0) {
            // Rate limit hatası varsa retry yapma
            if (rateLimitDetected) {
              console.log('⚠️ Rate limit hatası tespit edildi, retry yapılmayacak');
              break;
            }
            
            // Retry için bekleme süresi (exponential backoff)
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // 1s, 2s, 4s, max 5s
            // Retry attempt
            await new Promise(resolve => setTimeout(resolve, delay));
            
            // Yeni timeout için yeni controller oluştur
            const retryController = new AbortController();
            const retryTimeoutId = setTimeout(() => retryController.abort(), requestTimeout);
            fetchOptions.signal = retryController.signal;
            
            // Cleanup function
            const cleanup = () => {
              clearTimeout(retryTimeoutId);
            };
            
            try {
              response = await fetch(fullUrl, fetchOptions);
              cleanup();
            } catch (err) {
              cleanup();
              throw err;
            }
          } else {
            // İlk deneme
            response = await fetch(fullUrl, fetchOptions);
          }
          
          clearTimeout(timeoutId);
          
          // Backend response logları kaldırıldı (çok fazla log üretiyordu)
          
          // Rate limit hatası kontrolü - response başarılı geldi ama status 429 olabilir
          if (response.status === 429) {
            rateLimitDetected = true;
            const retryAfter = response.headers.get('retry-after') || response.headers.get('ratelimit-reset');
            const retryAfterSeconds = retryAfter ? parseInt(retryAfter, 10) : null;
            const retryAfterMinutes = retryAfterSeconds ? Math.ceil(retryAfterSeconds / 60) : null;
            
            let errorMessage = 'Çok fazla istek gönderildi. Lütfen birkaç dakika sonra tekrar deneyin.';
            if (retryAfterMinutes) {
              errorMessage = `Çok fazla istek gönderildi. Lütfen ${retryAfterMinutes} dakika sonra tekrar deneyin.`;
            } else if (retryAfterSeconds) {
              errorMessage = `Çok fazla istek gönderildi. Lütfen ${retryAfterSeconds} saniye sonra tekrar deneyin.`;
            }
            
            console.error('⚠️ Rate limit hatası (429) - retry yapılmayacak:', {
              retryAfter,
              retryAfterSeconds,
              retryAfterMinutes
            });
            
            return {
              success: false,
              error: 'Çok fazla istek',
              message: errorMessage,
            };
          }
          
          break; // Başarılı, loop'tan çık
        } catch (fetchError: any) {
          clearTimeout(timeoutId);
          lastError = fetchError;
          
          // Rate limit hatası için retry yapma (mesaj içinde kontrol)
          const isRateLimitError = fetchError.message?.includes('Too many requests') ||
                                  fetchError.message?.includes('rate limit') ||
                                  fetchError.message?.includes('429');
          
          if (isRateLimitError) {
            return {
              success: false,
              error: 'Çok fazla istek',
              message: 'Çok fazla istek gönderildi. Lütfen birkaç dakika sonra tekrar deneyin.',
            };
          }
          
          // AbortError (timeout) veya Network hatası
          const isNetworkError = fetchError.name === 'AbortError' || 
                                fetchError.message?.includes('Network') || 
                                fetchError.message?.includes('Failed to fetch') ||
                                fetchError.message?.includes('Network request failed') ||
                                fetchError.message?.includes('timeout') ||
                                fetchError.message?.includes('ECONNREFUSED') ||
                                fetchError.message?.includes('ENOTFOUND') ||
                                fetchError.message?.includes('ETIMEDOUT');
          
          if (isNetworkError && attempt < maxRetries) {
            const errorType = fetchError.name === 'AbortError' 
              ? `Timeout (${requestTimeout / 1000}s içinde yanıt gelmedi)` 
              : fetchError.message || fetchError.name || 'Bilinmeyen network hatası';
            console.error(`❌ Network error (attempt ${attempt + 1}/${maxRetries + 1}): ${errorType}`);
            console.error(`   Endpoint: ${endpoint}`);
            console.error(`   Backend URL: ${API_BASE_URL}`);
            continue; // Retry yap
          } else {
            // Son deneme veya network hatası değil
            console.error('❌ Fetch error:', fetchError);
            console.error('❌ Error details:', {
              name: fetchError.name,
              message: fetchError.message,
              code: fetchError.code,
              stack: fetchError.stack
            });
            
            // Network hatası için daha açıklayıcı mesaj
            if (isNetworkError) {
              const errorMessage = fetchError.name === 'AbortError' 
                ? 'Sunucu yanıt vermiyor. Lütfen internet bağlantınızı kontrol edin.'
                : `Sunucuya bağlanılamıyor. Lütfen internet bağlantınızı kontrol edin ve backend'in çalıştığından emin olun. (${API_BASE_URL})`;
              
              return {
                success: false,
                error: 'Bağlantı hatası',
                message: errorMessage,
              };
            }
            
            throw fetchError;
          }
        }
      }
      
      if (!response) {
        return {
          success: false,
          error: 'Bağlantı hatası',
          message: `Sunucuya bağlanılamadı. Tüm denemeler tükendi. (${API_BASE_URL})`,
        };
      }
      
      // Response headers'ı topla (sadece hata durumunda kullanılıyor)
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });
      
      // Response headers logları kaldırıldı (çok fazla log üretiyordu)

      // Handle 429 Too Many Requests (Rate Limit)
      if (response.status === 429) {
        const retryAfter = response.headers.get('retry-after') || response.headers.get('ratelimit-reset');
        const retryAfterSeconds = retryAfter ? parseInt(retryAfter, 10) : null;
        const retryAfterMinutes = retryAfterSeconds ? Math.ceil(retryAfterSeconds / 60) : null;
        
        let errorMessage = 'Çok fazla istek gönderildi. Lütfen birkaç dakika sonra tekrar deneyin.';
        if (retryAfterMinutes) {
          errorMessage = `Çok fazla istek gönderildi. Lütfen ${retryAfterMinutes} dakika sonra tekrar deneyin.`;
        }
        
        console.error('⚠️ Rate limit hatası (429):', {
          retryAfter,
          retryAfterSeconds,
          retryAfterMinutes,
          headers: responseHeaders
        });
        
        return {
          success: false,
          error: 'Çok fazla istek',
          message: errorMessage,
        };
      }

      // Handle 401 Unauthorized
      if (response.status === 401 && this.onUnauthorizedCallback) {
        this.onUnauthorizedCallback();
        return {
          success: false,
          error: 'Oturum süreniz doldu. Lütfen tekrar giriş yapın.',
        };
      }

      // Content-Type kontrolü
      const contentType = response.headers.get('content-type');
      const isJson = contentType && contentType.includes('application/json');
      
      let data: any;
      if (isJson) {
        // Response'u clone et ki body'yi hem loglayalım hem de parse edelim
        const responseClone = response.clone();
        const textData = await responseClone.text();
        
        try {
          data = JSON.parse(textData);
          
          // Response body'yi logla
          // Response body logları kaldırıldı
        } catch (parseError) {
          // JSON parse hatası
          console.error('❌ JSON parse hatası:', parseError);
          console.log('📦 Response Body (Raw):', textData.substring(0, 500));
          data = await response.json(); // Orijinal response'u kullan
        }
      } else {
        // HTML veya başka bir format döndüyse
        const text = await response.text();
        
        // Response body'yi logla
        // Response body text logları kaldırıldı
        
        // Rate limit hatası HTML olarak dönebilir
        if (response.status === 429 || text.includes('Too many requests') || text.includes('rate limit')) {
          const retryAfter = response.headers.get('retry-after') || response.headers.get('ratelimit-reset');
          const retryAfterSeconds = retryAfter ? parseInt(retryAfter, 10) : null;
          const retryAfterMinutes = retryAfterSeconds ? Math.ceil(retryAfterSeconds / 60) : null;
          
          let errorMessage = 'Çok fazla istek gönderildi. Lütfen birkaç dakika sonra tekrar deneyin.';
          if (retryAfterMinutes) {
            errorMessage = `Çok fazla istek gönderildi. Lütfen ${retryAfterMinutes} dakika sonra tekrar deneyin.`;
          }
          
          return {
            success: false,
            error: 'Çok fazla istek',
            message: errorMessage,
          };
        }
        
        console.error('❌ Backend HTML/Text Response:', {
          status: response.status,
          statusText: response.statusText,
          contentType: contentType,
          preview: text.substring(0, 200)
        });
        
        return {
          success: false,
          error: `Sunucu hatası (${response.status}): ${response.statusText}. Endpoint bulunamadı veya geçersiz yanıt döndü.`,
        };
      }

      if (!response.ok) {
        console.error('❌ Backend Error Response:', {
          status: response.status,
          statusText: response.statusText,
          data: data
        });
        
        // Rate limit hatası kontrolü (JSON response içinde de olabilir)
        if (response.status === 429 || 
            (data && (data.message?.includes('Too many requests') || 
                     data.error?.includes('Too many requests') ||
                     data.message?.includes('rate limit') ||
                     data.error?.includes('rate limit')))) {
          const retryAfter = response.headers.get('retry-after') || response.headers.get('ratelimit-reset');
          const retryAfterSeconds = retryAfter ? parseInt(retryAfter, 10) : null;
          const retryAfterMinutes = retryAfterSeconds ? Math.ceil(retryAfterSeconds / 60) : null;
          
          let errorMessage = data?.message || data?.error || 'Çok fazla istek gönderildi. Lütfen birkaç dakika sonra tekrar deneyin.';
          if (retryAfterMinutes && !errorMessage.includes('dakika')) {
            errorMessage = `Çok fazla istek gönderildi. Lütfen ${retryAfterMinutes} dakika sonra tekrar deneyin.`;
          }
          
          return {
            success: false,
            error: 'Çok fazla istek',
            message: errorMessage,
          };
        }
        
        // Permission denied hatası için özel mesaj
        const errorMessage = data?.message || data?.error || 'Bir hata oluştu';
        const errorDetails = data?.error || errorMessage;
        
        let userFriendlyMessage = errorMessage;
        if (errorDetails?.includes('EACCES') || errorDetails?.includes('permission denied')) {
          userFriendlyMessage = 'Sunucu izin hatası. Lütfen daha sonra tekrar deneyin veya destek ekibiyle iletişime geçin.';
        } else if (errorDetails?.includes('ENOENT') || errorDetails?.includes('no such file')) {
          userFriendlyMessage = 'Dosya bulunamadı. Lütfen tekrar deneyin.';
        } else if (errorDetails?.includes('timeout') || errorDetails?.includes('ETIMEDOUT')) {
          userFriendlyMessage = 'İstek zaman aşımına uğradı. Lütfen tekrar deneyin.';
        } else if (response.status === 500) {
          userFriendlyMessage = 'Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.';
        }
        
        return {
          success: false,
          error: userFriendlyMessage,
          message: userFriendlyMessage,
          errorName: data.errorName,
          errorCode: data.errorCode,
          errorDetails: data.errorDetails,
          errorStack: data.errorStack,
        };
      }

      return {
        success: true,
        data: data.data || data,
        isNewUser: data.isNewUser,
        message: data.message,
      };
    } catch (error: any) {
      console.error('API Request Error:', error);
      return {
        success: false,
        error: error.message || 'Sunucuya bağlanılamadı',
      };
    }
  }

  // ==================== User Routes ====================

  // User registration/update
  async registerUser(userData: any): Promise<ApiResponse<any>> {
    return this.makeRequest('/nirmind/users/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  // Get user profile
  async getUserProfile(timeout?: number): Promise<ApiResponse<any>> {
    // Profil kontrolü için daha kısa timeout (varsayılan 10 saniye) ve daha az retry
    // Bu sayede uygulama açılışı daha hızlı olur
    return this.makeRequest('/nirmind/users/profile', {
      timeout: timeout || 10000, // 10 saniye
      maxRetries: 1, // Sadece 1 retry (toplam 2 deneme)
    });
  }

  // Update user profile
  async updateUserProfile(userData: any): Promise<ApiResponse<any>> {
    return this.makeRequest('/nirmind/users/profile', {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  // Get user statistics
  async getUserStatistics(): Promise<ApiResponse<any>> {
    return this.makeRequest('/nirmind/users/statistics');
  }

  // ==================== Nirmind Routes ====================

  // Conversation methods
  async getConversations(params?: { page?: number; limit?: number }): Promise<ApiResponse<ConversationData[]>> {
    const queryParams = new URLSearchParams();
    if (params?.page) {
      queryParams.append('page', params.page.toString());
    }
    if (params?.limit) {
      queryParams.append('limit', params.limit.toString());
    }

    const queryString = queryParams.toString();
    return this.makeRequest(`/nirmind/conversations${queryString ? `?${queryString}` : ''}`);
  }

  async createConversation(title: string, initialMessage?: string): Promise<ApiResponse<ConversationData>> {
    return this.makeRequest('/nirmind/conversations', {
      method: 'POST',
      body: JSON.stringify({ title, initialMessage }),
    });
  }

  async getConversation(conversationId: string): Promise<ApiResponse<ConversationData>> {
    return this.makeRequest(`/nirmind/conversations/${conversationId}`);
  }

  async updateConversation(conversationId: string, title: string): Promise<ApiResponse<any>> {
    return this.makeRequest(`/nirmind/conversations/${conversationId}`, {
      method: 'PUT',
      body: JSON.stringify({ title }),
    });
  }

  async updateResearchMode(conversationId: string, isResearchMode: boolean): Promise<ApiResponse<any>> {
    console.log('📤 updateResearchMode request:', {
      conversationId,
      isResearchMode,
      isResearchModeType: typeof isResearchMode
    });
    
    return this.makeRequest(`/nirmind/conversations/${conversationId}/research-mode`, {
      method: 'PUT',
      body: JSON.stringify({ isResearchMode }),
    });
  }

  async deleteConversation(conversationId: string): Promise<ApiResponse<any>> {
    return this.makeRequest(`/nirmind/conversations/${conversationId}`, {
      method: 'DELETE',
    });
  }

  // Message methods
  async sendMessage(conversationId: string, message: string, attachments?: any[], promptType?: string): Promise<ApiResponse<any>> {
    return this.makeRequest('/nirmind/messages', {
      method: 'POST',
      body: JSON.stringify({ conversationId, message, attachments, promptType }),
    });
  }

  // Send Message with Streaming (SSE) - ChatGPT gibi gerçek zamanlı yazma efekti
  // React Native'de fetch API'nin response.body.getReader() çalışmıyor
  // Bu yüzden XMLHttpRequest kullanıyoruz
  // Returns an abort function to cancel the request
  async sendMessageStream(
    conversationId: string,
    message: string,
    attachments: any[],
    promptType: string | undefined,
    onUserMessage: (userMessage: any) => void,
    onAIStart: () => void,
    onAIChunk: (chunk: string, fullContent: string) => void,
    onAIComplete: (aiMessage: any) => void,
    onError: (error: string) => void,
  ): Promise<() => void> {
    let xhr: XMLHttpRequest | null = null;
    let isAborted = false;
    let isResolved = false;
    
    // Timeout'ları fonksiyon scope'unda tut (abort fonksiyonu için gerekli)
    let connectionTimeout: NodeJS.Timeout | null = null;
    let streamTimeout: NodeJS.Timeout | null = null;
    
    const abort = () => {
      if (isAborted || isResolved) return;
      isAborted = true;
      // Timeout'ları temizle
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
        connectionTimeout = null;
      }
      if (streamTimeout) {
        clearTimeout(streamTimeout);
        streamTimeout = null;
      }
      if (xhr) {
        console.log('🛑 XMLHttpRequest abort ediliyor...');
        xhr.abort();
        xhr = null;
      }
    };

    try {
      const token = await this.getAuthToken();
      if (!token) {
        // Token yoksa hata bildir ama abort fonksiyonunu döndür (kullanıcı kodunun çökmesini önlemek için)
        onError('Authentication token not found');
        // Promise ile abort fonksiyonunu döndür (sync return yerine)
        return Promise.resolve(abort);
      }

      // Promise'i hemen döndür, abort fonksiyonunu da döndür
      // ÖNEMLİ: Promise'i hemen resolve et ki abort fonksiyonu kullanılabilsin
      const promise = new Promise<() => void>((resolve) => {
        // Abort fonksiyonunu hemen döndür - böylece await eden kod abort fonksiyonunu hemen alır
        resolve(abort);
      });
      
      // XMLHttpRequest'i asenkron olarak başlat (Promise resolve edildikten sonra)
      // Bu şekilde abort fonksiyonu hemen kullanılabilir
      // NOT: connectionTimeout ve streamTimeout değişkenleri dış scope'tan erişilebilir
      (async () => {
      try {
        console.log('🌊 Streaming endpoint cagriliyor (XMLHttpRequest):', `${API_BASE_URL}/nirmind/messages/stream`);
        
        xhr = new XMLHttpRequest();
        let buffer = '';
        let eventCount = 0;
        let firstChunkTime: number | null = null;
        const requestStartTime = Date.now();
        // CRITICAL FIX: Duplicate event kontrolü için daha güvenilir hash kullan
        // Event type + message ID + content hash (ilk 200 karakter)
        const processedEvents = new Set<string>(); // İşlenen event'leri takip et (duplicate önlemek için)
        let aiStartCalled = false; // ai_start event'inin sadece bir kez çağrılmasını sağla
        // CRITICAL FIX: userMessageProcessed her yeni stream için sıfırlanmalı
        // Her yeni mesaj gönderiminde yeni bir stream başlar, bu yüzden flag'i sıfırla
        let userMessageProcessed = false; // user_message event'inin sadece bir kez işlenmesini sağla
        
        // Timeout mekanizması - ilk chunk gelene kadar kısa, sonrasında uzun
        const CONNECTION_TIMEOUT = 30000; // İlk bağlantı için 30 saniye
        const STREAM_TIMEOUT = 180000; // Stream başladıktan sonra 3 dakika (uzun AI cevapları için artırıldı)
        
        // İlk bağlantı timeout'u (dış scope'taki connectionTimeout değişkenine atama yap)
        connectionTimeout = setTimeout(() => {
          if (isAborted || isResolved || firstChunkTime) return;
          console.error('❌ Connection timeout - ilk chunk gelmedi');
          if (xhr) {
            xhr.abort();
          }
          onError('Bağlantı zaman aşımına uğradı. Lütfen internet bağlantınızı kontrol edip tekrar deneyin.');
          if (!isResolved && !isAborted) {
            isResolved = true;
          }
        }, CONNECTION_TIMEOUT);
        
        xhr.open('POST', `${API_BASE_URL}/nirmind/messages/stream`, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.setRequestHeader('Accept', 'text/event-stream');
        
        xhr.onreadystatechange = () => {
          if (isAborted) return;
          
          if (xhr && xhr.readyState === XMLHttpRequest.HEADERS_RECEIVED) {
            const contentType = xhr.getResponseHeader('Content-Type');
            console.log('🌊 Streaming response headers alindi:', {
              status: xhr.status,
              statusText: xhr.statusText,
              contentType: contentType,
              readyState: xhr.readyState
            });
            
            if (xhr.status !== 200) {
              console.error('❌ Streaming endpoint hatasi:', xhr.status, xhr.statusText);
              if (connectionTimeout) {
                clearTimeout(connectionTimeout);
                connectionTimeout = null;
              }
              onError(`HTTP error! status: ${xhr.status}`);
              if (!isResolved && !isAborted) {
                isResolved = true;
              }
              return;
            }
          }
        };
        
        // Helper function: responseText'ten ai_complete event'ini bul ve işle
        // Bu fonksiyon streamTimeout, xhr.onload, xhr.onerror, xhr.ontimeout içinde kullanılacak
        const processRemainingEvents = (responseText: string) => {
          // CRITICAL FIX: Abort edildiyse hiçbir event'i işleme
          if (isAborted) {
            console.log('ℹ️ [processRemainingEvents] Stream abort edildi, eventler işlenmiyor');
            return;
          }
          
          if (!responseText || !responseText.trim()) return;
          
          // Tüm responseText'i kontrol et (sadece buffer değil)
          const allEventBlocks = responseText.split('\n\n').filter(block => block.trim());
          
          for (const eventBlock of allEventBlocks) {
            // CRITICAL FIX: Her event block işlemeden önce abort kontrolü yap
            if (isAborted) {
              console.log('ℹ️ [processRemainingEvents] Stream abort edildi, event işleme durduruldu');
              return;
            }
            
            if (!eventBlock.trim()) continue;
            
            let eventType = '';
            const dataLines: string[] = [];
            
            const lines = eventBlock.split('\n');
            for (const line of lines) {
              if (line.startsWith('event: ')) {
                eventType = line.substring(7).trim();
              } else if (line.startsWith('data: ')) {
                const dataLine = line.substring(6);
                dataLines.push(dataLine);
              }
            }
            
            const eventData = dataLines.join('\n').trim();
            
            if (eventType === 'ai_complete' && eventData) {
              // CRITICAL FIX: ai_complete event'ini işlemeden önce abort kontrolü yap
              if (isAborted) {
                console.log('ℹ️ [processRemainingEvents] Stream abort edildi, ai_complete eventi işlenmiyor');
                return;
              }
              
              try {
                const data = JSON.parse(eventData);
                
                if (data.success && data.data?.aiMessage) {
                  const aiMsg = data.data.aiMessage;
                  if (aiMsg && aiMsg.id) {
                    // CRITICAL FIX: Callback'i çağırmadan önce tekrar abort kontrolü yap
                    if (isAborted) {
                      console.log('ℹ️ [processRemainingEvents] Stream abort edildi, onAIComplete callback çağrılmıyor');
                      return;
                    }
                    
                    // Duplicate kontrolü - eğer zaten işlendiyse tekrar işleme
                    const eventKey = `ai_complete:${aiMsg.id}`;
                    if (processedEvents.has(eventKey)) {
                      console.log('ℹ️ [processRemainingEvents] ai_complete zaten işlendi:', aiMsg.id);
                      continue;
                    }
                    processedEvents.add(eventKey);
                    
                    console.log('✅ [processRemainingEvents] ai_complete event bulundu ve işleniyor:', {
                      messageId: aiMsg.id,
                      textLength: aiMsg.text?.length || 0,
                      isResolved
                    });
                    
                    // CRITICAL FIX: isResolved flag'ini set etmeden önce callback'i çağır
                    onAIComplete(aiMsg);
                    console.log('✅ [processRemainingEvents] onAIComplete callback çağrıldı');
                    // CRITICAL FIX: isResolved flag'ini callback'ten SONRA set et
                    isResolved = true;
                    return; // Bulundu, işlendi, çık
                  }
                }
              } catch (parseError) {
                console.warn('⚠️ [processRemainingEvents] ai_complete parse hatası:', {
                  error: parseError instanceof Error ? parseError.message : String(parseError)
                });
              }
            }
          }
        };
        
        xhr.onprogress = () => {
          if (isAborted || !xhr) return;
          
          if (!firstChunkTime) {
            firstChunkTime = Date.now();
            const timeToFirstChunk = firstChunkTime - requestStartTime;
            console.log('✅ [BACKEND RESPONSE] İlk SSE chunk alındı - Backend bağlantısı başarılı!', {
              timeToFirstChunk: `${timeToFirstChunk}ms`,
              timeToFirstChunkSeconds: `${(timeToFirstChunk / 1000).toFixed(2)}s`,
              conversationId,
              timestamp: new Date(firstChunkTime).toISOString()
            });
            
            // İlk chunk geldi, connection timeout'u iptal et ve stream timeout'u başlat
            if (connectionTimeout) {
              clearTimeout(connectionTimeout);
              connectionTimeout = null;
            }
            
            // Stream timeout'u başlat - eğer stream başladıktan sonra uzun süre veri gelmezse
            streamTimeout = setTimeout(() => {
              if (isAborted || isResolved) return;
              
              // CRITICAL FIX: Abort etmeden önce responseText'i kontrol et
              // ai_complete event'i gelmiş olabilir
              if (xhr && xhr.responseText && !isResolved) {
                console.log('🔍 [streamTimeout] Timeout öncesi responseText kontrol ediliyor (ai_complete için):', {
                  responseTextLength: xhr.responseText.length
                });
                processRemainingEvents(xhr.responseText);
              }
              
              console.error('❌ Stream timeout - uzun süre veri gelmedi');
              if (xhr) {
                xhr.abort();
              }
              onError('Yanıt alınamadı. Lütfen tekrar deneyin.');
              if (!isResolved && !isAborted) {
                isResolved = true;
              }
            }, STREAM_TIMEOUT);
          } else {
            // Veri gelmeye devam ediyor, stream timeout'u sıfırla
            if (streamTimeout) {
              clearTimeout(streamTimeout);
              streamTimeout = setTimeout(() => {
                if (isAborted || isResolved) return;
                
                // CRITICAL FIX: Abort etmeden önce responseText'i kontrol et
                // ai_complete event'i gelmiş olabilir
                if (xhr && xhr.responseText && !isResolved) {
                  console.log('🔍 [streamTimeout] Timeout öncesi responseText kontrol ediliyor (ai_complete için):', {
                    responseTextLength: xhr.responseText.length
                  });
                  processRemainingEvents(xhr.responseText);
                }
                
                console.error('❌ Stream timeout - uzun süre veri gelmedi');
                if (xhr) {
                  xhr.abort();
                }
                onError('Yanıt alınamadı. Lütfen tekrar deneyin.');
                if (!isResolved && !isAborted) {
                  isResolved = true;
                }
              }, STREAM_TIMEOUT);
            }
          }
          
          // Yeni data geldi - sadece yeni kısmı al
          const currentResponseText = xhr.responseText;
          const newData = currentResponseText.substring(buffer.length);
          
          if (!newData) {
            // Yeni data yoksa, ama ai_complete event'i gelmiş olabilir
            // responseText'in tamamını kontrol et
            if (currentResponseText && !isResolved) {
              processRemainingEvents(currentResponseText);
            }
            return;
          }
          
          buffer += newData;
          
          // CRITICAL FIX: Her chunk geldiğinde responseText'in tamamını kontrol et
          // ai_complete event'i stream'in sonunda gelebilir ve hemen işlenmeli
          // isResolved kontrolünü kaldırdık - her zaman kontrol et (duplicate kontrolü processedEvents ile yapılıyor)
          if (currentResponseText) {
            // Sadece ai_complete event'ini kontrol et (performans için)
            // Eğer responseText'te "event: ai_complete" varsa, hemen işle
            if (currentResponseText.includes('event: ai_complete')) {
              console.log('🔍 [onprogress] responseText\'te ai_complete event\'i tespit edildi, işleniyor:', {
                responseTextLength: currentResponseText.length,
                isResolved
              });
              processRemainingEvents(currentResponseText);
            }
          }
          
          // Event'leri parse et - sadece tamamlanmış event'leri işle
          // Buffer'ı '\n\n' ile böl, son kısmı (tamamlanmamış) buffer'da kalır
          let lastNewlineIndex = -1;
          let processedLength = 0;
          
          // Buffer'ın sonundan başlayarak tamamlanmış event'leri bul
          for (let i = buffer.length - 1; i >= 0; i--) {
            if (buffer.substring(i, i + 2) === '\n\n') {
              lastNewlineIndex = i;
              break;
            }
          }
          
          // Tamamlanmış event'leri işle
          if (lastNewlineIndex >= 0) {
            const completeEvents = buffer.substring(0, lastNewlineIndex + 2);
            const incompleteEvent = buffer.substring(lastNewlineIndex + 2);
            
            // Tamamlanmış event'leri parse et
            const eventBlocks = completeEvents.split('\n\n').filter(block => block.trim());
            
            // Event block parse logları kaldırıldı (çok fazla log üretiyordu)
            
            for (const eventBlock of eventBlocks) {
              if (!eventBlock.trim()) continue;
              
              let eventType = '';
              const dataLines: string[] = [];
              
              const lines = eventBlock.split('\n');
              for (const line of lines) {
                if (line.startsWith('event: ')) {
                  eventType = line.substring(7).trim();
                } else if (line.startsWith('data: ')) {
                  // SSE spesifikasyonuna göre: birden fazla data: satırı varsa birleştirilmeli
                  const dataLine = line.substring(6); // trim yapmıyoruz, çünkü veri içinde boşluk önemli olabilir
                  dataLines.push(dataLine);
                }
              }
              
              // Tüm data satırlarını birleştir (SSE spesifikasyonu)
              const eventData = dataLines.join('\n').trim();
              
              if (eventType && eventData) {
                // JSON parse etmeden önce basit validasyon yap
                if (!eventData.trim()) {
                  continue; // Boş data, atla
                }
                
                // Event key oluştur - event type + data hash (ilk 100 karakter)
                // Thinking steps kaldırıldı - frontend'de artık işlenmiyor
                // ai_thinking_step event'lerini tamamen ignore et
                if (eventType === 'ai_thinking_step') {
                  continue; // Thinking step event'lerini ignore et
                }
                
                // CRITICAL FIX: Duplicate kontrolü - daha güvenilir hash kullan
                // Event type + message ID (varsa) + content hash (ilk 200 karakter)
                let eventKey = `${eventType}:${eventData.substring(0, 200)}`;
                let messageId: string | null = null;
                
                // Eğer event data içinde message ID varsa, onu da hash'e ekle
                try {
                  const tempData = JSON.parse(eventData);
                  if (tempData?.data?.userMessage?.id) {
                    messageId = tempData.data.userMessage.id;
                    eventKey = `${eventType}:${messageId}:${eventData.substring(0, 100)}`;
                  } else if (tempData?.data?.aiMessage?.id) {
                    messageId = tempData.data.aiMessage.id;
                    eventKey = `${eventType}:${messageId}:${eventData.substring(0, 100)}`;
                  } else if (tempData?.userMessage?.id) {
                    messageId = tempData.userMessage.id;
                    eventKey = `${eventType}:${messageId}:${eventData.substring(0, 100)}`;
                  } else if (tempData?.aiMessage?.id) {
                    messageId = tempData.aiMessage.id;
                    eventKey = `${eventType}:${messageId}:${eventData.substring(0, 100)}`;
                  }
                } catch (e) {
                  // JSON parse hatası - normal hash kullan
                }
                
                // CRITICAL FIX: Event type bazlı duplicate kontrolü
                // Özellikle user_message ve ai_start event'leri için daha sıkı kontrol
                // Duplicate event'ler normal olabilir (network retry, SSE reconnection vb.)
                // Bu yüzden sadece ilk birkaç kez log göster, sonra sessizce atla
                if (eventType === 'user_message' && userMessageProcessed) {
                  // Sadece ilk 3 duplicate event için log göster
                  if (eventCount <= 3) {
                    console.log(`ℹ️ Duplicate ${eventType} event atlandı (flag kontrolü): ${messageId || 'no ID'}`);
                  }
                  continue;
                }
                
                if (eventType === 'ai_start' && aiStartCalled) {
                  // Sadece ilk 3 duplicate event için log göster
                  if (eventCount <= 3) {
                    console.log(`ℹ️ Duplicate ${eventType} event atlandı (flag kontrolü)`);
                  }
                  continue;
                }
                
                if (processedEvents.has(eventKey)) {
                  // Sadece ilk 3 duplicate event için log göster
                  if (eventCount <= 3) {
                    console.log(`ℹ️ Duplicate event atlandı: ${eventType}`);
                  }
                  continue; // Bu event zaten işlendi, sessizce atla
                }
                
                // Event'i işlendi olarak işaretle
                processedEvents.add(eventKey);
                
                eventCount++;
                try {
                  // JSON parse öncesi validation
                  if (!eventData || typeof eventData !== 'string' || !eventData.trim()) {
                    continue; // Boş data, atla
                  }
                  
                  // Thinking step logları kaldırıldı (çok fazla log üretiyordu)
                  
                  const data = JSON.parse(eventData);
                  
                  // Thinking step parse logları kaldırıldı
                  
                  // Data validation
                  if (!data || typeof data !== 'object') {
                    console.warn('⚠️ Geçersiz SSE data formatı:', eventType);
                    continue;
                  }
                  
                  // Event logları azaltıldı - sadece önemli event'ler için log
                  // DEBUG: Her event için detaylı log (backend response tracking için)
                  const eventReceivedTime = Date.now();
                  const timeSinceRequestStart = eventReceivedTime - requestStartTime;
                  
                  if (eventCount <= 5 || eventType === 'ai_complete' || eventType === 'error') {
                    console.log(`📨 [BACKEND RESPONSE] SSE event alındı: ${eventType}`, {
                      eventNumber: eventCount,
                      timeSinceRequestStart: `${timeSinceRequestStart}ms`,
                      timestamp: new Date(eventReceivedTime).toISOString(),
                      conversationId
                    });
                  }
                  
                  switch (eventType) {
                    case 'user_message':
                      console.log('📨 [BackendApiService] user_message event alındı:', {
                        eventCount,
                        userMessageProcessed,
                        hasData: !!data,
                        dataSuccess: data?.success,
                        hasUserMessage: !!(data?.data?.userMessage),
                        userMessageId: data?.data?.userMessage?.id
                      });
                      
                      // CRITICAL FIX: Duplicate user_message event'lerini engelle
                      if (userMessageProcessed) {
                        // Duplicate event normal olabilir, sessizce atla
                        break;
                      }
                      
                      if (data.success && data.data?.userMessage) {
                        // UserMessage validation
                        const userMsg = data.data.userMessage;
                        if (!userMsg || !userMsg.id) {
                          console.error('❌ [BACKEND RESPONSE] Geçersiz userMessage:', userMsg);
                          break;
                        }
                        userMessageProcessed = true; // İşlendi olarak işaretle
                        const userMessageTime = Date.now();
                        const timeToUserMessage = userMessageTime - requestStartTime;
                        console.log('✅ [BACKEND RESPONSE] User message event işlendi - Backend mesajı alındı!', {
                          messageId: userMsg.id,
                          textLength: userMsg.text?.length || 0,
                          timeToUserMessage: `${timeToUserMessage}ms`,
                          conversationId,
                          timestamp: new Date(userMessageTime).toISOString()
                        });
                        onUserMessage(userMsg);
                      } else {
                        console.warn('⚠️ [BackendApiService] user_message event\'inde data yok veya başarısız:', {
                          hasData: !!data,
                          dataSuccess: data?.success,
                          hasUserMessage: !!(data?.data?.userMessage),
                          dataKeys: data ? Object.keys(data) : []
                        });
                      }
                      break;
                    case 'ai_start':
                      // Duplicate ai_start event'lerini engelle
                      if (aiStartCalled) {
                        // Duplicate event normal olabilir, sessizce atla
                        break;
                      }
                      aiStartCalled = true;
                      const aiStartTime = Date.now();
                      const timeToAIStart = aiStartTime - requestStartTime;
                      console.log('✅ [BACKEND RESPONSE] AI start event işlendi - AI cevabı başladı!', {
                        timeToAIStart: `${timeToAIStart}ms`,
                        conversationId,
                        timestamp: new Date(aiStartTime).toISOString()
                      });
                      onAIStart();
                      break;
                    case 'ai_thinking_step':
                      // Thinking step event - frontend'de artık işlenmiyor, ignore et
                      // Bu case'e asla gelmemeli çünkü yukarıda continue ile atlanıyor
                      break;
                    case 'ai_chunk':
                      // YENİ FORMAT: Thinking steps ve ana mesajı ayrı field'larda gönder
                      // Önce data.data.message formatını kontrol et (backend'den gelen yeni format)
                      if (data && data.data && data.data.message && typeof data.data.message.content === 'string' && typeof data.data.message.fullContent === 'string') {
                        if (eventCount <= 3) {
                          console.log(`📝 AI chunk alindi (data.data.message format, ${data.data.message.content.length} karakter)`);
                        }
                        // Ana mesajı gönder
                        onAIChunk(data.data.message.content, data.data.message.fullContent);
                      } else if (data && data.message && typeof data.message.content === 'string' && typeof data.message.fullContent === 'string') {
                        // data.message formatı
                        if (eventCount <= 3) {
                          console.log(`📝 AI chunk alindi (${data.message.content.length} karakter)`);
                        }
                        // Ana mesajı gönder
                        onAIChunk(data.message.content, data.message.fullContent);
                      } else if (data && data.data && typeof data.data.content === 'string' && typeof data.data.fullContent === 'string') {
                        // data.data.content formatı (backward compatibility)
                        if (eventCount <= 3) {
                          console.log(`📝 AI chunk alindi (data.data.content format, ${data.data.content.length} karakter)`);
                        }
                        onAIChunk(data.data.content, data.data.fullContent);
                      } else if (data && typeof data.content === 'string' && typeof data.fullContent === 'string') {
                        // Eski format desteği (backward compatibility)
                        if (eventCount <= 3) {
                          console.log(`📝 AI chunk alindi (eski format, ${data.content.length} karakter)`);
                        }
                        onAIChunk(data.content, data.fullContent);
                      } else if (data && data.data && data.data.userMessage) {
                        // CRITICAL FIX: Backend bazen userMessage gönderiyor, bu ai_chunk değil, atla
                        // Bu durumda chunk yok, sadece userMessage var - bu event'i ignore et
                        if (eventCount <= 3) {
                          console.log('ℹ️ ai_chunk event\'inde userMessage var, chunk yok - atlanıyor');
                        }
                        // Bu event'i ignore et, chunk yok
                        break;
                      } else {
                        // Geçersiz format - detaylı log (sadece ilk birkaç event için)
                        if (eventCount <= 5) {
                          console.warn('⚠️ Geçersiz ai_chunk data:', {
                            hasData: !!data,
                            hasDataData: !!data?.data,
                            dataKeys: data ? Object.keys(data) : [],
                            dataDataKeys: data?.data ? Object.keys(data.data) : [],
                            hasMessage: data?.message ? true : false,
                            hasDataMessage: data?.data?.message ? true : false,
                            hasUserMessage: data?.data?.userMessage ? true : false,
                            messageKeys: data?.message ? Object.keys(data.message) : [],
                            dataMessageKeys: data?.data?.message ? Object.keys(data.data.message) : [],
                            hasContent: typeof data?.content === 'string',
                            hasDataContent: typeof data?.data?.content === 'string',
                            hasFullContent: typeof data?.fullContent === 'string',
                            hasDataFullContent: typeof data?.data?.fullContent === 'string',
                            dataType: typeof data
                          });
                        }
                        // Chunk yok, devam et
                        break;
                      }
                      break;
                    case 'ai_complete':
                      // CRITICAL FIX: Abort edildiyse ai_complete event'ini işleme
                      // Kullanıcı mesajı durdurduysa, backend'den gelen cevabı gösterme
                      if (isAborted) {
                        console.log('ℹ️ [ai_complete] Stream abort edildi, ai_complete eventi işlenmiyor');
                        return;
                      }
                      const aiCompleteTime = Date.now();
                      const timeToAIComplete = aiCompleteTime - requestStartTime;
                      console.log('✅ [BACKEND RESPONSE] AI complete event işlendi - Backend cevabı tamamlandı!', {
                        hasData: !!data,
                        hasSuccess: !!data?.success,
                        hasAiMessage: !!data?.data?.aiMessage,
                        aiMessageId: data?.data?.aiMessage?.id,
                        aiMessageTextLength: data?.data?.aiMessage?.text?.length || 0,
                        timeToAIComplete: `${timeToAIComplete}ms`,
                        timeToAICompleteSeconds: `${(timeToAIComplete / 1000).toFixed(2)}s`,
                        conversationId,
                        timestamp: new Date(aiCompleteTime).toISOString()
                      });
                      // Timeout'ları temizle
                      if (connectionTimeout) {
                        clearTimeout(connectionTimeout);
                        connectionTimeout = null;
                      }
                      if (streamTimeout) {
                        clearTimeout(streamTimeout);
                        streamTimeout = null;
                      }
                      if (data.success && data.data?.aiMessage) {
                        // CRITICAL FIX: Callback'i çağırmadan önce tekrar abort kontrolü yap
                        // Abort edildiyse callback'i çağırma (kullanıcı mesajı durdurdu)
                        if (isAborted) {
                          console.log('ℹ️ [ai_complete] Stream abort edildi, onAIComplete callback çağrılmıyor');
                          break; // return yerine break kullan (switch case içinde)
                        }
                        
                        // AIMessage validation
                        const aiMsg = data.data.aiMessage;
                        if (!aiMsg || !aiMsg.id) {
                          console.error('❌ Geçersiz aiMessage:', aiMsg);
                          onError('AI mesajı geçersiz format');
                          break;
                        }
                        
                        // YENİ FORMAT: Response field'ını da handle et
                        // Thinking steps kaldırıldı - frontend'de artık işlenmiyor
                        if (data.data.response) {
                          // Thinking steps log'u kaldırıldı
                        }
                        
                        // Duplicate kontrolü - normal akışta da processedEvents'e ekle
                        const eventKey = `ai_complete:${aiMsg.id}`;
                        if (processedEvents.has(eventKey)) {
                          console.log('ℹ️ [ai_complete case] ai_complete zaten işlendi:', aiMsg.id);
                          break;
                        }
                        processedEvents.add(eventKey);
                        
                        console.log('📤 onAIComplete callback çağrılıyor:', {
                          messageId: aiMsg.id,
                          textLength: aiMsg.text?.length || 0,
                          hasText: !!aiMsg.text
                        });
                        // CRITICAL FIX: isResolved flag'ini set etmeden önce callback'i çağır
                        // Çünkü callback içinde state güncellemeleri yapılacak
                        onAIComplete(aiMsg);
                        console.log('✅ onAIComplete callback çağrıldı');
                        // CRITICAL FIX: isResolved flag'ini callback'ten SONRA set et
                        // Böylece onload/onerror/ontimeout callback'leri processRemainingEvents çağırmaz
                        isResolved = true;
                      } else {
                        console.error('❌ Geçersiz ai_complete data:', {
                          hasData: !!data,
                          hasSuccess: !!data?.success,
                          hasAiMessage: !!data?.data?.aiMessage,
                          data: data
                        });
                        onError('AI cevabı alınamadı');
                      }
                      const totalDuration = Date.now() - requestStartTime;
                      console.log('✅ SSE stream tamamlandi:', {
                        totalDuration: `${totalDuration}ms`,
                        totalDurationSeconds: `${(totalDuration / 1000).toFixed(2)}s`,
                        eventCount
                      });
                      if (!isResolved && !isAborted) {
                        isResolved = true;
                      }
                      return;
                    case 'error':
                      if (isAborted) return;
                      // Timeout'ları temizle
                      if (connectionTimeout) {
                        clearTimeout(connectionTimeout);
                        connectionTimeout = null;
                      }
                      if (streamTimeout) {
                        clearTimeout(streamTimeout);
                        streamTimeout = null;
                      }
                      
                      // Error event formatını kontrol et - backend'den farklı formatlar gelebilir
                      // data.message, data.error, data.data.message, data.data.error formatlarını kontrol et
                      let errorMsg = 'Bir hata oluştu';
                      if (data?.message) {
                        errorMsg = data.message;
                      } else if (data?.error) {
                        errorMsg = data.error;
                      } else if (data?.data?.message) {
                        errorMsg = data.data.message;
                      } else if (data?.data?.error) {
                        errorMsg = data.data.error;
                      }
                      
                      // Eğer success: true ise ve data içinde userMessage varsa, bu gerçek bir error değil
                      // Backend'den yanlış parse edilmiş bir user_message event'i olabilir
                      if (data?.success === true && (data?.data?.userMessage || data?.userMessage)) {
                        console.warn('⚠️ Error event ama success: true ve userMessage var, yanlış parse edilmiş olabilir:', {
                          eventType,
                          dataKeys: Object.keys(data || {}),
                          dataDataKeys: data?.data ? Object.keys(data.data) : [],
                          hasUserMessage: !!(data?.data?.userMessage || data?.userMessage)
                        });
                        // Gerçek bir error değilse, devam et (user_message event'i olabilir)
                        break; // return yerine break - diğer event'ler gelebilir
                      }
                      
                      // Eğer success: true ise ve error/message yoksa, bu gerçek bir error değil
                      if (data?.success === true && !data?.error && !data?.message && !data?.data?.error && !data?.data?.message) {
                        console.warn('⚠️ Error event ama success: true ve hata mesajı yok, yanlış parse edilmiş olabilir:', {
                          eventType,
                          dataKeys: Object.keys(data || {}),
                          dataDataKeys: data?.data ? Object.keys(data.data) : []
                        });
                        // Gerçek bir error değilse, devam et
                        break; // return yerine break - diğer event'ler gelebilir
                      }
                      
                      // Detaylı hata loglama
                      console.error('❌ SSE error event:', {
                        message: errorMsg,
                        error: data?.error || data?.data?.error,
                        errorType: data?.errorType || data?.data?.errorType,
                        errorCode: data?.errorCode || data?.data?.errorCode,
                        details: data?.details || data?.data?.details,
                        success: data?.success,
                        fullData: data
                      });
                      
                      // Kullanıcıya daha detaylı mesaj göster (development'ta)
                      const details = data?.details || data?.data?.details;
                      const userErrorMsg = process.env.NODE_ENV === 'development' && details
                        ? `${errorMsg}\n\nDetay: ${details}`
                        : errorMsg;
                      
                      onError(userErrorMsg);
                      if (!isResolved && !isAborted) {
                        isResolved = true;
                      }
                      return;
                    default:
                      // Bilinmeyen event type
                      console.warn('⚠️ Bilinmeyen SSE event type:', eventType);
                      break;
                  }
                } catch (parseError) {
                  // JSON parse hatası - data muhtemelen tamamlanmamış veya geçersiz
                  // Sessizce atla, çünkü bir sonraki chunk ile düzelebilir
                  if (eventCount <= 10) {
                    // İlk 10 hata için detaylı log
                    console.warn('⚠️ SSE data parse hatası (sessizce atlandı):', {
                      event: eventType,
                      error: parseError instanceof Error ? parseError.message : String(parseError),
                      dataLength: eventData?.length || 0,
                      dataPreview: eventData?.substring(0, 150) || 'N/A',
                      dataEnd: eventData?.substring(Math.max(0, eventData.length - 50)) || 'N/A'
                    });
                  }
                  // Parse hatası olsa bile devam et - bir sonraki chunk düzeltebilir
                  continue;
                }
              }
            }
            
            // Buffer'ı güncelle - sadece tamamlanmamış kısmı tut
            buffer = incompleteEvent;
            
            // CRITICAL FIX: Buffer'da tamamlanmamış event varsa, özellikle ai_complete event'ini kontrol et
            // ai_complete event'i stream'in sonunda gelebilir ve tamamlanmamış olarak buffer'da kalabilir
            if (incompleteEvent && incompleteEvent.trim()) {
              // Buffer'da tamamlanmamış event var - ai_complete event'i olabilir
              // Eğer buffer'da "event: ai_complete" varsa, data'nın tamamını beklemek yerine
              // mevcut kısmı parse etmeyi dene (stream kapandığında tamamlanmış olabilir)
              if (incompleteEvent.includes('event: ai_complete')) {
                console.log('🔍 [onprogress] Buffer\'da tamamlanmamış ai_complete event\'i tespit edildi:', {
                  bufferLength: incompleteEvent.length,
                  bufferPreview: incompleteEvent.substring(0, 200)
                });
                
                // CRITICAL FIX: Tamamlanmamış olsa bile parse etmeyi dene
                // Çünkü stream kapandığında tamamlanmış olabilir
                // Ama önce responseText'in tamamını kontrol et
                if (xhr && xhr.responseText && !isResolved) {
                  console.log('🔍 [onprogress] Buffer\'da ai_complete var, responseText kontrol ediliyor:', {
                    responseTextLength: xhr.responseText.length,
                    bufferLength: incompleteEvent.length
                  });
                  processRemainingEvents(xhr.responseText);
                }
              }
            }
            
            // CRITICAL FIX: Her chunk işlendikten sonra responseText'in tamamını kontrol et
            // ai_complete event'i stream'in sonunda gelebilir ve hemen işlenmeli
            // isResolved kontrolünü kaldırdık - her zaman kontrol et (duplicate kontrolü processedEvents ile yapılıyor)
            if (xhr && xhr.responseText) {
              // Her chunk'ta kontrol etmek performans sorunu yaratabilir
              // Bu yüzden sadece son birkaç chunk'ta veya belirli aralıklarla kontrol et
              // Ama ai_complete event'i için her zaman kontrol et
              if (xhr.responseText.includes('event: ai_complete')) {
                console.log('🔍 [onprogress] responseText\'te ai_complete event\'i tespit edildi, işleniyor:', {
                  responseTextLength: xhr.responseText.length,
                  eventCount,
                  isResolved
                });
                processRemainingEvents(xhr.responseText);
              }
            }
          }
        };
        
        xhr.onload = () => {
          // CRITICAL FIX: Stream kapandığında responseText'in tamamını kontrol et
          // ai_complete event'i buffer'da veya responseText'in herhangi bir yerinde olabilir
          // processRemainingEvents içinde abort kontrolü var, bu yeterli
          if (xhr && xhr.responseText) {
            console.log('🔍 [onload] Stream kapandı, responseText kontrol ediliyor (ai_complete için):', {
              responseTextLength: xhr.responseText.length,
              bufferLength: buffer.length,
              isResolved,
              hasAiComplete: xhr.responseText.includes('event: ai_complete'),
              isAborted
            });
            
            // Önce responseText'in tamamını kontrol et (processRemainingEvents içinde abort kontrolü var)
            processRemainingEvents(xhr.responseText);
            
            // Sonra buffer'ı da kontrol et (eğer farklıysa) - abort kontrolü processRemainingEvents içinde
            if (buffer && buffer.trim() && buffer !== xhr.responseText) {
              processRemainingEvents(buffer);
            }
          } else if (buffer && buffer.trim()) {
            // Eğer responseText yoksa sadece buffer'ı kontrol et - abort kontrolü processRemainingEvents içinde
            console.log('🔍 [onload] Stream kapandı, buffer kontrol ediliyor (ai_complete için):', {
              bufferLength: buffer.length,
              isResolved,
              hasAiComplete: buffer.includes('event: ai_complete'),
              isAborted
            });
            processRemainingEvents(buffer);
          } else {
            console.log('ℹ️ [onload] Stream kapandı ama responseText ve buffer yok:', {
              isResolved,
              hasResponseText: !!(xhr && xhr.responseText),
              bufferLength: buffer.length,
              isAborted
            });
          }
          
          // Timeout'ları temizle
          if (connectionTimeout) {
            clearTimeout(connectionTimeout);
            connectionTimeout = null;
          }
          if (streamTimeout) {
            clearTimeout(streamTimeout);
            streamTimeout = null;
          }
          const totalDuration = Date.now() - requestStartTime;
          console.log('✅ SSE stream tamamlandi (onload):', {
            status: xhr?.status,
            totalDuration: `${totalDuration}ms`,
            eventCount
          });
          if (!isResolved && !isAborted) {
            isResolved = true;
          }
        };
        
        xhr.onerror = () => {
          if (isAborted) return;
          
          // CRITICAL FIX: Hata olsa bile responseText'i kontrol et
          // ai_complete event'i gelmiş olabilir
          // isResolved kontrolünü kaldırdık - her zaman kontrol et (duplicate kontrolü processedEvents ile yapılıyor)
          if (xhr && xhr.responseText && xhr.status === 200) {
            console.log('🔍 [onerror] Status 200, responseText kontrol ediliyor (ai_complete için):', {
              responseTextLength: xhr.responseText.length,
              isResolved,
              hasAiComplete: xhr.responseText.includes('event: ai_complete')
            });
            processRemainingEvents(xhr.responseText);
          }
          
          // Status 200 ise, bu gerçek bir hata değil (SSE stream normal kapanmış olabilir)
          // onload zaten çağrılmışsa veya çağrılacaksa, bu hatayı tamamen ignore et
          if (xhr?.status === 200 && (xhr?.readyState === 4 || isResolved)) {
            // Sessizce ignore et - log bile yazma (gereksiz log spam'ini önlemek için)
            return;
          }
          
          // Timeout'ları temizle
          if (connectionTimeout) {
            clearTimeout(connectionTimeout);
            connectionTimeout = null;
          }
          if (streamTimeout) {
            clearTimeout(streamTimeout);
            streamTimeout = null;
          }
          
          // Gerçek bir hata varsa logla ve callback çağır
          if (xhr?.status !== 200 && xhr?.status !== 0) {
            // Status 0 genellikle network hatası (offline, connection refused, etc.)
            // Status 200 dışındaki durumlar gerçek hatalar
            console.error('❌ XMLHttpRequest error:', {
              status: xhr?.status,
              statusText: xhr?.statusText,
              readyState: xhr?.readyState
            });
            onError(`Bağlantı hatası: ${xhr?.statusText || 'Sunucuya bağlanılamadı'}`);
          } else {
            // Status 200 veya 0 (ama readyState 4 değilse) - muhtemelen stream normal kapanmış
            // Sessizce ignore et - log yazma
          }
          
          if (!isResolved && !isAborted) {
            isResolved = true;
          }
        };
        
        xhr.ontimeout = () => {
          if (isAborted) return;
          
          // CRITICAL FIX: Timeout olsa bile responseText'i kontrol et
          // CRITICAL FIX: ontimeout her zaman processRemainingEvents çağırmalı
          // Çünkü ai_complete event'i stream'in sonunda gelebilir ve normal akışta kaçırılmış olabilir
          if (xhr && xhr.responseText) {
            console.log('🔍 [ontimeout] Timeout oldu, responseText kontrol ediliyor (ai_complete için):', {
              responseTextLength: xhr.responseText.length,
              status: xhr.status,
              isResolved
            });
            processRemainingEvents(xhr.responseText);
          }
          
          // Timeout'ları temizle
          if (connectionTimeout) {
            clearTimeout(connectionTimeout);
            connectionTimeout = null;
          }
          if (streamTimeout) {
            clearTimeout(streamTimeout);
            streamTimeout = null;
          }
          const timeoutDuration = Date.now() - requestStartTime;
          // Native timeout - bu durum normal olabilir (uzun AI cevapları için)
          // Log seviyesini düşür, sadece bilgilendirme amaçlı
          console.warn('⚠️ XMLHttpRequest native timeout (bu normal olabilir - uzun AI cevapları için):', {
            duration: `${timeoutDuration}ms`,
            durationSeconds: `${(timeoutDuration / 1000).toFixed(2)}s`,
            firstChunkReceived: !!firstChunkTime,
            eventCount
          });
          onError('İstek zaman aşımına uğradı. Lütfen tekrar deneyin.');
          if (!isResolved && !isAborted) {
            isResolved = true;
          }
        };
        
        // Native timeout'u da ayarla (fallback için)
        xhr.timeout = STREAM_TIMEOUT;
        
        // Request body gönder
        // CRITICAL: Telefonun tarih ve saat bilgisini backend'e gönder
        const deviceDate = new Date();
        const deviceDateString = deviceDate.toLocaleDateString('tr-TR', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
        const deviceTimeString = deviceDate.toLocaleTimeString('tr-TR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        
        xhr.send(JSON.stringify({ 
          conversationId, 
          message, 
          attachments, 
          promptType,
          deviceDate: deviceDateString,
          deviceTime: deviceTimeString,
          deviceTimestamp: deviceDate.toISOString()
        }));
        
        console.log('✅ XMLHttpRequest gonderildi, SSE stream bekleniyor...');
        
      } catch (error: any) {
        if (isAborted) return;
        console.error('❌ Streaming error:', error);
        onError(error.message || 'Streaming connection failed');
        if (!isResolved && !isAborted) {
          isResolved = true;
        }
      }
      })(); // IIFE - Immediately Invoked Function Expression
      
      return promise; // Promise'i döndür (abort fonksiyonu ile resolve edilmiş)
    } catch (error: any) {
      console.error('❌ sendMessageStream başlatılırken hata:', error);
      onError(error.message || 'Streaming başlatılamadı');
      // Hata durumunda da abort fonksiyonunu Promise olarak döndür
      return Promise.resolve(abort);
    }
  }

  async getMessages(conversationId: string, page: number = 1, limit: number = 50): Promise<ApiResponse<MessageData[]>> {
    return this.makeRequest(`/nirmind/conversations/${conversationId}/messages?page=${page}&limit=${limit}`);
  }

  async deleteMessage(messageId: string): Promise<ApiResponse<any>> {
    return this.makeRequest(`/nirmind/messages/${messageId}`, {
      method: 'DELETE',
    });
  }

  async analyzeAttachment(data: {
    conversationId: string;
    attachmentUrl: string;
    attachmentType: string;
  }): Promise<ApiResponse<any>> {
    return this.makeRequest('/nirmind/analyze', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // AI methods
  async getQuickSuggestions(): Promise<ApiResponse<{question: string, promptType: string}[]>> {
    return this.makeRequest('/nirmind/quick-suggestions');
  }

  async getQuestions(params?: { category?: string; limit?: number; page?: number }): Promise<ApiResponse<any>> {
    const queryParams = new URLSearchParams();
    if (params?.category) queryParams.append('category', params.category);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.page) queryParams.append('page', params.page.toString());
    
    const queryString = queryParams.toString();
    return this.makeRequest(`/nirmind/questions${queryString ? `?${queryString}` : ''}`);
  }

  async getResearchSuggestions(limit?: number): Promise<ApiResponse<{question: string, promptType: string}[]>> {
    const queryParams = new URLSearchParams();
    if (limit) queryParams.append('limit', limit.toString());
    
    const queryString = queryParams.toString();
    return this.makeRequest(`/nirmind/research-suggestions${queryString ? `?${queryString}` : ''}`);
  }

  async getAISuggestions(): Promise<ApiResponse<any>> {
    return this.makeRequest('/nirmind/suggestions');
  }

  async getAIPrompts(): Promise<ApiResponse<any>> {
    return this.makeRequest('/nirmind/prompts');
  }

  async getFAQ(): Promise<ApiResponse<any>> {
    return this.makeRequest('/nirmind/faq');
  }

  // Attachment upload methods
  async uploadAttachment(
    type: 'IMAGE' | 'FILE' | 'AUDIO' | 'VIDEO',
    base64Data: string,
    filename?: string,
    mimeType?: string
  ): Promise<ApiResponse<{
    url: string;
    relativeUrl: string;
    filename: string;
    size: number;
    mimeType: string;
    type: string;
  }>> {
    return this.makeRequest('/nirmind/attachments/upload', {
      method: 'POST',
      body: JSON.stringify({ type, base64Data, filename, mimeType }),
    });
  }

  async uploadMultipleAttachments(
    attachments: Array<{
      type: 'IMAGE' | 'FILE' | 'AUDIO' | 'VIDEO';
      base64Data: string;
      filename?: string;
      mimeType?: string;
    }>
  ): Promise<ApiResponse<Array<{
    success: boolean;
    data?: {
      url: string;
      relativeUrl: string;
      filename: string;
      size: number;
      mimeType: string;
      type: string;
    };
    error?: string;
  }>>> {
    return this.makeRequest('/nirmind/attachments/upload-multiple', {
      method: 'POST',
      body: JSON.stringify({ attachments }),
    });
  }

  // Audio transcription (dikte için)
  async transcribeAudio(
    audioData: string, // Base64 encoded audio
    language: string = 'tr',
    audioType: string = 'audio/m4a'
  ): Promise<ApiResponse<{
    text: string;
    language: string;
  }>> {
    return this.makeRequest('/nirmind/audio/transcribe', {
      method: 'POST',
      body: JSON.stringify({ audioData, language, audioType }),
    });
  }

  // ==================== Nirpax Auth Routes (Cross-App) ====================

  async verifyNirpaxToken(token: string): Promise<ApiResponse<any>> {
    // Nirpax token'ını doğrulamak için Nirpax backend'ini kullan
    const response = await fetch(`${API_BASE_URL}/nirpax/auth/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });

    const data = await response.json();
    return {
      success: response.ok,
      data: data.data,
      error: data.error || data.message,
    };
  }

  async crossAppLogin(sourceApp: string, sourceToken: string): Promise<ApiResponse<any>> {
    return this.makeRequest('/nirpax/auth/cross-app-login', {
      method: 'POST',
      body: JSON.stringify({ sourceApp, sourceToken }),
    });
  }

  async googleAuth(data: {
    idToken: string;
    accessToken: string;
    email: string;
    displayName: string;
    photoURL?: string;
  }): Promise<ApiResponse<any>> {
    // Backend user objesi bekliyor: { idToken, accessToken, user: { email, name, photo, ... } }
    const nameParts = data.displayName?.split(' ') || [];
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    
    const requestBody = {
      idToken: data.idToken,
      accessToken: data.accessToken,
      user: {
        email: data.email,
        name: data.displayName || '',
        givenName: firstName,
        familyName: lastName,
        photo: data.photoURL || '',
      },
    };
    
    console.log('📤 Google Auth Request Body:', {
      hasIdToken: !!requestBody.idToken,
      hasAccessToken: !!requestBody.accessToken,
      email: requestBody.user.email,
      name: requestBody.user.name,
      idTokenPreview: requestBody.idToken ? requestBody.idToken.substring(0, 20) + '...' : 'missing'
    });
    
    return this.makeRequest('/nirmind/auth/google', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });
  }

  async appleAuth(data: {
    identityToken: string;
    authorizationCode: string;
    user: {
      email: string;
      name?: {
        firstName: string;
        lastName: string;
      } | null;
    };
  }): Promise<ApiResponse<any>> {
    console.log('🌐 Apple Auth Request:', `${API_BASE_URL}/nirmind/auth/apple`);
    console.log('📤 Apple Auth Data:', JSON.stringify(data, null, 2));
    
    return this.makeRequest('/nirmind/auth/apple', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

export default BackendApiService;

