# Nirmind Backend API Dokümantasyonu

Nirmind, Nireya ekosisteminde yer alan AI asistan uygulamasıdır. Bu dokümantasyon, Nirmind backend API'sinin teknik detaylarını, endpoint'lerini ve kullanım örneklerini içerir.

## 📋 İçindekiler

- [Genel Bakış](#genel-bakış)
- [Kurulum](#kurulum)
- [Authentication](#authentication)
- [API Endpoint'leri](#api-endpointleri)
- [Database Yapısı](#database-yapısı)
- [OpenAI Entegrasyonu](#openai-entegrasyonu)
- [Özellikler](#özellikler)
- [Dokümantasyon](#dokümantasyon)
- [Troubleshooting](#troubleshooting)

## 🎯 Genel Bakış

Nirmind, kullanıcıların AI ile sohbet edebileceği, dosya analizi yapabileceği ve detaylı araştırmalar yapabileceği bir AI asistan platformudur.

### Temel Özellikler

- ✅ **Chat Sistemi**: Kullanıcıların AI ile gerçek zamanlı sohbet yapabilmesi
- ✅ **Araştırma Modu**: Detaylı ve kapsamlı AI cevapları için özel mod
- ✅ **Dosya Analizi**: Görsel ve dosya yükleme ve analiz etme
- ✅ **Social Authentication**: Apple ve Google ile giriş desteği
- ✅ **Quick Suggestions**: Öneri soruları ve hızlı erişim
- ✅ **Markdown Desteği**: AI cevaplarında markdown formatı render

### Teknoloji Stack

- **Backend Framework**: Express.js
- **Database**: MySQL (Nirmind DB)
- **ORM**: Prisma
- **AI**: OpenAI GPT-4o-mini
- **Authentication**: JWT (Nirpax entegrasyonu)

## 🚀 Kurulum

### Gereksinimler

- Node.js 18+
- MySQL 8.0+
- npm veya yarn

### Environment Variables

`.env` dosyasına aşağıdaki değişkenleri ekleyin:

```env
# Nirmind Database
NIRMIND_DATABASE_URL=mysql://user:password@localhost:3306/nirmind_db

# OpenAI API
OPENAI_API_KEY=your_openai_api_key

# JWT Secret (Nirpax ile paylaşılan)
JWT_SECRET=your_jwt_secret_key

# Google OAuth (Optional)
GOOGLE_CLIENT_ID=your_google_client_id
```

### Database Setup

```bash
# Prisma client generate
npx prisma generate --schema=prisma/nirmind.schema.prisma

# Database schema'yı uygula
npx prisma db push --schema=prisma/nirmind.schema.prisma

# Seed data (Optional)
npm run db:seed:nirmind
npm run db:seed:nirmind:questions
```

## 🔐 Authentication

Nirmind API'si, **Nirpax Authentication System** ile entegre çalışır. Tüm protected endpoint'ler JWT token gerektirir.

### Token Format

```
Authorization: Bearer <JWT_TOKEN>
```

### User ID Mapping

**ÖNEMLİ**: Nirmind, kendi User modeline sahiptir ve Nirpax User ID'leri ile ilişkilendirilmiştir.

- Her request'te `req.user.sub` alanında **Nirpax User ID** gelir
- Bu ID ile Nirmind User bulunur: `nirmindPrisma.user.findUnique({ where: { nirpaxId } })`
- Tüm database işlemleri **Nirmind User ID** ile yapılır

### Authentication Endpoints

#### Apple Login
```http
POST /api/nirmind/auth/apple
Content-Type: application/json

{
  "identityToken": "apple_identity_token",
  "authorizationCode": "authorization_code"
}
```

#### Google Login
```http
POST /api/nirmind/auth/google
Content-Type: application/json

{
  "idToken": "google_id_token"
}
```

#### Token Verify
```http
GET /api/nirmind/auth/verify
Authorization: Bearer <JWT_TOKEN>
```

## 📡 API Endpoint'leri

### Base URL

- **Development**: `http://localhost:3000/api/nirmind`
- **Production**: `https://nirpax.com/api/nirmind`

### Health Check

```http
GET /api/nirmind/health
```

### Conversation Endpoints

#### Konuşmaları Listele
```http
GET /api/nirmind/conversations?page=1&limit=20&search=keyword
Authorization: Bearer <JWT_TOKEN>
```

#### Konuşma Oluştur
```http
POST /api/nirmind/conversations
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "title": "Yeni Konuşma",
  "initialMessage": "Merhaba" // Optional
}
```

#### Konuşma Detayı
```http
GET /api/nirmind/conversations/:id
Authorization: Bearer <JWT_TOKEN>
```

#### Araştırma Modunu Güncelle
```http
PUT /api/nirmind/conversations/:id/research-mode
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "isResearchMode": true
}
```

#### Konuşma Güncelle
```http
PUT /api/nirmind/conversations/:id
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "title": "Yeni Başlık"
}
```

#### Konuşma Sil
```http
DELETE /api/nirmind/conversations/:id
Authorization: Bearer <JWT_TOKEN>
```

### Message Endpoints

#### Mesaj Gönder
```http
POST /api/nirmind/messages
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "conversationId": "cmhi220xg002fuj0djpu4k0bh",
  "message": "Merhaba, nasılsın?",
  "promptType": "CHAT", // Optional: CHAT, RESEARCH, ANALYSIS, SUMMARY, TRANSLATION
  "attachments": [ // Optional
    {
      "type": "image",
      "url": "https://example.com/image.jpg",
      "filename": "image.jpg"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "userMessage": {
      "id": "msg123",
      "text": "Merhaba, nasılsın?",
      "isUser": true,
      "timestamp": "2025-11-02T18:00:00.000Z"
    },
    "aiMessage": {
      "id": "msg124",
      "text": "Merhaba! Ben Nirmind AI asistanıyım...",
      "isUser": false,
      "timestamp": "2025-11-02T18:00:01.000Z"
    },
    "conversation": {
      "id": "cmhi220xg002fuj0djpu4k0bh",
      "title": "Yeni Konuşma",
      "updatedAt": "2025-11-02T18:00:01.000Z"
    }
  }
}
```

#### Mesajları Getir
```http
GET /api/nirmind/conversations/:conversationId/messages?page=1&limit=50
Authorization: Bearer <JWT_TOKEN>
```

#### Mesaj Sil (Soft Delete)
```http
DELETE /api/nirmind/messages/:messageId
Authorization: Bearer <JWT_TOKEN>
```

### AI Endpoints

#### Quick Suggestions
```http
GET /api/nirmind/quick-suggestions?category=general&limit=27
Authorization: Bearer <JWT_TOKEN>
```

#### Research Suggestions
```http
GET /api/nirmind/research-suggestions?limit=10
Authorization: Bearer <JWT_TOKEN>
```

#### Questions
```http
GET /api/nirmind/questions?category=health&limit=20&page=1
Authorization: Bearer <JWT_TOKEN>
```

### User Endpoints

#### User Profile
```http
GET /api/nirmind/users/profile
Authorization: Bearer <JWT_TOKEN>
```

#### User Statistics
```http
GET /api/nirmind/users/statistics
Authorization: Bearer <JWT_TOKEN>
```

## 🗄️ Database Yapısı

### Ana Modeller

#### Conversation
```prisma
model Conversation {
  id            String   @id @default(cuid())
  userId        String
  title         String
  isResearchMode Boolean @default(false)
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  user      User      @relation(fields: [userId], references: [id])
  messages  Message[]
  
  @@index([userId])
  @@index([isResearchMode])
  @@index([isActive])
}
```

#### Message
```prisma
model Message {
  id             String   @id @default(cuid())
  conversationId String
  text           String   @nirmind.Text
  isUser         Boolean
  isDeleted      Boolean  @default(false)
  timestamp      DateTime @default(now())
  
  conversation   Conversation @relation(fields: [conversationId], references: [id])
  attachments    Attachment[]
  
  @@index([conversationId])
  @@index([isDeleted])
}
```

#### AIPrompt
```prisma
model AIPrompt {
  id        String     @id @default(cuid())
  type      PromptType @default(CHAT)
  content   String     @nirmind.Text
  isActive  Boolean    @default(true)
  
  @@index([type, isActive])
}

enum PromptType {
  CHAT
  ANALYSIS
  RESEARCH
  SUMMARY
  TRANSLATION
}
```

#### Question
```prisma
model Question {
  id        String     @id @default(cuid())
  question  String
  category  String?
  promptType PromptType @default(CHAT)
  isActive  Boolean    @default(true)
  order     Int        @default(0)
  
  @@index([promptType])
  @@index([isActive])
}
```

## 🤖 OpenAI Entegrasyonu

### Prompt Yönetimi

OpenAI prompt'ları database'de (`ai_prompts` tablosu) yönetilir:

- **CHAT**: Normal sohbet mesajları için
- **RESEARCH**: Detaylı araştırma modu için (max_tokens: 2000)
- **ANALYSIS**: Dosya/görsel analizi için
- **SUMMARY**: Özetleme için
- **TRANSLATION**: Çeviri için

### Prompt Type Belirleme

Mesaj gönderilirken prompt type şu sırayla belirlenir:

1. Frontend'den gönderilen `promptType` parametresi
2. Conversation'ın `isResearchMode` durumu (true ise RESEARCH)
3. Questions tablosundan soru eşleşmesi
4. Otomatik tespit (`determinePromptType`)

### OpenAI API Kullanımı

```javascript
const completion = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [
    { role: 'system', content: systemPrompt },
    ...conversationHistory
  ],
  max_tokens: promptType === 'RESEARCH' ? 2000 : 1000,
  temperature: 0.7
});
```

## ✨ Özellikler

### 1. Chat Sistemi

- Gerçek zamanlı mesajlaşma
- Konuşma geçmişi yönetimi
- Soft delete (mesaj silme)
- Pagination desteği

### 2. Araştırma Modu

- Conversation bazında aktif/pasif
- Detaylı ve kapsamlı AI cevapları
- Markdown formatı desteği
- Daha uzun token limiti (2000)

### 3. Dosya Analizi

- Görsel ve dosya yükleme
- Otomatik analiz ve açıklama
- Multiple attachment desteği

### 4. Quick Suggestions

- Database'den dinamik öneriler
- Kategori bazlı filtreleme
- Prompt type entegrasyonu

## 📚 Dokümantasyon

Detaylı dokümantasyon için `docs/` klasörüne bakın:

- **[Nirmind Chat API](./docs/NIRMIND_CHAT_API.md)** - Chat ve mesajlaşma sistemi
- **[Nirmind Research Mode](./docs/NIRMIND_RESEARCH_MODE.md)** - Araştırma modu özelliği
- **[Nirmind Questions API](./docs/NIRMIND_QUESTIONS_API.md)** - Öneri soruları API'si
- **[Nirmind OpenAI Prompts](./docs/NIRMIND_OPENAI_PROMPTS.md)** - OpenAI prompt yönetimi
- **[Nirmind Social Auth](./docs/NIRMIND_SOCIAL_AUTH.md)** - Apple ve Google giriş

## 🔧 Troubleshooting

### Sorun: "User not found in Nirmind database"

**Çözüm**: User ID mapping kontrol edin. `nirpaxId` ile Nirmind User bulunmalı.

### Sorun: "Conversation not found or access denied"

**Çözüm**: Conversation ID'nin doğru olduğundan ve kullanıcıya ait olduğundan emin olun.

### Sorun: AI cevabı gelmiyor

**Çözüm**: 
- OpenAI API key kontrolü
- Token limit kontrolü
- Prompt type kontrolü

### Sorun: Research mode çalışmıyor

**Çözüm**:
- Conversation'ın `isResearchMode` durumunu kontrol edin
- Mesaj gönderilirken `promptType: 'RESEARCH'` parametresinin gönderildiğinden emin olun

## 🛠️ Development

### Controller'lar

- `AuthController.js` - Authentication işlemleri
- `ConversationController.js` - Conversation CRUD işlemleri
- `MessageController.js` - Mesaj gönderme ve AI entegrasyonu
- `AIController.js` - AI önerileri ve prompt yönetimi
- `UserController.js` - User profil ve istatistikleri

### Routes

Tüm route'lar `src/routes/nirmind.js` dosyasında tanımlanmıştır.

### Database İşlemleri

Tüm database işlemleri Prisma ORM ile yapılır:

```javascript
const { nirmindPrisma } = require('../config/database');

// Örnek kullanım
const conversation = await nirmindPrisma.conversation.findFirst({
  where: { userId: nirmindUser.id, isActive: true }
});
```

## 📝 Response Format

Tüm API response'ları standart format kullanır:

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error type",
  "message": "Human readable error message"
}
```

## 🔒 Güvenlik

- Tüm endpoint'ler JWT token ile korunur (public endpoint'ler hariç)
- User ID mapping ile yetki kontrolü yapılır
- SQL injection koruması (Prisma ORM)
- Input validation yapılmalıdır

## 📞 İletişim

Sorularınız için:
- Backend ekibi ile iletişime geçin
- İlgili dokümantasyon dosyasını kontrol edin
- GitHub Issues'da sorun bildirin

## 📄 Lisans

Bu proje Nireya ekosisteminin bir parçasıdır.

