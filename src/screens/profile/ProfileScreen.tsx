import React, { useCallback, useState } from "react";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { Screen } from "../../components/Screen";
import { mockRepository, repository } from "../../lib/repository";
import type { SubscriptionTier, UserProfile } from "../../lib/types";
import { colors, spacing, typography } from "../../theme";
import type { RootStackParamList } from "../../navigation/types";

export function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [tier, setTier] = useState<SubscriptionTier>("free");

  useFocusEffect(
    useCallback(() => {
      Promise.all([repository.getProfile(), repository.getSubscriptionTier()]).then(([p, t]) => {
        setProfile(p);
        setTier(t);
      });
    }, [])
  );

  if (!profile) return <Screen />;

  return (
    <Screen>
      <Text style={styles.title}>{profile.displayName ?? "Profile"}</Text>

      <Card style={styles.section}>
        <Text style={styles.rowLabel}>Plan</Text>
        <Text style={styles.rowValue}>{tier === "pro" ? "Bloat Pro" : "Free"}</Text>
        {tier === "free" && <Button label="Upgrade to Pro" onPress={() => navigation.navigate("Paywall")} />}
      </Card>

      <Card style={styles.section}>
        <Text style={styles.rowLabel}>Baseline started</Text>
        <Text style={styles.rowValue}>
          {profile.baselineStartedAt ? new Date(profile.baselineStartedAt).toLocaleDateString() : "Not started"}
        </Text>
      </Card>

      <Card style={styles.section}>
        <Text style={styles.disclaimerTitle}>About Bloat</Text>
        <Text style={styles.disclaimer}>
          Bloat looks for personal associations between what you log and your bloating — it does not diagnose
          conditions like IBS, SIBO, food intolerances, allergies, or celiac disease. If symptoms are severe,
          persistent, or worsening, please talk to a healthcare professional.
        </Text>
      </Card>

      <View style={styles.devSection}>
        <Text style={styles.devLabel}>Demo tools</Text>
        <Button
          label="Restart onboarding"
          variant="ghost"
          onPress={async () => {
            await mockRepository.resetForDemo();
            navigation.reset({ index: 0, routes: [{ name: "Onboarding" }] });
          }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.title, color: colors.textPrimary, marginBottom: spacing.lg },
  section: { marginBottom: spacing.md, gap: spacing.sm },
  rowLabel: { ...typography.caption, color: colors.textTertiary },
  rowValue: { ...typography.bodyStrong, color: colors.textPrimary },
  disclaimerTitle: { ...typography.headline, color: colors.textPrimary },
  disclaimer: { ...typography.caption, color: colors.textSecondary },
  devSection: { marginTop: spacing.xl, gap: spacing.sm },
  devLabel: { ...typography.captionStrong, color: colors.textTertiary },
});
