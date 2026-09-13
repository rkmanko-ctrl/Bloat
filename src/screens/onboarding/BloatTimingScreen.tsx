import React from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "../../components/Button";
import { Screen } from "../../components/Screen";
import { SelectableRow } from "../../components/SelectableRow";
import { useOnboardingStore } from "../../state/onboardingStore";
import { colors, spacing, typography } from "../../theme";
import type { OnboardingStackParamList } from "../../navigation/types";
import type { BloatTiming } from "../../lib/types";

type Props = NativeStackScreenProps<OnboardingStackParamList, "BloatTiming">;

const OPTIONS: { key: BloatTiming; label: string }[] = [
  { key: "after_breakfast", label: "After breakfast" },
  { key: "after_lunch", label: "After lunch" },
  { key: "after_dinner", label: "After dinner" },
  { key: "mostly_evening", label: "Mostly in the evening" },
  { key: "random", label: "It seems random" },
];

export function BloatTimingScreen({ navigation }: Props) {
  const { bloatTiming, toggleBloatTiming } = useOnboardingStore();

  return (
    <Screen>
      <View style={styles.content}>
        <Text style={styles.title}>When do you usually feel bloated?</Text>
        <Text style={styles.support}>Select all that apply.</Text>
        <View style={styles.options}>
          {OPTIONS.map((o) => (
            <SelectableRow
              key={o.key}
              label={o.label}
              selected={bloatTiming.includes(o.key)}
              onPress={() => toggleBloatTiming(o.key)}
            />
          ))}
        </View>
      </View>
      <Button label="Continue" disabled={bloatTiming.length === 0} onPress={() => navigation.navigate("Frequency")} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, gap: spacing.sm },
  title: { ...typography.title, color: colors.textPrimary, marginBottom: spacing.xs },
  support: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.md },
  options: { gap: 0 },
});
