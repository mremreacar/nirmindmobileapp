import React, { ComponentProps, memo } from "react";
import { View, StyleSheet } from "react-native";
import ActionButtons from "../chat/ActionButtons";
import InputComponent from "../common/InputComponent";
import {
  getKeyboardAwarePaddingBottom,
  getResponsiveGap,
  getResponsivePadding,
  getResponsiveWidth,
  getResponsivePaddingBottom,
} from "../../constants";

interface HomeBottomSectionProps {
  keyboardHeight: number;
  isKeyboardVisible: boolean;
  isResearchMode: boolean;
  onPressResearch: () => void;
  onPressSuggestions: () => void;
  actionButtonsLoading?: boolean;
  inputProps: ComponentProps<typeof InputComponent>;
}

const HomeBottomSection: React.FC<HomeBottomSectionProps> = ({
  keyboardHeight,
  isKeyboardVisible,
  isResearchMode,
  onPressResearch,
  onPressSuggestions,
  actionButtonsLoading = false,
  inputProps,
}) => {
  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: getKeyboardAwarePaddingBottom(
            keyboardHeight,
            isKeyboardVisible
          ),
        },
      ]}
    >
      <ActionButtons
        onSuggestions={onPressSuggestions}
        onResearch={onPressResearch}
        isLoading={actionButtonsLoading}
        isResearchMode={isResearchMode}
      />

      <InputComponent {...inputProps} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "column",
    justifyContent: "flex-start",
    alignItems: "flex-start",
    paddingHorizontal: getResponsivePadding(),
    paddingBottom: getResponsivePaddingBottom(),
    paddingTop: 20,
    width: getResponsiveWidth(),
    gap: getResponsiveGap(),
    alignSelf: "center",
    backgroundColor: "transparent",
    zIndex: 1000,
  },
});

export default memo(HomeBottomSection);

