import React, { useEffect, useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { Chip } from "../../components/Chip";
import { Screen } from "../../components/Screen";
import { mealVisionAdapter, type DetectedIngredient } from "../../lib/ai/mealVision";
import { repository } from "../../lib/repository";
import { colors, radius, spacing, typography } from "../../theme";
import type { RootStackParamList } from "../../navigation/types";
import type { ContextFactorKey, PortionSize } from "../../lib/types";
import { CONTEXT_FACTOR_LABELS } from "../../lib/factors";

type Props = NativeStackScreenProps<RootStackParamList, "MealReview">;

const PORTIONS: { key: PortionSize; label: string }[] = [
  { key: "small", label: "Small" },
  { key: "medium", label: "Medium" },
  { key: "large", label: "Large" },
];

const MEAL_CONTEXT_FACTORS: ContextFactorKey[] = [
  "carbonated_drink",
  "alcohol",
  "coffee",
  "unusually_large_meal",
  "ate_quickly",
  "late_meal",
];

export function MealReviewScreen({ route, navigation }: Props) {
  const { photoUri } = route.params;
  const [loading, setLoading] = useState(!!photoUri);
  const [items, setItems] = useState<DetectedIngredient[]>([]);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [freeText, setFreeText] = useState("");
  const [portionSize, setPortionSize] = useState<PortionSize>("medium");
  const [showContext, setShowContext] = useState(false);
  const [contextFactorKeys, setContextFactorKeys] = useState<Set<ContextFactorKey>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!photoUri) return;
    let cancelled = false;
    mealVisionAdapter.analyzePhoto(photoUri).then((result) => {
      if (cancelled) return;
      setItems(result.items);
      setSuggestedTags(result.suggestedTags);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [photoUri]);

  const removeItem = (label: string) => setItems((prev) => prev.filter((i) => i.label !== label));

  const toggleContext = (key: ContextFactorKey) =>
    setContextFactorKeys((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const handleSave = async () => {
    setSaving(true);
    const freeTextItems = freeText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((label) => ({ label, categoryKey: null as string | null }));

    await repository.logMeal({
      portionSize,
      source: photoUri ? "photo" : "manual",
      photoUri: photoUri ?? undefined,
      ingredientLabels: [...items.map((i) => ({ label: i.label, categoryKey: i.categoryKey })), ...freeTextItems],
      freeTextAddition: freeText || undefined,
      contextFactorKeys: Array.from(contextFactorKeys),
    });

    navigation.reset({ index: 0, routes: [{ name: "Main" }] });
  };

  return (
    <Screen>
      <Text style={styles.title}>Confirm your meal</Text>

      {photoUri && <Image source={{ uri: photoUri }} style={styles.photo} />}

      {loading ? (
        <Card style={styles.loadingCard}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.loadingText}>Looking at your meal…</Text>
        </Card>
      ) : (
        <>
          {items.length > 0 && (
            <Card style={styles.section}>
              <Text style={styles.sectionTitle}>Looks like</Text>
              {items.map((item) => (
                <View key={item.label} style={styles.itemRow}>
                  <Text style={styles.itemLabel}>{item.label}</Text>
                  <Pressable onPress={() => removeItem(item.label)} hitSlop={8}>
                    <Text style={styles.removeLabel}>Remove</Text>
                  </Pressable>
                </View>
              ))}
              {suggestedTags.length > 0 && (
                <View style={styles.tagRow}>
                  {suggestedTags.map((t) => (
                    <View key={t} style={styles.tag}>
                      <Text style={styles.tagText}>{t}</Text>
                    </View>
                  ))}
                </View>
              )}
            </Card>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Anything we missed?</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. garlic sauce, protein shake"
              placeholderTextColor={colors.textTertiary}
              value={freeText}
              onChangeText={setFreeText}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Portion size</Text>
            <View style={styles.chipRow}>
              {PORTIONS.map((p) => (
                <Chip key={p.key} label={p.label} selected={portionSize === p.key} onPress={() => setPortionSize(p.key)} />
              ))}
            </View>
          </View>

          <Pressable onPress={() => setShowContext((v) => !v)} style={styles.disclosureRow}>
            <Text style={styles.disclosureText}>{showContext ? "Hide" : "Add details"} (optional)</Text>
          </Pressable>
          {showContext && (
            <View style={[styles.chipRow, styles.section]}>
              {MEAL_CONTEXT_FACTORS.map((key) => (
                <Chip
                  key={key}
                  label={CONTEXT_FACTOR_LABELS[key]}
                  selected={contextFactorKeys.has(key)}
                  onPress={() => toggleContext(key)}
                />
              ))}
            </View>
          )}

          <Button label="Save meal" onPress={handleSave} loading={saving} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.title, color: colors.textPrimary, marginBottom: spacing.md },
  photo: { width: "100%", aspectRatio: 4 / 3, borderRadius: radius.lg, marginBottom: spacing.md },
  loadingCard: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xl },
  loadingText: { ...typography.body, color: colors.textSecondary },
  section: { marginBottom: spacing.lg },
  sectionTitle: { ...typography.headline, color: colors.textPrimary, marginBottom: spacing.sm },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.xs,
  },
  itemLabel: { ...typography.body, color: colors.textPrimary },
  removeLabel: { ...typography.caption, color: colors.danger },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginTop: spacing.sm },
  tag: { backgroundColor: colors.surfaceMuted, borderRadius: radius.pill, paddingVertical: 4, paddingHorizontal: spacing.sm },
  tagText: { ...typography.caption, color: colors.textSecondary },
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
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  disclosureRow: { paddingVertical: spacing.sm },
  disclosureText: { ...typography.captionStrong, color: colors.accent },
});
