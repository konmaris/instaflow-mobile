import { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "./src/store/auth";
import { LoginScreen } from "./src/screens/LoginScreen";
import { OrdersScreen } from "./src/screens/OrdersScreen";
import { NewOrderScreen } from "./src/screens/NewOrderScreen";
import { ShiftScreen } from "./src/screens/ShiftScreen";
import { useShift } from "./src/store/shift";
import { useMyOrders } from "./src/store/orders";
import { ToastHost } from "./src/components/Toast";
import { colors, shadow } from "./src/theme";
import { tap } from "./src/lib/haptics";
import { supabase } from "./src/lib/supabase";

type Tab = "orders" | "new" | "shift";

const ALL_TABS: { key: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "orders", label: "Orders", icon: "receipt-outline" },
  { key: "new", label: "New", icon: "add-circle-outline" },
  { key: "shift", label: "Shift", icon: "time-outline" },
];

// Keep the native splash up until we've resolved the session, then fade out.
SplashScreen.preventAutoHideAsync().catch(() => {});
SplashScreen.setOptions?.({ duration: 400, fade: true });

export default function App() {
  return (
    <SafeAreaProvider>
      <AppInner />
    </SafeAreaProvider>
  );
}

function AppInner() {
  const insets = useSafeAreaInsets();
  const { session, profile, loading } = useAuth();
  const [tab, setTab] = useState<Tab>("orders");
  const shiftCtl = useShift({
    restaurantId: profile?.restaurant_id ?? null,
    staffId: profile?.id ?? null,
    role: profile?.role ?? null,
  });
  // Lifted here so the Orders tab can show a live active-order count badge.
  const orders = useMyOrders(profile?.id ?? null, profile?.role ?? null);

  // Hide the splash once auth has resolved (session known).
  useEffect(() => {
    if (!loading) SplashScreen.hideAsync().catch(() => {});
  }, [loading]);

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );

  if (!session) return <LoginScreen />;

  if (!profile?.restaurant_id)
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Ionicons name="business-outline" size={48} color={colors.muted} />
        <Text style={styles.emptyTitle}>No restaurant linked</Text>
        <Text style={styles.muted}>
          Ask your manager to add you to a restaurant, then sign in again.
        </Text>
        <TouchableOpacity style={styles.linkBtn} onPress={() => supabase.auth.signOut()}>
          <Text style={styles.linkText}>Sign out</Text>
        </TouchableOpacity>
      </View>
    );

  const onShift = !!shiftCtl.shift;
  const firstName = (profile.full_name ?? "").split(" ")[0] || "there";
  // Riders don't take orders; everyone else (waiter/manager/owner/admin) can.
  const canCreate = profile.role !== "rider";
  const tabs = ALL_TABS.filter((t) => t.key !== "new" || canCreate);
  const selectTab = (t: Tab) => {
    tap();
    setTab(t);
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View>
          <Text style={styles.hello}>Hi, {firstName}</Text>
          <Text style={styles.role}>{cap(profile.role)}</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.shiftPill, onShift ? styles.shiftOn : styles.shiftOff]}>
            <View style={[styles.dot, { backgroundColor: onShift ? colors.green : colors.muted }]} />
            <Text style={[styles.shiftPillText, { color: onShift ? colors.green : colors.muted }]}>
              {onShift ? "On shift" : "Off shift"}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.signOut}
            onPress={() => {
              tap();
              Alert.alert("Sign out?", "You'll need to sign in again.", [
                { text: "Cancel", style: "cancel" },
                { text: "Sign out", style: "destructive", onPress: () => supabase.auth.signOut() },
              ]);
            }}
            hitSlop={8}
          >
            <Ionicons name="log-out-outline" size={20} color={colors.inkSoft} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.body}>
        {tab === "orders" && (
          <OrdersScreen profile={profile} orders={orders} shiftId={shiftCtl.shift?.id ?? null} />
        )}
        {tab === "new" && canCreate && (
          <NewOrderScreen profile={profile} shiftId={shiftCtl.shift?.id ?? null} />
        )}
        {tab === "shift" && <ShiftScreen profile={profile} shift={shiftCtl} />}
      </View>

      {/* Tab bar — pads into the bottom safe area so it reaches the screen edge */}
      <View style={[styles.tabbar, { paddingBottom: insets.bottom + 10 }]}>
        {tabs.map((t) => {
          const activeTab = tab === t.key;
          const count = t.key === "orders" ? orders.active.length : 0;
          return (
            <TouchableOpacity key={t.key} style={styles.tab} onPress={() => selectTab(t.key)} activeOpacity={0.7}>
              <View>
                <Ionicons name={t.icon} size={24} color={activeTab ? colors.accent : colors.muted} />
                {count > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{count}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.tabText, { color: activeTab ? colors.accent : colors.muted }]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ToastHost />
    </View>
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
    paddingBottom: 12,
  },
  hello: { fontSize: 22, fontWeight: "800", color: colors.ink },
  role: { fontSize: 13, color: colors.muted, marginTop: 1 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  signOut: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: colors.card, ...shadow },
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
    paddingTop: 10,
    ...shadow,
  },
  tab: { flex: 1, alignItems: "center", gap: 3 },
  tabText: { fontSize: 11, fontWeight: "600" },
  badge: {
    position: "absolute", top: -5, right: -10, minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: colors.accent, alignItems: "center", justifyContent: "center", paddingHorizontal: 4,
  },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "800" },
});
