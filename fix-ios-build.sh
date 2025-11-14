#!/bin/bash

# Nirmind iOS Build Fix Script
# Xcode build sorunlarını çözmek için temizleme ve yeniden yapılandırma

cd "$(dirname "$0")"

echo "🔧 Nirmind iOS Build Fix Başlatılıyor..."
echo ""

# 1. Xcode DerivedData temizle
echo "1️⃣ Xcode DerivedData temizleniyor..."
rm -rf ~/Library/Developer/Xcode/DerivedData/*
echo "   ✅ DerivedData temizlendi"
echo ""

# 2. iOS build klasörünü temizle
echo "2️⃣ iOS build klasörü temizleniyor..."
cd ios
rm -rf build/
echo "   ✅ Build klasörü temizlendi"
echo ""

# 3. Pod'ları temizle ve yeniden yükle
echo "3️⃣ CocoaPods temizleniyor..."
rm -rf Pods/
rm -f Podfile.lock
echo "   ✅ Pod'lar temizlendi"
echo ""

echo "4️⃣ CocoaPods yeniden yükleniyor..."
pod install
if [ $? -ne 0 ]; then
    echo "   ⚠️ Pod install hatası! Manuel kontrol gerekebilir."
    exit 1
fi
echo "   ✅ Pod'lar yüklendi"
echo ""

cd ..

# 4. Expo cache temizle
echo "5️⃣ Expo cache temizleniyor..."
rm -rf .expo/
rm -rf node_modules/.cache/
echo "   ✅ Expo cache temizlendi"
echo ""

# 5. Xcode workspace'i kontrol et
echo "6️⃣ Xcode workspace kontrol ediliyor..."
if [ ! -f "ios/NirMind.xcworkspace/contents.xcworkspacedata" ]; then
    echo "   ⚠️ Workspace dosyası bulunamadı! Prebuild yapılacak..."
    npx expo prebuild --platform ios --clean
else
    echo "   ✅ Workspace dosyası mevcut"
fi
echo ""

echo "✅ Temizleme tamamlandı!"
echo ""
echo "📝 Sonraki Adımlar:"
echo "   1. Xcode'da ios/NirMind.xcworkspace dosyasını açın"
echo "   2. Product > Clean Build Folder (Cmd+Shift+K) yapın"
echo "   3. Product > Build (Cmd+B) yapın"
echo ""
echo "   VEYA terminal'de:"
echo "   cd ios && xcodebuild -workspace NirMind.xcworkspace -scheme NirMind clean build"
echo ""

