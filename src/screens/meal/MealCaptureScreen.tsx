import React, { useState } from "react";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "../../components/Button";
import { Screen } from "../../components/Screen";
import { colors, spacing, typography } from "../../theme";
import type { RootStackParamList } from "../../navigation/types";

export function MealCaptureScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [busy, setBusy] = useState(false);

  const openPicker = async (source: "camera" | "library") => {
    setBusy(true);
    try {
      const permission =
        source === "camera"
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        setBusy(false);
        return;
      }

      const result =
        source === "camera"
          ? await ImagePicker.launchCameraAsync({ quality: 0.6, allowsEditing: false })
          : await ImagePicker.launchImageLibraryAsync({ quality: 0.6, allowsEditing: false });

      if (!result.canceled && result.assets[0]) {
        navigation.navigate("MealReview", { photoUri: result.assets[0].uri });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scroll={false}>
      <View style={styles.content}>
        <Text style={styles.title}>Log a meal</Text>
        <Text style={styles.support}>A quick photo is the fastest way — we'll guess what's in it and you can fix anything wrong.</Text>
      </View>
      <View style={styles.actions}>
        <Button label="Take a photo" onPress={() => openPicker("camera")} loading={busy} />
        <Button label="Choose from library" variant="secondary" onPress={() => openPicker("library")} loading={busy} />
        <Button
          label="Log without a photo"
          variant="ghost"
          onPress={() => navigation.navigate("MealReview", { photoUri: null })}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, justifyContent: "center", gap: spacing.sm },
  title: { ...typography.title, color: colors.textPrimary },
  support: { ...typography.body, color: colors.textSecondary },
  actions: { gap: spacing.sm },
});
