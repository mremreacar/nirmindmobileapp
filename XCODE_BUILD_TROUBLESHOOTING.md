# Xcode Build Sorun Giderme Rehberi

## Problem: Xcode Açıkken Build Çalışmıyor, Kapalıyken Çalışıyor

Bu durum genellikle şu nedenlerden kaynaklanır:

### 1. **File Locking (Dosya Kilitleme)**
Xcode açıkken dosyaları kilitliyor ve başka bir process (terminal build) bu dosyalara erişemiyor.

**Çözüm:**
- Xcode'u kapatın
- Build yapın
- Veya Xcode içinden build yapın (Product > Build)

### 2. **DerivedData Çakışması**
Xcode açıkken kendi DerivedData'sını kullanıyor, terminal build farklı bir DerivedData kullanıyor.

**Çözüm:**
```bash
# DerivedData'yı temizle
rm -rf ~/Library/Developer/Xcode/DerivedData/*
```

### 3. **Build Process Çakışması**
Xcode'un arka planda çalışan bir build process'i var ve yeni build'i engelliyor.

**Çözüm:**
- Xcode'da Product > Stop (Cmd+.) yapın
- Activity Monitor'da `xcodebuild` process'lerini kontrol edin
- Gerekirse kill edin: `killall xcodebuild`

### 4. **Indexing Çakışması**
Xcode açıkken indexing yapıyor ve bu build'i yavaşlatıyor/engelliyor.

**Çözüm:**
- Xcode'da Product > Stop Indexing
- Veya Settings > General > Indexing'i geçici olarak kapatın

### 5. **Workspace Lock**
Xcode workspace'i açıkken başka bir process build yapmaya çalışıyor.

**Çözüm:**
- Xcode'u kapatın
- Veya sadece Xcode içinden build yapın

### 6. **Source Control Lock**
Xcode'un source control özelliği dosyaları kilitlemiş olabilir.

**Çözüm:**
- Xcode > Settings > Source Control > Enable Source Control'i kapatın (geçici)
- Veya git lock dosyalarını kontrol edin

## Önerilen Çözümler

### Çözüm 1: Xcode İçinden Build Yapın
1. Xcode'da `ios/NirMind.xcworkspace` açın
2. Product > Clean Build Folder (Cmd+Shift+K)
3. Product > Build (Cmd+B)

### Çözüm 2: Terminal Build İçin Xcode'u Kapatın
```bash
# Xcode'u kapat
killall Xcode

# Build yap
cd ios
xcodebuild -workspace NirMind.xcworkspace -scheme NirMind clean build
```

### Çözüm 3: DerivedData'yı Temizleyin
```bash
# Xcode'u kapat
killall Xcode

# DerivedData temizle
rm -rf ~/Library/Developer/Xcode/DerivedData/*

# Build yap
cd ios
xcodebuild -workspace NirMind.xcworkspace -scheme NirMind clean build
```

### Çözüm 4: Build Process'lerini Kontrol Edin
```bash
# Çalışan xcodebuild process'lerini gör
ps aux | grep xcodebuild

# Gerekirse kill et
killall xcodebuild
```

## En İyi Pratik

**Xcode açıkken build yapmak için:**
- Sadece Xcode içinden build yapın (Product > Build)
- Terminal build yapmak için Xcode'u kapatın

**Neden?**
- Xcode ve terminal build aynı dosyaları kullanmaya çalıştığında çakışma olur
- Xcode dosyaları kilitliyor
- DerivedData çakışması oluyor

## Hızlı Fix Script

```bash
#!/bin/bash
# Xcode'u kapat ve temizle
killall Xcode 2>/dev/null
killall xcodebuild 2>/dev/null
rm -rf ~/Library/Developer/Xcode/DerivedData/*
echo "✅ Xcode temizlendi, şimdi build yapabilirsiniz"
```

