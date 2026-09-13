import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing, typography } from "../theme";

const LABELS = ["Not bloated", "", "", "", "", "Very bloated"];

export function SeverityScale({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  return (
    <View>
      <View style={styles.row}>
        {colors.severity.map((color, i) => {
          const selected = value === i;
          return (
            <Pressable
              key={i}
              accessibilityRole="button"
              accessibilityLabel={`Severity ${i}`}
              accessibilityState={{ selected }}
              onPress={() => onChange(i)}
              style={[
                styles.bubble,
                { backgroundColor: color },
                selected && styles.bubbleSelected,
              ]}
            >
              <Text style={[styles.number, selected && styles.numberSelected]}>{i}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.labelRow}>
        <Text style={styles.edgeLabel}>{LABELS[0]}</Text>
        <Text style={styles.edgeLabel}>{LABELS[5]}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", gap: spacing.xs },
  bubble: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  bubbleSelected: { borderWidth: 3, borderColor: colors.textPrimary },
  number: { ...typography.headline, color: colors.textPrimary },
  numberSelected: { color: colors.textPrimary },
  labelRow: { flexDirection: "row", justifyContent: "space-between", marginTop: spacing.sm },
  edgeLabel: { ...typography.caption, color: colors.textSecondary },
});
