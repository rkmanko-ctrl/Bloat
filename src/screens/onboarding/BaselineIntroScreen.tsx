import React, { useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { Screen } from "../../components/Screen";
import { repository } from "../../lib/repository";
import { useOnboardingStore } from "../../state/onboardingStore";
import { colors, spacing, typography } from "../../theme";
import type { OnboardingStackParamList, RootStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<OnboardingStackParamList, "BaselineIntro">;

export function BaselineIntroScreen(_props: Props) {
  const rootNavigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { bloatTiming, frequency, symptomTypes, goals, reset } = useOnboardingStore();
  const [submitting, setSubmitting] = useState(false);

  const handleStart = async () => {
    setSubmitting(true);
    await repository.saveOnboarding({
      bloatTiming,
      frequency: frequency!,
      symptomTypes,
      goals,
    });
    await repository.startBaseline();
    reset();
    rootNavigation.reset({ index: 0, routes: [{ name: "Main" }] });
  };

  return (
    <Screen scroll={false}>
      <View style={styles.content}>
        <Text style={styles.title}>Great. Don't change your diet yet.</Text>
        <Card>
          <Text style={styles.body}>
            For the first few days, eat normally. We'll establish your baseline and look for patterns.
          </Text>
        </Card>
        <Text style={styles.note}>
          Removing foods now — before we know what's actually connected — makes it harder to tell what's really
          helping later.
        </Text>
      </View>
      <Button label="Start my baseline" onPress={handleStart} loading={submitting} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, justifyContent: "center", gap: spacing.lg },
  title: { ...typography.display, color: colors.textPrimary },
  body: { ...typography.body, color: colors.textPrimary },
  note: { ...typography.caption, color: colors.textTertiary },
});
