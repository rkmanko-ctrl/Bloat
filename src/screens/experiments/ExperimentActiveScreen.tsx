import React, { useCallback, useState } from "react";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { Screen } from "../../components/Screen";
import { repository } from "../../lib/repository";
import type { ExperimentWithProgress } from "../../lib/repository/types";
import { colors, spacing, typography } from "../../theme";
import type { RootStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "ExperimentActive">;

export function ExperimentActiveScreen({ route }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { experimentId } = route.params;
  const [progress, setProgress] = useState<ExperimentWithProgress | null>(null);

  useFocusEffect(
    useCallback(() => {
      repository.getExperiment(experimentId).then(setProgress);
    }, [experimentId])
  );

  if (!progress) return <Screen />;

  const { experiment, dayNumber, comparison } = progress;
  const isLastDay = dayNumber >= experiment.durationDays;

  return (
    <Screen>
      <Text style={styles.eyebrow}>
        Day {dayNumber} of {experiment.durationDays}
      </Text>
      <Text style={styles.title}>{experiment.title}</Text>

      <Card style={styles.card}>
        <View style={styles.statRow}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Baseline average</Text>
            <Text style={styles.statValue}>{(experiment.baselineAvgSeverity ?? 0).toFixed(1)} / 5</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Experiment so far</Text>
            <Text style={styles.statValue}>
              {comparison ? comparison.experimentAvgSeverity.toFixed(1) : "—"} / 5
            </Text>
          </View>
        </View>
        {!comparison && <Text style={styles.hint}>Log bloating today to start building this comparison.</Text>}
      </Card>

      <Text style={styles.note}>
        {isLastDay
          ? "Your experiment window is complete."
          : "Do not overinterpret this yet — a real read only makes sense once the full week is in."}
      </Text>

      <View style={styles.actions}>
        {isLastDay ? (
          <Button label="See results" onPress={() => navigation.replace("ExperimentResult", { experimentId })} />
        ) : (
          <>
            <Button label="Log a meal" variant="secondary" onPress={() => navigation.navigate("MealCapture")} />
            <Button label="Log bloating" variant="secondary" onPress={() => navigation.navigate("BloatCheckIn")} />
            <Button label="Done for now" variant="ghost" onPress={() => navigation.reset({ index: 0, routes: [{ name: "Main" }] })} />
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  eyebrow: { ...typography.captionStrong, color: colors.textTertiary, marginTop: spacing.sm },
  title: { ...typography.title, color: colors.textPrimary, marginTop: spacing.xs, marginBottom: spacing.lg },
  card: { marginBottom: spacing.md },
  statRow: { flexDirection: "row", gap: spacing.lg },
  stat: { flex: 1, gap: spacing.xs },
  statLabel: { ...typography.caption, color: colors.textTertiary },
  statValue: { ...typography.title, color: colors.textPrimary },
  hint: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.sm },
  note: { ...typography.caption, color: colors.textTertiary, marginBottom: spacing.xl },
  actions: { gap: spacing.sm },
});
