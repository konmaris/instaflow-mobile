import { useEffect, useRef } from "react";
import { Animated, View, StyleSheet } from "react-native";
import { colors, radius, shadow } from "../theme";

/** Pulsing placeholder cards shown while orders load. */
export function OrdersSkeleton() {
  const pulse = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    ).start();
  }, [pulse]);

  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 4 }}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={styles.card}>
          <Animated.View style={[styles.line, { width: "40%", opacity: pulse }]} />
          <Animated.View style={[styles.line, { width: "75%", opacity: pulse }]} />
          <Animated.View style={[styles.line, { width: "55%", opacity: pulse }]} />
          <Animated.View style={[styles.block, { opacity: pulse }]} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 16, marginBottom: 12, gap: 10, ...shadow },
  line: { height: 12, borderRadius: 6, backgroundColor: colors.line },
  block: { height: 40, borderRadius: radius.md, backgroundColor: colors.line, marginTop: 4 },
});
