import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Profile, Order } from "../lib/supabase";
import { useMyOrders, advanceOrder } from "../store/orders";
import { StatusBadge } from "../components/StatusBadge";
import { colors, radius, shadow } from "../theme";

const NEXT: Record<string, { status: any; label: string; icon: keyof typeof Ionicons.glyphMap } | undefined> = {
  assigned: { status: "out_for_delivery", label: "Start delivery", icon: "navigate" },
  out_for_delivery: { status: "delivered", label: "Mark delivered", icon: "checkmark-circle" },
  ready: { status: "served", label: "Mark served", icon: "checkmark-circle" },
};

const typeIcon: Record<string, keyof typeof Ionicons.glyphMap> = {
  delivery: "bicycle",
  dine_in: "restaurant",
  pickup: "bag-handle",
};

export function OrdersScreen({ profile, shiftId }: { profile: Profile; shiftId: string | null }) {
  const { active, completed, loading, refresh } = useMyOrders(profile.id, profile.role);

  const renderOrder = (o: Order, actionable: boolean) => {
    const next = NEXT[o.status];
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.orderNoRow}>
            <Ionicons name={typeIcon[o.type] ?? "receipt"} size={18} color={colors.inkSoft} />
            <Text style={styles.orderNo}>#{o.order_number}</Text>
          </View>
          <StatusBadge status={o.status} />
        </View>

        {!!o.delivery_address && (
          <Row icon="location-outline" text={o.delivery_address} />
        )}
        {!!o.customer_name && (
          <Row icon="person-outline" text={`${o.customer_name}${o.customer_phone ? " · " + o.customer_phone : ""}`} />
        )}

        <View style={styles.cardFoot}>
          <View style={styles.payRow}>
            <Ionicons
              name={o.payment_method === "cash" ? "cash-outline" : "card-outline"}
              size={16}
              color={colors.muted}
            />
            <Text style={styles.payText}>{o.payment_method === "cash" ? "Cash" : "Card"}</Text>
          </View>
          <Text style={styles.total}>€{Number(o.total).toFixed(2)}</Text>
        </View>

        {actionable && next && (
          <TouchableOpacity
            style={styles.action}
            onPress={() => advanceOrder(o.id, next.status, shiftId)}
            activeOpacity={0.85}
          >
            <Ionicons name={next.icon} size={18} color="#fff" />
            <Text style={styles.actionText}>{next.label}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.content}
      refreshing={loading}
      onRefresh={refresh}
      data={active}
      keyExtractor={(o) => o.id}
      ListHeaderComponent={<Text style={styles.section}>Active · {active.length}</Text>}
      renderItem={({ item }) => renderOrder(item, true)}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons name="cafe-outline" size={40} color={colors.muted} />
          <Text style={styles.emptyText}>No active orders right now.</Text>
        </View>
      }
      ListFooterComponent={
        completed.length > 0 ? (
          <View>
            <Text style={[styles.section, { marginTop: 22 }]}>Completed · {completed.length}</Text>
            {completed.map((o) => (
              <View key={o.id} style={{ opacity: 0.7 }}>{renderOrder(o, false)}</View>
            ))}
          </View>
        ) : null
      }
    />
  );
}

function Row({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={15} color={colors.muted} />
      <Text style={styles.rowText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 16, paddingBottom: 24 },
  section: { fontSize: 13, fontWeight: "700", color: colors.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 16, marginBottom: 12, ...shadow },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  orderNoRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  orderNo: { fontWeight: "800", fontSize: 17, color: colors.ink },
  row: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 4 },
  rowText: { color: colors.inkSoft, fontSize: 14, flex: 1 },
  cardFoot: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.line,
  },
  payRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  payText: { color: colors.muted, fontSize: 14, fontWeight: "600" },
  total: { fontWeight: "800", fontSize: 17, color: colors.ink },
  action: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: 13, marginTop: 14,
  },
  actionText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  empty: { alignItems: "center", paddingVertical: 48, gap: 10 },
  emptyText: { color: colors.muted },
});
