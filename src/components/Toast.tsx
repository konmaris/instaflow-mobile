import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { create } from "zustand";
import { colors, radius, shadow } from "../theme";

interface ToastState {
  message: string | null;
  icon: keyof typeof Ionicons.glyphMap;
  show: (message: string, icon?: keyof typeof Ionicons.glyphMap) => void;
  hide: () => void;
}

// Tiny global toast. Call toast("Order delivered") from anywhere.
export const useToastStore = create<ToastState>((set) => ({
  message: null,
  icon: "checkmark-circle",
  show: (message, icon = "checkmark-circle") => set({ message, icon }),
  hide: () => set({ message: null }),
}));

export const toast = (message: string, icon?: keyof typeof Ionicons.glyphMap) =>
  useToastStore.getState().show(message, icon);

/** Mount once near the app root. Animates in, auto-dismisses. */
export function ToastHost() {
  const { message, icon, hide } = useToastStore();
  const y = useRef(new Animated.Value(80)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!message) return;
    Animated.parallel([
      Animated.spring(y, { toValue: 0, useNativeDriver: true, bounciness: 8 }),
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
    const t = setTimeout(() => {
      Animated.parallel([
        Animated.timing(y, { toValue: 80, duration: 200, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(() => hide());
    }, 2200);
    return () => clearTimeout(t);
  }, [message, y, opacity, hide]);

  if (!message) return null;
  return (
    <Animated.View style={[styles.wrap, { opacity, transform: [{ translateY: y }] }]} pointerEvents="none">
      <View style={styles.toast}>
        <Ionicons name={icon} size={18} color={colors.green} />
        <Text style={styles.text}>{message}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 0, right: 0, bottom: 96, alignItems: "center" },
  toast: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: colors.ink, borderRadius: radius.pill,
    paddingHorizontal: 16, paddingVertical: 12, ...shadow,
  },
  text: { color: "#fff", fontWeight: "600", fontSize: 14 },
});
