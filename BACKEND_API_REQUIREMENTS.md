# Backend API Requirements - NirMind App

## 📋 Genel Bakış

Bu dokümantasyon, NirMind uygulamasının tüm sayfalarını analiz ederek backend'de ihtiyaç duyulan API'leri detaylandırır.

## 🗂️ Sayfa Analizi

### 1. HomeScreen (`src/pages/HomeScreen.tsx`)
**Amaç**: Ana sayfa, hızlı öneriler ve chat başlatma

**Mevcut Özellikler**:
- Hızlı öneriler (Oneriler, Araştırma, Hızlı Sorular)
- Chat başlatma
- Dikte özelliği
- Dosya/resim seçimi

**Backend API İhtiyaçları**:
- Hızlı öneriler için statik veri (şimdilik frontend'de)

### 2. ChatScreen (`src/pages/ChatScreen.tsx`)
**Amaç**: Ana chat arayüzü, mesajlaşma ve AI entegrasyonu

**Mevcut Özellikler**:
- Mesaj gönderme/alma
- Dosya/resim yükleme
- AI analizi
- Dikte özelliği
- Hızlı öneriler

**Backend API İhtiyaçları**:
- Chat mesajları CRUD
- Dosya yükleme
- AI entegrasyonu
- Kullanıcı yönetimi

### 3. ChatHistoryScreen (`src/pages/ChatHistoryScreen.tsx`)
**Amaç**: Geçmiş konuşmaları listeleme ve yönetme

**Mevcut Özellikler**:
- Konuşma listesi
- Konuşma silme
- Konuşma başlığı güncelleme
- Konuşma seçme

**Backend API İhtiyaçları**:
- Konuşma CRUD
- Kullanıcı bazlı filtreleme

### 4. Diğer Sayfalar
- **SettingsScreen**: Ayarlar (şimdilik frontend'de)
- **ProfileScreen**: Profil (şimdilik frontend'de)

## 🔧 Mevcut Servisler

### 1. Firebase Service (`services/firebaseService.ts`)
**Mevcut API'ler**:
- `createConversation()`
- `saveMessage()`
- `getConversationHistory()`
- `getUserConversations()`
- `deleteConversation()`
- `updateConversationTitle()`

### 2. OpenAI Service (`services/openaiService.ts`)
**Mevcut API'ler**:
- `sendMessage()`
- `analyzeImage()`

### 3. File Service (`services/fileService.ts`)
**Mevcut API'ler**:
- `uploadAndAnalyzeFile()`
- `isFileTypeSupported()`

## 📊 Backend API Gereksinimleri

### 1. Authentication APIs

#### 1.1 User Registration
```bash
# POST /api/auth/register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "displayName": "User Name"
  }'
```
**Neden Gerekli**: Kullanıcı kayıt işlemi için
**Kullanıldığı Sayfa**: Tüm sayfalar (authentication)

#### 1.2 User Login
```bash
# POST /api/auth/login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```
**Neden Gerekli**: Kullanıcı giriş işlemi için
**Kullanıldığı Sayfa**: Tüm sayfalar (authentication)

#### 1.3 Token Refresh
```bash
# POST /api/auth/refresh
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Authorization: Bearer <token>"
```
**Neden Gerekli**: Token yenileme için
**Kullanıldığı Sayfa**: Tüm sayfalar (authentication)

#### 1.4 Google OAuth Login
```bash
# POST /api/auth/google
curl -X POST http://localhost:3000/api/auth/google \
  -H "Content-Type: application/json" \
  -d '{
    "idToken": "google_id_token",
    "accessToken": "google_access_token",
    "email": "user@gmail.com",
    "displayName": "User Name",
    "photoURL": "https://lh3.googleusercontent.com/photo.jpg"
  }'
```

**Response Format**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user123",
      "email": "user@gmail.com",
      "displayName": "User Name",
      "photoURL": "https://lh3.googleusercontent.com/photo.jpg",
      "provider": "google",
      "isNewUser": false
    },
    "tokens": {
      "accessToken": "jwt_access_token",
      "refreshToken": "jwt_refresh_token",
      "expiresIn": 3600
    }
  }
}
```
**Neden Gerekli**: Google ile giriş yapma için
**Kullanıldığı Sayfa**: LoginMethodScreen, tüm sayfalar

#### 1.5 Apple Sign-In
```bash
# POST /api/auth/apple
curl -X POST http://localhost:3000/api/auth/apple \
  -H "Content-Type: application/json" \
  -d '{
    "identityToken": "apple_identity_token",
    "authorizationCode": "apple_auth_code",
    "user": {
      "email": "user@privaterelay.appleid.com",
      "name": {
        "firstName": "John",
        "lastName": "Doe"
      }
    }
  }'
```

**Response Format**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user123",
      "email": "user@privaterelay.appleid.com",
      "displayName": "John Doe",
      "provider": "apple",
      "isNewUser": true
    },
    "tokens": {
      "accessToken": "jwt_access_token",
      "refreshToken": "jwt_refresh_token",
      "expiresIn": 3600
    }
  }
}
```
**Neden Gerekli**: Apple ile giriş yapma için
**Kullanıldığı Sayfa**: LoginMethodScreen, tüm sayfalar

#### 1.6 Nirpax OAuth Login
```bash
# POST /api/auth/nirpax
curl -X POST http://localhost:3000/api/auth/nirpax \
  -H "Content-Type: application/json" \
  -d '{
    "accessToken": "nirpax_access_token",
    "refreshToken": "nirpax_refresh_token",
    "user": {
      "id": "nirpax_user_id",
      "email": "user@nirpax.com",
      "displayName": "Nirpax User",
      "company": "Nirpax Company"
    }
  }'
```

**Response Format**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user123",
      "email": "user@nirpax.com",
      "displayName": "Nirpax User",
      "company": "Nirpax Company",
      "provider": "nirpax",
      "isNewUser": false
    },
    "tokens": {
      "accessToken": "jwt_access_token",
      "refreshToken": "jwt_refresh_token",
      "expiresIn": 3600
    }
  }
}
```
**Neden Gerekli**: Nirpax ile giriş yapma için
**Kullanıldığı Sayfa**: LoginMethodScreen, tüm sayfalar

#### 1.7 Social Login Callback
```bash
# GET /api/auth/callback/{provider}?code=auth_code&state=state_value
curl -X GET "http://localhost:3000/api/auth/callback/google?code=auth_code&state=state_value"
```

**Response Format**:
```json
{
  "success": true,
  "data": {
    "redirectUrl": "nirmind://auth/success?token=jwt_token",
    "user": {
      "id": "user123",
      "email": "user@example.com",
      "displayName": "User Name",
      "provider": "google"
    }
  }
}
```
**Neden Gerekli**: OAuth callback işlemi için
**Kullanıldığı Sayfa**: LoginMethodScreen

### 2. Chat Management APIs

#### 2.1 Create Conversation
```bash
# POST /api/conversations
curl -X POST http://localhost:3000/api/conversations \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Yeni Sohbet",
    "userId": "user123"
  }'
```
**Neden Gerekli**: Yeni konuşma oluşturmak için
**Kullanıldığı Sayfa**: HomeScreen, ChatScreen

#### 2.2 Get User Conversations (Kullanıcı Bazlı Mesaj Geçmişi)
```bash
# GET /api/conversations?userId=user123&page=1&limit=20
curl -X GET "http://localhost:3000/api/conversations?userId=user123&page=1&limit=20" \
  -H "Authorization: Bearer <token>"
```

**Response Format**:
```json
{
  "success": true,
  "data": {
    "conversations": [
      {
        "id": "conv123",
        "title": "AI ile Sohbet",
        "userId": "user123",
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-01T12:00:00Z",
        "messageCount": 15,
        "lastMessage": {
          "text": "Son mesaj metni...",
          "timestamp": "2024-01-01T12:00:00Z",
          "isUser": true
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "totalPages": 3
    }
  }
}
```
**Neden Gerekli**: Kullanıcının konuşmalarını listelemek için
**Kullanıldığı Sayfa**: ChatHistoryScreen

#### 2.3 Get Conversation Messages (Detaylı Mesaj Geçmişi)
```bash
# GET /api/conversations/{conversationId}/messages?page=1&limit=50
curl -X GET "http://localhost:3000/api/conversations/conv123/messages?page=1&limit=50" \
  -H "Authorization: Bearer <token>"
```

**Response Format**:
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "msg123",
        "text": "Merhaba, nasılsın?",
        "isUser": true,
        "timestamp": "2024-01-01T00:00:00Z",
        "conversationId": "conv123",
        "attachments": [
          {
            "id": "att123",
            "type": "image",
            "url": "https://example.com/image.jpg",
            "filename": "image.jpg",
            "size": 1024
          }
        ]
      },
      {
        "id": "msg124",
        "text": "Merhaba! İyiyim, teşekkürler. Sana nasıl yardımcı olabilirim?",
        "isUser": false,
        "timestamp": "2024-01-01T00:01:00Z",
        "conversationId": "conv123",
        "attachments": []
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 25,
      "totalPages": 1
    }
  }
}
```
**Neden Gerekli**: Konuşma mesajlarını almak için
**Kullanıldığı Sayfa**: ChatScreen

#### 2.4 Save Message (Mesaj Kaydetme API)
```bash
# POST /api/conversations/{conversationId}/messages
curl -X POST http://localhost:3000/api/conversations/conv123/messages \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Merhaba, bu bir test mesajı",
    "isUser": true,
    "timestamp": "2024-01-01T00:00:00Z",
    "attachments": [
      {
        "type": "image",
        "url": "https://example.com/image.jpg",
        "filename": "image.jpg",
        "size": 1024
      }
    ]
  }'
```

**Response Format**:
```json
{
  "success": true,
  "data": {
    "message": {
      "id": "msg123",
      "text": "Merhaba, bu bir test mesajı",
      "isUser": true,
      "timestamp": "2024-01-01T00:00:00Z",
      "conversationId": "conv123",
      "attachments": [
        {
          "id": "att123",
          "type": "image",
          "url": "https://example.com/image.jpg",
          "filename": "image.jpg",
          "size": 1024
        }
      ]
    }
  }
}
```
**Neden Gerekli**: Mesaj kaydetmek için
**Kullanıldığı Sayfa**: ChatScreen

#### 2.5 Update Conversation Title
```bash
# PUT /api/conversations/{conversationId}
curl -X PUT http://localhost:3000/api/conversations/conv123 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Güncellenmiş Başlık"
  }'
```
**Neden Gerekli**: Konuşma başlığını güncellemek için
**Kullanıldığı Sayfa**: ChatHistoryScreen

#### 2.6 Delete Conversation
```bash
# DELETE /api/conversations/{conversationId}
curl -X DELETE http://localhost:3000/api/conversations/conv123 \
  -H "Authorization: Bearer <token>"
```
**Neden Gerekli**: Konuşma silmek için
**Kullanıldığı Sayfa**: ChatHistoryScreen

### 3. File Upload APIs

#### 3.1 Upload File
```bash
# POST /api/files/upload
curl -X POST http://localhost:3000/api/files/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@/path/to/file.pdf" \
  -F "conversationId=conv123"
```
**Neden Gerekli**: Dosya yüklemek için
**Kullanıldığı Sayfa**: ChatScreen, HomeScreen

#### 3.2 Upload Image
```bash
# POST /api/files/upload-image
curl -X POST http://localhost:3000/api/files/upload-image \
  -H "Authorization: Bearer <token>" \
  -F "image=@/path/to/image.jpg" \
  -F "conversationId=conv123"
```
**Neden Gerekli**: Resim yüklemek için
**Kullanıldığı Sayfa**: ChatScreen, HomeScreen

#### 3.3 Get File
```bash
# GET /api/files/{fileId}
curl -X GET http://localhost:3000/api/files/file123 \
  -H "Authorization: Bearer <token>"
```
**Neden Gerekli**: Dosya indirmek için
**Kullanıldığı Sayfa**: ChatScreen

### 4. AI Integration APIs

#### 4.1 Send Message to AI
```bash
# POST /api/ai/chat
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Merhaba",
    "conversationId": "conv123",
    "userId": "user123"
  }'
```
**Neden Gerekli**: AI ile mesajlaşmak için
**Kullanıldığı Sayfa**: ChatScreen

#### 4.2 Analyze Image
```bash
# POST /api/ai/analyze-image
curl -X POST http://localhost:3000/api/ai/analyze-image \
  -H "Authorization: Bearer <token>" \
  -F "image=@/path/to/image.jpg" \
  -F "conversationId=conv123"
```
**Neden Gerekli**: Resim analizi için
**Kullanıldığı Sayfa**: ChatScreen

#### 4.3 Analyze File
```bash
# POST /api/ai/analyze-file
curl -X POST http://localhost:3000/api/ai/analyze-file \
  -H "Authorization: Bearer <token>" \
  -F "file=@/path/to/file.pdf" \
  -F "conversationId=conv123"
```
**Neden Gerekli**: Dosya analizi için
**Kullanıldığı Sayfa**: ChatScreen

### 5. User Management APIs

#### 5.1 Get User Profile
```bash
# GET /api/users/profile
curl -X GET http://localhost:3000/api/users/profile \
  -H "Authorization: Bearer <token>"
```

**Response Format**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user123",
      "email": "user@example.com",
      "displayName": "User Name",
      "photoURL": "https://lh3.googleusercontent.com/photo.jpg",
      "provider": "google",
      "company": "Nirpax Company",
      "isEmailVerified": true,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T12:00:00Z",
      "preferences": {
        "language": "tr",
        "theme": "dark",
        "notifications": {
          "email": true,
          "push": true,
          "marketing": false
        }
      },
      "statistics": {
        "totalMessages": 150,
        "totalConversations": 5,
        "lastActiveAt": "2024-01-01T12:00:00Z"
      }
    }
  }
}
```
**Neden Gerekli**: Kullanıcı profil bilgilerini almak için
**Kullanıldığı Sayfa**: ProfileScreen, tüm sayfalar

#### 5.2 Update User Profile
```bash
# PUT /api/users/profile
curl -X PUT http://localhost:3000/api/users/profile \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "displayName": "Yeni İsim",
    "photoURL": "https://example.com/new-photo.jpg",
    "preferences": {
      "language": "en",
      "theme": "light",
      "notifications": {
        "email": false,
        "push": true,
        "marketing": true
      }
    }
  }'
```

**Response Format**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user123",
      "email": "user@example.com",
      "displayName": "Yeni İsim",
      "photoURL": "https://example.com/new-photo.jpg",
      "provider": "google",
      "company": "Nirpax Company",
      "isEmailVerified": true,
      "updatedAt": "2024-01-01T13:00:00Z",
      "preferences": {
        "language": "en",
        "theme": "light",
        "notifications": {
          "email": false,
          "push": true,
          "marketing": true
        }
      }
    }
  }
}
```
**Neden Gerekli**: Kullanıcı profilini güncellemek için
**Kullanıldığı Sayfa**: ProfileScreen

#### 5.3 Update User Preferences
```bash
# PUT /api/users/preferences
curl -X PUT http://localhost:3000/api/users/preferences \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "language": "tr",
    "theme": "dark",
    "notifications": {
      "email": true,
      "push": false,
      "marketing": false
    }
  }'
```

#### 5.4 Upload Profile Photo
```bash
# POST /api/users/profile/photo
curl -X POST http://localhost:3000/api/users/profile/photo \
  -H "Authorization: Bearer <token>" \
  -F "photo=@/path/to/photo.jpg"
```

**Response Format**:
```json
{
  "success": true,
  "data": {
    "photoURL": "https://storage.example.com/users/user123/photo.jpg",
    "updatedAt": "2024-01-01T13:00:00Z"
  }
}
```

#### 5.5 Delete Profile Photo
```bash
# DELETE /api/users/profile/photo
curl -X DELETE http://localhost:3000/api/users/profile/photo \
  -H "Authorization: Bearer <token>"
```

#### 5.6 Change Password (Email Users Only)
```bash
# PUT /api/users/password
curl -X PUT http://localhost:3000/api/users/password \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "old_password",
    "newPassword": "new_password"
  }'
```

#### 5.7 Get User Activity
```bash
# GET /api/users/activity?page=1&limit=20
curl -X GET "http://localhost:3000/api/users/activity?page=1&limit=20" \
  -H "Authorization: Bearer <token>"
```

**Response Format**:
```json
{
  "success": true,
  "data": {
    "activities": [
      {
        "id": "act123",
        "type": "conversation_created",
        "description": "Yeni konuşma oluşturuldu",
        "timestamp": "2024-01-01T12:00:00Z",
        "metadata": {
          "conversationId": "conv123",
          "conversationTitle": "AI ile Sohbet"
        }
      },
      {
        "id": "act124",
        "type": "message_sent",
        "description": "Mesaj gönderildi",
        "timestamp": "2024-01-01T11:30:00Z",
        "metadata": {
          "conversationId": "conv123",
          "messageLength": 25
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

#### 5.8 Delete User Account
```bash
# DELETE /api/users/account
curl -X DELETE http://localhost:3000/api/users/account \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "confirmation": "DELETE_ACCOUNT",
    "password": "user_password"
  }'
```

**Response Format**:
```json
{
  "success": true,
  "data": {
    "message": "Hesap başarıyla silindi",
    "deletedAt": "2024-01-01T13:00:00Z"
  }
}
```

### 6. Quick Suggestions APIs

#### 6.1 Get Quick Suggestions
```bash
# GET /api/suggestions/quick
curl -X GET http://localhost:3000/api/suggestions/quick \
  -H "Authorization: Bearer <token>"
```
**Neden Gerekli**: Hızlı öneriler için
**Kullanıldığı Sayfa**: HomeScreen, ChatScreen

#### 6.2 Get Research Suggestions
```bash
# GET /api/suggestions/research
curl -X GET http://localhost:3000/api/suggestions/research \
  -H "Authorization: Bearer <token>"
```
**Neden Gerekli**: Araştırma önerileri için
**Kullanıldığı Sayfa**: HomeScreen

### 7. FAQ (Sık Sorulan Sorular) APIs

#### 7.1 Get FAQ Categories
```bash
# GET /api/faq/categories
curl -X GET http://localhost:3000/api/faq/categories \
  -H "Authorization: Bearer <token>"
```

**Response Format**:
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "id": "cat123",
        "name": "Genel Sorular",
        "description": "Uygulama hakkında genel sorular",
        "icon": "help-circle",
        "questionCount": 15,
        "order": 1
      },
      {
        "id": "cat124",
        "name": "Teknik Destek",
        "description": "Teknik sorunlar ve çözümler",
        "icon": "settings",
        "questionCount": 8,
        "order": 2
      }
    ]
  }
}
```

#### 7.2 Get FAQ Questions by Category
```bash
# GET /api/faq/categories/{categoryId}/questions
curl -X GET "http://localhost:3000/api/faq/categories/cat123/questions" \
  -H "Authorization: Bearer <token>"
```

**Response Format**:
```json
{
  "success": true,
  "data": {
    "questions": [
      {
        "id": "faq123",
        "question": "NirMind nasıl çalışır?",
        "answer": "NirMind, yapay zeka destekli bir asistan uygulamasıdır...",
        "categoryId": "cat123",
        "tags": ["genel", "nasıl-çalışır"],
        "helpful": 25,
        "notHelpful": 2,
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-01T12:00:00Z"
      }
    ]
  }
}
```

#### 7.3 Search FAQ Questions
```bash
# GET /api/faq/search?q=arama_terimi&categoryId=cat123
curl -X GET "http://localhost:3000/api/faq/search?q=nasıl&categoryId=cat123" \
  -H "Authorization: Bearer <token>"
```

#### 7.4 Rate FAQ Question
```bash
# POST /api/faq/{questionId}/rate
curl -X POST http://localhost:3000/api/faq/faq123/rate \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "rating": "helpful",
    "feedback": "Çok faydalı oldu"
  }'
```

#### 7.5 Submit FAQ Question
```bash
# POST /api/faq/submit
curl -X POST http://localhost:3000/api/faq/submit \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Yeni soru metni",
    "categoryId": "cat123",
    "userEmail": "user@example.com"
  }'
```

### 8. AI Prompt Management APIs

#### 8.1 Get AI Prompts
```bash
# GET /api/ai/prompts?type=chat&category=general
curl -X GET "http://localhost:3000/api/ai/prompts?type=chat&category=general" \
  -H "Authorization: Bearer <token>"
```

**Response Format**:
```json
{
  "success": true,
  "data": {
    "prompts": [
      {
        "id": "prompt123",
        "name": "Genel Sohbet",
        "description": "Genel konularda sohbet için",
        "content": "Sen yardımcı bir AI asistanısın. Kullanıcıya nazik ve yararlı cevaplar ver.",
        "type": "chat",
        "category": "general",
        "variables": ["user_name", "context"],
        "isActive": true,
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-01T12:00:00Z"
      }
    ]
  }
}
```

#### 8.2 Get AI Prompt by ID
```bash
# GET /api/ai/prompts/{promptId}
curl -X GET http://localhost:3000/api/ai/prompts/prompt123 \
  -H "Authorization: Bearer <token>"
```

#### 8.3 Create AI Prompt
```bash
# POST /api/ai/prompts
curl -X POST http://localhost:3000/api/ai/prompts \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Yeni Prompt",
    "description": "Yeni prompt açıklaması",
    "content": "Prompt içeriği...",
    "type": "chat",
    "category": "general",
    "variables": ["user_name"]
  }'
```

#### 8.4 Update AI Prompt
```bash
# PUT /api/ai/prompts/{promptId}
curl -X PUT http://localhost:3000/api/ai/prompts/prompt123 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Güncellenmiş Prompt",
    "content": "Güncellenmiş prompt içeriği...",
    "isActive": true
  }'
```

#### 8.5 Delete AI Prompt
```bash
# DELETE /api/ai/prompts/{promptId}
curl -X DELETE http://localhost:3000/api/ai/prompts/prompt123 \
  -H "Authorization: Bearer <token>"
```

#### 8.6 Get AI Prompt Categories
```bash
# GET /api/ai/prompts/categories
curl -X GET http://localhost:3000/api/ai/prompts/categories \
  -H "Authorization: Bearer <token>"
```

**Response Format**:
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "id": "cat123",
        "name": "Genel Sohbet",
        "description": "Genel konularda sohbet",
        "promptCount": 5,
        "isActive": true
      },
      {
        "id": "cat124",
        "name": "Teknik Destek",
        "description": "Teknik konularda yardım",
        "promptCount": 3,
        "isActive": true
      }
    ]
  }
}
```

#### 8.7 Execute AI Prompt
```bash
# POST /api/ai/prompts/{promptId}/execute
curl -X POST http://localhost:3000/api/ai/prompts/prompt123/execute \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "variables": {
      "user_name": "John Doe",
      "context": "Yardım istiyorum"
    },
    "conversationId": "conv123"
  }'
```

## 🔄 Mevcut Firebase Service Mapping

### Firebase → Backend API Mapping

| Firebase Function | Backend API | Method |
|------------------|-------------|---------|
| `createConversation()` | `/api/conversations` | POST |
| `saveMessage()` | `/api/conversations/{id}/messages` | POST |
| `getConversationHistory()` | `/api/conversations/{id}/messages` | GET |
| `getUserConversations()` | `/api/conversations` | GET |
| `deleteConversation()` | `/api/conversations/{id}` | DELETE |
| `updateConversationTitle()` | `/api/conversations/{id}` | PUT |

## 📱 Sayfa Bazlı API Kullanımı

### HomeScreen
- **Authentication**: Login/Register
- **Quick Suggestions**: GET /api/suggestions/quick
- **File Upload**: POST /api/files/upload
- **Create Conversation**: POST /api/conversations

### ChatScreen
- **Send Message**: POST /api/ai/chat
- **File Upload**: POST /api/files/upload
- **Image Analysis**: POST /api/ai/analyze-image
- **Save Message**: POST /api/conversations/{id}/messages
- **Get Messages**: GET /api/conversations/{id}/messages

### ChatHistoryScreen
- **Get Conversations**: GET /api/conversations
- **Delete Conversation**: DELETE /api/conversations/{id}
- **Update Title**: PUT /api/conversations/{id}

### ProfileScreen
- **Get User Profile**: GET /api/users/profile
- **Update User Profile**: PUT /api/users/profile
- **Update Preferences**: PUT /api/users/preferences
- **Upload Profile Photo**: POST /api/users/profile/photo
- **Delete Profile Photo**: DELETE /api/users/profile/photo
- **Change Password**: PUT /api/users/password (Email users only)
- **Get User Activity**: GET /api/users/activity
- **Delete Account**: DELETE /api/users/account

### HelpCenterScreen
- **Get FAQ Categories**: GET /api/faq/categories
- **Get FAQ Questions**: GET /api/faq/categories/{id}/questions
- **Search FAQ**: GET /api/faq/search
- **Rate FAQ Question**: POST /api/faq/{id}/rate
- **Submit FAQ Question**: POST /api/faq/submit
- **Get AI Prompts**: GET /api/ai/prompts
- **Execute AI Prompt**: POST /api/ai/prompts/{id}/execute

## 🗄️ Veritabanı Şeması

### Users Tablosu
```sql
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255), -- NULL olabilir (OAuth kullanıcıları için)
  display_name VARCHAR(255),
  photo_url VARCHAR(500), -- Profil fotoğrafı URL'i
  provider ENUM('email', 'google', 'apple', 'nirpax') DEFAULT 'email',
  provider_id VARCHAR(255), -- OAuth provider'dan gelen ID
  company VARCHAR(255), -- Nirpax kullanıcıları için şirket bilgisi
  is_email_verified BOOLEAN DEFAULT FALSE,
  last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  
  -- OAuth provider bilgileri için unique constraint
  UNIQUE KEY unique_provider (provider, provider_id)
);
```

### User Preferences Tablosu
```sql
CREATE TABLE user_preferences (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  language VARCHAR(5) DEFAULT 'tr',
  theme ENUM('light', 'dark', 'auto') DEFAULT 'auto',
  email_notifications BOOLEAN DEFAULT TRUE,
  push_notifications BOOLEAN DEFAULT TRUE,
  marketing_notifications BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_preferences (user_id)
);
```

### User Activities Tablosu
```sql
CREATE TABLE user_activities (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  activity_type ENUM(
    'conversation_created',
    'message_sent',
    'file_uploaded',
    'profile_updated',
    'login',
    'logout'
  ) NOT NULL,
  description TEXT NOT NULL,
  metadata JSON, -- Ek bilgiler için JSON field
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_activities_user_id (user_id),
  INDEX idx_user_activities_timestamp (timestamp)
);
```

### Conversations Tablosu
```sql
CREATE TABLE conversations (
  id VARCHAR(36) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Messages Tablosu
```sql
CREATE TABLE messages (
  id VARCHAR(36) PRIMARY KEY,
  conversation_id VARCHAR(36) NOT NULL,
  text TEXT NOT NULL,
  is_user BOOLEAN NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);
```

### Attachments Tablosu
```sql
CREATE TABLE attachments (
  id VARCHAR(36) PRIMARY KEY,
  message_id VARCHAR(36) NOT NULL,
  type ENUM('image', 'file', 'audio', 'video') NOT NULL,
  url VARCHAR(500) NOT NULL,
  filename VARCHAR(255),
  size INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
);
```

### FAQ Categories Tablosu
```sql
CREATE TABLE faq_categories (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(100),
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### FAQ Questions Tablosu
```sql
CREATE TABLE faq_questions (
  id VARCHAR(36) PRIMARY KEY,
  category_id VARCHAR(36) NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  tags JSON, -- ["genel", "nasıl-çalışır"] gibi tag array'i
  helpful_count INTEGER DEFAULT 0,
  not_helpful_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (category_id) REFERENCES faq_categories(id) ON DELETE CASCADE,
  INDEX idx_faq_questions_category (category_id),
  FULLTEXT INDEX idx_faq_questions_search (question, answer)
);
```

### FAQ Ratings Tablosu
```sql
CREATE TABLE faq_ratings (
  id VARCHAR(36) PRIMARY KEY,
  question_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  rating ENUM('helpful', 'not_helpful') NOT NULL,
  feedback TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (question_id) REFERENCES faq_questions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_question_rating (user_id, question_id)
);
```

### AI Prompt Categories Tablosu
```sql
CREATE TABLE ai_prompt_categories (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### AI Prompts Tablosu
```sql
CREATE TABLE ai_prompts (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  type ENUM('chat', 'analysis', 'summary', 'translation') DEFAULT 'chat',
  category_id VARCHAR(36) NOT NULL,
  variables JSON, -- ["user_name", "context"] gibi variable array'i
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (category_id) REFERENCES ai_prompt_categories(id) ON DELETE CASCADE,
  INDEX idx_ai_prompts_category (category_id),
  INDEX idx_ai_prompts_type (type)
);
```

### AI Prompt Executions Tablosu
```sql
CREATE TABLE ai_prompt_executions (
  id VARCHAR(36) PRIMARY KEY,
  prompt_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  conversation_id VARCHAR(36),
  variables JSON, -- Çalıştırılan variable'lar
  result TEXT, -- AI'dan gelen sonuç
  execution_time_ms INTEGER, -- Çalıştırma süresi
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (prompt_id) REFERENCES ai_prompts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL,
  INDEX idx_ai_prompt_executions_user (user_id),
  INDEX idx_ai_prompt_executions_conversation (conversation_id)
);
```

## 🔍 Ek API Gereksinimleri

### 2.6 Get User Message History (Kullanıcı Mesaj Geçmişi)
```bash
# GET /api/users/{userId}/messages?page=1&limit=50&conversationId=conv123
curl -X GET "http://localhost:3000/api/users/user123/messages?page=1&limit=50&conversationId=conv123" \
  -H "Authorization: Bearer <token>"
```

**Response Format**:
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "msg123",
        "text": "Kullanıcı mesajı",
        "isUser": true,
        "timestamp": "2024-01-01T00:00:00Z",
        "conversationId": "conv123",
        "conversationTitle": "AI ile Sohbet"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 100,
      "totalPages": 2
    }
  }
}
```

### 2.7 Search Messages (Mesaj Arama)
```bash
# GET /api/conversations/{conversationId}/messages/search?q=arama_terimi&page=1&limit=20
curl -X GET "http://localhost:3000/api/conversations/conv123/messages/search?q=merhaba&page=1&limit=20" \
  -H "Authorization: Bearer <token>"
```

### 2.8 Get Message Statistics (Mesaj İstatistikleri)
```bash
# GET /api/users/{userId}/statistics
curl -X GET "http://localhost:3000/api/users/user123/statistics" \
  -H "Authorization: Bearer <token>"
```

**Response Format**:
```json
{
  "success": true,
  "data": {
    "totalMessages": 150,
    "totalConversations": 5,
    "averageMessagesPerConversation": 30,
    "mostActiveDay": "2024-01-15",
    "messageCountByDay": {
      "2024-01-15": 25,
      "2024-01-14": 20,
      "2024-01-13": 15
    }
  }
}
```

## 🔐 Güvenlik Gereksinimleri

### Authentication Middleware
- JWT token doğrulama
- Rate limiting (dakikada 100 istek)
- CORS yapılandırması
- Input validation ve sanitization

### OAuth Provider Yapılandırması

#### Google OAuth
```javascript
// Google OAuth yapılandırması
const googleConfig = {
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: process.env.GOOGLE_REDIRECT_URI,
  scope: ['email', 'profile'],
  // Google ID token doğrulama
  verifyIdToken: true
};
```

#### Apple Sign-In
```javascript
// Apple Sign-In yapılandırması
const appleConfig = {
  clientId: process.env.APPLE_CLIENT_ID,
  teamId: process.env.APPLE_TEAM_ID,
  keyId: process.env.APPLE_KEY_ID,
  privateKey: process.env.APPLE_PRIVATE_KEY,
  redirectUri: process.env.APPLE_REDIRECT_URI,
  scope: ['name', 'email']
};
```

#### Nirpax OAuth
```javascript
// Nirpax OAuth yapılandırması
const nirpaxConfig = {
  clientId: process.env.NIRPAX_CLIENT_ID,
  clientSecret: process.env.NIRPAX_CLIENT_SECRET,
  baseUrl: process.env.NIRPAX_BASE_URL,
  redirectUri: process.env.NIRPAX_REDIRECT_URI,
  scope: ['profile', 'email', 'company']
};
```

### OAuth Token Doğrulama
- Google ID token doğrulama (Google API)
- Apple identity token doğrulama (Apple API)
- Nirpax access token doğrulama (Nirpax API)
- JWT token imzalama ve doğrulama

### Data Privacy
- Kullanıcı verilerinin şifrelenmesi
- GDPR uyumluluğu
- Veri silme işlemleri (soft delete)
- Audit log tutma
- OAuth provider verilerinin güvenli saklanması

## 📊 Performance Optimizasyonları

### Database Indexing
```sql
-- Kullanıcı bazlı sorgular için
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_timestamp ON messages(timestamp);

-- Arama için full-text index
CREATE FULLTEXT INDEX idx_messages_text ON messages(text);
```

### Caching Strategy
- Redis ile conversation cache
- Message pagination cache
- User statistics cache
- 15 dakika TTL

## 🔗 OAuth Provider Entegrasyonu

### Frontend OAuth Flow
```javascript
// Google OAuth Flow
const googleLogin = async () => {
  const result = await GoogleSignin.signIn();
  const response = await fetch('/api/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      idToken: result.idToken,
      accessToken: result.accessToken,
      email: result.user.email,
      displayName: result.user.name,
      photoURL: result.user.photo
    })
  });
  return response.json();
};

// Apple Sign-In Flow
const appleLogin = async () => {
  const result = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });
  const response = await fetch('/api/auth/apple', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identityToken: result.identityToken,
      authorizationCode: result.authorizationCode,
      user: result.user
    })
  });
  return response.json();
};

// Nirpax OAuth Flow
const nirpaxLogin = async () => {
  const result = await NirpaxAuth.signIn();
  const response = await fetch('/api/auth/nirpax', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user
    })
  });
  return response.json();
};
```

### OAuth Error Handling
```json
{
  "success": false,
  "error": {
    "code": "OAUTH_ERROR",
    "message": "Google OAuth authentication failed",
    "details": {
      "provider": "google",
      "errorCode": "invalid_token",
      "timestamp": "2024-01-01T00:00:00Z"
    }
  }
}
```

## 🚀 Implementation Priority

### Phase 1 (Critical)
1. **OAuth Authentication APIs** (Google, Apple, Nirpax)
2. **JWT Token Management**
3. **User Registration/Login**
4. **User Profile Management APIs**
5. Chat Management APIs
6. File Upload APIs
7. **FAQ APIs** (Sık sorulan sorular)

### Phase 2 (Important)
1. AI Integration APIs
2. **AI Prompt Management APIs**
3. **User Preferences & Settings APIs**
4. **Profile Photo Management**
5. **User Activity Tracking**
6. **OAuth Provider Token Refresh**
7. **Social Login Callback Handling**
8. Kullanıcı bazlı mesaj geçmişi API'leri

### Phase 3 (Nice to Have)
1. Quick Suggestions APIs
2. Analytics APIs
3. Notification APIs
4. **Advanced OAuth Features** (Account Linking)
5. **User Account Deletion**
6. **Advanced Profile Features**
7. **FAQ Rating & Feedback System**
8. **Advanced AI Prompt Features**
9. Mesaj arama ve istatistik API'leri

## 📱 Frontend Integration

### LoginMethodScreen Gereksinimleri
- Google OAuth SDK entegrasyonu
- Apple Sign-In SDK entegrasyonu
- Nirpax OAuth SDK entegrasyonu
- OAuth callback handling
- Error handling ve retry logic
- Loading states ve UX

### Environment Variables
```bash
# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=your_redirect_uri

# Apple Sign-In
APPLE_CLIENT_ID=your_apple_client_id
APPLE_TEAM_ID=your_apple_team_id
APPLE_KEY_ID=your_apple_key_id
APPLE_PRIVATE_KEY=your_apple_private_key

# Nirpax OAuth
NIRPAX_CLIENT_ID=your_nirpax_client_id
NIRPAX_CLIENT_SECRET=your_nirpax_client_secret
NIRPAX_BASE_URL=your_nirpax_base_url
```

---

*Bu dokümantasyon, Google, Apple ve Nirpax OAuth entegrasyonu için güncellenmiştir.*
