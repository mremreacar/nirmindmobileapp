import AsyncStorage from '@react-native-async-storage/async-storage';

// Backend API URL - Nircore backend
const API_BASE_URL = 'https://nirpax.com/api';

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
    options: RequestInit = {}
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
        headers['Authorization'] = `Bearer ${token}`;
      }

      const fullUrl = `${API_BASE_URL}${endpoint}`;
      console.log('🌐 API Request:', options.method || 'GET', fullUrl);
      console.log('📤 Request Headers:', JSON.stringify(headers, null, 2));
      
      // Request body varsa logla (ilk 200 karakter)
      if (options.body) {
        const bodyPreview = typeof options.body === 'string' 
          ? options.body.substring(0, 200) + (options.body.length > 200 ? '...' : '')
          : JSON.stringify(options.body).substring(0, 200);
        console.log('📤 Request Body Preview:', bodyPreview);
        console.log('📤 Request Body Size:', typeof options.body === 'string' ? options.body.length : JSON.stringify(options.body).length, 'bytes');
      }
      
      // Fetch options - Network timeout ve retry için optimize edilmiş
      const fetchOptions: RequestInit = {
        method: options.method || 'GET',
        headers: headers as HeadersInit,
        ...options,
        cache: 'no-cache',
        credentials: 'omit', // CORS için
      };
      
      // Network timeout için AbortController kullan
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 saniye timeout (artırıldı)
      fetchOptions.signal = controller.signal;
      
      let response: Response;
      let lastError: any = null;
      const maxRetries = 3; // Toplam 4 deneme (1 ilk + 3 retry)
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
            console.log(`🔄 Retry attempt ${attempt}/${maxRetries} after ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            
            // Yeni timeout için yeni controller oluştur
            const retryController = new AbortController();
            const retryTimeoutId = setTimeout(() => retryController.abort(), 30000);
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
            console.error(`❌ Network error (attempt ${attempt + 1}/${maxRetries + 1}):`, fetchError.message || fetchError.name);
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
      
      if (!response!) {
        return {
          success: false,
          error: 'Bağlantı hatası',
          message: `Sunucuya bağlanılamadı. Tüm denemeler tükendi. (${API_BASE_URL})`,
        };
      }
      
      console.log('📥 Response Status:', response.status, response.statusText);
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });
      console.log('📥 Response Headers:', JSON.stringify(responseHeaders, null, 2));

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
        data = await response.json();
      } else {
        // HTML veya başka bir format döndüyse
        const text = await response.text();
        
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
  async getUserProfile(): Promise<ApiResponse<any>> {
    return this.makeRequest('/nirmind/users/profile');
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
  async getConversations(): Promise<ApiResponse<ConversationData[]>> {
    return this.makeRequest('/nirmind/conversations');
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
  async sendMessageStream(
    conversationId: string,
    message: string,
    attachments: any[],
    promptType: string | undefined,
    onUserMessage: (userMessage: any) => void,
    onAIStart: () => void,
    onAIChunk: (chunk: string, fullContent: string) => void,
    onAIComplete: (aiMessage: any) => void,
    onError: (error: string) => void
  ): Promise<void> {
    const token = await this.getAuthToken();
    if (!token) {
      onError('Authentication token not found');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/nirmind/messages/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ conversationId, message, attachments, promptType }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        onError(errorData.message || `HTTP error! status: ${response.status}`);
        return;
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      if (!reader) {
        onError('Response body reader not available');
        return;
      }

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const eventBlock of events) {
          if (!eventBlock.trim()) continue;
          
          let eventType = '';
          let eventData = '';
          
          const lines = eventBlock.split('\n');
          for (const line of lines) {
            if (line.startsWith('event: ')) {
              eventType = line.substring(7).trim();
            } else if (line.startsWith('data: ')) {
              eventData = line.substring(6).trim();
            }
          }
          
          if (eventType && eventData) {
            try {
              const data = JSON.parse(eventData);
              
              switch (eventType) {
                case 'user_message':
                  if (data.success && data.data?.userMessage) {
                    onUserMessage(data.data.userMessage);
                  }
                  break;
                case 'ai_start':
                  onAIStart();
                  break;
                case 'ai_chunk':
                  if (data.content && data.fullContent) {
                    onAIChunk(data.content, data.fullContent);
                  }
                  break;
                case 'ai_complete':
                  if (data.success && data.data?.aiMessage) {
                    onAIComplete(data.data.aiMessage);
                  }
                  break;
                case 'error':
                  onError(data.message || data.error || 'An error occurred');
                  return;
              }
            } catch (parseError) {
              console.error('❌ SSE data parse error:', parseError, 'Event:', eventType, 'Data:', eventData);
            }
          }
        }
      }
    } catch (error: any) {
      console.error('❌ Streaming error:', error);
      onError(error.message || 'Streaming connection failed');
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
    const response = await fetch('https://nirpax.com/api/nirpax/auth/verify', {
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

