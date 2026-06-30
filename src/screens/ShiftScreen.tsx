import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Profile } from "../lib/supabase";
import { supabase } from "../lib/supabase";
import type { useShift } from "../store/shift";
import { isTrackingAsync } from "../lib/tracking";
import { colors, radius, shadow } from "../theme";
import { success, warn } from "../lib/haptics";

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
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    isTrackingAsync().then(setTracking);
  }, [shift]);

  useEffect(() => {
    if (!shift) return;
    supabase
      .from("tips")
      .select("amount")
      .eq("shift_id", shift.id)
      .then(({ data }) => setTips((data ?? []).reduce((s, t) => s + Number(t.amount), 0)));
  }, [shift]);

  const doOpen = async () => {
    setBusy(true);
    try {
      await openShift(Number(cash) || 0);
      success();
    } catch (e) {
      Alert.alert("Could not start shift", String(e));
    } finally {
      setBusy(false);
    }
  };

  const doClose = async () => {
    setBusy(true);
    try {
      await closeShift(Number(cash) || 0);
      warn();
      Alert.alert("Shift closed", "Nice work today!");
    } catch (e) {
      Alert.alert("Could not end shift", String(e));
    } finally {
      setBusy(false);
    }
  };

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {!shift ? (
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="power" size={30} color={colors.accent} />
          </View>
          <Text style={styles.heroTitle}>Start your shift</Text>
          <Text style={styles.heroSub}>
            {profile.role === "rider"
              ? "GPS sharing turns on so customers can track deliveries."
              : "Track your orders and balances for the shift."}
          </Text>

          <Text style={styles.label}>Opening cash (€)</Text>
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            value={cash}
            onChangeText={setCash}
            placeholderTextColor={colors.muted}
          />
          <TouchableOpacity style={styles.primary} onPress={doOpen} disabled={busy} activeOpacity={0.85}>
            {busy ? <ActivityIndicator color="#fff" /> : (
              <>
                <Ionicons name="play" size={18} color="#fff" />
                <Text style={styles.primaryText}>Start shift</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.banner}>
            <View style={styles.bannerLeft}>
              <View style={styles.liveDot} />
              <View>
                <Text style={styles.bannerTitle}>You're on shift</Text>
                <Text style={styles.bannerSub}>
                  Since {new Date(shift.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </Text>
              </View>
            </View>
            {profile.role === "rider" && (
              <View style={styles.gpsPill}>
                <Ionicons name="location" size={14} color={tracking ? colors.green : colors.muted} />
                <Text style={[styles.gpsText, { color: tracking ? colors.green : colors.muted }]}>
                  {tracking ? "GPS on" : "GPS off"}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.statGrid}>
            <Stat icon="cash-outline" tint={colors.green} label="Cash collected" value={`€${num(shift.cash_collected)}`} />
            <Stat icon="card-outline" tint={colors.blue} label="Card" value={`€${num(shift.card_collected)}`} />
            <Stat icon="happy-outline" tint={colors.accent} label="Tips (card)" value={`€${tips.toFixed(2)}`} />
            <Stat icon="bag-check-outline" tint={colors.inkSoft} label="Orders" value={String(shift.orders_count)} />
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Closing cash (€)</Text>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              value={cash}
              onChangeText={setCash}
              placeholderTextColor={colors.muted}
            />
            <TouchableOpacity
              style={[styles.primary, { backgroundColor: colors.red }]}
              onPress={doClose}
              disabled={busy}
              activeOpacity={0.85}
            >
              {busy ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Ionicons name="stop" size={18} color="#fff" />
                  <Text style={styles.primaryText}>End shift</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}

      <TouchableOpacity onPress={refresh} style={styles.refresh}>
        <Ionicons name="refresh" size={15} color={colors.muted} />
        <Text style={styles.refreshText}>Refresh</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const num = (n: number | null) => Number(n ?? 0).toFixed(2);

function Stat({
  icon,
  tint,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={20} color={tint} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  hero: { backgroundColor: colors.card, borderRadius: radius.xl, padding: 24, alignItems: "center", ...shadow },
  heroIcon: {
    width: 64, height: 64, borderRadius: 20, backgroundColor: colors.accentSoft,
    alignItems: "center", justifyContent: "center", marginBottom: 14,
  },
  heroTitle: { fontSize: 20, fontWeight: "800", color: colors.ink },
  heroSub: { color: colors.inkSoft, textAlign: "center", marginTop: 6, marginBottom: 18 },

  banner: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: colors.card, borderRadius: radius.lg, padding: 16, marginBottom: 14, ...shadow,
  },
  bannerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  liveDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.green },
  bannerTitle: { fontWeight: "800", color: colors.ink, fontSize: 16 },
  bannerSub: { color: colors.muted, fontSize: 13, marginTop: 1 },
  gpsPill: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: colors.bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  gpsText: { fontSize: 12, fontWeight: "700" },

  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 14 },
  stat: {
    width: "47%", flexGrow: 1, backgroundColor: colors.card, borderRadius: radius.lg, padding: 16, gap: 6, ...shadow,
  },
  statValue: { fontSize: 22, fontWeight: "800", color: colors.ink },
  statLabel: { color: colors.muted, fontSize: 12 },

  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 16, ...shadow },
  label: { color: colors.inkSoft, fontWeight: "600", marginBottom: 8 },
  input: {
    backgroundColor: colors.bg, borderRadius: radius.md, padding: 14, fontSize: 18,
    color: colors.ink, marginBottom: 12,
  },
  primary: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: colors.brand, borderRadius: radius.md, padding: 15,
  },
  primaryText: { color: "#fff", fontWeight: "700", fontSize: 16 },

  refresh: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 16 },
  refreshText: { color: colors.muted },
});
