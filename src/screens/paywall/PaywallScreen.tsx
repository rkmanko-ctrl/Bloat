import React, { useCallback, useState } from "react";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { Screen } from "../../components/Screen";
import { repository } from "../../lib/repository";
import { colors, radius, spacing, typography } from "../../theme";
import type { RootStackParamList } from "../../navigation/types";

type Plan = "monthly" | "yearly";

const FEATURES = [
  "Unlimited AI meal recognition",
  "Deeper personal patterns",
  "Guided experiments",
  "Full historical insights",
  "Advanced pattern comparison",
  "Weekly reports",
];

export function PaywallScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [patternCount, setPatternCount] = useState<number | null>(null);
  const [plan, setPlan] = useState<Plan>("yearly");
  const [purchasing, setPurchasing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      repository.getPatterns().then((p) => setPatternCount(p.length));
    }, [])
  );

  const handlePurchase = async () => {
    setPurchasing(true);
    // In production this calls RevenueCat's purchase flow and the
    // `subscriptions` table is updated by its webhook, not the client.
    await repository.setSubscriptionTier("pro");
    navigation.goBack();
  };

  return (
    <Screen>
      <Text style={styles.eyebrow}>
        {patternCount && patternCount > 0
          ? `We found ${patternCount} possible pattern${patternCount === 1 ? "" : "s"} associated with your bloating.`
          : "Unlock deeper insight into your bloating."}
      </Text>
      <Text style={styles.title}>Unlock my patterns</Text>

      <Card style={styles.featuresCard}>
        {FEATURES.map((f) => (
          <Text key={f} style={styles.feature}>
            ✓ {f}
          </Text>
        ))}
      </Card>

      <View style={styles.plans}>
        <Pressable style={[styles.plan, plan === "yearly" && styles.planSelected]} onPress={() => setPlan("yearly")}>
          <Text style={styles.planBadge}>Best value</Text>
          <Text style={styles.planTitle}>Yearly</Text>
          <Text style={styles.planPrice}>$59.99/year</Text>
        </Pressable>
        <Pressable style={[styles.plan, plan === "monthly" && styles.planSelected]} onPress={() => setPlan("monthly")}>
          <Text style={styles.planTitle}>Monthly</Text>
          <Text style={styles.planPrice}>$9.99/month</Text>
        </Pressable>
      </View>

      <Button label="Unlock my patterns" onPress={handlePurchase} loading={purchasing} />
      <Button label="Not now" variant="ghost" onPress={() => navigation.goBack()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  eyebrow: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm },
  title: { ...typography.display, color: colors.textPrimary, marginTop: spacing.xs, marginBottom: spacing.lg },
  featuresCard: { gap: spacing.sm, marginBottom: spacing.lg },
  feature: { ...typography.body, color: colors.textPrimary },
  plans: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.lg },
  plan: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  planSelected: { borderColor: colors.accent, backgroundColor: colors.accentMuted },
  planBadge: { ...typography.captionStrong, color: colors.accent, marginBottom: spacing.xs },
  planTitle: { ...typography.bodyStrong, color: colors.textPrimary },
  planPrice: { ...typography.body, color: colors.textSecondary },
});
