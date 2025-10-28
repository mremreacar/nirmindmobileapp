import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useFonts } from "expo-font";
import { SvgXml } from "react-native-svg";

const { width, height } = Dimensions.get("window");

interface OnboardingScreenProps {
  onNext: () => void;
}

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onNext }) => {
  let [fontsLoaded] = useFonts({
    "Poppins-Regular": require("../assets/fonts/Poppins-Regular .ttf"),
    "Poppins-Medium": require("../assets/fonts/Poppins-Medium.ttf"),
    "SpaceGrotesk-Regular": require("../assets/fonts/SpaceGrotesk-Regular.ttf"),
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <LinearGradient
      colors={["#02020A", "#16163C"]}
      locations={[0.1827, 1.0]}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      {/* Logo Icon */}
      <View style={styles.logoIconContainer}>
        <Image
          source={require("@/src/assets/images/logo/nirmind-logo-vertical_1.png")}
          style={styles.logoIconImage}
          resizeMode="contain"
        />
      </View>

      {/* Tagline */}
      <View style={styles.taglineContainer}>
        <Text style={styles.taglineText}>
          Yeni nesil dijital zeka ile güçlendirilmiş{"\n"}
          concierge altyapısına sahip dijital asistanınız
        </Text>
      </View>

      {/* Call to Action */}
      {/* Instruction Text */}
      <Text style={styles.instructionText}>
        Hesabınızı oluşturmak için devam edin
      </Text>

      {/* Action Section */}
      <View style={styles.actionContainer}>
        <TouchableOpacity style={styles.startButton} onPress={onNext}>
          <LinearGradient
            colors={["#7E7AE9", "#3B38BD", "#7E7AE9"]}
            style={styles.buttonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.buttonText}>Başlayın</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: width,
    height: height,
  },
  logoIconContainer: {
    position: "absolute",
    top: 250,
    left: 0,
    right: 0,
    width: "100%",
    height: 120,
    justifyContent: "center",
    alignItems: "center",
  },
  logoIconImage: {
    width: 120,
    height: 120,
    alignSelf: "center",
  },
  taglineContainer: {
    position: "absolute",
    top: 420,
    left: 0,
    right: 0,
    width: "100%",
    height: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  taglineText: {
    fontFamily: "Poppins-Regular",
    fontSize: 15,
    fontWeight: "400",
    color: "#FFFFFF",
    textAlign: "center",
    lineHeight: 20,
  },
  actionContainer: {
    position: "absolute",
    top: 690,
    left: 0,
    right: 0,
    width: "100%",
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  instructionText: {
    fontFamily: "Poppins-Regular",
    fontSize: 15,
    fontWeight: "400",
    color: "#FFFFFF",
    textAlign: "center",
    lineHeight: 20,
    letterSpacing: 0,
    position: "absolute",
    top: 650,
    left: 0,
    right: 0,
    width: "100%",
    height: 21,
    justifyContent: "center",
    alignItems: "center",
  },
  startButton: {
    width: 350,
    height: 56,
    borderRadius: 48,
    overflow: "hidden",
  },
  buttonGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 8,
    paddingRight: 12,
    paddingBottom: 8,
    paddingLeft: 12,
  },
  buttonText: {
    fontFamily: "Poppins-Medium",
    fontSize: 16,
    fontWeight: "600",
    color: "white",
    textAlign: "center",
  },
});

export default OnboardingScreen;
