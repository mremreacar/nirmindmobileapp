import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CHAT_CONSTANTS } from '@/src/constants/chatConstants';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.errorContainer}>
          <View style={styles.errorContent}>
            <Text style={styles.errorTitle}>Bir Hata Oluştu</Text>
            <Text style={styles.errorMessage}>
              Uygulamada beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.
            </Text>
            <TouchableOpacity style={styles.retryButton} onPress={this.handleRetry}>
              <Text style={styles.retryButtonText}>Tekrar Dene</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    backgroundColor: CHAT_CONSTANTS.COLORS.BACKGROUND,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorContent: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    maxWidth: 300,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: CHAT_CONSTANTS.COLORS.TEXT_PRIMARY,
    fontFamily: 'Poppins-Medium',
    marginBottom: 10,
  },
  errorMessage: {
    fontSize: 16,
    color: CHAT_CONSTANTS.COLORS.TEXT_SECONDARY,
    fontFamily: 'Poppins-Regular',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  errorDetails: {
    fontSize: 12,
    color: CHAT_CONSTANTS.COLORS.TEXT_SECONDARY,
    fontFamily: 'Poppins-Regular',
    textAlign: 'center',
    marginBottom: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    padding: 10,
    borderRadius: 8,
  },
  retryButton: {
    backgroundColor: CHAT_CONSTANTS.COLORS.PRIMARY,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
  },
  retryButtonText: {
    color: CHAT_CONSTANTS.COLORS.TEXT_PRIMARY,
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
  },
});

export default ErrorBoundary;