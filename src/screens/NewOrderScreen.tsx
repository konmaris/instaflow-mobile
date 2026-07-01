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
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Profile } from "../lib/supabase";
import {
  useTables,
  useCatalog,
  createDineInOrder,
  appendToOrder,
  findOpenOrderForTable,
  type NewLine,
  type Table,
  type Product,
} from "../store/catalog";
import { ModifierSheet } from "./ModifierSheet";
import { colors, radius, shadow } from "../theme";
import { tap, success } from "../lib/haptics";
import { toast } from "../components/Toast";

const uid = () => Math.random().toString(36).slice(2);

export function NewOrderScreen({ profile, shiftId }: { profile: Profile; shiftId: string | null }) {
  const restaurantId = profile.restaurant_id!;
  const { zones, tables, occupied, loading, refresh } = useTables(restaurantId);
  const { categories, products, modifiers, loading: menuLoading } = useCatalog(restaurantId);

  const [table, setTable] = useState<Table | null>(null);
  const [existing, setExisting] = useState<{ id: string; order_number: number } | null>(null);
  const [lines, setLines] = useState<NewLine[]>([]);
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [payment, setPayment] = useState<"cash" | "card">("cash");
  const [sheetProduct, setSheetProduct] = useState<Product | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const total = useMemo(() => lines.reduce((s, l) => s + l.unit_price * l.quantity, 0), [lines]);
  const count = lines.reduce((s, l) => s + l.quantity, 0);
  const simpleQty = (pid: string) =>
    lines.find((l) => l.product_id === pid && l.selected_options.length === 0 && !l.notes)?.quantity ?? 0;
  const prodQty = (pid: string) => lines.filter((l) => l.product_id === pid).reduce((s, l) => s + l.quantity, 0);

  const addSimple = (p: Product) => {
    tap();
    setLines((c) => {
      const ex = c.find((l) => l.product_id === p.id && l.selected_options.length === 0 && !l.notes);
      if (ex) return c.map((l) => (l === ex ? { ...l, quantity: l.quantity + 1 } : l));
      return [...c, { line_id: uid(), product_id: p.id, name: p.name, base_price: Number(p.price), unit_price: Number(p.price), quantity: 1, selected_options: [] }];
    });
  };
  const onAddProduct = (p: Product) => {
    if ((modifiers[p.id]?.length ?? 0) > 0) {
      tap();
      setSheetProduct(p);
    } else addSimple(p);
  };
  const incLine = (id: string) => setLines((c) => c.map((l) => (l.line_id === id ? { ...l, quantity: l.quantity + 1 } : l)));
  const decLine = (id: string) => setLines((c) => c.map((l) => (l.line_id === id ? { ...l, quantity: l.quantity - 1 } : l)).filter((l) => l.quantity > 0));
  const decSimple = (pid: string) => {
    tap();
    setLines((c) => c.map((l) => (l.product_id === pid && l.selected_options.length === 0 && !l.notes ? { ...l, quantity: l.quantity - 1 } : l)).filter((l) => l.quantity > 0));
  };

  const selectTable = async (t: Table) => {
    tap();
    setTable(t);
    setExisting(await findOpenOrderForTable(t.id));
  };

  const reset = () => {
    setTable(null);
    setExisting(null);
    setLines([]);
    setActiveCat(null);
    setCartOpen(false);
    refresh();
  };

  const send = async () => {
    if (!table || lines.length === 0) return;
    setSending(true);
    try {
      if (existing) {
        await appendToOrder(existing.id, lines);
        success();
        toast(`Added to #${existing.order_number} ✓`);
      } else {
        const num = await createDineInOrder({ restaurantId, waiterId: profile.id, tableId: table.id, shiftId, paymentMethod: payment, lines });
        success();
        toast(`Order #${num} sent 🍽`);
      }
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
                      <TouchableOpacity key={t.id} style={[styles.tableCard, busy && styles.tableBusy]} onPress={() => selectTable(t)} activeOpacity={0.85}>
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
          {existing && <Text style={styles.existTag}>+ #{existing.order_number}</Text>}
        </View>
        <TouchableOpacity onPress={reset} hitSlop={8}>
          <Text style={styles.change}>Change</Text>
        </TouchableOpacity>
      </View>
      {existing && <Text style={styles.existNote}>Adding to this table's open order #{existing.order_number}</Text>}

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
          contentContainerStyle={{ padding: 12 }}
          renderItem={({ item }) => {
            const hasMods = (modifiers[item.id]?.length ?? 0) > 0;
            const q = hasMods ? prodQty(item.id) : simpleQty(item.id);
            return (
              <View style={styles.prod}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.prodName}>{item.name}</Text>
                  <Text style={styles.prodPrice}>€{Number(item.price).toFixed(2)}{hasMods ? " · options" : ""}</Text>
                </View>
                {!hasMods && q > 0 ? (
                  <View style={styles.stepper}>
                    <TouchableOpacity onPress={() => decSimple(item.id)} style={styles.stepBtn}><Ionicons name="remove" size={18} color={colors.ink} /></TouchableOpacity>
                    <Text style={styles.qty}>{q}</Text>
                    <TouchableOpacity onPress={() => addSimple(item)} style={[styles.stepBtn, styles.stepAdd]}><Ionicons name="add" size={18} color="#fff" /></TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity onPress={() => onAddProduct(item)} style={styles.addBtn}>
                    {hasMods && q > 0 && <View style={styles.countDot}><Text style={styles.countText}>{q}</Text></View>}
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
        {!existing && (
          <View style={styles.payToggle}>
            {(["cash", "card"] as const).map((m) => (
              <TouchableOpacity key={m} onPress={() => setPayment(m)} style={[styles.payBtn, payment === m && styles.payOn]}>
                <Text style={[styles.payText, payment === m && { color: "#fff" }]}>{m === "cash" ? "Cash" : "Card"}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <View style={styles.footRow}>
          <TouchableOpacity style={styles.viewBtn} disabled={count === 0} onPress={() => setCartOpen(true)}>
            <Ionicons name="list" size={18} color={count === 0 ? colors.muted : colors.ink} />
            <Text style={[styles.viewText, count === 0 && { color: colors.muted }]}>{count}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.send, (count === 0 || sending) && { opacity: 0.5 }]} disabled={count === 0 || sending} onPress={send} activeOpacity={0.85}>
            {sending ? <ActivityIndicator color="#fff" /> : (
              <>
                <Ionicons name="send" size={16} color="#fff" />
                <Text style={styles.sendText}>{existing ? "Add to order" : "Send order"} · €{total.toFixed(2)}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {sheetProduct && (
        <ModifierSheet
          product={sheetProduct}
          groups={modifiers[sheetProduct.id] ?? []}
          onClose={() => setSheetProduct(null)}
          onAdd={(line) => {
            setLines((c) => [...c, line]);
            setSheetProduct(null);
          }}
        />
      )}

      <CartSheet
        open={cartOpen}
        lines={lines}
        total={total}
        onClose={() => setCartOpen(false)}
        onInc={incLine}
        onDec={decLine}
      />
    </View>
  );
}

function CartSheet({
  open, lines, total, onClose, onInc, onDec,
}: {
  open: boolean; lines: NewLine[]; total: number; onClose: () => void; onInc: (id: string) => void; onDec: (id: string) => void;
}) {
  return (
    <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.cartSheet}>
        <View style={styles.head}>
          <Text style={styles.title}>Order items</Text>
          <TouchableOpacity onPress={onClose} hitSlop={12}><Ionicons name="close" size={26} color={colors.inkSoft} /></TouchableOpacity>
        </View>
        <FlatList
          data={lines}
          keyExtractor={(l) => l.line_id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <View style={styles.cartLine}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cartName}>{item.name}</Text>
                {item.selected_options.length > 0 && (
                  <Text style={styles.cartOpts}>{item.selected_options.map((o) => o.option).join(", ")}</Text>
                )}
                {!!item.notes && <Text style={styles.cartNote}>“{item.notes}”</Text>}
                <Text style={styles.cartPrice}>€{(item.unit_price * item.quantity).toFixed(2)}</Text>
              </View>
              <View style={styles.stepper}>
                <TouchableOpacity onPress={() => onDec(item.line_id)} style={styles.stepBtn}><Ionicons name="remove" size={18} color={colors.ink} /></TouchableOpacity>
                <Text style={styles.qty}>{item.quantity}</Text>
                <TouchableOpacity onPress={() => onInc(item.line_id)} style={[styles.stepBtn, styles.stepAdd]}><Ionicons name="add" size={18} color="#fff" /></TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>No items yet.</Text>}
        />
        <View style={styles.cartFoot}>
          <Text style={styles.cartTotalLabel}>Total</Text>
          <Text style={styles.cartTotal}>€{total.toFixed(2)}</Text>
        </View>
      </View>
    </Modal>
  );
}

const Center = ({ children }: { children: React.ReactNode }) => <View style={styles.center}>{children}</View>;
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
  tableCard: { width: "22%", flexGrow: 1, aspectRatio: 1, maxWidth: "31%", backgroundColor: colors.card, borderRadius: radius.lg, alignItems: "center", justifyContent: "center", gap: 4, ...shadow },
  tableBusy: { borderWidth: 2, borderColor: colors.accent },
  tableLabel: { fontSize: 18, fontWeight: "800", color: colors.ink },
  seatRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  seatText: { color: colors.muted, fontSize: 12 },
  busyTag: { fontSize: 10, fontWeight: "700", color: colors.accent },

  builder: { flex: 1 },
  tableBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginHorizontal: 12, marginTop: 4, marginBottom: 4, backgroundColor: colors.card, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12, ...shadow },
  tableBarLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  tableBarText: { fontWeight: "800", fontSize: 16, color: colors.ink },
  existTag: { color: colors.accent, fontWeight: "800", fontSize: 12 },
  existNote: { color: colors.accent, fontSize: 12, marginHorizontal: 14, marginBottom: 6 },
  change: { color: colors.accent, fontWeight: "700" },

  chipRow: { flexGrow: 0, maxHeight: 44 },
  chip: { backgroundColor: colors.card, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, height: 36 },
  chipOn: { backgroundColor: colors.brand },
  chipText: { color: colors.inkSoft, fontWeight: "600", fontSize: 13 },

  prod: { flexDirection: "row", alignItems: "center", backgroundColor: colors.card, borderRadius: radius.md, padding: 14, marginBottom: 10, ...shadow },
  prodName: { fontWeight: "600", color: colors.ink, fontSize: 15 },
  prodPrice: { color: colors.muted, marginTop: 2 },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
  countDot: { position: "absolute", top: -6, right: -6, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center", paddingHorizontal: 4, zIndex: 1 },
  countText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  stepper: { flexDirection: "row", alignItems: "center", gap: 10 },
  stepBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },
  stepAdd: { backgroundColor: colors.accent },
  qty: { fontWeight: "800", fontSize: 16, color: colors.ink, minWidth: 18, textAlign: "center" },

  footer: { padding: 12, gap: 10, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.card },
  payToggle: { flexDirection: "row", gap: 8 },
  payBtn: { flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: radius.md, backgroundColor: colors.bg },
  payOn: { backgroundColor: colors.brand },
  payText: { fontWeight: "700", color: colors.inkSoft },
  footRow: { flexDirection: "row", gap: 10 },
  viewBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, borderRadius: radius.md, backgroundColor: colors.bg },
  viewText: { fontWeight: "800", color: colors.ink },
  send: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: 15 },
  sendText: { color: "#fff", fontWeight: "800", fontSize: 15 },

  cartSheet: { flex: 1, backgroundColor: colors.bg },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16 },
  title: { fontSize: 20, fontWeight: "800", color: colors.ink },
  cartLine: { flexDirection: "row", alignItems: "center", backgroundColor: colors.card, borderRadius: radius.md, padding: 14, marginBottom: 10, ...shadow },
  cartName: { fontWeight: "700", color: colors.ink, fontSize: 15 },
  cartOpts: { color: colors.inkSoft, fontSize: 13, marginTop: 2 },
  cartNote: { color: colors.muted, fontSize: 13, fontStyle: "italic", marginTop: 1 },
  cartPrice: { color: colors.inkSoft, marginTop: 4, fontWeight: "600" },
  cartFoot: { flexDirection: "row", justifyContent: "space-between", padding: 16, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.card },
  cartTotalLabel: { fontWeight: "700", color: colors.inkSoft, fontSize: 16 },
  cartTotal: { fontWeight: "800", color: colors.ink, fontSize: 18 },
});
