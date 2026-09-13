import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { OnboardingStackParamList } from "./types";
import { WelcomeScreen } from "../screens/onboarding/WelcomeScreen";
import { BloatTimingScreen } from "../screens/onboarding/BloatTimingScreen";
import { FrequencyScreen } from "../screens/onboarding/FrequencyScreen";
import { SymptomTypeScreen } from "../screens/onboarding/SymptomTypeScreen";
import { GoalsScreen } from "../screens/onboarding/GoalsScreen";
import { BaselineIntroScreen } from "../screens/onboarding/BaselineIntroScreen";

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export function OnboardingNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="BloatTiming" component={BloatTimingScreen} />
      <Stack.Screen name="Frequency" component={FrequencyScreen} />
      <Stack.Screen name="SymptomType" component={SymptomTypeScreen} />
      <Stack.Screen name="Goals" component={GoalsScreen} />
      <Stack.Screen name="BaselineIntro" component={BaselineIntroScreen} />
    </Stack.Navigator>
  );
}
