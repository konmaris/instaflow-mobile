import * as Haptics from "expo-haptics";

// Thin wrappers so screens don't import expo-haptics directly everywhere.
export const tap = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
export const success = () =>
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
export const warn = () =>
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
