import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { colors, radius, spacing, typography } from "../theme";

type Variant = "primary" | "secondary" | "ghost" | "danger";

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
}

export function Button({ label, onPress, variant = "primary", disabled, loading, fullWidth = true }: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? colors.surface : colors.accent} />
      ) : (
        <Text style={[styles.label, variant === "primary" && styles.labelOnAccent]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  fullWidth: { alignSelf: "stretch" },
  primary: { backgroundColor: colors.accent },
  secondary: { backgroundColor: colors.surfaceMuted },
  ghost: { backgroundColor: "transparent" },
  danger: { backgroundColor: colors.dangerMuted },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.85 },
  label: { ...typography.bodyStrong, color: colors.textPrimary },
  labelOnAccent: { color: colors.surface },
});
