# Nirmind iOS Google Sign-In Fix
# Bu script iOS native modüllerini yeniden yükler ve development build oluşturur

cd /Users/beydanurpinarbasi/Desktop/Astro/NirMind/nirmindmobileapp

echo "=== NIRMIND iOS GOOGLE SIGN-IN FIX ==="
echo ""

# 1. iOS pod'larını temizle ve yeniden yükle
echo "1️⃣ iOS pod'larını temizleniyor..."
cd ios
rm -rf Pods Podfile.lock
echo "✅ Pod'lar temizlendi"
echo ""

echo "2️⃣ Pod'lar yeniden yükleniyor..."
pod install
echo "✅ Pod'lar yüklendi"
echo ""

cd ..

# 2. Expo prebuild (gerekirse)
echo "3️⃣ Expo prebuild kontrol ediliyor..."
if [ ! -d "ios/NirMind.xcodeproj" ]; then
    echo "   Prebuild yapılıyor..."
    npx expo prebuild --platform ios
else
    echo "   Prebuild zaten yapılmış"
fi
echo ""

# 3. Development build oluştur
echo "4️⃣ Development build oluşturuluyor..."
echo "   Bu işlem birkaç dakika sürebilir..."
echo ""
echo "   Komut: npx expo run:ios"
echo ""
echo "   VEYA Xcode'da:"
echo "   - ios/NirMind.xcworkspace dosyasını açın"
echo "   - Product > Clean Build Folder (Cmd+Shift+K)"
echo "   - Product > Build (Cmd+B)"
echo ""

echo "✅ Hazırlık tamamlandı!"
echo ""
echo "📝 Sonraki Adımlar:"
echo "   1. Xcode'da ios/NirMind.xcworkspace dosyasını açın"
echo "   2. Clean Build Folder yapın (Cmd+Shift+K)"
echo "   3. Build yapın (Cmd+B)"
echo "   4. Veya terminal'de: npx expo run:ios"
echo ""




