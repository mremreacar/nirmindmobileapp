import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts } from 'expo-font';
import { SvgXml } from 'react-native-svg';
import Header from '../components/Header';
import { useAuth } from '../contexts/AuthContext';
import BackendApiService from '../services/BackendApiService';

const { width, height } = Dimensions.get('window');

const phoneIcon = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M2.5 3.33333C2.5 2.8731 2.8731 2.5 3.33333 2.5H5.83333C6.29357 2.5 6.66667 2.8731 6.66667 3.33333C6.66667 4.25381 6.66667 5.17429 6.66667 6.09476C6.66667 6.555 6.29357 6.9281 5.83333 6.9281C5.3731 6.9281 5 6.555 5 6.09476V3.33333H3.33333V16.6667H5V13.9052C5 13.445 5.3731 13.0719 5.83333 13.0719C6.29357 13.0719 6.66667 13.445 6.66667 13.9052C6.66667 14.8257 6.66667 15.7462 6.66667 16.6667C6.66667 17.1269 6.29357 17.5 5.83333 17.5H3.33333C2.8731 17.5 2.5 17.1269 2.5 16.6667V3.33333Z" fill="white"/>
<path d="M8.33333 2.5H16.6667C17.1269 2.5 17.5 2.8731 17.5 3.33333V16.6667C17.5 17.1269 17.1269 17.5 16.6667 17.5H8.33333C7.8731 17.5 7.5 17.1269 7.5 16.6667V3.33333C7.5 2.8731 7.8731 2.5 8.33333 2.5ZM9.16667 4.16667V15.8333H15.8333V4.16667H9.16667Z" fill="white"/>
</svg>`;

const editIcon = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M11.05 3.00002L4.20835 10.2417C3.95002 10.5167 3.70002 11.0584 3.65002 11.4334L3.34169 14.1334C3.23335 15.1084 3.93335 15.775 4.90002 15.6084L7.58335 15.15C7.95835 15.0834 8.48335 14.8084 8.74169 14.525L15.5834 7.28335C16.7667 6.08335 17.3 4.60835 15.4584 2.86668C13.625 1.14168 12.2334 1.75002 11.05 3.00002Z" stroke="white" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M9.90833 4.20831C10.2667 6.00831 11.7333 7.46665 13.5417 7.81665" stroke="white" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M2.5 18.3333H17.5" stroke="white" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const locationIcon = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M9.99999 11.1917C11.4358 11.1917 12.5992 10.0283 12.5992 8.59249C12.5992 7.15666 11.4358 5.99333 9.99999 5.99333C8.56416 5.99333 7.40083 7.15666 7.40083 8.59249C7.40083 10.0283 8.56416 11.1917 9.99999 11.1917Z" stroke="white" stroke-width="1.5"/>
<path d="M3.01666 7.07499C4.65833 -0.141676 15.35 -0.133343 16.9833 7.08333C17.9417 11.3167 15.3083 14.9 12.8667 17.1167C11.4833 18.3667 8.51666 18.3667 7.12499 17.1167C4.69166 14.9 2.05833 11.3083 3.01666 7.07499Z" stroke="white" stroke-width="1.5"/>
</svg>`;

const globeIcon = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M10 18.3333C14.6024 18.3333 18.3333 14.6024 18.3333 10C18.3333 5.39763 14.6024 1.66667 10 1.66667C5.39763 1.66667 1.66667 5.39763 1.66667 10C1.66667 14.6024 5.39763 18.3333 10 18.3333Z" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M1.66667 10H18.3333" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M10 1.66667C12.0703 3.737 13.3333 6.763 13.3333 10C13.3333 13.237 12.0703 16.263 10 18.3333C7.92967 16.263 6.66667 13.237 6.66667 10C6.66667 6.763 7.92967 3.737 10 1.66667Z" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const cardIcon = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M1.66667 6.66667H18.3333" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M2.5 15H6.66667" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M9.16667 15H12.5" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M17.5 10.8333V4.16667C17.5 2.5 16.6667 1.66667 15 1.66667H5C3.33333 1.66667 2.5 2.5 2.5 4.16667V15.8333C2.5 17.5 3.33333 18.3333 5 18.3333H15C16.6667 18.3333 17.5 17.5 17.5 15.8333V12.5" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const infoIcon = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M9.16667 6.66667H10.8333V8.33333H9.16667V6.66667Z" fill="white"/>
<path d="M9.16667 10H10.8333V15H9.16667V10Z" fill="white"/>
<path d="M10 1.66667C5.4 1.66667 1.66667 5.4 1.66667 10C1.66667 14.6 5.4 18.3333 10 18.3333C14.6 18.3333 18.3333 14.6 18.3333 10C18.3333 5.4 14.6 1.66667 10 1.66667ZM10 16.6667C6.325 16.6667 3.33333 13.675 3.33333 10C3.33333 6.325 6.325 3.33333 10 3.33333C13.675 3.33333 16.6667 6.325 16.6667 10C16.6667 13.675 13.675 16.6667 10 16.6667Z" fill="white"/>
</svg>`;

const logoutIcon = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M7.5 17.5H4.16667C3.24167 17.5 2.5 16.7583 2.5 15.8333V4.16667C2.5 3.24167 3.24167 2.5 4.16667 2.5H7.5" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M13.3333 14.1667L17.5 10L13.3333 5.83333" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M17.5 10H7.5" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const chevronRightIcon = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M6 12L10 8L6 4" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

interface ProfileScreenProps {
  onBack: () => void;
  onChatPress?: () => void;
  onHelpCenterPress?: () => void;
  onLogout?: () => void;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ onBack, onChatPress, onHelpCenterPress, onLogout }) => {
  const { user: authUser, logout } = useAuth();
  const [profileData, setProfileData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const backendApiService = BackendApiService.getInstance();
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  
  let [fontsLoaded] = useFonts({
    'Poppins-Regular': require('@assets/fonts/Poppins-Regular .ttf'),
    'Poppins-Medium': require('@assets/fonts/Poppins-Medium.ttf'),
  });

  // Shimmer animasyonu - daha smooth
  useEffect(() => {
    if (isLoading) {
      shimmerAnim.setValue(0);
      contentOpacity.setValue(0);
      const shimmerAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(shimmerAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      );
      shimmerAnimation.start();
      return () => {
        shimmerAnimation.stop();
        shimmerAnim.setValue(0);
      };
    } else {
      // Loading bittiğinde animasyonu durdur ve içeriği fade-in yap
      shimmerAnim.setValue(0);
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isLoading, shimmerAnim, contentOpacity]);

  // Backend'den profil bilgilerini çek
  useEffect(() => {
    const loadProfile = async () => {
      try {
        setIsLoading(true);
        // Profil bilgileri logları kaldırıldı (açılışta çok fazla log üretiyordu)
        const response = await backendApiService.getUserProfile();
        
        if (response.success && response.data) {
          // Profil bilgileri alındı logları kaldırıldı
          setProfileData(response.data);
        } else {
          // Profil bilgileri alınamadı uyarısı kaldırıldı
          // Backend'den alınamazsa auth user'ı kullan
          setProfileData(authUser);
        }
      } catch (error) {
        console.error('❌ Profil yükleme hatası:', error);
        // Hata durumunda auth user'ı kullan
        setProfileData(authUser);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [authUser]);

  if (!fontsLoaded) {
    return null;
  }

  // Backend'den gelen profil verisini veya auth user'ı kullan
  const user = profileData || authUser;

  // Kullanıcı adının baş harflerini al
  const getInitials = () => {
    if (!user) return '??';
    const firstInitial = user.firstName?.charAt(0) || '';
    const lastInitial = user.lastName?.charAt(0) || '';
    return (firstInitial + lastInitial).toUpperCase();
  };

  const fullName = user ? `${user.firstName} ${user.lastName}` : 'Kullanıcı';
  const email = user?.email || 'email@example.com';
  const phone = user?.phone || 'Belirtilmemiş';
  const address = user?.address || 'Belirtilmemiş';
  const language = user?.language || 'Belirtilmemiş';
  const cardInfo = user?.cardInfo || 'Yok';

  return (
    <View style={styles.profileContainer}>
      <LinearGradient
        colors={['#02020A', '#16163C']}
        locations={[0.1827, 1.0]}
        style={styles.profileGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        {/* Header */}
        <Header
          onBackPress={onBack}
          onChatPress={onChatPress}
          onLogoPress={() => {
            // Profil ekranından Home ekranına gitme logları kaldırıldı
            onBack();
          }}
          showBackButton={true}
          showChatButton={true}
          title="Profilim"
        />

        <ScrollView style={styles.profileContent}>
          {isLoading ? (
            <Animated.View 
              style={[
                styles.skeletonContainer,
                {
                  opacity: shimmerAnim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [1, 1, 1],
                  }),
                },
              ]}
            >
              {/* Profile Info Skeleton */}
              <View style={styles.skeletonProfileInfoSection}>
                <View style={[styles.skeletonProfileImage, styles.skeletonShimmer]}>
                  <Animated.View
                    style={[
                      styles.skeletonShimmerOverlay,
                      {
                        opacity: shimmerAnim.interpolate({
                          inputRange: [0, 0.5, 1],
                          outputRange: [0.1, 0.3, 0.1],
                        }),
                      },
                    ]}
                  />
                </View>
                <View style={[styles.skeletonName, styles.skeletonShimmer]}>
                  <Animated.View
                    style={[
                      styles.skeletonShimmerOverlay,
                      {
                        opacity: shimmerAnim.interpolate({
                          inputRange: [0, 0.5, 1],
                          outputRange: [0.1, 0.3, 0.1],
                        }),
                      },
                    ]}
                  />
                </View>
                <View style={[styles.skeletonEmail, styles.skeletonShimmer]}>
                  <Animated.View
                    style={[
                      styles.skeletonShimmerOverlay,
                      {
                        opacity: shimmerAnim.interpolate({
                          inputRange: [0, 0.5, 1],
                          outputRange: [0.1, 0.3, 0.1],
                        }),
                      },
                    ]}
                  />
                </View>
              </View>

              {/* Details Card Skeleton */}
              <View style={styles.skeletonDetailsCard}>
                {[1, 2, 3, 4].map((index) => (
                  <View key={index} style={styles.skeletonDetailRow}>
                    <View style={[styles.skeletonIcon, styles.skeletonShimmer]}>
                      <Animated.View
                        style={[
                          styles.skeletonShimmerOverlay,
                          {
                            opacity: shimmerAnim.interpolate({
                              inputRange: [0, 0.5, 1],
                              outputRange: [0.2, 0.6, 0.2],
                            }),
                          },
                        ]}
                      />
                    </View>
                    <View style={styles.skeletonDetailTextContainer}>
                      <View style={[styles.skeletonLabel, styles.skeletonShimmer]}>
                        <Animated.View
                          style={[
                            styles.skeletonShimmerOverlay,
                            {
                              opacity: shimmerAnim.interpolate({
                                inputRange: [0, 0.5, 1],
                                outputRange: [0.2, 0.6, 0.2],
                              }),
                            },
                          ]}
                        />
                      </View>
                      <View style={[styles.skeletonValue, styles.skeletonShimmer]}>
                        <Animated.View
                          style={[
                            styles.skeletonShimmerOverlay,
                            {
                              opacity: shimmerAnim.interpolate({
                                inputRange: [0, 0.5, 1],
                                outputRange: [0.2, 0.6, 0.2],
                              }),
                            },
                          ]}
                        />
                      </View>
                    </View>
                  </View>
                ))}
              </View>

              {/* Actions Card Skeleton */}
              <View style={styles.skeletonActionsCard}>
                {[1, 2].map((index) => (
                  <View key={index} style={styles.skeletonActionRow}>
                    <View style={[styles.skeletonActionIcon, styles.skeletonShimmer]}>
                      <Animated.View
                        style={[
                          styles.skeletonShimmerOverlay,
                          {
                            opacity: shimmerAnim.interpolate({
                              inputRange: [0, 0.5, 1],
                              outputRange: [0.2, 0.6, 0.2],
                            }),
                          },
                        ]}
                      />
                    </View>
                    <View style={[styles.skeletonActionText, styles.skeletonShimmer]}>
                      <Animated.View
                        style={[
                          styles.skeletonShimmerOverlay,
                          {
                            opacity: shimmerAnim.interpolate({
                              inputRange: [0, 0.5, 1],
                              outputRange: [0.2, 0.6, 0.2],
                            }),
                          },
                        ]}
                      />
                    </View>
                    <View style={[styles.skeletonChevron, styles.skeletonShimmer]}>
                      <Animated.View
                        style={[
                          styles.skeletonShimmerOverlay,
                          {
                            opacity: shimmerAnim.interpolate({
                              inputRange: [0, 0.5, 1],
                              outputRange: [0.2, 0.6, 0.2],
                            }),
                          },
                        ]}
                      />
                    </View>
                  </View>
                ))}
              </View>
            </Animated.View>
          ) : (
            <Animated.View
              style={[
                styles.contentContainer,
                {
                  opacity: contentOpacity,
                },
              ]}
            >
              {/* Profile Info Section */}
              <View style={styles.profileInfoSection}>
            <View style={styles.profileImageContainer}>
              <View style={styles.profileImage}>
                {user?.profileImageUrl ? (
                  <Image 
                    source={{ uri: user.profileImageUrl }} 
                    style={styles.profileImageSource}
                    resizeMode="cover"
                  />
                ) : (
                  <Text allowFontScaling={false} style={styles.profileInitials}>{getInitials()}</Text>
                )}
              </View>
            </View>
            <Text allowFontScaling={false} style={styles.profileName}>{fullName}</Text>
            <Text allowFontScaling={false} style={styles.profileEmail}>{email}</Text>
          </View>

          {/* User Details Card */}
          <View style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <View style={styles.detailLeft}>
                <SvgXml xml={phoneIcon} width="20" height="20" />
                <View style={styles.detailTextContainer}>
                  <Text allowFontScaling={false} style={styles.detailLabel}>Telefon Numarası</Text>
                  <Text allowFontScaling={false} style={styles.detailValue}>{phone}</Text>
                </View>
              </View>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.detailLeft}>
                <SvgXml xml={locationIcon} width="20" height="20" />
                <View style={styles.detailTextContainer}>
                  <Text allowFontScaling={false} style={styles.detailLabel}>Mevcut Adres</Text>
                  <Text allowFontScaling={false} style={styles.detailValue}>{address}</Text>
                </View>
              </View>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.detailLeft}>
                <SvgXml xml={globeIcon} width="20" height="20" />
                <View style={styles.detailTextContainer}>
                  <Text allowFontScaling={false} style={styles.detailLabel}>Dil</Text>
                  <Text allowFontScaling={false} style={styles.detailValue}>{language}</Text>
                </View>
              </View>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.detailLeft}>
                <SvgXml xml={cardIcon} width="20" height="20" />
                <View style={styles.detailTextContainer}>
                  <Text allowFontScaling={false} style={styles.detailLabel}>Mevcut Kartım</Text>
                  <Text allowFontScaling={false} style={styles.detailValue}>{cardInfo}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Actions Card */}
          <View style={styles.actionsCard}>
            <TouchableOpacity style={styles.actionRow} onPress={onHelpCenterPress}>
              <View style={styles.actionLeft}>
                <SvgXml xml={infoIcon} width="20" height="20" />
                <Text allowFontScaling={false} style={styles.actionText}>Yardım Merkezi</Text>
              </View>
              <SvgXml xml={chevronRightIcon} width="16" height="16" />
            </TouchableOpacity>

              <TouchableOpacity style={styles.actionRow} onPress={() => {
                logout();
                onLogout?.();
              }}>
                <View style={styles.actionLeft}>
                  <SvgXml xml={logoutIcon} width="20" height="20" />
                  <Text allowFontScaling={false} style={styles.actionText}>Çıkış Yap</Text>
                </View>
                <SvgXml xml={chevronRightIcon} width="16" height="16" />
              </TouchableOpacity>
          </View>

              {/* Footer Text */}
              <View style={styles.footerSection}>
                <Text allowFontScaling={false} style={styles.footerText}>
                Tüm kullanıcı bilgileri Nirpax uygulaması{'\n'}
                üzerinden otomatik olarak entegre edilir.
                </Text>
              </View>
            </Animated.View>
          )}
        </ScrollView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  profileContainer: {
    flex: 1,
    width: width,
    height: height,
    backgroundColor: '#16163C',
  },
  profileGradient: {
    flex: 1,
  },
  profileContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  profileInfoSection: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  profileImageContainer: {
    marginBottom: 8,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#7E7AE9',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  profileImageSource: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  profileInitials: {
    fontFamily: 'Poppins-Medium',
    fontSize: 32,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  profileName: {
    fontFamily: 'Poppins-Medium',
    fontSize: 24,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  profileEmail: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    fontWeight: '400',
    color: '#9CA3AF',
  },
  detailsCard: {
    backgroundColor: '#FFFFFF0D',
    borderRadius: 24,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFFFFF0D',
  },
  detailRow: {
    marginBottom: 16,
  },
  detailLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  detailTextContainer: {
    flex: 1,
  },
  detailLabel: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  detailValue: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    fontWeight: '400',
    color: '#9CA3AF',
    lineHeight: 20,
  },
  actionsCard: {
    backgroundColor: '#FFFFFF0D',
    borderRadius: 24,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFFFFF0D',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  footerSection: {
    paddingVertical: 8,
    paddingBottom: 20,
  },
  footerText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    fontWeight: '400',
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
  },
  skeletonContainer: {
    flex: 1,
    paddingTop: 20,
  },
  contentContainer: {
    flex: 1,
  },
  skeletonProfileInfoSection: {
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 20,
  },
  skeletonProfileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFFFFF08',
    marginBottom: 16,
    overflow: 'hidden',
  },
  skeletonName: {
    width: 180,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#FFFFFF08',
    marginBottom: 8,
    overflow: 'hidden',
  },
  skeletonEmail: {
    width: 220,
    height: 20,
    borderRadius: 8,
    backgroundColor: '#FFFFFF08',
    overflow: 'hidden',
  },
  skeletonDetailsCard: {
    backgroundColor: '#FFFFFF05',
    borderRadius: 24,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFFFFF05',
  },
  skeletonDetailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  skeletonIcon: {
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: '#FFFFFF08',
    overflow: 'hidden',
  },
  skeletonDetailTextContainer: {
    flex: 1,
  },
  skeletonLabel: {
    width: '60%',
    height: 18,
    borderRadius: 6,
    backgroundColor: '#FFFFFF08',
    marginBottom: 8,
    overflow: 'hidden',
  },
  skeletonValue: {
    width: '80%',
    height: 16,
    borderRadius: 6,
    backgroundColor: '#FFFFFF08',
    overflow: 'hidden',
  },
  skeletonActionsCard: {
    backgroundColor: '#FFFFFF05',
    borderRadius: 24,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFFFFF05',
  },
  skeletonActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    marginBottom: 8,
  },
  skeletonActionIcon: {
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: '#FFFFFF08',
    marginRight: 12,
    overflow: 'hidden',
  },
  skeletonActionText: {
    flex: 1,
    height: 20,
    borderRadius: 6,
    backgroundColor: '#FFFFFF08',
    overflow: 'hidden',
  },
  skeletonChevron: {
    width: 16,
    height: 16,
    borderRadius: 4,
    backgroundColor: '#FFFFFF08',
    marginLeft: 12,
    overflow: 'hidden',
  },
  skeletonShimmer: {
    position: 'relative',
    overflow: 'hidden',
  },
  skeletonShimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF15',
  },
});

export default ProfileScreen;
