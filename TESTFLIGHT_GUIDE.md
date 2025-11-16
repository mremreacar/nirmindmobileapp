# TestFlight Hazırlık Rehberi

## 📋 Ön Gereksinimler

1. **Apple Developer Hesabı**
   - Aktif Apple Developer Program üyeliği
   - App Store Connect erişimi
   - Team ID: `5B43Y4572U`

2. **EAS CLI Kurulumu**
   ```bash
   npm install -g eas-cli
   eas login
   ```

3. **App Store Connect'te Uygulama**
   - App Store Connect'te uygulama oluşturulmuş olmalı
   - Bundle ID: `com.nireya.nirmind`
   - ASC App ID'yi not edin

## 🔧 Yapılandırma

### 1. app.json Kontrolü
- ✅ Version: `1.0.0`
- ✅ Build Number: `1` (her build'de otomatik artacak)
- ✅ Bundle Identifier: `com.nireya.nirmind`
- ✅ Apple Team ID: `5B43Y4572U`
- ✅ Runtime Version: `appVersion` policy

### 2. eas.json Yapılandırması
- ✅ Production build profili hazır
- ✅ Preview-TestFlight profili eklendi
- ⚠️ Submit ayarlarını güncelleyin (Apple ID ve ASC App ID)

### 3. eas.json Submit Ayarlarını Güncelleme

`eas.json` dosyasındaki submit bölümünü güncelleyin:

```json
"submit": {
  "production": {
    "ios": {
      "appleId": "your-apple-id@example.com",
      "ascAppId": "1234567890"
    }
  }
}
```

## 🚀 TestFlight Build Oluşturma

### Adım 1: Build Oluşturma

```bash
# TestFlight için build oluştur
npm run build:ios:testflight

# VEYA direkt EAS komutu
eas build --platform ios --profile preview-testflight
```

### Adım 2: Build İşlemi

1. EAS CLI size sorular soracak:
   - **Build profile seçimi**: `preview-testflight` seçin
   - **Credentials**: EAS otomatik olarak yönetir (veya manuel yapabilirsiniz)

2. Build işlemi 15-30 dakika sürebilir
3. Build tamamlandığında URL alacaksınız

### Adım 3: TestFlight'a Yükleme

#### Otomatik Yükleme (Önerilen)
```bash
# Build tamamlandıktan sonra otomatik submit
eas submit --platform ios --profile production --latest
```

#### Manuel Yükleme
1. Build tamamlandığında `.ipa` dosyasını indirin
2. App Store Connect'e giriş yapın
3. TestFlight sekmesine gidin
4. "+" butonuna tıklayın ve `.ipa` dosyasını yükleyin

## 📝 Build Number Yönetimi

EAS otomatik olarak build number'ı artırır (`autoIncrement: true`). 
Manuel olarak artırmak isterseniz:

```bash
# app.json'da buildNumber'ı artırın
# Örnek: "1" -> "2"
```

## ✅ Kontrol Listesi

Build öncesi kontrol edin:

- [ ] `app.json` version ve buildNumber doğru
- [ ] `eas.json` submit ayarları güncellendi
- [ ] Production API URL'leri kullanılıyor (`https://nircore.io/api`)
- [ ] Google Services plist dosyası mevcut
- [ ] Apple Team ID doğru (`5B43Y4572U`)
- [ ] Bundle Identifier doğru (`com.nireya.nirmind`)
- [ ] Tüm izinler (permissions) tanımlı
- [ ] Info.plist ayarları tamam

## 🔍 Build Durumunu Kontrol Etme

```bash
# Aktif build'leri listele
eas build:list

# Belirli bir build'in detaylarını gör
eas build:view [BUILD_ID]
```

## 🐛 Sorun Giderme

### Build Hatası
```bash
# Build loglarını görüntüle
eas build:view [BUILD_ID] --logs
```

### Credentials Sorunu
```bash
# Credentials'ları kontrol et
eas credentials

# Credentials'ları sıfırla (gerekirse)
eas credentials --platform ios
```

### Provisioning Profile Sorunu
- App Store Connect'te provisioning profile'ları kontrol edin
- EAS otomatik olarak yönetir, manuel müdahale genelde gerekmez

## 📱 TestFlight'ta Test

1. Build yüklendikten sonra App Store Connect'te işleme alınır (genelde 10-30 dakika)
2. İşleme tamamlandığında test kullanıcılarına bildirim gönderilir
3. Test kullanıcıları TestFlight uygulamasından indirebilir

## 🔄 Sonraki Build'ler

Her yeni build için:
1. Version veya buildNumber'ı artırın (veya autoIncrement kullanın)
2. `npm run build:ios:testflight` komutunu çalıştırın
3. Build tamamlandığında submit edin

## 📞 Destek

Sorun yaşarsanız:
- EAS dokümantasyonu: https://docs.expo.dev/build/introduction/
- EAS Build durumu: https://expo.dev/accounts/[your-account]/projects/nirmind-app/builds

