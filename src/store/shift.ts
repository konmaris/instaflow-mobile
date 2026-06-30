import { useCallback, useEffect, useState } from "react";
import { supabase, type Shift } from "../lib/supabase";
import { startTracking, stopTracking } from "../lib/tracking";

/**
 * Manages the staff member's current open shift. Opening a shift (for a rider)
 * also starts GPS tracking; closing it stops tracking and records closing cash.
 */
export function useShift(params: {
  restaurantId: string | null;
  staffId: string | null;
  role: string | null;
  getActiveOrderId: () => string | null;
}) {
  const { restaurantId, staffId, role, getActiveOrderId } = params;
  const [shift, setShift] = useState<Shift | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!staffId) return;
    const { data } = await supabase
      .from("shifts")
      .select("*")
      .eq("staff_id", staffId)
      .eq("status", "open")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setShift(data ?? null);
    setLoading(false);
  }, [staffId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const openShift = async (openingCash: number) => {
    if (!restaurantId || !staffId) return;
    const { data, error } = await supabase
      .from("shifts")
      .insert({
        restaurant_id: restaurantId,
        staff_id: staffId,
        status: "open",
        opening_cash: openingCash,
      })
      .select("*")
      .single();
    if (error) throw error;
    setShift(data);
    if (role === "rider") {
      await startTracking({ restaurantId, riderId: staffId, getActiveOrderId });
    }
  };

  const closeShift = async (closingCash: number) => {
    if (!shift) return;
    await stopTracking();
    const { data, error } = await supabase
      .from("shifts")
      .update({ status: "closed", ended_at: new Date().toISOString(), closing_cash: closingCash })
      .eq("id", shift.id)
      .select("*")
      .single();
    if (error) throw error;
    setShift(null);
    return data;
  };

  return { shift, loading, openShift, closeShift, refresh };
}
