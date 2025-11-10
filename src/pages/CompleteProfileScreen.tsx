

// ------------------------------------------------------------
// File: src/screens/CompleteProfileScreen.tsx (FINAL)
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useFonts } from "expo-font";
import AsyncStorage from "@react-native-async-storage/async-storage";
import BackendApiService from "../services/BackendApiService";
import { useAuth } from "../contexts/AuthContext";
import { CountryCode } from "react-native-country-picker-modal";
import PhoneField from "../components/PhoneField";
import { parsePhoneNumberFromString } from "libphonenumber-js";

const DEFAULT_COUNTRY_CODE: CountryCode = "TR";
const DEFAULT_CALLING_CODE = "90";

const { width, height } = Dimensions.get("window");

interface CompleteProfileScreenProps {
  onComplete: () => void;
  initialData?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    missingFields?: string[];
  };
}

const CompleteProfileScreen: React.FC<CompleteProfileScreenProps> = ({
  onComplete,
  initialData,
}) => {
  // Placeholder değerleri kontrol et ve boş string olarak başlat
  const isPlaceholderValue = (value: string | undefined): boolean => {
    if (!value) return true;
    const normalized = value.trim().toLowerCase();
    return normalized === "apple" || normalized === "google" || normalized === "user" || normalized === "";
  };

  const getInitialFirstName = () => {
    const value = initialData?.firstName?.trim() || "";
    return isPlaceholderValue(value) ? "" : value;
  };

  const getInitialLastName = () => {
    const value = initialData?.lastName?.trim() || "";
    return isPlaceholderValue(value) ? "" : value;
  };

  const [firstName, setFirstName] = useState(getInitialFirstName());
  const [lastName, setLastName] = useState(getInitialLastName());
  const [countryCode, setCountryCode] = useState<CountryCode>(DEFAULT_COUNTRY_CODE);
  const [callingCode, setCallingCode] = useState<string>(DEFAULT_CALLING_CODE);
  const [phoneNumber, setPhoneNumber] = useState<string>(""); // ulusal numara (sadece rakam)
  const [isCountryPickerVisible, setIsCountryPickerVisible] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);
  const { user, setUser } = useAuth();
  const backendApiService = BackendApiService.getInstance();

  let [fontsLoaded] = useFonts({
    "Poppins-Regular": require("@assets/fonts/Poppins-Regular .ttf"),
    "Poppins-Medium": require("@assets/fonts/Poppins-Medium.ttf"),
    "SpaceGrotesk-Regular": require("@assets/fonts/SpaceGrotesk-Regular.ttf"),
  });

  const missingFields = initialData?.missingFields || [];
  const needsFirstName = missingFields.includes("firstName");
  const needsLastName = missingFields.includes("lastName");
  const needsPhone = missingFields.includes("phone");

  // initialData.phone varsa parçala (E.164: +<callingCode><ulusal>)
  useEffect(() => {
    let isMounted = true;

    const initializePhoneState = async () => {
      const rawPhone = initialData?.phone?.trim();
      if (!rawPhone) {
        if (isMounted) {
          setPhoneNumber("");
          setCallingCode(DEFAULT_CALLING_CODE);
          setCountryCode(DEFAULT_COUNTRY_CODE);
        }
        return;
      }

      const sanitized = rawPhone.replace(/\s+/g, "");
      const phoneMatch = sanitized.match(/^\+?(\d{1,4})(\d*)$/);
      if (phoneMatch) {
        const [, detectedCallingCode, remainingDigits] = phoneMatch;
        if (isMounted) {
          setCallingCode(detectedCallingCode);
          setPhoneNumber(remainingDigits.replace(/\D/g, ""));
        }
      } else {
        const digitsOnly = sanitized.replace(/[^0-9]/g, "");
        if (isMounted) {
          setPhoneNumber(digitsOnly);
        }
      }
    };

    initializePhoneState();
    return () => { isMounted = false; };
  }, [initialData?.phone]);

  const handleComplete = async () => {
    // Validation
    if (needsFirstName && (!firstName || firstName.trim() === "")) {
      Alert.alert("Eksik Bilgi", "Lütfen adınızı giriniz.");
      return;
    }

    if (needsLastName && (!lastName || lastName.trim() === "")) {
      Alert.alert("Eksik Bilgi", "Lütfen soyadınızı giriniz.");
      return;
    }

    const sanitizedPhoneNumber = phoneNumber.replace(/[^0-9]/g, "");
    let e164PhoneNumber = "";

    if (needsPhone && !sanitizedPhoneNumber) {
      Alert.alert("Eksik Bilgi", "Lütfen telefon numaranızı giriniz.");
      return;
    }

    // Placeholder değerleri kontrol et
    const normalizedFirstName = firstName.trim().toLowerCase();
    if (["apple", "google", "user"].includes(normalizedFirstName)) {
      Alert.alert("Geçersiz İsim", "Lütfen gerçek adınızı giriniz. 'Apple', 'Google' veya 'User' gibi değerler kabul edilmez.");
      return;
    }

    const normalizedLastName = lastName.trim().toLowerCase();
    if (["apple", "google", "user"].includes(normalizedLastName)) {
      Alert.alert("Geçersiz Soyisim", "Lütfen gerçek soyadınızı giriniz. 'Apple', 'Google' veya 'User' gibi değerler kabul edilmez.");
      return;
    }

    // Telefon E.164 regex kontrolü (opsiyonel)
    if (needsPhone && sanitizedPhoneNumber) {
      const parsedPhone = parsePhoneNumberFromString(`+${callingCode}${sanitizedPhoneNumber}`);
      if (!parsedPhone || !parsedPhone.isValid()) {
        Alert.alert("Hata", "Lütfen geçerli bir telefon numarası giriniz.");
        return;
      }
      e164PhoneNumber = parsedPhone.number;
    }

    try {
      setIsLoading(true);

      // Profil bilgilerini güncelle
      const updateData: any = {};
      if (needsFirstName && firstName.trim()) updateData.firstName = firstName.trim();
      if (needsLastName && lastName.trim()) updateData.lastName = lastName.trim();
      if (needsPhone && sanitizedPhoneNumber) {
        updateData.phone = e164PhoneNumber;
      }

      const response = await backendApiService.updateUserProfile(updateData);

      if (response.success && response.data) {
        // Backend'den gelen güncel bilgileri kullan
        if (user) {
          const updatedUser = {
            ...user,
            firstName: response.data.firstName || user.firstName,
            lastName: response.data.lastName || user.lastName,
            phone: response.data.phone || user.phone,
          };
          setUser(updatedUser);

          // AsyncStorage'a kaydet
          try {
            await AsyncStorage.setItem("user", JSON.stringify(updatedUser));
          } catch (error) {
            console.error("❌ User AsyncStorage kaydetme hatası:", error);
          }
        }

        Alert.alert("Başarılı", "Profil bilgileriniz güncellendi.", [
          { text: "Tamam", onPress: onComplete },
        ]);
      } else {
        Alert.alert("Hata", response.error || "Profil güncellenirken bir hata oluştu.");
      }
    } catch (error: any) {
      console.error("❌ Profil güncelleme hatası:", error);
      Alert.alert("Hata", error.message || "Profil güncellenirken bir hata oluştu.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!fontsLoaded) return null;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <LinearGradient colors={["#03030B", "#16163C"]} style={styles.gradient} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Profil Bilgilerinizi Tamamlayın</Text>
            <Text style={styles.subtitle}>Devam etmek için eksik bilgilerinizi giriniz</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {needsFirstName && (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Ad *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Adınızı giriniz"
                  placeholderTextColor="#999999"
                  value={firstName}
                  onChangeText={setFirstName}
                  autoCapitalize="words"
                  editable={!isLoading}
                />
              </View>
            )}

            {needsLastName && (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Soyad *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Soyadınızı giriniz"
                  placeholderTextColor="#999999"
                  value={lastName}
                  onChangeText={setLastName}
                  autoCapitalize="words"
                  editable={!isLoading}
                />
              </View>
            )}

            {needsPhone && (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Telefon Numarası *</Text>
                <PhoneField
                  value={phoneNumber}
                  onChange={setPhoneNumber}
                  countryCode={countryCode}
                  callingCode={callingCode}
                  setCallingCode={setCallingCode}
                  setCountryCode={setCountryCode}
                  disabled={isLoading}
                />
              </View>
            )}
          </View>

          {/* Complete Button */}
          <TouchableOpacity style={[styles.completeButton, isLoading && styles.completeButtonDisabled]} onPress={handleComplete} disabled={isLoading}>
            <LinearGradient colors={["#00DDA5", "#007759"]} style={styles.completeButtonGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              {isLoading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.completeButtonText}>Tamamla</Text>}
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },
  header: { marginBottom: 40, alignItems: "center" },
  title: { fontFamily: "Poppins-Medium", fontSize: 24, fontWeight: "500", color: "#FFFFFF", textAlign: "center", marginBottom: 12 },
  subtitle: { fontFamily: "Poppins-Regular", fontSize: 14, fontWeight: "400", color: "#CCCCCC", textAlign: "center", lineHeight: 20 },
  form: { marginBottom: 32 },
  inputContainer: { marginBottom: 24 },
  label: { fontFamily: "Poppins-Medium", fontSize: 14, fontWeight: "500", color: "#FFFFFF", marginBottom: 8 },
  input: { width: "100%", height: 56, backgroundColor: "#1A1A3E", borderRadius: 12, paddingHorizontal: 16, fontFamily: "Poppins-Regular", fontSize: 16, color: "#FFFFFF", borderWidth: 1, borderColor: "#2A2A4E" },
  completeButton: { width: "100%", borderRadius: 50, overflow: "hidden", height: 56, marginTop: 20 },
  completeButtonDisabled: { opacity: 0.6 },
  completeButtonGradient: { width: "100%", height: 56, justifyContent: "center", alignItems: "center" },
  completeButtonText: { fontFamily: "Poppins-Medium", fontSize: 16, fontWeight: "500", color: "#FFFFFF" },
});

export default CompleteProfileScreen;
