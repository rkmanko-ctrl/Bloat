import React from "react";
import { StyleSheet, View } from "react-native";
import { colors, spacing } from "../theme";

export function ProgressDots({ total = 5, filled }: { total?: number; filled: number }) {
  return (
    <View style={styles.row}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={[styles.dot, i < filled ? styles.filled : styles.empty]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: spacing.xs },
  dot: { width: 10, height: 10, borderRadius: 5 },
  filled: { backgroundColor: colors.accent },
  empty: { backgroundColor: colors.border },
});
