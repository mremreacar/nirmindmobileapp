import React, { memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
} from 'react-native';
import { SvgXml } from 'react-native-svg';

const { width } = Dimensions.get('window');

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

// Chat icon SVG - Home ekranındaki gibi
const chatIconSvg = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M12.5 2.01175C12.3344 2.00395 12.1677 2 12 2C6.47778 2 2 6.28357 2 11.5667C2 14.1051 3.03333 16.4115 4.71889 18.1231C5.09 18.5 5.33778 19.0148 5.23778 19.5448C5.07275 20.4112 4.69874 21.2194 4.15111 21.893C5.59195 22.161 7.09014 21.9197 8.37499 21.2364C8.82918 20.9949 9.05627 20.8741 9.21653 20.8496C9.37678 20.8251 9.60633 20.8682 10.0654 20.9545C10.7032 21.0742 11.3507 21.1343 12 21.1334C17.5222 21.1334 22 16.8499 22 11.5667C22 11.3765 21.9942 11.1875 21.9827 11" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M15 5.5H22M18.5 2V9" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M11.9955 12H12.0045M15.991 12H16M8 12H8.00897" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

interface HeaderProps {
  onBackPress?: () => void;
  onChatPress?: () => void;
  onLogoPress?: () => void;
  showBackButton?: boolean;
  showChatButton?: boolean;
  title?: string;
}

const Header: React.FC<HeaderProps> = ({
  onBackPress,
  onChatPress,
  onLogoPress,
  showBackButton = true,
  showChatButton = true,
  title,
}) => {
  return (
    <View style={styles.header}>
      <Image
        source={require('@assets/images/elipse-light.png')}
        style={styles.headerBlur}
        resizeMode="cover"
      />
      
      {showBackButton && (
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => {
            console.log('🔙 Header geri butonu tıklandı');
            onBackPress?.();
          }}
          accessible={true}
          accessibilityLabel="Geri git"
          accessibilityHint="Önceki ekrana dönmek için dokunun"
          accessibilityRole="button"
        >
          <View style={styles.arrowButton}>
            <Text style={styles.arrowText}>←</Text>
          </View>
        </TouchableOpacity>
      )}

      <View style={styles.headerCenter}>
        {title ? (
          <Text style={styles.headerTitle}>{title}</Text>
        ) : (
          <TouchableOpacity
            onPress={() => {
              console.log('🏠 Logo tıklandı - Home ekranına gidiliyor');
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
        )}
      </View>

      {showChatButton && (
        <TouchableOpacity
          style={styles.headerButton}
          onPress={onChatPress}
          accessible={true}
          accessibilityLabel="Chat başlat"
          accessibilityHint="Yeni bir sohbet başlatmak için dokunun"
          accessibilityRole="button"
        >
          <View style={styles.chatButton}>
            <SvgXml
              xml={chatIconSvg}
              width={20}
              height={20}
            />
          </View>
        </TouchableOpacity>
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
    tintColor: '#7E7AE9',
  },
  headerButton: {
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  arrowButton: {
    width: 48,
    height: 48,
    borderRadius: 100,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.3)",
    paddingTop: 17,
    paddingRight: 12,
    paddingBottom: 12,
    paddingLeft: 12,
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
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
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.3)",
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
    backgroundColor: 'transparent',
  },
});

export default memo(Header);
