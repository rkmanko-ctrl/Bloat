import React, { useEffect, useState } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, View } from "react-native";
import type { RootStackParamList } from "./types";
import { OnboardingNavigator } from "./OnboardingNavigator";
import { TabNavigator } from "./TabNavigator";
import { MealCaptureScreen } from "../screens/meal/MealCaptureScreen";
import { MealReviewScreen } from "../screens/meal/MealReviewScreen";
import { BloatCheckInScreen } from "../screens/symptom/BloatCheckInScreen";
import { SafetyFlowScreen } from "../screens/safety/SafetyFlowScreen";
import { PatternDetailScreen } from "../screens/patterns/PatternDetailScreen";
import { ExperimentStartScreen } from "../screens/experiments/ExperimentStartScreen";
import { ExperimentActiveScreen } from "../screens/experiments/ExperimentActiveScreen";
import { ExperimentResultScreen } from "../screens/experiments/ExperimentResultScreen";
import { ProfileScreen } from "../screens/profile/ProfileScreen";
import { PaywallScreen } from "../screens/paywall/PaywallScreen";
import { repository } from "../lib/repository";
import { colors } from "../theme";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const [initialRoute, setInitialRoute] = useState<"Onboarding" | "Main" | null>(null);

  useEffect(() => {
    repository.getProfile().then((profile) => {
      setInitialRoute(profile.onboarding && profile.baselineStartedAt ? "Main" : "Onboarding");
    });
  }, []);

  if (!initialRoute) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
      <Stack.Screen name="Main" component={TabNavigator} />
      <Stack.Group screenOptions={{ headerShown: true, headerBackTitle: "" }}>
        <Stack.Screen name="MealCapture" component={MealCaptureScreen} options={{ title: "Log a meal" }} />
        <Stack.Screen name="MealReview" component={MealReviewScreen} options={{ title: "Confirm meal" }} />
        <Stack.Screen name="BloatCheckIn" component={BloatCheckInScreen} options={{ title: "Log bloating" }} />
        <Stack.Screen name="SafetyFlow" component={SafetyFlowScreen} options={{ title: "" }} />
        <Stack.Screen name="PatternDetail" component={PatternDetailScreen} options={{ title: "Pattern" }} />
        <Stack.Screen name="ExperimentStart" component={ExperimentStartScreen} options={{ title: "New experiment" }} />
        <Stack.Screen name="ExperimentActive" component={ExperimentActiveScreen} options={{ title: "Experiment" }} />
        <Stack.Screen name="ExperimentResult" component={ExperimentResultScreen} options={{ title: "Results" }} />
        <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: "Profile" }} />
        <Stack.Screen name="Paywall" component={PaywallScreen} options={{ title: "Bloat Pro" }} />
      </Stack.Group>
    </Stack.Navigator>
  );
}
