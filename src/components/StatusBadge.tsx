import { View, Text, StyleSheet } from "react-native";
import { colors, radius, statusStyle } from "../theme";

export function StatusBadge({ status }: { status: string }) {
  const s = statusStyle[status] ?? { fg: colors.inkSoft, bg: colors.line, label: status };
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <Text style={[styles.text, { color: s.fg }]}>{s.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start" },
  text: { fontSize: 12, fontWeight: "700" },
});
