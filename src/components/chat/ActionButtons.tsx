import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { SvgXml } from 'react-native-svg';

const { width, height } = Dimensions.get('window');
const isSmallScreen = height < 700;
const isTablet = width > 600;

// Responsive functions
const getResponsiveGap = () => {
  if (isSmallScreen) return 6;
  return 8;
};

interface ActionButtonsProps {
  onSuggestions: () => void;
  onResearch: () => void;
  isLoading: boolean;
  isResearchMode: boolean;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
  onSuggestions,
  onResearch,
  isLoading,
  isResearchMode
}) => {
  const onerilerIcon = `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M15.7067 2.29326C17.5587 4.14526 16.0574 8.64929 12.3534 12.3533C8.64942 16.0573 4.1454 17.5586 2.29341 15.7066C0.44141 13.8546 1.94275 9.35061 5.64674 5.6466C9.35073 1.9426 13.8547 0.441259 15.7067 2.29326ZM2.29326 2.29336C0.441262 4.14537 1.9426 8.64939 5.64659 12.3534C9.35058 16.0574 13.8546 17.5587 15.7066 15.7067C17.5586 13.8547 16.0573 9.35071 12.3533 5.64671C8.64927 1.94271 4.14525 0.441364 2.29326 2.29336Z" stroke="white" stroke-opacity="0.7"/>
<path d="M10.875 9C10.875 10.0355 10.0355 10.875 9 10.875C7.96447 10.875 7.125 10.0355 7.125 9C7.125 7.96447 7.96447 7.125 9 7.125C10.0355 7.125 10.875 7.96447 10.875 9Z" stroke="white" stroke-opacity="0.7"/>
</svg>`;

  const arastirmaIcon = `<svg width="19" height="18" viewBox="0 0 19 18" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M17 9C17 9.98491 16.806 10.9602 16.4291 11.8701C16.0522 12.7801 15.4997 13.6069 14.8033 14.3033C14.1069 14.9997 13.2801 15.5522 12.3701 15.9291C11.4602 16.306 10.4849 16.5 9.5 16.5C8.51509 16.5 7.53982 16.306 6.62987 15.9291C5.71993 15.5522 4.89314 14.9997 4.1967 14.3033C3.50026 13.6069 2.94781 12.7801 2.5709 11.8701C2.19399 10.9602 2 9.98491 2 9C2 8.01509 2.19399 7.03982 2.5709 6.12987C2.94781 5.21993 3.50026 4.39314 4.1967 3.6967C4.89314 3.00026 5.71993 2.44781 6.62988 2.0709C7.53982 1.69399 8.51509 1.5 9.5 1.5C10.4849 1.5 11.4602 1.69399 12.3701 2.0709C13.2801 2.44781 14.1069 3.00026 14.8033 3.6967C15.4997 4.39314 16.0522 5.21993 16.4291 6.12988C16.806 7.03982 17 8.01509 17 9L17 9Z" stroke="white" stroke-opacity="0.7"/>
<path d="M12.5 9C12.5 9.98491 12.4224 10.9602 12.2716 11.8701C12.1209 12.7801 11.8999 13.6069 11.6213 14.3033C11.3427 14.9997 11.012 15.5522 10.6481 15.9291C10.2841 16.306 9.89397 16.5 9.5 16.5C9.10603 16.5 8.71593 16.306 8.35195 15.9291C7.98797 15.5522 7.65726 14.9997 7.37868 14.3033C7.1001 13.6069 6.87913 12.7801 6.72836 11.8701C6.5776 10.9602 6.5 9.98491 6.5 9C6.5 8.01509 6.5776 7.03982 6.72836 6.12987C6.87913 5.21993 7.1001 4.39314 7.37868 3.6967C7.65726 3.00026 7.98797 2.44781 8.35195 2.0709C8.71593 1.69399 9.10603 1.5 9.5 1.5C9.89397 1.5 10.2841 1.69399 10.6481 2.0709C11.012 2.44781 11.3427 3.00026 11.6213 3.6967C11.8999 4.39314 12.1209 5.21993 12.2716 6.12988C12.4224 7.03982 12.5 8.01509 12.5 9L12.5 9Z" stroke="white" stroke-opacity="0.7"/>
<path d="M2 9H17" stroke="white" stroke-opacity="0.7" stroke-linecap="round"/>
</svg>`;

  return (
    <View style={styles.actionButtonsContainer}>
      <TouchableOpacity 
        style={[styles.actionButton, styles.onerilerButton]}
        onPress={onSuggestions}
        disabled={isLoading}
      >
        <SvgXml 
          xml={onerilerIcon}
          width="18"
          height="18"
        />
        <Text allowFontScaling={false} style={styles.actionButtonText}>Öneriler</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[
          styles.actionButton, 
          styles.arastirmaButton,
          isResearchMode && styles.arastirmaButtonActive
        ]}
        onPress={onResearch}
        disabled={isLoading}
      >
        <SvgXml 
          xml={arastirmaIcon}
          width="19"
          height="18"
        />
        <Text allowFontScaling={false} style={[
          styles.actionButtonText,
          isResearchMode && styles.actionButtonTextActive
        ]}>
          Araştırma
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    width: isTablet ? 300 : 242,
    height: isSmallScreen ? 38 : 42,
    gap: getResponsiveGap(),
    backgroundColor: 'transparent',
    zIndex: 1000,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)', // 5% opacity
    borderRadius: 48, // 48px radius for pill shape
    paddingTop: 12,
    paddingRight: 16,
    paddingBottom: 12,
    paddingLeft: 16,
    gap: 6,
    height: 42,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  onerilerButton: {
    width: 120,
  },
  arastirmaButton: {
    width: 120,
  },
  arastirmaButtonActive: {
    backgroundColor: '#3B38BD',
  },
  actionButtonText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16.8, // 140% of 12px
    letterSpacing: 0, // 0%
    textAlign: 'center',
    color: '#FFFFFF',
  },
  actionButtonTextActive: {
    color: '#FFFFFF',
  },
});

export default ActionButtons;
