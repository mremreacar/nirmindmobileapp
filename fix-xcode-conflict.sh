#!/bin/bash

# Xcode Çakışma Fix Script
# Xcode açıkken build çalışmama sorununu çözer

echo "🔧 Xcode Çakışma Fix Başlatılıyor..."
echo ""

# 1. Çalışan Xcode process'lerini kontrol et
echo "1️⃣ Çalışan Xcode process'leri kontrol ediliyor..."
XCODE_PROCESSES=$(ps aux | grep -i xcode | grep -v grep | wc -l | tr -d ' ')
if [ "$XCODE_PROCESSES" -gt 0 ]; then
    echo "   ⚠️  $XCODE_PROCESSES Xcode process bulundu"
    echo "   Xcode'u kapatmak ister misiniz? (y/n)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        killall Xcode 2>/dev/null
        echo "   ✅ Xcode kapatıldı"
    else
        echo "   ℹ️  Xcode açık kalacak, build çalışmayabilir"
    fi
else
    echo "   ✅ Xcode kapalı"
fi
echo ""

# 2. Çalışan xcodebuild process'lerini kontrol et
echo "2️⃣ Çalışan xcodebuild process'leri kontrol ediliyor..."
XCODEBUILD_PROCESSES=$(ps aux | grep xcodebuild | grep -v grep | wc -l | tr -d ' ')
if [ "$XCODEBUILD_PROCESSES" -gt 0 ]; then
    echo "   ⚠️  $XCODEBUILD_PROCESSES xcodebuild process bulundu, durduruluyor..."
    killall xcodebuild 2>/dev/null
    sleep 2
    echo "   ✅ xcodebuild process'leri durduruldu"
else
    echo "   ✅ xcodebuild process yok"
fi
echo ""

# 3. DerivedData temizle
echo "3️⃣ DerivedData temizleniyor..."
rm -rf ~/Library/Developer/Xcode/DerivedData/*
echo "   ✅ DerivedData temizlendi"
echo ""

# 4. Build klasörünü temizle
echo "4️⃣ iOS build klasörü temizleniyor..."
cd "$(dirname "$0")"
if [ -d "ios/build" ]; then
    rm -rf ios/build/
    echo "   ✅ Build klasörü temizlendi"
else
    echo "   ℹ️  Build klasörü zaten temiz"
fi
echo ""

echo "✅ Temizleme tamamlandı!"
echo ""
echo "📝 Şimdi build yapabilirsiniz:"
echo "   - Xcode açıkken: Xcode içinden Product > Build (Cmd+B)"
echo "   - Terminal'den: cd ios && xcodebuild -workspace NirMind.xcworkspace -scheme NirMind build"
echo ""
echo "⚠️  NOT: Xcode açıkken terminal'den build yapmak çakışmaya neden olabilir."
echo "   Terminal build için Xcode'u kapatmanız önerilir."
echo ""

