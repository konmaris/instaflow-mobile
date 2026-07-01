import { useState } from "react";
import { Modal, View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ModGroup, Product, NewLine } from "../store/catalog";
import { colors, radius } from "../theme";

const uid = () => Math.random().toString(36).slice(2);

export function ModifierSheet({
  product,
  groups,
  onClose,
  onAdd,
}: {
  product: Product;
  groups: ModGroup[];
  onClose: () => void;
  onAdd: (line: NewLine) => void;
}) {
  // selections: groupId -> set of optionIds
  const [sel, setSel] = useState<Record<string, string[]>>({});
  const [notes, setNotes] = useState("");
  const [qty, setQty] = useState(1);

  const toggle = (g: ModGroup, optId: string) => {
    setSel((prev) => {
      const cur = prev[g.id] ?? [];
      if (g.max_select <= 1) return { ...prev, [g.id]: [optId] };
      if (cur.includes(optId)) return { ...prev, [g.id]: cur.filter((x) => x !== optId) };
      if (cur.length >= g.max_select) return prev; // at limit
      return { ...prev, [g.id]: [...cur, optId] };
    });
  };

  const unmet = groups.filter((g) => (sel[g.id]?.length ?? 0) < g.min_select);
  const deltas = groups.flatMap((g) =>
    (sel[g.id] ?? []).map((id) => g.options.find((o) => o.id === id)?.price_delta ?? 0),
  );
  const unit = Number(product.price) + deltas.reduce((a, b) => a + b, 0);

  const add = () => {
    if (unmet.length) return;
    const selected_options = groups.flatMap((g) =>
      (sel[g.id] ?? []).map((id) => {
        const o = g.options.find((x) => x.id === id)!;
        return { group: g.name, option: o.name, price_delta: o.price_delta };
      }),
    );
    onAdd({
      line_id: uid(),
      product_id: product.id,
      name: product.name,
      base_price: Number(product.price),
      unit_price: unit,
      quantity: qty,
      selected_options,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.sheet}>
        <View style={styles.head}>
          <Text style={styles.title}>{product.name}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={26} color={colors.inkSoft} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {groups.map((g) => (
            <View key={g.id} style={styles.group}>
              <View style={styles.groupHead}>
                <Text style={styles.groupName}>{g.name}</Text>
                <Text style={styles.groupHint}>
                  {g.min_select > 0 ? "Required" : "Optional"}
                  {g.max_select > 1 ? ` · up to ${g.max_select}` : ""}
                </Text>
              </View>
              {g.options.map((o) => {
                const on = (sel[g.id] ?? []).includes(o.id);
                return (
                  <TouchableOpacity key={o.id} style={styles.opt} onPress={() => toggle(g, o.id)} activeOpacity={0.7}>
                    <Ionicons
                      name={g.max_select <= 1 ? (on ? "radio-button-on" : "radio-button-off") : on ? "checkbox" : "square-outline"}
                      size={22}
                      color={on ? colors.accent : colors.muted}
                    />
                    <Text style={styles.optName}>{o.name}</Text>
                    {o.price_delta > 0 && <Text style={styles.optPrice}>+€{o.price_delta.toFixed(2)}</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}

          <Text style={styles.groupName}>Notes</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="e.g. no onions"
            placeholderTextColor={colors.muted}
            style={styles.notes}
            multiline
          />
        </ScrollView>

        <View style={styles.foot}>
          <View style={styles.stepper}>
            <TouchableOpacity onPress={() => setQty((q) => Math.max(1, q - 1))} style={styles.stepBtn}>
              <Ionicons name="remove" size={18} color={colors.ink} />
            </TouchableOpacity>
            <Text style={styles.qty}>{qty}</Text>
            <TouchableOpacity onPress={() => setQty((q) => q + 1)} style={[styles.stepBtn, { backgroundColor: colors.accent }]}>
              <Ionicons name="add" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={[styles.add, unmet.length > 0 && { opacity: 0.5 }]} disabled={unmet.length > 0} onPress={add}>
            <Text style={styles.addText}>
              {unmet.length ? `Choose ${unmet[0].name}` : `Add · €${(unit * qty).toFixed(2)}`}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: colors.bg },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16 },
  title: { fontSize: 20, fontWeight: "800", color: colors.ink },
  group: { marginBottom: 18 },
  groupHead: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginBottom: 6 },
  groupName: { fontSize: 15, fontWeight: "800", color: colors.ink },
  groupHint: { fontSize: 12, color: colors.muted },
  opt: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.card, borderRadius: radius.md, padding: 12, marginBottom: 8 },
  optName: { flex: 1, color: colors.ink, fontSize: 15 },
  optPrice: { color: colors.inkSoft, fontWeight: "600" },
  notes: { backgroundColor: colors.card, borderRadius: radius.md, padding: 12, minHeight: 60, marginTop: 8, color: colors.ink, textAlignVertical: "top" },
  foot: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.card },
  stepper: { flexDirection: "row", alignItems: "center", gap: 10 },
  stepBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },
  qty: { fontWeight: "800", fontSize: 16, minWidth: 18, textAlign: "center", color: colors.ink },
  add: { flex: 1, backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: 15, alignItems: "center" },
  addText: { color: "#fff", fontWeight: "800", fontSize: 16 },
});
