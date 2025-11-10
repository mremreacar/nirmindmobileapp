// File: src/components/PhoneField.tsx
import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from "react-native";
import CountryPicker, { Country, CountryCode } from "react-native-country-picker-modal";
import { AsYouType } from "libphonenumber-js/min";
import examples from "libphonenumber-js/examples.mobile.json";

type Props = {
  value: string;
  onChange: (national: string) => void;
  countryCode?: CountryCode;
  onCountryChange?: (code: CountryCode, callingCode: string, countryName?: string) => void;
  disabled?: boolean;
  callingCode: string;
  setCallingCode: (code: string) => void;
  setCountryCode: (code: CountryCode) => void;
};

const DEFAULT_PLACEHOLDER = "555 123 45 67";

export default function PhoneField({
  value,
  onChange,
  countryCode = "TR",
  onCountryChange,
  disabled,
  callingCode,
  setCallingCode,
  setCountryCode,
}: Props) {
  const [placeholder, setPlaceholder] = useState<string>(
    () => getExamplePlaceholder(countryCode) ?? DEFAULT_PLACEHOLDER
  );

  useEffect(() => {
    setPlaceholder(getExamplePlaceholder(countryCode) ?? DEFAULT_PLACEHOLDER);
  }, [countryCode]);

  const formattedNational = useMemo(() => {
    if (!value) {
      return "";
    }

    try {
      const formatter = new AsYouType(countryCode as any);
      const formattedInput = formatter.input(value);

      if (formattedInput.startsWith("+")) {
        const dialing = formatter.getCallingCode();
        if (dialing) {
          const prefix = `+${dialing}`;
          return formattedInput.startsWith(prefix)
            ? formattedInput.substring(prefix.length).trimStart()
            : formattedInput.replace(/^\+\d+/, "").trimStart();
        }
      }

      return formattedInput;
    } catch (error) {
      console.warn("Telefon formatlama başarısız", error);
      return value;
    }
  }, [value, countryCode]);

  const handleCountrySelect = (country: Country) => {
    const code = country.cca2;
    const dial = country.callingCode?.[0] ?? callingCode;
    setCountryCode(code);
    setCallingCode(dial);
    onCountryChange?.(
      code,
      dial,
      typeof country.name === "string" ? country.name : (country.name as any)?.common
    );
  };

  const handleInput = (text: string) => {
    const digits = text.replace(/\D/g, "");
    onChange(digits);
  };

  return (
    <View style={styles.wrapper}>
      <CountryPicker
        countryCode={countryCode}
        withFilter
        withFlag
        withCallingCode
        withEmoji
        onSelect={handleCountrySelect}
        renderFlagButton={({ onOpen }) => (
          <TouchableOpacity
            style={styles.prefix}
            onPress={() => !disabled && onOpen?.()}
            disabled={!!disabled}
          >
            <Text style={styles.flagEmoji}>{countryCodeToEmoji(countryCode)}</Text>
            <Text style={styles.callingCode}>+{callingCode}</Text>
          </TouchableOpacity>
        )}
      />

      <View style={styles.divider} />

      <TextInput
        style={styles.input}
        value={formattedNational}
        onChangeText={handleInput}
        placeholder={placeholder}
        placeholderTextColor="#999"
        keyboardType="phone-pad"
        editable={!disabled}
        maxLength={20}
        accessibilityLabel="Telefon numarası"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    height: 56,
    backgroundColor: "#1A1A3E",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2A2A4E",
    flexDirection: "row",
    alignItems: "center",
  },
  prefix: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    height: "100%",
  },
  flagEmoji: {
    fontSize: 20,
  },
  callingCode: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "600",
    color: "#FFF",
  },
  divider: {
    width: 1,
    height: "60%",
    backgroundColor: "#2A2A4E",
    marginHorizontal: 12,
  },
  input: {
    flex: 1,
    height: "100%",
    fontSize: 16,
    color: "#FFF",
    paddingHorizontal: 4,
  },
});

function countryCodeToEmoji(code: string): string {
  return code
    .toUpperCase()
    .split("")
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join("");
}

function getExamplePlaceholder(cca2: CountryCode): string | undefined {
  const entry = (examples as Record<string, string>)[cca2];
  const rawExample = entry;
  if (!rawExample) {
    return undefined;
  }

  try {
    const digitsOnly = rawExample.replace(/[^0-9]/g, "");
    const formatter = new AsYouType(cca2 as any);
    const formatted = formatter.input(digitsOnly);
    const national = formatted.startsWith("+")
      ? formatted.replace(/^\+\d+/, "").trimStart()
      : formatted;
    if (national.replace(/\D/g, "").length < 7) {
      return undefined;
    }
    return national;
  } catch (error) {
    console.warn("Placeholder formatlanamadı", error);
    return undefined;
  }
}