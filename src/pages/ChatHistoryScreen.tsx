import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Image,
  Keyboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts } from 'expo-font';
import { SvgXml } from 'react-native-svg';
import { useChat } from '@/src/lib/context/ChatContext';
import Header from '../components/Header';
import { useAuth } from '../contexts/AuthContext';

const { width, height } = Dimensions.get('window');

const searchIcon = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M7.33333 12.6667C10.2789 12.6667 12.6667 10.2789 12.6667 7.33333C12.6667 4.38781 10.2789 2 7.33333 2C4.38781 2 2 4.38781 2 7.33333C2 10.2789 4.38781 12.6667 7.33333 12.6667Z" stroke="#9CA3AF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M14 14L11.1 11.1" stroke="#9CA3AF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const leftArrowIcon = `<svg width="19" height="13" viewBox="0 0 19 13" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M4.42502 7.65683L7.75003 10.9818C7.98336 11.2152 8.09516 11.4874 8.08544 11.7985C8.07572 12.1096 7.96391 12.3818 7.75003 12.6152C7.51669 12.8485 7.23961 12.97 6.91878 12.9797C6.59794 12.9895 6.32086 12.8777 6.08752 12.6443L0.750024 7.30683C0.516691 7.0735 0.400024 6.80128 0.400024 6.49017C0.400024 6.17906 0.516691 5.90683 0.750024 5.6735L6.08752 0.336C6.32086 0.102667 6.59794 -0.00913889 6.91878 0.000583333C7.23961 0.0103056 7.51669 0.131833 7.75003 0.365167C7.96391 0.5985 8.07572 0.870722 8.08544 1.18183C8.09516 1.49294 7.98336 1.76517 7.75003 1.9985L4.42502 5.3235L17.4334 5.3235C17.7639 5.3235 18.041 5.43531 18.2646 5.65892C18.4882 5.88253 18.6 6.15961 18.6 6.49017C18.6 6.82072 18.4882 7.09781 18.2646 7.32142C18.041 7.54503 17.7639 7.65683 17.4334 7.65683L4.42502 7.65683Z" fill="white"/>
</svg>`;

const headphoneIcon = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M3 14V11C3 7.13401 6.13401 4 10 4C13.866 4 17 7.13401 17 11V14" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M17 14C18.1046 14 19 14.8954 19 16V17C19 18.1046 18.1046 19 17 19H16C15.4477 19 15 18.5523 15 18V15C15 14.4477 15.4477 14 16 14H17Z" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M3 14C1.89543 14 1 14.8954 1 16V17C1 18.1046 1.89543 19 3 19H4C4.55228 19 5 18.5523 5 18V15C5 14.4477 4.55228 14 4 14H3Z" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const documentsIcon = `<svg width="21" height="18" viewBox="0 0 21 18" fill="none" xmlns="http://www.w3.org/2000/svg">
<g clip-path="url(#clip0_30_391)">
<path d="M20.0764 4.37037V4.83053C19.958 5.15657 19.8068 5.43452 19.4886 5.60379L10.3862 9.19073L10.1707 9.19674L5.21995 7.2821C4.19881 7.69971 3.09997 8.04518 2.09594 8.49285C2.04923 8.51367 2.00299 8.49008 2.01917 8.56777L10.2743 11.837L18.6576 8.50996C18.2594 7.94251 18.7847 7.23261 19.4391 7.51796C19.7749 7.66457 19.9585 7.98922 20.076 8.31896V8.74074C19.9696 9.08482 19.8128 9.3734 19.4886 9.55284L17.0852 10.5236L19.4886 11.4943C19.8253 11.6816 19.965 11.9517 20.076 12.3064V12.6898C19.9604 13.0986 19.7425 13.4187 19.3351 13.5782C16.4821 14.5725 13.6582 16.0164 10.808 16.9741C10.4676 17.0884 10.1837 17.1813 9.8308 17.0125L1.07388 13.5394C0.390805 13.1754 0.228477 12.2208 0.791769 11.6719C1.19551 11.2783 1.91234 11.3338 2.01085 11.9508C2.04877 12.188 1.95396 12.2972 1.86656 12.4969L10.2822 15.7902L18.5429 12.5353L15.3037 11.2376L10.3927 13.1449H10.1328L1.06093 9.56579C0.21969 9.11026 0.255301 7.91523 1.1118 7.50686L3.43804 6.59348C3.4348 6.53983 3.37977 6.53428 3.3437 6.51578C2.64767 6.16338 1.72134 5.96868 1.03549 5.60379C0.213216 5.16629 0.259001 3.92871 1.10024 3.54671L10.093 0.00323731L10.3969 0L19.4507 3.55873C19.774 3.74557 19.9835 4.0064 20.0764 4.37037ZM18.5429 4.56276L10.2822 1.30741L1.98125 4.58126L10.2808 7.86204C12.9594 6.74702 15.7292 5.81606 18.3879 4.65572C18.4351 4.6349 18.5415 4.61872 18.5433 4.5623L18.5429 4.56276Z" fill="white"/>
</g>
<defs>
<clipPath id="clip0_30_391">
<rect width="19.6329" height="17.1041" fill="white" transform="translate(0.443604)"/>
</clipPath>
</defs>
</svg>`;

const nirmindLogoIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1725.15 282.37">
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

interface ChatHistoryScreenProps {
  onBack: () => void;
  onSelectConversation?: (conversationId: string) => void;
  onOpenProfile?: () => void;
}

const ChatHistoryScreen: React.FC<ChatHistoryScreenProps> = ({
  onBack,
  onSelectConversation,
  onOpenProfile,
}) => {
  const { user } = useAuth();
  const { conversations, deleteConversation, loadConversations, updateConversationMessages, selectConversation } = useChat();
  const [searchText, setSearchText] = useState('');
  const [expandedConversations, setExpandedConversations] = useState<Set<string>>(new Set());
  const [loadingFullMessages, setLoadingFullMessages] = useState<Set<string>>(new Set());
  const [showAllConversations, setShowAllConversations] = useState(false);
  
  // Maksimum gösterilecek konuşma sayısı
  const MAX_CONVERSATIONS_DISPLAY = 10;
  
  // Kullanıcı adının baş harflerini al
  const getInitials = () => {
    if (!user) return '??';
    const firstInitial = user.firstName?.charAt(0) || '';
    const lastInitial = user.lastName?.charAt(0) || '';
    return (firstInitial + lastInitial).toUpperCase();
  };

  const fullName = user ? `${user.firstName} ${user.lastName}` : 'Kullanıcı';
  
  let [fontsLoaded] = useFonts({
    'Poppins-Regular': require('@assets/fonts/Poppins-Regular .ttf'),
    'Poppins-Medium': require('@assets/fonts/Poppins-Medium.ttf'),
  });

  if (!fontsLoaded) {
    return null;
  }

  // Konuşmaları yükle
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Arama metni değiştiğinde tümünü göster durumunu sıfırla
  useEffect(() => {
    setShowAllConversations(false);
  }, [searchText]);

  // Filtrelenmiş konuşmalar
  const filteredConversations = conversations.filter(conv => {
    const title = conv.title || '';
    const search = searchText || '';
    return title.toLowerCase().includes(search.toLowerCase());
  });

  // Gösterilecek konuşmalar
  const displayedConversations = showAllConversations 
    ? filteredConversations 
    : filteredConversations.slice(0, MAX_CONVERSATIONS_DISPLAY);
  
  // 10'dan fazla konuşma var mı?
  const hasMoreConversations = filteredConversations.length > MAX_CONVERSATIONS_DISPLAY;

  const handleLoadAllMessages = async (conversationId: string) => {
    setLoadingFullMessages(prev => new Set(prev).add(conversationId));
    try {
      const BackendApiService = require('../services/BackendApiService').default;
      const backendApiService = BackendApiService.getInstance();
      const response = await backendApiService.getMessages(conversationId, 1, 1000);
      
      if (response.success && response.data && 'messages' in response.data) {
        const allMessages = (response.data as any).messages.map((msg: any) => ({
          id: msg.id,
          text: msg.text || '',
          isUser: msg.isUser,
          timestamp: new Date(msg.timestamp || msg.createdAt),
          images: msg.attachments?.filter((a: any) => a.type === 'IMAGE' || a.type === 'image').map((a: any) => a.url),
          files: msg.attachments?.filter((a: any) => a.type === 'FILE' || a.type === 'file').map((a: any) => ({
            name: a.filename,
            uri: a.url,
            size: a.size,
            mimeType: a.mimeType
          }))
        }));
        
        // Conversation'ı güncelle
        updateConversationMessages(conversationId, allMessages);
        
        setExpandedConversations(prev => new Set(prev).add(conversationId));
      }
    } catch (error) {
      console.error('❌ Tüm mesajlar yüklenirken hata:', error);
    } finally {
      setLoadingFullMessages(prev => {
        const newSet = new Set(prev);
        newSet.delete(conversationId);
        return newSet;
      });
    }
  };

  const handleConversationSelect = async (conversationId: string) => {
    // Klavyeyi kapat
    Keyboard.dismiss();
    
    console.log('📥 Geçmiş sohbetten conversation seçiliyor:', conversationId);
    
    // Conversation'ı ChatContext'te seç - bu conversation'ı yükler
    try {
      await selectConversation(conversationId);
      console.log('✅ Conversation ChatContext\'te seçildi:', conversationId);
    } catch (error) {
      console.error('❌ Conversation seçilirken hata:', error);
    }
    
    // Parent component'e bildir
    if (onSelectConversation) {
      onSelectConversation(conversationId);
    }
    
    // ChatHistoryScreen'i kapat ve Home'a dön
    onBack();
  };

  const handleBackPress = () => {
    // Klavyeyi kapat
    Keyboard.dismiss();
    // Sonra geri git
    onBack();
  };

  const handleDeleteConversation = (conversationId: string, conversationTitle: string) => {
    Alert.alert(
      'Sohbeti Sil',
      `"${conversationTitle}" sohbetini silmek istediğinizden emin misiniz?`,
      [
        {
          text: 'İptal',
          style: 'cancel',
        },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: () => deleteConversation(conversationId),
        },
      ]
    );
  };

  return (
    <View style={styles.chatHistoryContainer}>
      <LinearGradient
        colors={['#02020A', '#16163C']}
        locations={[0.1827, 1.0]}
        style={styles.chatHistoryGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        {/* Chat History Header */}
        <View style={styles.chatHistoryHeader}>
          <View style={styles.searchSection}>
            <View style={styles.searchBar}>
              <SvgXml 
                xml={searchIcon}
                width="16"
                height="16"
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Ara"
                placeholderTextColor="#9CA3AF"
                value={searchText}
                onChangeText={setSearchText}
              />
            </View>
            <TouchableOpacity 
              style={styles.backButton}
              activeOpacity={1}
              onPress={handleBackPress}
            >
              <SvgXml 
                xml={leftArrowIcon}
                width="20"
                height="20"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Chat History Content */}
        <ScrollView style={styles.chatHistoryContent}>
          {/* NirMind Section */}
          <View style={styles.historySection}>
            <View style={styles.sectionItem}>
              <SvgXml 
                xml={nirmindLogoIcon}
                width="120"
                height="20"
              />
            </View>
          </View>

          {/* Past Chats Section */}
          <View style={styles.historySection}>
            <View style={styles.sectionItem}>
              <SvgXml 
                xml={documentsIcon}
                width="21"
                height="18"
              />
              <Text allowFontScaling={false} style={styles.sectionText}>Geçmiş Sohbetler</Text>
            </View>
          </View>

          {/* Chat List */}
          <View style={styles.chatList}>
            {displayedConversations.map((conversation) => {
                const isExpanded = expandedConversations.has(conversation.id);
                const isLoading = loadingFullMessages.has(conversation.id);
                const totalMessageCount = conversation.totalMessageCount || conversation.messages.length;
                const displayedMessages = isExpanded ? conversation.messages : conversation.messages.slice(0, 10);
                const hasMoreMessages = totalMessageCount > 10 && !isExpanded;
                
                return (
                  <View key={conversation.id} style={styles.conversationItem}>
                    <TouchableOpacity 
                      style={styles.chatItem}
                      activeOpacity={1}
                      onPress={() => handleConversationSelect(conversation.id)}
                      onLongPress={() => handleDeleteConversation(conversation.id, conversation.title || 'Sohbet')}
                    >
                      <View style={styles.chatItemContent}>
                        <Text allowFontScaling={false} style={styles.chatText}>{conversation.title || 'Sohbet'}</Text>
                        <Text allowFontScaling={false} style={styles.chatDate}>
                          {new Date(conversation.updatedAt).toLocaleDateString('tr-TR', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </Text>
                      </View>
                    </TouchableOpacity>
                    
                    {/* Mesajlar */}
                    {displayedMessages.length > 0 && (
                      <View style={styles.messagesContainer}>
                        {displayedMessages.map((message, index) => (
                          <View key={message.id || index} style={styles.messageItem}>
                            <Text allowFontScaling={false} style={styles.messageText} numberOfLines={2}>
                              {message.isUser ? '👤 ' : '🤖 '}
                              {message.text || '(Mesaj içeriği yok)'}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                    
                    {/* Tümünü Göster Butonu */}
                    {hasMoreMessages && (
                      <TouchableOpacity
                        style={styles.showAllButton}
                        onPress={() => handleLoadAllMessages(conversation.id)}
                        disabled={isLoading}
                      >
                        <Text allowFontScaling={false} style={styles.showAllButtonText}>
                          {isLoading ? 'Yükleniyor...' : `Tümünü göster (${totalMessageCount - displayedMessages.length} mesaj daha)`}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
          </View>
          
          {/* Tümünü Gör Butonu - 10'dan fazla konuşma varsa göster */}
          {!showAllConversations && hasMoreConversations && (
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={() => setShowAllConversations(true)}
              activeOpacity={0.7}
            >
              <Text allowFontScaling={false} style={styles.viewAllButtonText}>
                Tümünü Gör ({filteredConversations.length - MAX_CONVERSATIONS_DISPLAY} sohbet daha)
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>


        {/* Additional Bottom Section */}
        <View style={styles.additionalBottomSection}>
          <TouchableOpacity 
            style={styles.additionalContent}
            activeOpacity={1}
            onPress={onOpenProfile}
          >
            <View style={styles.profileRow}>
              <View style={styles.profileContainer}>
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
              <Text allowFontScaling={false} style={styles.profileName}>{fullName}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  chatHistoryContainer: {
    flex: 1,
    width: width,
    height: height,
    backgroundColor: '#16163C',
  },
  chatHistoryGradient: {
    flex: 1,
  },
  chatHistoryHeader: {
    paddingTop: 70,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 30,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#FFFFFF',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatHistoryContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  historySection: {
    marginBottom: 20,
  },
  sectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  sectionText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  chatList: {
    gap: 8,
  },
  conversationItem: {
    marginBottom: 16,
  },
  chatItem: {
    paddingVertical: 12,
    paddingHorizontal: 0,
  },
  chatItemContent: {
    paddingLeft: 33, // İkon genişliği (21) + gap (12) = 33px
  },
  messagesContainer: {
    paddingLeft: 33,
    paddingTop: 8,
    gap: 6,
  },
  messageItem: {
    paddingVertical: 4,
  },
  messageText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    fontWeight: '400',
    color: '#9CA3AF',
    lineHeight: 16,
  },
  showAllButton: {
    paddingLeft: 33,
    paddingTop: 8,
    paddingBottom: 4,
  },
  showAllButtonText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
    fontWeight: '500',
    color: '#7E7AE9',
  },
  viewAllButton: {
    marginTop: 16,
    marginBottom: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewAllButtonText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    fontWeight: '500',
    color: '#7E7AE9',
  },
  chatText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    fontWeight: '400',
    color: '#FFFFFF',
    lineHeight: 20,
  },
  chatDate: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    fontWeight: '400',
    color: '#9CA3AF',
    marginTop: 4,
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 40,
  },
  userProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#7E7AE9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInitials: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  userName: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  additionalBottomSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 40,
  },
  additionalContent: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 30,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  additionalText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    fontWeight: '400',
    color: '#FFFFFF',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profileContainer: {
    width: 52,
    height: 52,
    borderRadius: 46,
    backgroundColor: '#16163C',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 14,
    gap: 10,
    overflow: 'hidden',
  },
  profileImageSource: {
    width: 52,
    height: 52,
    borderRadius: 46,
  },
  profileInitials: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  profileName: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
});

export default ChatHistoryScreen;
