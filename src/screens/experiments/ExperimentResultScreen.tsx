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

type Props = NativeStackScreenProps<RootStackParamList, "ExperimentResult">;

export function ExperimentResultScreen({ route }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { experimentId } = route.params;
  const [progress, setProgress] = useState<ExperimentWithProgress | null>(null);

  useFocusEffect(
    useCallback(() => {
      repository.getExperiment(experimentId).then(setProgress);
    }, [experimentId])
  );

  if (!progress || !progress.comparison) return <Screen />;

  const { experiment, comparison } = progress;

  const finish = async () => {
    await repository.finishExperiment(experimentId, "completed");
    navigation.reset({ index: 0, routes: [{ name: "Main" }] });
  };

  const fewerHighEpisodes = comparison.experimentHighEpisodeCount < comparison.baselineHighEpisodeCount;

  return (
    <Screen>
      <Text style={styles.title}>Experiment complete</Text>
      <Text style={styles.headline}>
        {comparison.improved
          ? "Your bloating improved during this experiment."
          : "Your bloating stayed about the same during this experiment."}
      </Text>

      <Card style={styles.card}>
        <View style={styles.statRow}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Before</Text>
            <Text style={styles.statValue}>{comparison.baselineAvgSeverity.toFixed(1)}</Text>
            <Text style={styles.statCaption}>average symptom severity</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Experiment</Text>
            <Text style={styles.statValue}>{comparison.experimentAvgSeverity.toFixed(1)}</Text>
            <Text style={styles.statCaption}>average symptom severity</Text>
          </View>
        </View>
        {fewerHighEpisodes && (
          <Text style={styles.highlight}>You also logged fewer high-bloating episodes.</Text>
        )}
      </Card>

      <Text style={styles.interpretation}>{comparison.interpretation}</Text>

      <View style={styles.actions}>
        <Button label="Keep this change" onPress={finish} />
        <Button label="Test again later" variant="secondary" onPress={finish} />
        <Button label="Try another experiment" variant="ghost" onPress={finish} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.captionStrong, color: colors.textTertiary, marginTop: spacing.sm },
  headline: { ...typography.title, color: colors.textPrimary, marginTop: spacing.xs, marginBottom: spacing.lg },
  card: { gap: spacing.sm, marginBottom: spacing.lg },
  statRow: { flexDirection: "row", gap: spacing.lg },
  stat: { flex: 1, gap: spacing.xs },
  statLabel: { ...typography.caption, color: colors.textTertiary },
  statValue: { ...typography.display, fontSize: 30, color: colors.textPrimary },
  statCaption: { ...typography.caption, color: colors.textSecondary },
  highlight: { ...typography.bodyStrong, color: colors.success, marginTop: spacing.sm },
  interpretation: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.xl },
  actions: { gap: spacing.sm },
});
