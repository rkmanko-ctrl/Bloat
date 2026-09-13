import React from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "../../components/Button";
import { Screen } from "../../components/Screen";
import { SelectableRow } from "../../components/SelectableRow";
import { useOnboardingStore } from "../../state/onboardingStore";
import { colors, spacing, typography } from "../../theme";
import type { OnboardingStackParamList } from "../../navigation/types";
import type { BloatFrequency } from "../../lib/types";

type Props = NativeStackScreenProps<OnboardingStackParamList, "Frequency">;

const OPTIONS: { key: BloatFrequency; label: string }[] = [
  { key: "almost_daily", label: "Almost every day" },
  { key: "few_times_week", label: "A few times a week" },
  { key: "about_weekly", label: "About once a week" },
  { key: "occasionally", label: "Occasionally" },
];

export function FrequencyScreen({ navigation }: Props) {
  const { frequency, setFrequency } = useOnboardingStore();

  return (
    <Screen>
      <View style={styles.content}>
        <Text style={styles.title}>How often does it happen?</Text>
        <View style={styles.options}>
          {OPTIONS.map((o) => (
            <SelectableRow key={o.key} label={o.label} selected={frequency === o.key} onPress={() => setFrequency(o.key)} />
          ))}
        </View>
      </View>
      <Button label="Continue" disabled={!frequency} onPress={() => navigation.navigate("SymptomType")} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, gap: spacing.sm },
  title: { ...typography.title, color: colors.textPrimary, marginBottom: spacing.md },
  options: {},
});
