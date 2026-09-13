import React, { useState } from "react";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { Screen } from "../../components/Screen";
import { RED_FLAG_OPTIONS, SAFETY_COPY } from "../../lib/safety";
import { colors, spacing, typography } from "../../theme";
import type { RootStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "SafetyFlow">;

/**
 * Section 15: when a check-in reports something outside everyday bloating,
 * the product's job shifts from "run another experiment" to "point toward
 * appropriate care." This screen deliberately has no path back into
 * pattern/experiment features — only forward, to guidance and back home.
 */
export function SafetyFlowScreen({ route }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [showGuidance, setShowGuidance] = useState(false);
  const selectedLabels = route.params.redFlags
    .map((key) => RED_FLAG_OPTIONS.find((o) => o.key === key)?.label)
    .filter((l): l is string => !!l);

  return (
    <Screen>
      <Text style={styles.title}>{SAFETY_COPY.title}</Text>
      <Text style={styles.body}>{SAFETY_COPY.body}</Text>

      {selectedLabels.length > 0 && (
        <Card style={styles.selectedCard}>
          <Text style={styles.selectedTitle}>What you shared:</Text>
          {selectedLabels.map((l) => (
            <Text key={l} style={styles.selectedItem}>
              • {l}
            </Text>
          ))}
        </Card>
      )}

      {showGuidance && (
        <Card style={styles.guidanceCard}>
          <Text style={styles.guidanceText}>
            Consider contacting your primary care doctor or a gastroenterologist to describe what you're
            experiencing. If symptoms are severe, sudden, or rapidly worsening, urgent or emergency care is the
            safer choice rather than waiting.
          </Text>
        </Card>
      )}

      <Text style={styles.disclaimer}>{SAFETY_COPY.disclaimer}</Text>

      <View style={styles.actions}>
        <Button label={SAFETY_COPY.cta} onPress={() => setShowGuidance(true)} />
        <Button
          label={SAFETY_COPY.secondary}
          variant="ghost"
          onPress={() => navigation.reset({ index: 0, routes: [{ name: "Main" }] })}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.title, color: colors.textPrimary, marginBottom: spacing.md },
  body: { ...typography.body, color: colors.textPrimary, marginBottom: spacing.lg },
  selectedCard: { backgroundColor: colors.surfaceMuted, borderWidth: 0, marginBottom: spacing.lg, gap: spacing.xs },
  selectedTitle: { ...typography.captionStrong, color: colors.textSecondary, marginBottom: spacing.xs },
  selectedItem: { ...typography.body, color: colors.textPrimary },
  guidanceCard: { backgroundColor: colors.dangerMuted, borderWidth: 0, marginBottom: spacing.lg },
  guidanceText: { ...typography.body, color: colors.textPrimary },
  disclaimer: { ...typography.caption, color: colors.textTertiary, marginBottom: spacing.xl },
  actions: { gap: spacing.sm },
});
