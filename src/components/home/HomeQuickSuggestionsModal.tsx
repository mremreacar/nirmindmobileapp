import React, { memo } from "react";
import {
  Modal,
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  Dimensions,
} from "react-native";
import type { QuickSuggestion } from "../../types/homeScreen";

const { width, height } = Dimensions.get("window");

interface HomeQuickSuggestionsModalProps {
  visible: boolean;
  onClose: () => void;
  isLoading: boolean;
  suggestions: QuickSuggestion[];
  onSelectSuggestion: (suggestion: QuickSuggestion) => void;
}

const HomeQuickSuggestionsModal: React.FC<HomeQuickSuggestionsModalProps> = ({
  visible,
  onClose,
  isLoading,
  suggestions,
  onSelectSuggestion,
}) => (
  <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
    <TouchableOpacity
      style={styles.modalOverlay}
      activeOpacity={1}
      onPress={onClose}
    >
      <TouchableOpacity
        style={styles.modalContainer}
        activeOpacity={1}
        onPress={(event) => event.stopPropagation()}
      >
        <View style={styles.header}>
          <Text allowFontScaling={false} style={styles.title}>
            Hızlı Öneriler
          </Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text allowFontScaling={false} style={styles.closeButtonText}>
              ✕
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.list}>
          {isLoading ? (
            <Text allowFontScaling={false} style={styles.loadingText}>
              Öneriler yükleniyor...
            </Text>
          ) : suggestions.length > 0 ? (
            suggestions.map((suggestion, index) => (
              <TouchableOpacity
                key={`${suggestion.question}-${index}`}
                style={styles.suggestionItem}
                onPress={() => onSelectSuggestion(suggestion)}
              >
                <Text allowFontScaling={false} style={styles.suggestionText}>
                  {suggestion.question}
                </Text>
              </TouchableOpacity>
            ))
          ) : (
            <Text allowFontScaling={false} style={styles.loadingText}>
              Öneri bulunamadı
            </Text>
          )}
        </View>
      </TouchableOpacity>
    </TouchableOpacity>
  </Modal>
);

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    backgroundColor: "#1A1A2E",
    borderRadius: 20,
    width: width * 0.9,
    maxHeight: height * 0.7,
    borderWidth: 1,
    borderColor: "#FFFFFF30",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#FFFFFF30",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    fontFamily: "Poppins-Medium",
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#3B38BD",
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  list: {
    maxHeight: height * 0.5,
  },
  suggestionItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#2A2A3E",
  },
  suggestionText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Poppins-Regular",
    lineHeight: 22,
  },
  loadingText: {
    color: "#999999",
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    textAlign: "center",
    padding: 20,
  },
});

export default memo(HomeQuickSuggestionsModal);

