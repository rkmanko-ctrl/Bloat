import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing, typography } from "../theme";

/** A full-width selectable list row, used throughout onboarding for
 * single- and multi-select questions (section 4). */
export function SelectableRow({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.row, selected && styles.rowSelected]}
    >
      <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
      <View style={[styles.indicator, selected && styles.indicatorSelected]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  rowSelected: { borderColor: colors.accent, backgroundColor: colors.accentMuted },
  label: { ...typography.body, color: colors.textPrimary, flexShrink: 1 },
  labelSelected: { fontWeight: "600" },
  indicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
  },
  indicatorSelected: { borderColor: colors.accent, backgroundColor: colors.accent },
});
