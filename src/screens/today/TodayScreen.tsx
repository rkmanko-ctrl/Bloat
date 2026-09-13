import React, { useCallback, useState } from "react";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { ProgressDots } from "../../components/ProgressDots";
import { Screen } from "../../components/Screen";
import { repository } from "../../lib/repository";
import type { TodayStatus } from "../../lib/repository/types";
import type { UserProfile } from "../../lib/types";
import { colors, spacing, typography } from "../../theme";
import type { RootStackParamList } from "../../navigation/types";

const BASELINE_WINDOW_DAYS = 5;

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function TodayScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [status, setStatus] = useState<TodayStatus | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const load = useCallback(async () => {
    const [s, p] = await Promise.all([repository.getTodayStatus(), repository.getProfile()]);
    setStatus(s);
    setProfile(p);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!status || !profile) return <Screen />;

  const inBaselineWindow = status.baselineDayNumber <= BASELINE_WINDOW_DAYS;
  const checklist = [
    { label: "Breakfast logged", done: status.mealsLoggedToday.breakfast },
    { label: "Lunch logged", done: status.mealsLoggedToday.lunch },
    { label: "Dinner logged", done: status.mealsLoggedToday.dinner },
    { label: "Evening check-in", done: status.eveningCheckinLoggedToday },
  ];

  return (
    <Screen>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            {greeting()}
            {profile.displayName ? `, ${profile.displayName}.` : "."}
          </Text>
          <Text style={styles.subtitle}>
            {inBaselineWindow ? `Day ${status.baselineDayNumber} of your baseline` : "Keep logging to sharpen your patterns"}
          </Text>
        </View>
        <Pressable onPress={() => navigation.navigate("Profile")} accessibilityRole="button" accessibilityLabel="Profile">
          <View style={styles.avatar}>
            <Text style={styles.avatarLabel}>{(profile.displayName ?? "?").charAt(0)}</Text>
          </View>
        </Pressable>
      </View>

      {inBaselineWindow && (
        <Text style={styles.helper}>We need a little more information before looking for patterns.</Text>
      )}

      <Card style={styles.checklistCard}>
        <Text style={styles.cardTitle}>Today</Text>
        {checklist.map((item) => (
          <View key={item.label} style={styles.checklistRow}>
            <View style={[styles.checkMark, item.done && styles.checkMarkDone]}>
              {item.done && <Text style={styles.checkMarkText}>✓</Text>}
            </View>
            <Text style={[styles.checklistLabel, item.done && styles.checklistLabelDone]}>{item.label}</Text>
          </View>
        ))}
      </Card>

      <View style={styles.ctas}>
        <Button label="Log a meal" onPress={() => navigation.navigate("MealCapture")} />
        <Button label="Log bloating" variant="secondary" onPress={() => navigation.navigate("BloatCheckIn")} />
      </View>

      <Card style={styles.confidenceCard}>
        <View style={styles.confidenceHeader}>
          <Text style={styles.cardTitle}>Pattern confidence</Text>
          <ProgressDots total={5} filled={status.patternConfidenceDots} />
        </View>
        <Text style={styles.confidenceLabel}>{status.patternConfidenceLabel}</Text>
        <Text style={styles.confidenceHelper}>
          Usually we need several days of observations before suggesting patterns.
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: spacing.md },
  greeting: { ...typography.title, color: colors.textPrimary },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs },
  helper: { ...typography.caption, color: colors.textTertiary, marginBottom: spacing.md },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accentMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLabel: { ...typography.bodyStrong, color: colors.accent },
  checklistCard: { marginBottom: spacing.lg, gap: spacing.sm },
  cardTitle: { ...typography.headline, color: colors.textPrimary, marginBottom: spacing.xs },
  checklistRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xs },
  checkMark: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkMarkDone: { backgroundColor: colors.success, borderColor: colors.success },
  checkMarkText: { color: colors.surface, fontSize: 13, fontWeight: "700" },
  checklistLabel: { ...typography.body, color: colors.textSecondary },
  checklistLabelDone: { color: colors.textPrimary },
  ctas: { gap: spacing.sm, marginBottom: spacing.lg },
  confidenceCard: { backgroundColor: colors.surfaceMuted, borderWidth: 0, gap: spacing.xs },
  confidenceHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  confidenceLabel: { ...typography.bodyStrong, color: colors.textPrimary },
  confidenceHelper: { ...typography.caption, color: colors.textSecondary },
});
