import React, { PropsWithChildren } from "react";
import { ScrollView, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing } from "../theme";

interface ScreenProps {
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
}

export function Screen({ children, scroll = true, style, padded = true }: PropsWithChildren<ScreenProps>) {
  if (scroll) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <ScrollView
          style={[styles.container, style]}
          contentContainerStyle={[padded && styles.padded, styles.grow]}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={[styles.container, padded && styles.padded, style]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, backgroundColor: colors.background },
  grow: { flexGrow: 1 },
  padded: { padding: spacing.lg },
});
