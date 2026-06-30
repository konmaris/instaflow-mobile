import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";
import { colors, radius, shadow } from "../theme";

export function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    setBusy(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.logoWrap}>
        <View style={styles.logoBadge}>
          <Ionicons name="bicycle" size={34} color="#fff" />
        </View>
        <Text style={styles.brand}>
          Insta<Text style={{ color: colors.accent }}>flow</Text>
        </Text>
        <Text style={styles.subtitle}>Rider & waiter app</Text>
      </View>

      <View style={styles.card}>
        <Field icon="mail-outline">
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
        </Field>
        <Field icon="lock-closed-outline">
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={colors.muted}
            secureTextEntry={!show}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity onPress={() => setShow((s) => !s)} hitSlop={10}>
            <Ionicons name={show ? "eye-off-outline" : "eye-outline"} size={20} color={colors.muted} />
          </TouchableOpacity>
        </Field>

        {error && (
          <View style={styles.errorRow}>
            <Ionicons name="alert-circle" size={16} color={colors.red} />
            <Text style={styles.error}>{error}</Text>
          </View>
        )}

        <TouchableOpacity style={styles.button} onPress={submit} disabled={busy} activeOpacity={0.85}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign in</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function Field({ icon, children }: { icon: keyof typeof Ionicons.glyphMap; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Ionicons name={icon} size={20} color={colors.muted} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: colors.bg },
  logoWrap: { alignItems: "center", marginBottom: 28 },
  logoBadge: {
    width: 72, height: 72, borderRadius: 22, backgroundColor: colors.brand,
    alignItems: "center", justifyContent: "center", marginBottom: 14, ...shadow,
  },
  brand: { fontSize: 30, fontWeight: "800", color: colors.ink },
  subtitle: { color: colors.muted, marginTop: 2 },
  card: { backgroundColor: colors.card, borderRadius: radius.xl, padding: 20, gap: 12, ...shadow },
  field: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: colors.bg, borderRadius: radius.md, paddingHorizontal: 14,
  },
  input: { flex: 1, paddingVertical: 14, fontSize: 16, color: colors.ink },
  button: {
    backgroundColor: colors.accent, borderRadius: radius.md, padding: 16,
    alignItems: "center", marginTop: 4,
  },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  errorRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  error: { color: colors.red, flex: 1 },
});
