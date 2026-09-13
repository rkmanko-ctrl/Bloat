import React from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "../../components/Button";
import { Screen } from "../../components/Screen";
import { SelectableRow } from "../../components/SelectableRow";
import { useOnboardingStore } from "../../state/onboardingStore";
import { colors, spacing, typography } from "../../theme";
import type { OnboardingStackParamList } from "../../navigation/types";
import type { SymptomType } from "../../lib/types";

type Props = NativeStackScreenProps<OnboardingStackParamList, "SymptomType">;

const OPTIONS: { key: SymptomType; label: string }[] = [
  { key: "tightness", label: "Tight / full stomach" },
  { key: "visible_bloating", label: "Visible abdominal bloating" },
  { key: "gas", label: "Gas" },
  { key: "discomfort", label: "Abdominal discomfort" },
  { key: "fullness", label: "Heavy after eating" },
  { key: "other", label: "Other" },
];

export function SymptomTypeScreen({ navigation }: Props) {
  const { symptomTypes, toggleSymptomType } = useOnboardingStore();

  return (
    <Screen>
      <View style={styles.content}>
        <Text style={styles.title}>What does it usually feel like?</Text>
        <Text style={styles.support}>Select all that apply.</Text>
        <View style={styles.options}>
          {OPTIONS.map((o) => (
            <SelectableRow
              key={o.key}
              label={o.label}
              selected={symptomTypes.includes(o.key)}
              onPress={() => toggleSymptomType(o.key)}
            />
          ))}
        </View>
      </View>
      <Button label="Continue" disabled={symptomTypes.length === 0} onPress={() => navigation.navigate("Goals")} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, gap: spacing.sm },
  title: { ...typography.title, color: colors.textPrimary, marginBottom: spacing.xs },
  support: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.md },
  options: {},
});
