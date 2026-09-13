import React, { useCallback, useState } from "react";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { Screen } from "../../components/Screen";
import { repository } from "../../lib/repository";
import type { PatternListItem } from "../../lib/repository/types";
import { colors, spacing, typography } from "../../theme";
import type { RootStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "ExperimentStart">;

const DURATION_DAYS = 7;

export function ExperimentStartScreen({ route }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { patternId } = route.params;
  const [pattern, setPattern] = useState<PatternListItem | null>(null);
  const [starting, setStarting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      repository.getPattern(patternId).then(setPattern);
    }, [patternId])
  );

  if (!pattern) return <Screen />;

  const label = pattern.evidence.factor.label;

  const handleStart = async () => {
    setStarting(true);
    const experiment = await repository.startExperiment(patternId, DURATION_DAYS);
    navigation.replace("ExperimentActive", { experimentId: experiment.id });
  };

  return (
    <Screen>
      <Text style={styles.eyebrow}>{DURATION_DAYS}-day experiment</Text>
      <Text style={styles.title}>Skip {label.toLowerCase()}</Text>

      <Card style={styles.card}>
        <Text style={styles.bodyStrong}>For the next {DURATION_DAYS} days:</Text>
        <Text style={styles.body}>Avoid {label.toLowerCase()}.</Text>
        <Text style={styles.body}>Try to keep the rest of your normal routine reasonably similar.</Text>
        <Text style={styles.body}>Continue logging meals and bloating.</Text>
      </Card>

      <Text style={styles.note}>We will compare your symptom pattern with your baseline.</Text>

      <View style={styles.spacer} />
      <Button label="Start experiment" onPress={handleStart} loading={starting} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  eyebrow: { ...typography.captionStrong, color: colors.textTertiary, marginTop: spacing.sm },
  title: { ...typography.display, color: colors.textPrimary, marginTop: spacing.xs, marginBottom: spacing.lg },
  card: { gap: spacing.sm, marginBottom: spacing.lg },
  bodyStrong: { ...typography.bodyStrong, color: colors.textPrimary },
  body: { ...typography.body, color: colors.textSecondary },
  note: { ...typography.caption, color: colors.textTertiary },
  spacer: { flex: 1, minHeight: spacing.xl },
});
