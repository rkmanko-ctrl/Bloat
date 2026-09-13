import React, { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { StyleSheet, Text, View } from "react-native";
import { Card } from "../../components/Card";
import { Screen } from "../../components/Screen";
import { repository } from "../../lib/repository";
import type { Meal, SymptomEvent } from "../../lib/types";
import { colors, spacing, typography } from "../../theme";

type TimelineEntry =
  | { kind: "meal"; at: Date; meal: Meal }
  | { kind: "symptom"; at: Date; symptom: SymptomEvent };

function dayLabel(d: Date): string {
  const today = new Date();
  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (isSameDay(d, today)) return "Today";
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (isSameDay(d, yesterday)) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

function timeLabel(d: Date): string {
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

const PORTION_LABEL: Record<string, string> = { small: "Small", medium: "Medium", large: "Large" };

export function HistoryScreen() {
  const [entries, setEntries] = useState<TimelineEntry[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      Promise.all([repository.getMeals(30), repository.getSymptoms(30)]).then(([meals, symptoms]) => {
        const combined: TimelineEntry[] = [
          ...meals.map((m): TimelineEntry => ({ kind: "meal", at: new Date(m.loggedAt), meal: m })),
          ...symptoms.map((s): TimelineEntry => ({ kind: "symptom", at: new Date(s.occurredAt), symptom: s })),
        ].sort((a, b) => b.at.getTime() - a.at.getTime());
        setEntries(combined);
      });
    }, [])
  );

  if (!entries) return <Screen />;

  const groups = new Map<string, TimelineEntry[]>();
  for (const entry of entries) {
    const key = dayLabel(entry.at);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(entry);
  }

  return (
    <Screen>
      <Text style={styles.title}>History</Text>
      {entries.length === 0 && (
        <Card>
          <Text style={styles.emptyText}>Nothing logged yet — meals and bloating check-ins will show up here.</Text>
        </Card>
      )}
      {Array.from(groups.entries()).map(([day, dayEntries]) => (
        <View key={day} style={styles.dayGroup}>
          <Text style={styles.dayLabel}>{day}</Text>
          {dayEntries.map((entry) =>
            entry.kind === "meal" ? (
              <Card key={entry.meal.id} style={styles.entryCard}>
                <View style={styles.entryRow}>
                  <Text style={styles.entryTitle}>Meal</Text>
                  <Text style={styles.entryTime}>{timeLabel(entry.at)}</Text>
                </View>
                <Text style={styles.entryDetail}>
                  {entry.meal.portionSize ? PORTION_LABEL[entry.meal.portionSize] : "Medium"} portion
                  {entry.meal.notes ? ` · ${entry.meal.notes}` : ""}
                </Text>
              </Card>
            ) : (
              <Card key={entry.symptom.id} style={[styles.entryCard, styles.symptomCard]}>
                <View style={styles.entryRow}>
                  <Text style={styles.entryTitle}>Bloating — severity {entry.symptom.severity}/5</Text>
                  <Text style={styles.entryTime}>{timeLabel(entry.at)}</Text>
                </View>
                {entry.symptom.types.length > 0 && (
                  <Text style={styles.entryDetail}>{entry.symptom.types.join(", ")}</Text>
                )}
              </Card>
            )
          )}
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.title, color: colors.textPrimary, marginBottom: spacing.lg },
  emptyText: { ...typography.body, color: colors.textSecondary },
  dayGroup: { marginBottom: spacing.lg },
  dayLabel: { ...typography.captionStrong, color: colors.textTertiary, marginBottom: spacing.sm },
  entryCard: { marginBottom: spacing.sm, gap: spacing.xs },
  symptomCard: { backgroundColor: colors.surfaceMuted, borderWidth: 0 },
  entryRow: { flexDirection: "row", justifyContent: "space-between" },
  entryTitle: { ...typography.bodyStrong, color: colors.textPrimary },
  entryTime: { ...typography.caption, color: colors.textTertiary },
  entryDetail: { ...typography.body, color: colors.textSecondary },
});
