import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  Linking,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts } from 'expo-font';
import { SvgXml } from 'react-native-svg';
import Header from '../components/Header';
import BackendApiService from '../services/BackendApiService';

const { width, height } = Dimensions.get('window');

const backIcon = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M12.5 15L7.5 10L12.5 5" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;


const emailIcon = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M3.33333 6.66667L8.25833 10.7417C8.85 11.175 9.575 11.4 10.3167 11.375C11.0583 11.35 11.7667 11.075 12.325 10.6L16.6667 7.08333" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M15 15H5C3.33333 15 2.5 14.1667 2.5 12.5V7.5C2.5 5.83333 3.33333 5 5 5H15C16.6667 5 17.5 5.83333 17.5 7.5V12.5C17.5 14.1667 16.6667 15 15 15Z" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const chevronDownIcon = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M4 6L8 10L12 6" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const chevronRightIcon = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M6 12L10 8L6 4" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

interface HelpCenterScreenProps {
  onBack: () => void;
  onChatPress?: () => void;
}

interface FAQItem {
  id?: string;
  question: string;
  answer: string;
  category?: string;
}

const HelpCenterScreen: React.FC<HelpCenterScreenProps> = ({ onBack, onChatPress }) => {
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [faqData, setFaqData] = useState<FAQItem[]>([]);
  const [isLoadingFAQ, setIsLoadingFAQ] = useState(true);
  const [faqError, setFaqError] = useState<string | null>(null);
  const backendApiService = BackendApiService.getInstance();
  
  let [fontsLoaded] = useFonts({
    'Poppins-Regular': require('@assets/fonts/Poppins-Regular .ttf'),
    'Poppins-Medium': require('@assets/fonts/Poppins-Medium.ttf'),
  });

  // Backend'den FAQ verilerini çek
  useEffect(() => {
    const loadFAQ = async () => {
      try {
        setIsLoadingFAQ(true);
        setFaqError(null);
        const response = await backendApiService.getFAQ();
        
        if (response.success && response.data) {
          // Backend'den gelen format: { faqs: [...], pagination: {...} }
          const faqs = response.data.faqs || response.data || [];
          setFaqData(faqs);
        } else {
          // Backend'den veri alınamazsa boş liste
          setFaqData([]);
          console.warn('⚠️ FAQ verileri backend\'den alınamadı');
        }
      } catch (error) {
        console.error('❌ FAQ yükleme hatası:', error);
        setFaqError('FAQ verileri yüklenemedi');
        // Hata durumunda boş liste
        setFaqData([]);
      } finally {
        setIsLoadingFAQ(false);
      }
    };

    loadFAQ();
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  const toggleAccordion = (index: number) => {
    const newExpandedItems = new Set(expandedItems);
    if (newExpandedItems.has(index)) {
      newExpandedItems.delete(index);
    } else {
      newExpandedItems.add(index);
    }
    setExpandedItems(newExpandedItems);
  };

  const handleEmailPress = () => {
    const email = 'support@nirmind.app';
    const subject = 'Yardım Talebi';
    const body = 'Merhaba,\n\n';
    const url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      }
    });
  };


  return (
    <View style={styles.helpCenterContainer}>
      <LinearGradient
        colors={['#02020A', '#16163C']}
        locations={[0.1827, 1.0]}
        style={styles.helpCenterGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        {/* Header */}
        <Header
          onBackPress={onBack}
          onChatPress={onChatPress}
          onLogoPress={() => {
            console.log('🏠 Yardım Merkezi ekranından Home ekranına gidiliyor');
            onBack();
          }}
          showBackButton={true}
          showChatButton={true}
          title="Yardım Merkezi"
        />

        <ScrollView style={styles.helpCenterContent}>
          {/* Intro Text */}
          <View style={styles.introSection}>
            <Text style={styles.introText}>
              Sorularınıza hızlıca yanıt bulun veya bizimle iletişime geçin.
            </Text>
          </View>

          {/* Contact Options */}
          <View style={styles.contactSection}>
            {/* Email Contact */}
            <TouchableOpacity style={styles.contactButton} onPress={handleEmailPress}>
              <View style={styles.contactButtonContent}>
                <SvgXml xml={emailIcon} width="20" height="20" />
                <Text style={styles.contactButtonText}>Bize Ulaşın: support@nirmind.app</Text>
              </View>
            </TouchableOpacity>

          </View>

          {/* FAQ Section */}
          <View style={styles.faqSection}>
            <Text style={styles.faqTitle}>Sık Sorulan Sorular</Text>
            
            {isLoadingFAQ ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.loadingText}>FAQ yükleniyor...</Text>
              </View>
            ) : faqData.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Henüz FAQ bulunmuyor</Text>
              </View>
            ) : (
              faqData.map((faq, index) => {
                const isExpanded = expandedItems.has(index);
                return (
                  <View key={faq.id || index} style={styles.faqItem}>
                    <TouchableOpacity 
                      style={styles.faqHeader} 
                      onPress={() => toggleAccordion(index)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.faqQuestion}>{faq.question}</Text>
                      <Animated.View
                        style={{
                          transform: [{ rotate: isExpanded ? '180deg' : '0deg' }],
                        }}
                      >
                        <SvgXml xml={chevronDownIcon} width="16" height="16" />
                      </Animated.View>
                    </TouchableOpacity>
                    
                    {isExpanded && (
                      <Animated.View style={styles.faqContent}>
                        <Text style={styles.faqAnswer}>{faq.answer}</Text>
                      </Animated.View>
                    )}
                  </View>
                );
              })
            )}
            
            {faqError && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{faqError}</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  helpCenterContainer: {
    flex: 1,
    width: width,
    height: height,
    backgroundColor: '#16163C',
  },
  helpCenterGradient: {
    flex: 1,
  },
  helpCenterContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  introSection: {
    paddingVertical: 20,
  },
  introText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    fontWeight: '400',
    color: '#9CA3AF',
    lineHeight: 24,
  },
  contactSection: {
    marginBottom: 32,
  },
  contactButton: {
    backgroundColor: '#FFFFFF0D',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FFFFFF0D',
  },
  contactButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  contactButtonText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    flex: 1,
  },
  faqSection: {
    marginBottom: 32,
  },
  faqTitle: {
    fontFamily: 'Poppins-Medium',
    fontSize: 20,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  faqItem: {
    backgroundColor: '#FFFFFF0D',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FFFFFF0D',
    overflow: 'hidden',
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  faqContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  faqQuestion: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    flex: 1,
    marginRight: 12,
  },
  faqAnswer: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    fontWeight: '400',
    color: '#9CA3AF',
    lineHeight: 20,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 12,
  },
  loadingText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#9CA3AF',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#9CA3AF',
  },
  errorContainer: {
    padding: 12,
    backgroundColor: '#FF000010',
    borderRadius: 8,
    marginTop: 8,
  },
  errorText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#FF6B6B',
  },
});

export default HelpCenterScreen;
