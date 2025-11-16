# Backend Response Debug Guide

Frontend'in backend'den cevabı alıp almadığını kontrol etmek için kullanılan mekanizmalar.

## Console Log'ları ile Kontrol

React Native Debugger veya Metro bundler console'unda şu log'ları arayın:

### 1. İlk Bağlantı
```
✅ [BACKEND RESPONSE] İlk SSE chunk alındı - Backend bağlantısı başarılı!
```
- Bu log görünüyorsa: Backend'e bağlantı başarılı
- Görünmüyorsa: Network hatası veya backend erişilemiyor

### 2. User Message Event
```
✅ [BACKEND RESPONSE] User message event işlendi - Backend mesajı alındı!
```
- Bu log görünüyorsa: Backend kullanıcı mesajını aldı ve kaydetti
- `messageId`: Backend'den dönen mesaj ID'si
- `timeToUserMessage`: İstek başlangıcından mesaj alınana kadar geçen süre

### 3. AI Start Event
```
✅ [BACKEND RESPONSE] AI start event işlendi - AI cevabı başladı!
```
- Bu log görünüyorsa: AI cevabı hazırlanmaya başladı
- `timeToAIStart`: İstek başlangıcından AI başlangıcına kadar geçen süre

### 4. AI Chunk Events
```
📝 AI chunk alindi (X karakter)
```
- Bu log'lar görünüyorsa: AI cevabı stream ediliyor
- Her chunk geldiğinde görünür (ilk 3 chunk için detaylı log)

### 5. AI Complete Event
```
✅ [BACKEND RESPONSE] AI complete event işlendi - Backend cevabı tamamlandı!
```
- Bu log görünüyorsa: AI cevabı tamamen alındı
- `timeToAIComplete`: Toplam süre
- `aiMessageId`: Backend'den dönen AI mesaj ID'si

## Event Sırası

Normal bir akışta şu sırayla event'ler gelmelidir:

1. `✅ [BACKEND RESPONSE] İlk SSE chunk alındı` - Bağlantı kuruldu
2. `✅ [BACKEND RESPONSE] User message event işlendi` - Kullanıcı mesajı kaydedildi
3. `✅ [BACKEND RESPONSE] AI start event işlendi` - AI cevabı başladı
4. `📝 AI chunk alindi` - AI cevabı stream ediliyor (birden fazla)
5. `✅ [BACKEND RESPONSE] AI complete event işlendi` - AI cevabı tamamlandı

## Sorun Tespiti

### Backend'e Bağlanılamıyor
- **Belirti**: İlk chunk log'u görünmüyor
- **Kontrol**: Network bağlantısını kontrol edin
- **Log**: `❌ Connection timeout` veya `❌ XMLHttpRequest error`

### User Message Gelmiyor
- **Belirti**: User message log'u görünmüyor
- **Kontrol**: Backend log'larını kontrol edin
- **Olası Neden**: Backend'de mesaj kaydedilirken hata oluştu

### AI Start Gelmiyor
- **Belirti**: AI start log'u görünmüyor
- **Kontrol**: Backend'de `ai_start` event'inin gönderildiğini kontrol edin
- **Olası Neden**: Backend hazırlık işlemleri çok uzun sürüyor

### AI Chunk Gelmiyor
- **Belirti**: Chunk log'ları görünmüyor
- **Kontrol**: Backend'de Claude API çağrısının başarılı olduğunu kontrol edin
- **Olası Neden**: Claude API hatası veya rate limit

### AI Complete Gelmiyor
- **Belirti**: Complete log'u görünmüyor
- **Kontrol**: Stream timeout olup olmadığını kontrol edin
- **Olası Neden**: Stream kesildi veya backend'de hata oluştu

## Debug Hook Kullanımı

`useBackendResponseDebug` hook'unu kullanarak programatik olarak durumu kontrol edebilirsiniz:

```typescript
import { useBackendResponseDebug } from '@/src/hooks/useBackendResponseDebug';

const { debugInfo, getStatusSummary, printDebugInfo } = useBackendResponseDebug(
  isStreaming,
  conversationId
);

// Durumu kontrol et
const summary = getStatusSummary();
if (!summary.isHealthy) {
  printDebugInfo(); // Console'a detaylı bilgi yazdır
}
```

## Network Tab Kontrolü

React Native Debugger'da Network tab'inde:

1. `/nirmind/messages/stream` endpoint'ini bulun
2. Status code'un `200` olduğunu kontrol edin
3. Response'u inceleyin - SSE event'leri görünmelidir:
   - `event: user_message`
   - `event: ai_start`
   - `event: ai_chunk`
   - `event: ai_complete`

## Backend Log'ları ile Karşılaştırma

Backend'de şu log'ları arayın:

1. `🔍 sendMessageStream başlatıldı` - İstek alındı
2. `📤 [BACKEND] user_message event gönderiliyor` - User message gönderildi
3. `📤 [BACKEND] ai_start event gönderiliyor` - AI start gönderildi
4. `📤 [BACKEND] ai_chunk event gönderiliyor` - Chunk'lar gönderiliyor
5. `📤 [BACKEND] ai_complete event gönderiliyor` - Complete gönderildi

Frontend log'ları ile backend log'larını karşılaştırarak hangi event'in kaybolduğunu tespit edebilirsiniz.

