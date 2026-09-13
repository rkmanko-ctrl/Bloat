import React, { useState } from "react";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Button } from "../../components/Button";
import { Chip } from "../../components/Chip";
import { Screen } from "../../components/Screen";
import { SeverityScale } from "../../components/SeverityScale";
import { repository } from "../../lib/repository";
import { RED_FLAG_OPTIONS } from "../../lib/safety";
import type { RedFlagSymptom, SymptomType } from "../../lib/types";
import { colors, radius, spacing, typography } from "../../theme";
import type { RootStackParamList } from "../../navigation/types";

const SYMPTOM_TYPES: { key: SymptomType; label: string }[] = [
  { key: "tightness", label: "Tightness" },
  { key: "fullness", label: "Fullness" },
  { key: "gas", label: "Gas" },
  { key: "visible_bloating", label: "Visible bloating" },
  { key: "discomfort", label: "Discomfort" },
];

export function BloatCheckInScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [severity, setSeverity] = useState<number | null>(null);
  const [types, setTypes] = useState<Set<SymptomType>>(new Set());
  const [notes, setNotes] = useState("");
  const [showConcern, setShowConcern] = useState(false);
  const [redFlags, setRedFlags] = useState<Set<RedFlagSymptom>>(new Set());
  const [saving, setSaving] = useState(false);

  const toggleType = (key: SymptomType) =>
    setTypes((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const toggleRedFlag = (key: RedFlagSymptom) =>
    setRedFlags((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const handleSave = async () => {
    if (severity === null) return;
    setSaving(true);
    const redFlagList = Array.from(redFlags);
    await repository.logSymptom({
      severity: severity as 0 | 1 | 2 | 3 | 4 | 5,
      types: Array.from(types),
      notes: notes || undefined,
      redFlags: redFlagList,
    });

    if (redFlagList.length > 0) {
      navigation.replace("SafetyFlow", { redFlags: redFlagList });
    } else {
      navigation.reset({ index: 0, routes: [{ name: "Main" }] });
    }
  };

  return (
    <Screen>
      <Text style={styles.title}>How bloated do you feel?</Text>
      <SeverityScale value={severity} onChange={setSeverity} />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>What are you feeling?</Text>
        <View style={styles.chipRow}>
          {SYMPTOM_TYPES.map((t) => (
            <Chip key={t.key} label={t.label} selected={types.has(t.key)} onPress={() => toggleType(t.key)} />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Anything else?</Text>
        <TextInput
          style={styles.input}
          placeholder="Optional"
          placeholderTextColor={colors.textTertiary}
          value={notes}
          onChangeText={setNotes}
        />
      </View>

      <Pressable onPress={() => setShowConcern((v) => !v)} style={styles.disclosureRow}>
        <Text style={styles.disclosureText}>
          {showConcern ? "Hide" : "This feels like more than usual bloating"}
        </Text>
      </Pressable>
      {showConcern && (
        <View style={styles.section}>
          <Text style={styles.concernHelper}>
            If any of these apply, please also consider reaching out to a healthcare professional.
          </Text>
          <View style={styles.chipRow}>
            {RED_FLAG_OPTIONS.map((o) => (
              <Chip key={o.key} label={o.label} selected={redFlags.has(o.key)} onPress={() => toggleRedFlag(o.key)} />
            ))}
          </View>
        </View>
      )}

      <Button label="Save" onPress={handleSave} disabled={severity === null} loading={saving} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.title, color: colors.textPrimary, marginBottom: spacing.lg },
  section: { marginTop: spacing.xl, marginBottom: spacing.md },
  sectionTitle: { ...typography.headline, color: colors.textPrimary, marginBottom: spacing.sm },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  disclosureRow: { marginTop: spacing.md },
  disclosureText: { ...typography.caption, color: colors.textTertiary, textDecorationLine: "underline" },
  concernHelper: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.sm },
});
