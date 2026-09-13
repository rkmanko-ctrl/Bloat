import React, { useCallback, useState } from "react";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { ConfidenceBadge } from "../../components/ConfidenceBadge";
import { Screen } from "../../components/Screen";
import { repository } from "../../lib/repository";
import type { ExperimentWithProgress, PatternListItem } from "../../lib/repository/types";
import { colors, spacing, typography } from "../../theme";
import type { RootStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "PatternDetail">;

function onsetCopy(range: [number, number] | null): string {
  if (!range) return "Not enough matched occasions yet to estimate timing.";
  const [lo, hi] = range;
  const round = (n: number) => Math.max(0, Math.round(n));
  return round(lo) === round(hi) ? `~${round(lo)} hours later` : `~${round(lo)}-${round(hi)} hours later`;
}

export function PatternDetailScreen({ route }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { patternId } = route.params;
  const [pattern, setPattern] = useState<PatternListItem | null>(null);
  const [activeExperiment, setActiveExperiment] = useState<ExperimentWithProgress | null>(null);

  useFocusEffect(
    useCallback(() => {
      Promise.all([repository.getPattern(patternId), repository.getActiveExperiment()]).then(([p, e]) => {
        setPattern(p);
        setActiveExperiment(e);
      });
    }, [patternId])
  );

  if (!pattern) return <Screen />;

  const { evidence } = pattern;
  const hasOtherActiveExperiment = activeExperiment !== null && activeExperiment.experiment.patternId !== patternId;
  const alreadyRunningThis = activeExperiment !== null && activeExperiment.experiment.patternId === patternId;

  return (
    <Screen>
      <Text style={styles.title}>{evidence.factor.label}</Text>
      <ConfidenceBadge confidence={pattern.confidence} />

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>What we've noticed</Text>
        <Text style={styles.body}>{pattern.summary}</Text>
      </Card>

      <Card style={styles.section}>
        <View style={styles.statRow}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>With {evidence.factor.label.toLowerCase()}</Text>
            <Text style={styles.statValue}>
              {evidence.exposedSymptomCount} / {evidence.exposedCount}
            </Text>
            <Text style={styles.statCaption}>observations with bloating</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Without</Text>
            <Text style={styles.statValue}>
              {evidence.unexposedSymptomCount} / {evidence.unexposedCount}
            </Text>
            <Text style={styles.statCaption}>comparable observations</Text>
          </View>
        </View>
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Typical symptom timing</Text>
        <Text style={styles.body}>{onsetCopy(evidence.onsetHoursRange)}</Text>
      </Card>

      {alreadyRunningThis ? (
        <Card style={styles.noteCard}>
          <Text style={styles.noteText}>You're already running an experiment on this pattern.</Text>
          <Button
            label="View experiment"
            variant="secondary"
            onPress={() => navigation.navigate("ExperimentActive", { experimentId: activeExperiment!.experiment.id })}
          />
        </Card>
      ) : hasOtherActiveExperiment ? (
        <Card style={styles.noteCard}>
          <Text style={styles.noteText}>
            Finish your current experiment ({activeExperiment!.experiment.title}) before starting a new one — that
            keeps the comparison clean.
          </Text>
        </Card>
      ) : (
        <>
          <Text style={styles.prompt}>Want to test it?</Text>
          <Button
            label="Start a 7-day experiment"
            onPress={() => navigation.navigate("ExperimentStart", { patternId })}
          />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.title, color: colors.textPrimary, marginTop: spacing.sm, marginBottom: spacing.sm },
  section: { marginTop: spacing.lg, gap: spacing.xs },
  sectionTitle: { ...typography.headline, color: colors.textPrimary },
  body: { ...typography.body, color: colors.textSecondary },
  statRow: { flexDirection: "row", gap: spacing.lg },
  stat: { flex: 1, gap: spacing.xs },
  statLabel: { ...typography.caption, color: colors.textTertiary },
  statValue: { ...typography.display, fontSize: 26, color: colors.textPrimary },
  statCaption: { ...typography.caption, color: colors.textSecondary },
  prompt: { ...typography.headline, color: colors.textPrimary, marginTop: spacing.xl, marginBottom: spacing.sm },
  noteCard: { marginTop: spacing.xl, gap: spacing.sm, backgroundColor: colors.surfaceMuted, borderWidth: 0 },
  noteText: { ...typography.body, color: colors.textPrimary },
});
