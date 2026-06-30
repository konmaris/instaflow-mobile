import { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from "react-native";
import type { Profile } from "../lib/supabase";
import { supabase } from "../lib/supabase";
import type { useShift } from "../store/shift";
import { isTrackingAsync } from "../lib/tracking";

export function ShiftScreen({
  profile,
  shift: ctl,
}: {
  profile: Profile;
  shift: ReturnType<typeof useShift>;
}) {
  const { shift, loading, openShift, closeShift, refresh } = ctl;
  const [cash, setCash] = useState("0");
  const [tips, setTips] = useState(0);
  const [tracking, setTracking] = useState(false);

  // Reflect background GPS state.
  useEffect(() => {
    isTrackingAsync().then(setTracking);
  }, [shift]);

  // Pull this shift's card tips total for display.
  useEffect(() => {
    if (!shift) return;
    supabase
      .from("tips")
      .select("amount")
      .eq("shift_id", shift.id)
      .then(({ data }) => setTips((data ?? []).reduce((s, t) => s + Number(t.amount), 0)));
  }, [shift]);

  const doOpen = async () => {
    try {
      await openShift(Number(cash) || 0);
    } catch (e) {
      Alert.alert("Could not open shift", String(e));
    }
  };

  const doClose = async () => {
    try {
      await closeShift(Number(cash) || 0);
      Alert.alert("Shift closed", "Have a good rest!");
    } catch (e) {
      Alert.alert("Could not close shift", String(e));
    }
  };

  if (loading) return <View style={styles.container}><Text>Loading…</Text></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>Shift</Text>

      {!shift ? (
        <View style={styles.card}>
          <Text style={styles.label}>Opening cash (€)</Text>
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            value={cash}
            onChangeText={setCash}
          />
          <TouchableOpacity style={styles.primary} onPress={doOpen}>
            <Text style={styles.primaryText}>Start shift</Text>
          </TouchableOpacity>
          {profile.role === "rider" && (
            <Text style={styles.note}>Starting a shift enables GPS tracking.</Text>
          )}
        </View>
      ) : (
        <>
          <View style={styles.card}>
            <Text style={styles.status}>● On shift</Text>
            <Text style={styles.note}>
              Started {new Date(shift.started_at).toLocaleTimeString()}
            </Text>
            {profile.role === "rider" && (
              <Text style={styles.note}>
                GPS: {tracking ? "tracking" : "off"}
              </Text>
            )}
          </View>

          <View style={styles.statsRow}>
            <Stat label="Cash collected" value={`€${Number(shift.cash_collected).toFixed(2)}`} />
            <Stat label="Card" value={`€${Number(shift.card_collected).toFixed(2)}`} />
          </View>
          <View style={styles.statsRow}>
            <Stat label="Tips (card)" value={`€${tips.toFixed(2)}`} />
            <Stat label="Orders" value={String(shift.orders_count)} />
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Closing cash (€)</Text>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              value={cash}
              onChangeText={setCash}
            />
            <TouchableOpacity style={[styles.primary, { backgroundColor: "#dc2626" }]} onPress={doClose}>
              <Text style={styles.primaryText}>End shift</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
      <TouchableOpacity onPress={refresh} style={{ marginTop: 12 }}>
        <Text style={{ color: "#6b7280", textAlign: "center" }}>Refresh</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f4f6" },
  title: { fontSize: 22, fontWeight: "800", marginBottom: 12 },
  card: { backgroundColor: "#fff", borderRadius: 10, padding: 16, marginBottom: 12 },
  label: { color: "#6b7280", marginBottom: 6 },
  input: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8, padding: 12, fontSize: 18 },
  primary: { backgroundColor: "#111", borderRadius: 8, padding: 14, alignItems: "center", marginTop: 12 },
  primaryText: { color: "#fff", fontWeight: "600" },
  note: { color: "#9ca3af", marginTop: 8, fontSize: 12 },
  status: { color: "#16a34a", fontWeight: "700", fontSize: 16 },
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  stat: { flex: 1, backgroundColor: "#fff", borderRadius: 10, padding: 16 },
  statValue: { fontSize: 20, fontWeight: "700" },
  statLabel: { color: "#6b7280", fontSize: 12, marginTop: 2 },
});
