import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import type { Profile, Order } from "../lib/supabase";
import { useMyOrders, advanceOrder } from "../store/orders";

const NEXT: Record<string, { status: any; label: string } | undefined> = {
  assigned: { status: "out_for_delivery", label: "Start delivery" },
  out_for_delivery: { status: "delivered", label: "Mark delivered" },
  ready: { status: "served", label: "Mark served" },
};

export function OrdersScreen({
  profile,
  shiftId,
}: {
  profile: Profile;
  shiftId: string | null;
}) {
  const { active, completed, loading, refresh } = useMyOrders(profile.id, profile.role);

  const renderOrder = (o: Order, actionable: boolean) => {
    const next = NEXT[o.status];
    return (
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.orderNo}>#{o.order_number}</Text>
          <Text style={styles.total}>€{Number(o.total).toFixed(2)}</Text>
        </View>
        <Text style={styles.meta}>
          {o.type} · {o.payment_method} · {o.status.replace(/_/g, " ")}
        </Text>
        {o.delivery_address ? <Text style={styles.addr}>{o.delivery_address}</Text> : null}
        {o.customer_name ? <Text style={styles.addr}>{o.customer_name} · {o.customer_phone}</Text> : null}
        {actionable && next && (
          <TouchableOpacity style={styles.action} onPress={() => advanceOrder(o.id, next.status, shiftId)}>
            <Text style={styles.actionText}>{next.label}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={{ padding: 16 }}
      refreshing={loading}
      onRefresh={refresh}
      data={active}
      keyExtractor={(o) => o.id}
      ListHeaderComponent={<Text style={styles.h}>Active ({active.length})</Text>}
      renderItem={({ item }) => renderOrder(item, true)}
      ListEmptyComponent={<Text style={styles.empty}>No active orders.</Text>}
      ListFooterComponent={
        <View>
          <Text style={[styles.h, { marginTop: 24 }]}>Completed ({completed.length})</Text>
          {completed.map((o) => (
            <View key={o.id}>{renderOrder(o, false)}</View>
          ))}
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: "#f3f4f6" },
  h: { fontSize: 16, fontWeight: "700", marginBottom: 8 },
  card: { backgroundColor: "#fff", borderRadius: 10, padding: 12, marginBottom: 10 },
  row: { flexDirection: "row", justifyContent: "space-between" },
  orderNo: { fontWeight: "700", fontSize: 16 },
  total: { fontWeight: "700" },
  meta: { color: "#6b7280", marginTop: 2, textTransform: "capitalize" },
  addr: { color: "#374151", marginTop: 4 },
  action: { backgroundColor: "#ff5722", borderRadius: 8, padding: 12, alignItems: "center", marginTop: 10 },
  actionText: { color: "#fff", fontWeight: "600" },
  empty: { color: "#9ca3af", textAlign: "center", paddingVertical: 16 },
});
