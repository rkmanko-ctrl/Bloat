import React from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "../../components/Button";
import { Screen } from "../../components/Screen";
import { SelectableRow } from "../../components/SelectableRow";
import { useOnboardingStore } from "../../state/onboardingStore";
import { colors, spacing, typography } from "../../theme";
import type { OnboardingStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<OnboardingStackParamList, "Goals">;

const OPTIONS = [
  "Feel less bloated after meals",
  "Understand which foods seem connected",
  "Feel more comfortable in the evening",
  "Stop guessing what causes it",
];

export function GoalsScreen({ navigation }: Props) {
  const { goals, toggleGoal } = useOnboardingStore();

  return (
    <Screen>
      <View style={styles.content}>
        <Text style={styles.title}>What would success look like?</Text>
        <View style={styles.options}>
          {OPTIONS.map((o) => (
            <SelectableRow key={o} label={o} selected={goals.includes(o)} onPress={() => toggleGoal(o)} />
          ))}
        </View>
      </View>
      <Button label="Continue" disabled={goals.length === 0} onPress={() => navigation.navigate("BaselineIntro")} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, gap: spacing.sm },
  title: { ...typography.title, color: colors.textPrimary, marginBottom: spacing.md },
  options: {},
});
