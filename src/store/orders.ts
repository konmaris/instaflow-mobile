import { useCallback, useEffect, useState } from "react";
import { supabase, type Order } from "../lib/supabase";
import type { Database } from "../lib/database.types";

type OrderStatus = Database["public"]["Enums"]["order_status"];

const DONE: OrderStatus[] = ["delivered", "served", "completed"];

// The order a rider is currently delivering, so GPS breadcrumbs can be tied to
// it. Read by the tracking loop via getActiveDeliveryOrderId().
let _activeDeliveryOrderId: string | null = null;
export function getActiveDeliveryOrderId() {
  return _activeDeliveryOrderId;
}

/**
 * Orders assigned to the signed-in rider/waiter. Splits into active vs completed
 * and live-updates via Realtime. `role` decides whether to match the rider or
 * waiter assignment column.
 */
export function useMyOrders(staffId: string | null, role: string | null) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const col = role === "rider" ? "assigned_rider_id" : "assigned_waiter_id";

  const refresh = useCallback(async () => {
    if (!staffId) return;
    const { data } = await supabase
      .from("orders")
      .select("*")
      .eq(col, staffId)
      .order("created_at", { ascending: false })
      .limit(50);
    setOrders(data ?? []);
    setLoading(false);
  }, [staffId, col]);

  useEffect(() => {
    refresh();
    if (!staffId) return;
    const ch = supabase
      .channel(`my-orders-${staffId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `${col}=eq.${staffId}` },
        () => refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [staffId, col, refresh]);

  const active = orders.filter((o) => !DONE.includes(o.status) && o.status !== "cancelled" && o.status !== "rejected");
  const completed = orders.filter((o) => DONE.includes(o.status));

  // Expose the in-progress delivery for GPS attribution.
  _activeDeliveryOrderId =
    active.find((o) => o.status === "out_for_delivery")?.id ??
    active.find((o) => o.type === "delivery")?.id ??
    null;

  return { active, completed, loading, refresh };
}

export async function advanceOrder(id: string, status: OrderStatus) {
  const now = new Date().toISOString();
  const patch: Partial<Order> = { status };
  if (status === "delivered" || status === "served" || status === "completed")
    patch.completed_at = now;
  const { error } = await supabase.from("orders").update(patch).eq("id", id);
  if (error) throw error;
}
