import React, { memo, useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
  TextInput,
} from "react-native";
import { SvgXml } from "react-native-svg";

const { width } = Dimensions.get("window");

// NirMind White Logo SVG
const nirmindWhiteSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1725.15 282.37">
<g>
<path fill="#ffffff" d="M234.58,151.05v-3.3c-18.68-6.2-38.36-7.81-53.88-21.03-9.58-8.16-16.59-20.95-20.68-32.73-2.59-7.46-4.03-20.81-6.91-26.77-.76-1.58-1.27-2.38-3.2-2.01-6.21,29.07-12.8,51.84-39.58,67.84-14.54,8.69-28.45,9.9-44.05,15.19.05,1.43-.51,2,.73,3,4.21,3.37,24.48,7.82,31.23,10.34,20.41,7.62,36.76,20.57,41.82,42.94,19.14,84.53-107.67,102.12-135.03,30.54-8.73-22.85-5.54-41.79,4.92-63.04,23.85-48.43,57.71-95.32,83.23-143.21C116.21-3.96,166.69-9.74,196.89,16.45c9.75,8.45,16.19,20.79,22.87,31.7,23.1,37.71,49.51,81.69,69.66,120.78,11.77,22.84,16.42,42,6.17,66.96-29.52,71.89-154.02,51.23-134.67-31.35,8.5-36.27,42.67-44.24,73.66-53.5Z"/>
<path fill="#ffffff" d="M376.25,276.99V8.13h48.78l109.85,254.27h4.61V8.13h24.58v268.86h-48.78L405.44,22.34h-4.61v254.65h-24.58Z"/>
<path fill="#ffffff" d="M642.42,58.06c-5.64,0-10.37-1.92-14.21-5.76-3.84-3.84-5.76-8.58-5.76-14.21s1.92-10.69,5.76-14.4c3.84-3.71,8.58-5.57,14.21-5.57s10.69,1.86,14.4,5.57c3.71,3.71,5.57,8.52,5.57,14.4s-1.86,10.37-5.57,14.21c-3.72,3.84-8.52,5.76-14.4,5.76ZM630.9,276.99V90.32h23.05v186.67h-23.05Z"/>
<path fill="#ffffff" d="M721.54,276.99V90.32h22.28v23.43h4.61c3.58-8.45,8.89-14.6,15.94-18.44,7.04-3.84,16.83-5.76,29.38-5.76h21.89v21.51h-24.58c-14.09,0-25.35,3.97-33.8,11.91-8.45,7.94-12.68,20.36-12.68,37.26v116.76h-23.05Z"/>
<path fill="#ffffff" d="M854.81,276.99V8.13h94.1l46.47,234.29h6.91l46.48-234.29h94.1v268.86h-49.16V45.38h-6.91l-46.09,231.61h-83.73l-46.09-231.61h-6.91v231.61h-49.16Z"/>
<path fill="#ffffff" d="M1219.31,64.2c-8.71,0-16.07-2.81-22.08-8.45-6.02-5.63-9.03-13.06-9.03-22.28s3.01-16.64,9.03-22.28c6.01-5.63,13.38-8.45,22.08-8.45s16.38,2.82,22.28,8.45c5.89,5.64,8.83,13.06,8.83,22.28s-2.95,16.65-8.83,22.28c-5.89,5.64-13.32,8.45-22.28,8.45ZM1195.11,276.99V86.48h48.4v190.51h-48.4Z"/>
<path fill="#ffffff" d="M1297.28,276.99V86.48h47.63v24.97h6.91c3.07-6.66,8.83-12.99,17.28-19.01,8.45-6.01,21.25-9.03,38.41-9.03,14.85,0,27.85,3.4,38.98,10.18,11.14,6.79,19.78,16.13,25.93,28.04,6.15,11.91,9.22,25.8,9.22,41.67v113.69h-48.4v-109.85c0-14.34-3.52-25.09-10.56-32.26-7.05-7.17-17.09-10.75-30.15-10.75-14.85,0-26.38,4.93-34.57,14.79-8.2,9.86-12.29,23.62-12.29,41.29v96.79h-48.4Z"/>
<path fill="#ffffff" d="M1610.69,282.37c-15.11,0-29.26-3.78-42.44-11.33-13.19-7.55-23.75-18.63-31.69-33.22-7.94-14.6-11.91-32.26-11.91-53v-6.15c0-20.74,3.97-38.41,11.91-53,7.93-14.6,18.44-25.67,31.49-33.22,13.06-7.55,27.27-11.33,42.63-11.33,11.52,0,21.19,1.34,29,4.03,7.81,2.69,14.15,6.09,19.01,10.18,4.86,4.1,8.58,8.45,11.14,13.06h6.91V8.13h48.4v268.86h-47.63v-23.05h-6.91c-4.36,7.17-11.08,13.7-20.16,19.59-9.09,5.89-22.34,8.83-39.75,8.83ZM1625.29,240.12c14.85,0,27.27-4.8,37.26-14.4,9.99-9.6,14.98-23.62,14.98-42.06v-3.84c0-18.44-4.93-32.46-14.79-42.06-9.86-9.6-22.34-14.4-37.45-14.4s-27.27,4.8-37.26,14.4c-9.99,9.6-14.98,23.62-14.98,42.06v3.84c0,18.44,4.99,32.46,14.98,42.06,9.99,9.6,22.4,14.4,37.26,14.4Z"/>
</g>
</svg>`;

// Chat icon SVG - Chat.svg dosyasından
const chatIconSvg = `<svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect x="1" y="1" width="46" height="46" rx="23" fill="white" fillOpacity="0.05"/>
<rect x="1" y="1" width="46" height="46" rx="23" stroke="url(#paint0_linear_100_242)" strokeWidth="2"/>
<path d="M24.5 14.0117C24.3344 14.0039 24.1677 14 24 14C18.4778 14 14 18.2836 14 23.5667C14 26.1051 15.0333 28.4115 16.7189 30.1231C17.09 30.5 17.3378 31.0148 17.2378 31.5448C17.0728 32.4112 16.6987 33.2194 16.1511 33.893C17.592 34.161 19.0901 33.9197 20.375 33.2364C20.8292 32.9949 21.0563 32.8741 21.2165 32.8496C21.3768 32.8251 21.6063 32.8682 22.0654 32.9545C22.7032 33.0742 23.3507 33.1343 24 33.1334C29.5222 33.1334 34 28.8499 34 23.5667C34 23.3765 33.9942 23.1875 33.9827 23" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
<path d="M27 17.5H34M30.5 14V21" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
<path d="M23.9955 24H24.0045M27.991 24H28M20 24H20.009" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
<defs>
<linearGradient id="paint0_linear_100_242" x1="24" y1="0" x2="24" y2="48" gradientUnits="userSpaceOnUse">
<stop stopColor="white" stopOpacity="0.33"/>
<stop offset="1" stopColor="white" stopOpacity="0"/>
</linearGradient>
</defs>
</svg>`;

// Back arrow icon SVG - sag_ok.svg dosyasından (normal layout için)
const backArrowSvg = `<svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect x="47" y="47" width="46" height="46" rx="23" transform="rotate(-180 47 47)" fill="white" fillOpacity="0.05"/>
<rect x="47" y="47" width="46" height="46" rx="23" transform="rotate(-180 47 47)" stroke="url(#paint0_linear_100_230)" strokeWidth="2"/>
<path d="M29.075 23.3432L25.75 20.0182C25.5166 19.7848 25.4048 19.5126 25.4146 19.2015C25.4243 18.8904 25.5361 18.6182 25.75 18.3848C25.9833 18.1515 26.2604 18.03 26.5812 18.0203C26.9021 18.0105 27.1791 18.1223 27.4125 18.3557L32.75 23.6932C32.9833 23.9265 33.1 24.1987 33.1 24.5098C33.1 24.8209 32.9833 25.0932 32.75 25.3265L27.4125 30.664C27.1791 30.8973 26.9021 31.0091 26.5812 30.9994C26.2604 30.9897 25.9833 30.8682 25.75 30.6348C25.5361 30.4015 25.4243 30.1293 25.4146 29.8182C25.4048 29.5071 25.5166 29.2348 25.75 29.0015L29.075 25.6765L16.0666 25.6765C15.7361 25.6765 15.459 25.5647 15.2354 25.3411C15.0118 25.1175 14.9 24.8404 14.9 24.5098C14.9 24.1793 15.0118 23.9022 15.2354 23.6786C15.459 23.455 15.7361 23.3432 16.0666 23.3432L29.075 23.3432Z" fill="white"/>
<defs>
<linearGradient id="paint0_linear_100_230" x1="72" y1="48" x2="72" y2="96" gradientUnits="userSpaceOnUse">
<stop stopColor="white" stopOpacity="0.33"/>
<stop offset="1" stopColor="white" stopOpacity="0"/>
</linearGradient>
</defs>
</svg>`;

// Back arrow icon SVG - sol_ok.svg dosyasından (reverse layout için - ChatHistoryScreen)
const backArrowLeftSvg = `<svg width="65" height="48" viewBox="0 0 65 48" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect x="9.5" y="1" width="46" height="46" rx="23" fill="white" fillOpacity="0.05"/>
<rect x="9.5" y="1" width="46" height="46" rx="23" stroke="url(#paint0_linear_1_929)" strokeWidth="2"/>
<path d="M27.425 24.6568L30.75 27.9818C30.9834 28.2152 31.0952 28.4874 31.0854 28.7985C31.0757 29.1096 30.9639 29.3818 30.75 29.6152C30.5167 29.8485 30.2396 29.97 29.9188 29.9797C29.5979 29.9895 29.3209 29.8777 29.0875 29.6443L23.75 24.3068C23.5167 24.0735 23.4 23.8013 23.4 23.4902C23.4 23.1791 23.5167 22.9068 23.75 22.6735L29.0875 17.336C29.3209 17.1027 29.5979 16.9909 29.9188 17.0006C30.2396 17.0103 30.5167 17.1318 30.75 17.3652C30.9639 17.5985 31.0757 17.8707 31.0854 18.1818C31.0952 18.4929 30.9834 18.7652 30.75 18.9985L27.425 22.3235H40.4334C40.7639 22.3235 41.041 22.4353 41.2646 22.6589C41.4882 22.8825 41.6 23.1596 41.6 23.4902C41.6 23.8207 41.4882 24.0978 41.2646 24.3214C41.041 24.545 40.7639 24.6568 40.4334 24.6568H27.425Z" fill="white"/>
<defs>
<linearGradient id="paint0_linear_1_929" x1="32.5" y1="0" x2="32.5" y2="48" gradientUnits="userSpaceOnUse">
<stop stopColor="white" stopOpacity="0.33"/>
<stop offset="1" stopColor="white" stopOpacity="0"/>
</linearGradient>
</defs>
</svg>`;

interface HeaderProps {
  onBackPress?: () => void;
  onChatPress?: () => void;
  onLogoPress?: () => void;
  showBackButton?: boolean;
  showChatButton?: boolean;
  showLogo?: boolean;
  title?: string;
  // Search bar props
  searchValue?: string;
  onSearchChange?: (text: string) => void;
  searchPlaceholder?: string;
  showSearch?: boolean;
  // Reverse layout: Chat button on left, Back button on right (for ChatHistoryScreen)
  reverseLayout?: boolean;
}

const Header: React.FC<HeaderProps> = ({
  onBackPress,
  onChatPress,
  onLogoPress,
  showBackButton = true,
  showChatButton = true,
  showLogo = true,
  title,
  searchValue,
  onSearchChange,
  searchPlaceholder = "Ara",
  showSearch = false,
  reverseLayout = false,
}) => {
  const searchInputRef = useRef<TextInput>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const imageLoadedRef = useRef(false);

  // Görseli hemen yükle - component mount olduğunda
  useEffect(() => {
    // Görseli hemen yükle (preload)
    const imageSource = require("@assets/images/elipse-light.png");
    // Görsel zaten cache'de olabilir, bu yüzden direkt yükle
    setImageLoaded(true);
    imageLoadedRef.current = true;
  }, []);

  const handleImageLoad = () => {
    setImageLoaded(true);
    imageLoadedRef.current = true;
  };

  return (
    <View style={styles.header}>
      <Image
        source={require("@assets/images/elipse-light.png")}
        style={[
          styles.headerBlur,
          {
            opacity: imageLoadedRef.current || imageLoaded ? 1 : 0,
          },
        ]}
        resizeMode="cover"
        onLoad={handleImageLoad}
        fadeDuration={0}
      />

      {/* Sol taraf - Normal: Geri butonu, Reverse: Chat butonu */}
      {reverseLayout ? (
        // Reverse layout: Chat button on left
        showChatButton ? (
          <TouchableOpacity
            style={styles.headerButton}
            onPress={onChatPress}
            accessible={true}
            accessibilityLabel="Chat başlat"
            accessibilityHint="Yeni bir sohbet başlatmak için dokunun"
            accessibilityRole="button"
          >
            <View style={styles.chatButton}>
              <SvgXml xml={chatIconSvg} width={48} height={48} />
            </View>
          </TouchableOpacity>
        ) : null
      ) : // Normal layout: Back button on left
      showBackButton ? (
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => {
            console.log("🔙 Header geri butonu tıklandı");
            onBackPress?.();
          }}
          accessible={true}
          accessibilityLabel="Geri git"
          accessibilityHint="Önceki ekrana dönmek için dokunun"
          accessibilityRole="button"
        >
          <View>
            <SvgXml xml={backArrowSvg} width={48} height={48} />
          </View>
        </TouchableOpacity>
      ) : (
        <View style={styles.headerButton} />
      )}

      <View style={styles.headerCenter}>
        {title ? (
          <Text style={styles.headerTitle}>{title}</Text>
        ) : showLogo ? (
          <TouchableOpacity
            onPress={() => {
              console.log("🏠 Logo tıklandı - Home ekranına gidiliyor");
              onLogoPress?.();
            }}
            accessible={true}
            accessibilityLabel="Ana sayfa"
            accessibilityHint="Ana sayfaya dönmek için dokunun"
            accessibilityRole="button"
            style={styles.logoButton}
          >
            <SvgXml
              xml={nirmindWhiteSvg}
              width={160}
              height={26}
              style={styles.logoStyle}
            />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Sağ taraf - Normal: Chat butonu, Reverse: Search bar ve Geri butonu */}
      {reverseLayout ? (
        // Reverse layout: Search bar and Back button on right
        <View style={styles.headerRight}>
          {showSearch && (
            <TouchableOpacity
              style={styles.searchBarContainer}
              activeOpacity={1}
              onPress={() => {
                searchInputRef.current?.focus();
              }}
            >
              <SvgXml
                xml={`<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M7.33333 12.6667C10.2789 12.6667 12.6667 10.2789 12.6667 7.33333C12.6667 4.38781 10.2789 2 7.33333 2C4.38781 2 2 4.38781 2 7.33333C2 10.2789 4.38781 12.6667 7.33333 12.6667Z" stroke="#9CA3AF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M14 14L11.1 11.1" stroke="#9CA3AF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`}
                width="16"
                height="16"
              />
              <TextInput
                ref={searchInputRef}
                style={styles.searchInput}
                placeholder={searchPlaceholder}
                placeholderTextColor="#9CA3AF"
                value={searchValue}
                onChangeText={onSearchChange}
                returnKeyType="search"
                blurOnSubmit={false}
                autoCorrect={false}
                autoCapitalize="none"
              />
            </TouchableOpacity>
          )}
          {showBackButton && (
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => {
                console.log("🔙 Header geri butonu tıklandı");
                onBackPress?.();
              }}
              accessible={true}
              accessibilityLabel="Geri git"
              accessibilityHint="Önceki ekrana dönmek için dokunun"
              accessibilityRole="button"
            >
          <View>
            <SvgXml xml={backArrowLeftSvg} width={65} height={48} />
          </View>
            </TouchableOpacity>
          )}
        </View>
      ) : // Normal layout: Chat button on right
      showChatButton ? (
        <TouchableOpacity
          style={styles.headerButton}
          onPress={onChatPress}
          accessible={true}
          accessibilityLabel="Chat başlat"
          accessibilityHint="Yeni bir sohbet başlatmak için dokunun"
          accessibilityRole="button"
        >
          <View style={styles.chatButton}>
            <SvgXml xml={chatIconSvg} width={48} height={48} />
          </View>
        </TouchableOpacity>
      ) : (
        <View style={styles.headerButton} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    position: "relative",
  },
  headerBlur: {
    position: "absolute",
    top: -600,
    right: -600,
    width: 1200,
    height: 1200,
    opacity: 3.0,
    tintColor: "#7E7AE9",
  },
  headerButton: {
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
 
  arrowText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "bold",
    marginTop: -6,
    transform: [{ scaleX: -1 }],
  },
  headerCenter: {
    flex: 1,
    flexShrink: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minWidth: 0,
  },
  headerTitle: {
    fontFamily: "Poppins-Medium",
    fontSize: 22,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  chatButton: {
    width: 48,
    height: 48,
    borderRadius: 100,

    justifyContent: "center",
    alignItems: "center",
    paddingTop: 17,
    paddingRight: 12,
    paddingBottom: 12,
    paddingLeft: 12,
  },
  logoStyle: {
    transform: [{ rotate: "0deg" }],
    opacity: 1,
  },
  logoButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    // Hover effect için hafif background
    backgroundColor: "transparent",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flexShrink: 1,
    minWidth: 0,
    flex: 1,
    justifyContent: "flex-end",
  },
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 44,
    flex: 1,
    minWidth: 250,
    maxWidth: width * 0.9,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: "Poppins-Regular",
    paddingVertical: 0,
    minHeight: 20,
  },
});

export default memo(Header);
