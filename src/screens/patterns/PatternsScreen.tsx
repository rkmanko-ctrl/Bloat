import React, { useCallback, useState } from "react";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { ConfidenceBadge } from "../../components/ConfidenceBadge";
import { Screen } from "../../components/Screen";
import { repository } from "../../lib/repository";
import type { PatternListItem } from "../../lib/repository/types";
import type { SubscriptionTier } from "../../lib/types";
import { colors, radius, spacing, typography } from "../../theme";
import type { RootStackParamList } from "../../navigation/types";

const FREE_VISIBLE_PATTERNS = 1;

export function PatternsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [patterns, setPatterns] = useState<PatternListItem[] | null>(null);
  const [tier, setTier] = useState<SubscriptionTier>("free");

  useFocusEffect(
    useCallback(() => {
      Promise.all([repository.getPatterns(), repository.getSubscriptionTier()]).then(([p, t]) => {
        setPatterns(p);
        setTier(t);
      });
    }, [])
  );

  if (!patterns) return <Screen />;

  if (patterns.length === 0) {
    return (
      <Screen>
        <Text style={styles.title}>Your patterns</Text>
        <Card>
          <Text style={styles.emptyText}>
            Still gathering data. Keep logging meals and bloating — patterns usually start to appear after a few
            days of observations.
          </Text>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={styles.title}>Your patterns</Text>
      {patterns.map((p, index) => {
        const locked = tier === "free" && index >= FREE_VISIBLE_PATTERNS;
        return (
          <Card key={p.id} style={styles.card}>
            <View style={styles.rankRow}>
              <Text style={styles.rank}>{index + 1}.</Text>
              <View style={styles.rankContent}>
                <Text style={styles.factorLabel}>{p.evidence.factor.label}</Text>
                <ConfidenceBadge confidence={p.confidence} />
              </View>
            </View>

            {locked ? (
              <View>
                <Text style={styles.blurredText} numberOfLines={2}>
                  {p.summary}
                </Text>
                <Pressable onPress={() => navigation.navigate("Paywall")} style={styles.lockOverlay}>
                  <Text style={styles.lockText}>🔒 Unlock my patterns</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <Text style={styles.summary}>{p.summary}</Text>
                <Pressable onPress={() => navigation.navigate("PatternDetail", { patternId: p.id })}>
                  <Text style={styles.explore}>{p.confidence === "early_signal" ? "Keep tracking →" : "Explore →"}</Text>
                </Pressable>
              </>
            )}
          </Card>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.title, color: colors.textPrimary, marginBottom: spacing.lg },
  emptyText: { ...typography.body, color: colors.textSecondary },
  card: { marginBottom: spacing.md, gap: spacing.sm },
  rankRow: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start" },
  rank: { ...typography.headline, color: colors.textTertiary },
  rankContent: { flex: 1, gap: spacing.xs },
  factorLabel: { ...typography.headline, color: colors.textPrimary },
  summary: { ...typography.body, color: colors.textSecondary },
  explore: { ...typography.captionStrong, color: colors.accent, marginTop: spacing.xs },
  blurredText: { ...typography.body, color: colors.textTertiary },
  lockOverlay: {
    marginTop: spacing.sm,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  lockText: { ...typography.captionStrong, color: colors.textPrimary },
});
