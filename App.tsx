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
import { useAuth } from "./src/store/auth";
import { LoginScreen } from "./src/screens/LoginScreen";
import { OrdersScreen } from "./src/screens/OrdersScreen";
import { ShiftScreen } from "./src/screens/ShiftScreen";
import { getActiveDeliveryOrderId } from "./src/store/orders";

type Tab = "orders" | "shift";

export default function App() {
  const { session, profile, loading } = useAuth();
  const [tab, setTab] = useState<Tab>("orders");

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );

  if (!session) return <LoginScreen />;

  if (!profile?.restaurant_id)
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>
          Your account isn't linked to a restaurant yet. Ask your manager to set it up.
        </Text>
      </View>
    );

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="dark" />
      <View style={styles.body}>
        {tab === "orders" ? (
          <OrdersScreen profile={profile} />
        ) : (
          <ShiftScreen profile={profile} getActiveOrderId={getActiveDeliveryOrderId} />
        )}
      </View>
      <View style={styles.tabbar}>
        <TabButton label="Orders" active={tab === "orders"} onPress={() => setTab("orders")} />
        <TabButton label="Shift" active={tab === "shift"} onPress={() => setTab("shift")} />
      </View>
    </SafeAreaView>
  );
}

function TabButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.tab} onPress={onPress}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f3f4f6" },
  body: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: "#f3f4f6" },
  muted: { color: "#6b7280", textAlign: "center" },
  tabbar: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "#e5e7eb", backgroundColor: "#fff" },
  tab: { flex: 1, paddingVertical: 14, alignItems: "center" },
  tabText: { color: "#9ca3af", fontWeight: "600" },
  tabTextActive: { color: "#111" },
});
