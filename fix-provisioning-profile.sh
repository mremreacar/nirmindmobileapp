#!/bin/bash

# Provisioning Profile Fix Script
# Mac destination hatasını çözer

cd "$(dirname "$0")/ios"

echo "🔧 Provisioning Profile Fix Başlatılıyor..."
echo ""

echo "⚠️  SORUN: Xcode Mac'i build destination olarak seçmiş"
echo "   Provisioning profile Mac'i içermiyor"
echo ""

echo "📝 ÇÖZÜM:"
echo ""
echo "1️⃣ Xcode'da:"
echo "   - ios/NirMind.xcworkspace dosyasını açın"
echo "   - Üst kısımda scheme yanındaki destination'ı değiştirin:"
echo "     • 'Beyda MacBook Pro' yerine"
echo "     • 'Any iOS Simulator' veya"
echo "     • 'iPhone 15 Simulator' gibi bir simulator seçin"
echo ""
echo "2️⃣ VEYA Terminal'den simulator build:"
echo "   cd ios"
echo "   xcodebuild -workspace NirMind.xcworkspace -scheme NirMind -destination 'platform=iOS Simulator,name=iPhone 15' build"
echo ""

echo "3️⃣ VEYA Gerçek cihaz için:"
echo "   - Xcode'da bir iOS cihazı bağlayın"
echo "   - Destination olarak o cihazı seçin"
echo "   - Provisioning profile'ı güncelleyin"
echo ""

echo "✅ Build destination'ı düzelttikten sonra tekrar deneyin"
echo ""

