import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export interface Payment {
  id: string;
  amount: number;
  method: "cash" | "card";
  tip_amount: number;
  status: string;
  created_at: string;
}

/** Payments recorded against an order + live paid/remaining totals (split bill). */
export function usePayments(orderId: string | null, total: number) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!orderId) return;
    const { data } = await supabase
      .from("payments")
      .select("id, amount, method, tip_amount, status, created_at")
      .eq("order_id", orderId)
      .order("created_at");
    setPayments((data ?? []) as Payment[]);
    setLoading(false);
  }, [orderId]);

  useEffect(() => {
    refresh();
    if (!orderId) return;
    const ch = supabase
      .channel(`payments-${orderId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payments", filter: `order_id=eq.${orderId}` },
        () => refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [orderId, refresh]);

  const paid = payments
    .filter((p) => p.status === "paid")
    .reduce((s, p) => s + Number(p.amount), 0);
  const remaining = Math.max(Math.round((total - paid) * 100) / 100, 0);

  return { payments, paid, remaining, loading, refresh };
}

/** Record one split payment against an order. */
export async function addPayment(input: {
  restaurantId: string;
  orderId: string;
  amount: number;
  method: "cash" | "card";
  tip?: number;
  collectedBy: string;
}) {
  const { error } = await supabase.from("payments").insert({
    restaurant_id: input.restaurantId,
    order_id: input.orderId,
    method: input.method,
    status: "paid",
    amount: input.amount,
    tip_amount: input.tip ?? 0,
    collected_by: input.collectedBy,
    collected_at: new Date().toISOString(),
  });
  if (error) throw error;
}
