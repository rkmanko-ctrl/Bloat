import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import type { MainTabParamList } from "./types";
import { TodayScreen } from "../screens/today/TodayScreen";
import { PatternsScreen } from "../screens/patterns/PatternsScreen";
import { HistoryScreen } from "../screens/history/HistoryScreen";
import { colors } from "../theme";

const Tab = createBottomTabNavigator<MainTabParamList>();

export function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        // Deliberately no icons — three clearly-labeled text tabs read fine
        // at this scale, and skipping icons avoids the placeholder glyph
        // React Navigation renders when no tabBarIcon is supplied.
        tabBarIcon: () => null,
      }}
    >
      <Tab.Screen name="Today" component={TodayScreen} />
      <Tab.Screen name="Patterns" component={PatternsScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
    </Tab.Navigator>
  );
}
