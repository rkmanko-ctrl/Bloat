import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { PatternConfidence } from "../lib/types";
import { colors, radius, spacing, typography } from "../theme";

const STYLE_BY_TIER: Record<PatternConfidence, { bg: string; fg: string; label: string }> = {
  stronger_pattern: { bg: colors.accentMuted, fg: colors.accent, label: "Strongest current pattern" },
  possible_pattern: { bg: colors.warningMuted, fg: colors.warning, label: "Possible pattern" },
  early_signal: { bg: colors.surfaceMuted, fg: colors.textSecondary, label: "Early signal" },
};

export function ConfidenceBadge({ confidence }: { confidence: PatternConfidence }) {
  const s = STYLE_BY_TIER[confidence];
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <Text style={[styles.text, { color: s.fg }]}>{s.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
  },
  text: { ...typography.captionStrong },
});
