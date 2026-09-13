import React from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "../../components/Button";
import { Screen } from "../../components/Screen";
import { colors, spacing, typography } from "../../theme";
import type { OnboardingStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<OnboardingStackParamList, "Welcome">;

export function WelcomeScreen({ navigation }: Props) {
  return (
    <Screen scroll={false}>
      <View style={styles.content}>
        <Text style={styles.title}>Let's figure out what's behind your bloating.</Text>
        <Text style={styles.support}>
          Track meals and symptoms for a few days. Bloat will look for patterns that may be worth testing.
        </Text>
      </View>
      <Button label="Get started" onPress={() => navigation.navigate("BloatTiming")} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, justifyContent: "center", gap: spacing.md },
  title: { ...typography.display, color: colors.textPrimary },
  support: { ...typography.body, color: colors.textSecondary },
});
