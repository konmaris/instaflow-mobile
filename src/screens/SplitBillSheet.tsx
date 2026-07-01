import { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Profile } from "../lib/supabase";
import { usePayments, addPayment } from "../store/payments";
import { colors, radius, shadow } from "../theme";
import { success, tap } from "../lib/haptics";
import { toast } from "../components/Toast";

export function SplitBillSheet({
  profile,
  orderId,
  orderNumber,
  total,
  onClose,
}: {
  profile: Profile;
  orderId: string;
  orderNumber: number;
  total: number;
  onClose: () => void;
}) {
  const { payments, paid, remaining } = usePayments(orderId, total);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"cash" | "card">("cash");
  const [tip, setTip] = useState("");
  const [busy, setBusy] = useState(false);

  const amountNum = Number(amount) || 0;
  const settled = remaining <= 0;

  const setSplit = (n: number) => {
    tap();
    setAmount((Math.round((remaining / n) * 100) / 100).toFixed(2));
  };

  const record = async () => {
    const amt = amountNum > 0 ? amountNum : remaining;
    if (amt <= 0) return;
    setBusy(true);
    try {
      await addPayment({
        restaurantId: profile.restaurant_id!,
        orderId,
        amount: Math.min(amt, remaining || amt),
        method,
        tip: Number(tip) || 0,
        collectedBy: profile.id,
      });
      success();
      setAmount("");
      setTip("");
      if (Math.min(amt, remaining) >= remaining) toast("Bill settled ✓");
    } catch (e) {
      Alert.alert("Could not record payment", String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.sheet}>
        <View style={styles.head}>
          <Text style={styles.title}>Split bill · #{orderNumber}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={26} color={colors.inkSoft} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {/* Summary */}
          <View style={styles.summary}>
            <Sum label="Total" value={total} />
            <Sum label="Paid" value={paid} tint={colors.green} />
            <Sum label="Remaining" value={remaining} tint={remaining > 0 ? colors.accent : colors.green} big />
          </View>

          {settled ? (
            <View style={styles.done}>
              <Ionicons name="checkmark-circle" size={40} color={colors.green} />
              <Text style={styles.doneText}>Bill fully paid</Text>
            </View>
          ) : (
            <>
              {/* Split helpers */}
              <Text style={styles.section}>Split remaining equally</Text>
              <View style={styles.splitRow}>
                {[2, 3, 4, 5].map((n) => (
                  <TouchableOpacity key={n} style={styles.splitBtn} onPress={() => setSplit(n)}>
                    <Text style={styles.splitText}>/{n}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Add a payment */}
              <Text style={styles.section}>Add payment</Text>
              <View style={styles.card}>
                <View style={styles.amountRow}>
                  <Text style={styles.euro}>€</Text>
                  <TextInput
                    style={styles.amountInput}
                    keyboardType="decimal-pad"
                    placeholder={remaining.toFixed(2)}
                    placeholderTextColor={colors.muted}
                    value={amount}
                    onChangeText={setAmount}
                  />
                </View>
                <View style={styles.methodRow}>
                  {(["cash", "card"] as const).map((m) => (
                    <TouchableOpacity
                      key={m}
                      onPress={() => setMethod(m)}
                      style={[styles.methodBtn, method === m && styles.methodOn]}
                    >
                      <Ionicons
                        name={m === "cash" ? "cash-outline" : "card-outline"}
                        size={17}
                        color={method === m ? "#fff" : colors.inkSoft}
                      />
                      <Text style={[styles.methodText, method === m && { color: "#fff" }]}>
                        {m === "cash" ? "Cash" : "Card"}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {method === "card" && (
                  <View style={styles.amountRow}>
                    <Text style={styles.tipLabel}>Tip €</Text>
                    <TextInput
                      style={styles.tipInput}
                      keyboardType="decimal-pad"
                      placeholder="0.00"
                      placeholderTextColor={colors.muted}
                      value={tip}
                      onChangeText={setTip}
                    />
                  </View>
                )}
                <TouchableOpacity style={styles.record} onPress={record} disabled={busy}>
                  {busy ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.recordText}>
                      Record €{(amountNum > 0 ? Math.min(amountNum, remaining) : remaining).toFixed(2)} · {method}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Recorded payments */}
          {payments.length > 0 && (
            <>
              <Text style={styles.section}>Payments</Text>
              <View style={styles.card}>
                {payments.map((p) => (
                  <View key={p.id} style={styles.payRow}>
                    <Ionicons
                      name={p.method === "cash" ? "cash-outline" : "card-outline"}
                      size={16}
                      color={colors.muted}
                    />
                    <Text style={styles.payMethod}>{p.method}</Text>
                    {p.tip_amount > 0 && <Text style={styles.payTip}>+€{Number(p.tip_amount).toFixed(2)} tip</Text>}
                    <Text style={styles.payAmt}>€{Number(p.amount).toFixed(2)}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

function Sum({ label, value, tint, big }: { label: string; value: number; tint?: string; big?: boolean }) {
  return (
    <View style={styles.sumCell}>
      <Text style={styles.sumLabel}>{label}</Text>
      <Text style={[styles.sumValue, big && { fontSize: 22 }, tint ? { color: tint } : null]}>
        €{value.toFixed(2)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: colors.bg },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16 },
  title: { fontSize: 20, fontWeight: "800", color: colors.ink },
  summary: { flexDirection: "row", backgroundColor: colors.card, borderRadius: radius.lg, padding: 16, ...shadow },
  sumCell: { flex: 1, alignItems: "center" },
  sumLabel: { color: colors.muted, fontSize: 12 },
  sumValue: { fontWeight: "800", color: colors.ink, fontSize: 16, marginTop: 2 },
  section: { fontSize: 13, fontWeight: "700", color: colors.muted, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 20, marginBottom: 8 },
  splitRow: { flexDirection: "row", gap: 10 },
  splitBtn: { flex: 1, alignItems: "center", backgroundColor: colors.card, borderRadius: radius.md, paddingVertical: 14, ...shadow },
  splitText: { fontWeight: "800", color: colors.ink, fontSize: 16 },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 16, ...shadow },
  amountRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  euro: { fontSize: 26, fontWeight: "800", color: colors.ink },
  amountInput: { flex: 1, fontSize: 26, fontWeight: "800", color: colors.ink, paddingVertical: 4 },
  methodRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  methodBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: colors.bg, borderRadius: radius.md, paddingVertical: 12 },
  methodOn: { backgroundColor: colors.brand },
  methodText: { fontWeight: "700", color: colors.inkSoft },
  tipLabel: { color: colors.muted, fontWeight: "600" },
  tipInput: { flex: 1, fontSize: 16, color: colors.ink, paddingVertical: 8 },
  record: { backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: 15, alignItems: "center", marginTop: 12 },
  recordText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  payRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6 },
  payMethod: { color: colors.ink, textTransform: "capitalize", flex: 1 },
  payTip: { color: colors.muted, fontSize: 12 },
  payAmt: { fontWeight: "700", color: colors.ink },
  done: { alignItems: "center", gap: 8, paddingVertical: 28 },
  doneText: { fontWeight: "800", color: colors.green, fontSize: 16 },
});
