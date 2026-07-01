import { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";
import { supabase } from "../lib/supabase";
import { advanceOrder, type OrderRow } from "../store/orders";
import { StatusBadge } from "../components/StatusBadge";
import { toast } from "../components/Toast";
import { colors, radius, shadow } from "../theme";
import { NEXT, typeIcon, typeLabel, callCustomer, openMaps } from "../lib/orderFlow";
import { success } from "../lib/haptics";
import { createSimSign, issueReceipt } from "../lib/fiscal";
import { SplitBillSheet } from "./SplitBillSheet";
import type { Profile } from "../lib/supabase";

const ADVANCE_TOAST: Record<string, string> = {
  out_for_delivery: "On the way 🛵",
  delivered: "Order delivered ✓",
  served: "Order served ✓",
};

interface Item {
  id: string;
  name: string;
  quantity: number;
  unit_price: number;
  notes: string | null;
  selected_options: { option: string }[] | null;
}

export function OrderDetail({
  order,
  profile,
  shiftId,
  onClose,
}: {
  order: OrderRow;
  profile: Profile;
  shiftId: string | null;
  onClose: () => void;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [splitOpen, setSplitOpen] = useState(false);
  const next = NEXT[order.status];
  const hasGeo = order.delivery_lat != null && order.delivery_lng != null;
  const fiscalIssued = order.fiscal_status === "issued";

  // In-person card via the simultaneous flow. The SoftPOS card tap is the pending
  // integration point (Viva/other acquirer SDK) — it must return the POS result
  // that completes sendSimInvoice.
  const tapToPay = async () => {
    setBusy(true);
    try {
      await createSimSign(order.id, Number(order.total));
      Alert.alert(
        "Card tap",
        "Provider signature obtained. Presenting the card requires the SoftPOS SDK (integration pending). Once wired, its result completes the fiscal receipt.",
      );
      // TODO: const pos = await SoftPOS.tap({ amount: order.total, signature });
      //       await sendSimInvoice(order.id, pos); success(); toast("Paid + receipt issued");
    } catch (e) {
      Alert.alert("Tap to Pay failed", String(e));
    } finally {
      setBusy(false);
    }
  };

  const issueCashReceipt = async () => {
    setBusy(true);
    try {
      await issueReceipt(order.id);
      success();
      Alert.alert("Receipt issued", "myDATA receipt issued for this order.");
    } catch (e) {
      Alert.alert("Could not issue receipt", String(e));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    supabase
      .from("order_items")
      .select("id, name, quantity, unit_price, notes, selected_options")
      .eq("order_id", order.id)
      .then(({ data }) => {
        setItems((data ?? []) as Item[]);
        setLoading(false);
      });
  }, [order.id]);

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.sheet}>
        <View style={styles.handleRow}>
          <Text style={styles.title}>Order #{order.order_number}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={26} color={colors.inkSoft} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          <View style={styles.metaRow}>
            <View style={styles.typeChip}>
              <Ionicons name={typeIcon[order.type] ?? "receipt"} size={15} color={colors.inkSoft} />
              <Text style={styles.typeText}>{typeLabel[order.type] ?? order.type}</Text>
            </View>
            <StatusBadge status={order.status} />
          </View>

          {/* Map preview for deliveries */}
          {order.type === "delivery" && hasGeo && (
            <View style={styles.mapWrap}>
              <MapView
                provider={PROVIDER_DEFAULT}
                style={styles.map}
                pointerEvents="none"
                initialRegion={{
                  latitude: order.delivery_lat as number,
                  longitude: order.delivery_lng as number,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
              >
                <Marker
                  coordinate={{
                    latitude: order.delivery_lat as number,
                    longitude: order.delivery_lng as number,
                  }}
                />
              </MapView>
            </View>
          )}

          {/* Customer / address */}
          <View style={styles.card}>
            {order.type === "dine_in" && !!order.restaurant_tables?.label && (
              <Row icon="grid-outline" text={`Table ${order.restaurant_tables.label}`} />
            )}
            {!!order.customer_name && <Row icon="person-outline" text={order.customer_name} />}
            {!!order.customer_phone && <Row icon="call-outline" text={order.customer_phone} />}
            {!!order.delivery_address && <Row icon="location-outline" text={order.delivery_address} />}
            {!!order.notes && <Row icon="chatbox-outline" text={order.notes} />}
          </View>

          {/* Quick actions */}
          {(!!order.customer_phone || !!order.delivery_address) && (
            <View style={styles.quickRow}>
              {!!order.customer_phone && (
                <TouchableOpacity style={styles.quickBtn} onPress={() => callCustomer(order.customer_phone!)}>
                  <Ionicons name="call" size={17} color={colors.ink} />
                  <Text style={styles.quickText}>Call</Text>
                </TouchableOpacity>
              )}
              {!!order.delivery_address && (
                <TouchableOpacity style={styles.quickBtn} onPress={() => openMaps(order.delivery_address!)}>
                  <Ionicons name="navigate" size={17} color={colors.ink} />
                  <Text style={styles.quickText}>Navigate</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Items */}
          <Text style={styles.section}>Items</Text>
          <View style={styles.card}>
            {loading ? (
              <ActivityIndicator color={colors.accent} />
            ) : (
              items.map((it) => (
                <View key={it.id} style={styles.itemRow}>
                  <Text style={styles.qty}>{it.quantity}×</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName}>{it.name}</Text>
                    {!!it.selected_options?.length && (
                      <Text style={styles.itemOpts}>{it.selected_options.map((o) => o.option).join(", ")}</Text>
                    )}
                    {!!it.notes && <Text style={styles.itemNote}>“{it.notes}”</Text>}
                  </View>
                  <Text style={styles.itemPrice}>€{(it.unit_price * it.quantity).toFixed(2)}</Text>
                </View>
              ))
            )}
            <View style={styles.totalRow}>
              <View style={styles.payChip}>
                <Ionicons
                  name={order.payment_method === "cash" ? "cash-outline" : "card-outline"}
                  size={15}
                  color={colors.muted}
                />
                <Text style={styles.payText}>{order.payment_method === "cash" ? "Cash" : "Card"}</Text>
              </View>
              <Text style={styles.total}>€{Number(order.total).toFixed(2)}</Text>
            </View>
          </View>

          {/* Settle / split bill */}
          <TouchableOpacity style={styles.settleBtn} onPress={() => setSplitOpen(true)}>
            <Ionicons name="wallet-outline" size={18} color={colors.ink} />
            <Text style={styles.settleText}>Split / settle bill</Text>
          </TouchableOpacity>

          {/* Fiscal (myDATA) */}
          <Text style={styles.section}>Receipt</Text>
          <View style={styles.card}>
            <View style={styles.fiscalRow}>
              <Ionicons
                name={fiscalIssued ? "receipt" : "receipt-outline"}
                size={18}
                color={fiscalIssued ? colors.green : colors.muted}
              />
              <Text style={[styles.fiscalText, fiscalIssued && { color: colors.green }]}>
                {fiscalIssued
                  ? `Receipt issued${order.fiscal_mark ? ` · ${order.fiscal_mark}` : ""}`
                  : order.fiscal_status === "failed"
                    ? "Fiscal failed — retry"
                    : "No receipt yet"}
              </Text>
            </View>
            {!fiscalIssued && (
              <View style={styles.fiscalBtns}>
                {order.payment_method === "card" && (
                  <TouchableOpacity style={styles.tapBtn} onPress={tapToPay} disabled={busy}>
                    <Ionicons name="card" size={17} color="#fff" />
                    <Text style={styles.tapText}>Tap to Pay</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.issueBtn} onPress={issueCashReceipt} disabled={busy}>
                  <Text style={styles.issueText}>Issue receipt</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>

        {next && (
          <TouchableOpacity
            style={styles.action}
            onPress={async () => {
              success();
              await advanceOrder(order.id, next.status, shiftId);
              toast(ADVANCE_TOAST[next.status] ?? "Order updated");
              onClose();
            }}
            activeOpacity={0.85}
          >
            <Ionicons name={next.icon} size={19} color="#fff" />
            <Text style={styles.actionText}>{next.label}</Text>
          </TouchableOpacity>
        )}

        {splitOpen && (
          <SplitBillSheet
            profile={profile}
            orderId={order.id}
            orderNumber={order.order_number}
            total={Number(order.total)}
            onClose={() => setSplitOpen(false)}
          />
        )}
      </View>
    </Modal>
  );
}

function Row({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={16} color={colors.muted} />
      <Text style={styles.rowText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: colors.bg },
  handleRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8,
  },
  title: { fontSize: 20, fontWeight: "800", color: colors.ink },
  body: { padding: 16, paddingBottom: 8 },
  metaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  typeChip: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.line, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  typeText: { fontWeight: "700", color: colors.inkSoft, fontSize: 13 },
  mapWrap: { height: 160, borderRadius: radius.lg, overflow: "hidden", marginBottom: 12, ...shadow },
  map: { flex: 1 },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 16, marginBottom: 12, ...shadow },
  row: { flexDirection: "row", alignItems: "center", gap: 8, marginVertical: 4 },
  rowText: { color: colors.ink, fontSize: 15, flex: 1 },
  quickRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  quickBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: colors.card, borderRadius: radius.md, paddingVertical: 13, ...shadow },
  quickText: { fontWeight: "700", color: colors.ink, fontSize: 15 },
  section: { fontSize: 13, fontWeight: "700", color: colors.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  itemRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 6 },
  qty: { fontWeight: "800", color: colors.accent, fontSize: 15 },
  itemName: { color: colors.ink, fontSize: 15 },
  itemOpts: { color: colors.inkSoft, fontSize: 13, marginTop: 1 },
  itemNote: { color: colors.muted, fontSize: 13, fontStyle: "italic", marginTop: 1 },
  itemPrice: { color: colors.inkSoft, fontSize: 15 },
  totalRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.line },
  payChip: { flexDirection: "row", alignItems: "center", gap: 6 },
  payText: { color: colors.muted, fontWeight: "600" },
  total: { fontWeight: "800", fontSize: 18, color: colors.ink },
  action: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: colors.accent, margin: 16, borderRadius: radius.md, paddingVertical: 16,
  },
  actionText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  settleBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: colors.card, borderRadius: radius.md, paddingVertical: 13, marginTop: 12, ...shadow },
  settleText: { fontWeight: "700", color: colors.ink, fontSize: 15 },
  fiscalRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  fiscalText: { color: colors.inkSoft, fontSize: 14, flex: 1 },
  fiscalBtns: { flexDirection: "row", gap: 10, marginTop: 12 },
  tapBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: colors.brand, borderRadius: radius.md, paddingVertical: 12 },
  tapText: { color: "#fff", fontWeight: "700" },
  issueBtn: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg, borderRadius: radius.md, paddingVertical: 12 },
  issueText: { color: colors.ink, fontWeight: "700" },
});
