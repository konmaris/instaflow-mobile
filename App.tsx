import { useState } from "react";
import { StatusBar } from "expo-status-bar";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "./src/store/auth";
import { LoginScreen } from "./src/screens/LoginScreen";
import { OrdersScreen } from "./src/screens/OrdersScreen";
import { ShiftScreen } from "./src/screens/ShiftScreen";
import { useShift } from "./src/store/shift";
import { colors, shadow } from "./src/theme";
import { supabase } from "./src/lib/supabase";

type Tab = "orders" | "shift";

const TABS: { key: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "orders", label: "Orders", icon: "receipt-outline" },
  { key: "shift", label: "Shift", icon: "time-outline" },
];

export default function App() {
  const { session, profile, loading } = useAuth();
  const [tab, setTab] = useState<Tab>("orders");
  const shiftCtl = useShift({
    restaurantId: profile?.restaurant_id ?? null,
    staffId: profile?.id ?? null,
    role: profile?.role ?? null,
  });

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );

  if (!session) return <LoginScreen />;

  if (!profile?.restaurant_id)
    return (
      <SafeAreaView style={styles.center}>
        <Ionicons name="business-outline" size={48} color={colors.muted} />
        <Text style={styles.emptyTitle}>No restaurant linked</Text>
        <Text style={styles.muted}>
          Ask your manager to add you to a restaurant, then sign in again.
        </Text>
        <TouchableOpacity style={styles.linkBtn} onPress={() => supabase.auth.signOut()}>
          <Text style={styles.linkText}>Sign out</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );

  const onShift = !!shiftCtl.shift;
  const firstName = (profile.full_name ?? "").split(" ")[0] || "there";

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.hello}>Hi, {firstName}</Text>
          <Text style={styles.role}>{cap(profile.role)}</Text>
        </View>
        <View style={[styles.shiftPill, onShift ? styles.shiftOn : styles.shiftOff]}>
          <View style={[styles.dot, { backgroundColor: onShift ? colors.green : colors.muted }]} />
          <Text style={[styles.shiftPillText, { color: onShift ? colors.green : colors.muted }]}>
            {onShift ? "On shift" : "Off shift"}
          </Text>
        </View>
      </View>

      <View style={styles.body}>
        {tab === "orders" ? (
          <OrdersScreen profile={profile} shiftId={shiftCtl.shift?.id ?? null} />
        ) : (
          <ShiftScreen profile={profile} shift={shiftCtl} />
        )}
      </View>

      {/* Tab bar */}
      <View style={styles.tabbar}>
        {TABS.map((t) => {
          const activeTab = tab === t.key;
          return (
            <TouchableOpacity key={t.key} style={styles.tab} onPress={() => setTab(t.key)} activeOpacity={0.7}>
              <Ionicons
                name={t.icon}
                size={24}
                color={activeTab ? colors.accent : colors.muted}
              />
              <Text style={[styles.tabText, { color: activeTab ? colors.accent : colors.muted }]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: colors.bg, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: colors.ink, marginTop: 8 },
  muted: { color: colors.inkSoft, textAlign: "center" },
  linkBtn: { marginTop: 16, paddingHorizontal: 16, paddingVertical: 10 },
  linkText: { color: colors.accent, fontWeight: "600" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  hello: { fontSize: 22, fontWeight: "800", color: colors.ink },
  role: { fontSize: 13, color: colors.muted, marginTop: 1 },
  shiftPill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  shiftOn: { backgroundColor: colors.greenSoft },
  shiftOff: { backgroundColor: colors.line },
  dot: { width: 8, height: 8, borderRadius: 4 },
  shiftPillText: { fontSize: 13, fontWeight: "700" },

  tabbar: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 8,
    paddingBottom: 24,
    ...shadow,
  },
  tab: { flex: 1, alignItems: "center", gap: 2 },
  tabText: { fontSize: 11, fontWeight: "600" },
});
