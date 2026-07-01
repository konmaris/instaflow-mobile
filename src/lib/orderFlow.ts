import { Ionicons } from "@expo/vector-icons";
import { Linking, Platform } from "react-native";
import type { Database } from "./database.types";
import { tap } from "./haptics";

type OrderStatus = Database["public"]["Enums"]["order_status"];

/** The next action a rider/waiter can take from a given status. */
export const NEXT: Record<
  string,
  { status: OrderStatus; label: string; icon: keyof typeof Ionicons.glyphMap } | undefined
> = {
  assigned: { status: "out_for_delivery", label: "Start delivery", icon: "navigate" },
  out_for_delivery: { status: "delivered", label: "Mark delivered", icon: "checkmark-circle" },
  ready: { status: "served", label: "Mark served", icon: "checkmark-circle" },
};

export const typeIcon: Record<string, keyof typeof Ionicons.glyphMap> = {
  delivery: "bicycle",
  dine_in: "restaurant",
  pickup: "bag-handle",
};

export const typeLabel: Record<string, string> = {
  delivery: "Delivery",
  dine_in: "Dine-in",
  pickup: "Pickup",
};

export const callCustomer = (phone: string) => {
  tap();
  Linking.openURL(`tel:${phone.replace(/\s/g, "")}`);
};

export const openMaps = (address: string) => {
  tap();
  const q = encodeURIComponent(address);
  Linking.openURL(
    Platform.OS === "ios" ? `http://maps.apple.com/?daddr=${q}` : `geo:0,0?q=${q}`,
  );
};
