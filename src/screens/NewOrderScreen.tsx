import { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Profile } from "../lib/supabase";
import { useTables, useCatalog, createDineInOrder, type NewLine, type Table } from "../store/catalog";
import { colors, radius, shadow } from "../theme";
import { tap, success } from "../lib/haptics";
import { toast } from "../components/Toast";

export function NewOrderScreen({ profile, shiftId }: { profile: Profile; shiftId: string | null }) {
  const restaurantId = profile.restaurant_id!;
  const { zones, tables, occupied, loading, refresh } = useTables(restaurantId);
  const { categories, products, loading: menuLoading } = useCatalog(restaurantId);

  const [table, setTable] = useState<Table | null>(null);
  const [cart, setCart] = useState<NewLine[]>([]);
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [payment, setPayment] = useState<"cash" | "card">("cash");
  const [sending, setSending] = useState(false);

  const total = useMemo(() => cart.reduce((s, l) => s + l.unit_price * l.quantity, 0), [cart]);
  const count = cart.reduce((s, l) => s + l.quantity, 0);
  const qtyOf = (id: string) => cart.find((l) => l.product_id === id)?.quantity ?? 0;

  const add = (p: { id: string; name: string; price: number }) => {
    tap();
    setCart((c) => {
      const ex = c.find((l) => l.product_id === p.id);
      if (ex) return c.map((l) => (l.product_id === p.id ? { ...l, quantity: l.quantity + 1 } : l));
      return [...c, { product_id: p.id, name: p.name, unit_price: Number(p.price), quantity: 1 }];
    });
  };
  const dec = (id: string) => {
    tap();
    setCart((c) => c.map((l) => (l.product_id === id ? { ...l, quantity: l.quantity - 1 } : l)).filter((l) => l.quantity > 0));
  };

  const reset = () => {
    setTable(null);
    setCart([]);
    setActiveCat(null);
    refresh();
  };

  const send = async () => {
    if (!table || cart.length === 0) return;
    setSending(true);
    try {
      const num = await createDineInOrder({
        restaurantId,
        waiterId: profile.id,
        tableId: table.id,
        shiftId,
        paymentMethod: payment,
        lines: cart,
      });
      success();
      toast(`Order #${num} sent 🍽`);
      reset();
    } catch (e) {
      Alert.alert("Could not send order", String(e));
    } finally {
      setSending(false);
    }
  };

  // ---- Phase 1: table picker ----
  if (!table) {
    if (loading) return <Center><ActivityIndicator color={colors.accent} /></Center>;
    if (tables.length === 0)
      return (
        <Center>
          <Ionicons name="grid-outline" size={40} color={colors.muted} />
          <Text style={styles.emptyText}>No tables set up yet.</Text>
        </Center>
      );

    const grouped = zones.length
      ? zones.map((z) => ({ zone: z.name, list: tables.filter((t) => t.zone_id === z.id) }))
      : [{ zone: "", list: tables }];
    const noZone = tables.filter((t) => !t.zone_id && zones.length);
    if (noZone.length) grouped.push({ zone: "Other", list: noZone });

    return (
      <ScrollView contentContainerStyle={styles.pickerContent}>
        <Text style={styles.h1}>Pick a table</Text>
        {grouped.map(
          (g) =>
            g.list.length > 0 && (
              <View key={g.zone || "all"} style={{ marginBottom: 18 }}>
                {!!g.zone && <Text style={styles.zoneLabel}>{g.zone}</Text>}
                <View style={styles.tableGrid}>
                  {g.list.map((t) => {
                    const busy = occupied.has(t.id);
                    return (
                      <TouchableOpacity
                        key={t.id}
                        style={[styles.tableCard, busy && styles.tableBusy]}
                        onPress={() => {
                          tap();
                          setTable(t);
                        }}
                        activeOpacity={0.85}
                      >
                        <Text style={[styles.tableLabel, busy && { color: colors.accent }]}>{t.label}</Text>
                        <View style={styles.seatRow}>
                          <Ionicons name="people-outline" size={13} color={colors.muted} />
                          <Text style={styles.seatText}>{t.seats}</Text>
                        </View>
                        {busy && <Text style={styles.busyTag}>Active</Text>}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ),
        )}
      </ScrollView>
    );
  }

  // ---- Phase 2: build the order ----
  const visible = activeCat ? products.filter((p) => p.category_id === activeCat) : products;

  return (
    <View style={styles.builder}>
      <View style={styles.tableBar}>
        <View style={styles.tableBarLeft}>
          <Ionicons name="grid" size={18} color={colors.accent} />
          <Text style={styles.tableBarText}>Table {table.label}</Text>
        </View>
        <TouchableOpacity onPress={() => setTable(null)} hitSlop={8}>
          <Text style={styles.change}>Change</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow} contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}>
        <Chip active={!activeCat} onPress={() => setActiveCat(null)}>All</Chip>
        {categories.map((c) => (
          <Chip key={c.id} active={activeCat === c.id} onPress={() => setActiveCat(c.id)}>{c.name}</Chip>
        ))}
      </ScrollView>

      {menuLoading ? (
        <Center><ActivityIndicator color={colors.accent} /></Center>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ padding: 12, paddingBottom: 12 }}
          renderItem={({ item }) => {
            const q = qtyOf(item.id);
            return (
              <View style={styles.prod}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.prodName}>{item.name}</Text>
                  <Text style={styles.prodPrice}>€{Number(item.price).toFixed(2)}</Text>
                </View>
                {q > 0 ? (
                  <View style={styles.stepper}>
                    <TouchableOpacity onPress={() => dec(item.id)} style={styles.stepBtn}>
                      <Ionicons name="remove" size={18} color={colors.ink} />
                    </TouchableOpacity>
                    <Text style={styles.qty}>{q}</Text>
                    <TouchableOpacity onPress={() => add(item)} style={[styles.stepBtn, styles.stepAdd]}>
                      <Ionicons name="add" size={18} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity onPress={() => add(item)} style={styles.addBtn}>
                    <Ionicons name="add" size={20} color="#fff" />
                  </TouchableOpacity>
                )}
              </View>
            );
          }}
          ListEmptyComponent={<Text style={styles.emptyText}>No products.</Text>}
        />
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.payToggle}>
          {(["cash", "card"] as const).map((m) => (
            <TouchableOpacity
              key={m}
              onPress={() => setPayment(m)}
              style={[styles.payBtn, payment === m && styles.payOn]}
            >
              <Text style={[styles.payText, payment === m && { color: "#fff" }]}>{m === "cash" ? "Cash" : "Card"}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          style={[styles.send, (count === 0 || sending) && { opacity: 0.5 }]}
          disabled={count === 0 || sending}
          onPress={send}
          activeOpacity={0.85}
        >
          {sending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="send" size={17} color="#fff" />
              <Text style={styles.sendText}>Send order · {count} · €{total.toFixed(2)}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const Center = ({ children }: { children: React.ReactNode }) => (
  <View style={styles.center}>{children}</View>
);

function Chip({ active, onPress, children }: { active: boolean; onPress: () => void; children: React.ReactNode }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.chip, active && styles.chipOn]}>
      <Text style={[styles.chipText, active && { color: "#fff" }]}>{children}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 24 },
  emptyText: { color: colors.muted },

  pickerContent: { padding: 16 },
  h1: { fontSize: 20, fontWeight: "800", color: colors.ink, marginBottom: 14 },
  zoneLabel: { fontSize: 12, fontWeight: "700", color: colors.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  tableGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tableCard: {
    width: "22%", flexGrow: 1, aspectRatio: 1, maxWidth: "31%",
    backgroundColor: colors.card, borderRadius: radius.lg, alignItems: "center", justifyContent: "center", gap: 4, ...shadow,
  },
  tableBusy: { borderWidth: 2, borderColor: colors.accent },
  tableLabel: { fontSize: 18, fontWeight: "800", color: colors.ink },
  seatRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  seatText: { color: colors.muted, fontSize: 12 },
  busyTag: { fontSize: 10, fontWeight: "700", color: colors.accent },

  builder: { flex: 1 },
  tableBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginHorizontal: 12, marginTop: 4, marginBottom: 8, backgroundColor: colors.card,
    borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12, ...shadow,
  },
  tableBarLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  tableBarText: { fontWeight: "800", fontSize: 16, color: colors.ink },
  change: { color: colors.accent, fontWeight: "700" },

  chipRow: { flexGrow: 0, maxHeight: 44 },
  chip: { backgroundColor: colors.card, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, height: 36 },
  chipOn: { backgroundColor: colors.brand },
  chipText: { color: colors.inkSoft, fontWeight: "600", fontSize: 13 },

  prod: { flexDirection: "row", alignItems: "center", backgroundColor: colors.card, borderRadius: radius.md, padding: 14, marginBottom: 10, ...shadow },
  prodName: { fontWeight: "600", color: colors.ink, fontSize: 15 },
  prodPrice: { color: colors.muted, marginTop: 2 },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
  stepper: { flexDirection: "row", alignItems: "center", gap: 10 },
  stepBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },
  stepAdd: { backgroundColor: colors.accent },
  qty: { fontWeight: "800", fontSize: 16, color: colors.ink, minWidth: 18, textAlign: "center" },

  footer: { padding: 12, gap: 10, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.card },
  payToggle: { flexDirection: "row", gap: 8 },
  payBtn: { flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: radius.md, backgroundColor: colors.bg },
  payOn: { backgroundColor: colors.brand },
  payText: { fontWeight: "700", color: colors.inkSoft },
  send: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: 15 },
  sendText: { color: "#fff", fontWeight: "800", fontSize: 16 },
});
