import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export interface Zone {
  id: string;
  name: string;
  sort_order: number;
}
export interface Table {
  id: string;
  label: string;
  seats: number;
  zone_id: string | null;
}
export interface Category {
  id: string;
  name: string;
  sort_order: number;
}
export interface Product {
  id: string;
  name: string;
  price: number;
  category_id: string | null;
  is_available: boolean;
}

/** Tables + zones for the visual table picker, with live occupancy (active dine-in). */
export function useTables(restaurantId: string | null) {
  const [zones, setZones] = useState<Zone[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [occupied, setOccupied] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!restaurantId) return;
    const [z, t, o] = await Promise.all([
      supabase.from("zones").select("id,name,sort_order").eq("restaurant_id", restaurantId).order("sort_order"),
      supabase
        .from("restaurant_tables")
        .select("id,label,seats,zone_id")
        .eq("restaurant_id", restaurantId)
        .eq("is_active", true)
        .order("label"),
      supabase
        .from("orders")
        .select("table_id")
        .eq("restaurant_id", restaurantId)
        .eq("type", "dine_in")
        .in("status", ["pending", "accepted", "preparing", "ready", "served"]),
    ]);
    setZones(z.data ?? []);
    setTables((t.data ?? []) as Table[]);
    setOccupied(new Set((o.data ?? []).map((r) => r.table_id).filter(Boolean) as string[]));
    setLoading(false);
  }, [restaurantId]);

  useEffect(() => {
    load();
  }, [load]);

  return { zones, tables, occupied, loading, refresh: load };
}

/** Active menu (categories + available products) for building an order. */
export function useCatalog(restaurantId: string | null) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!restaurantId) return;
    (async () => {
      const [c, p] = await Promise.all([
        supabase.from("categories").select("id,name,sort_order").eq("restaurant_id", restaurantId).eq("is_active", true).order("sort_order"),
        supabase
          .from("products")
          .select("id,name,price,category_id,is_available")
          .eq("restaurant_id", restaurantId)
          .eq("is_active", true)
          .eq("is_available", true)
          .order("sort_order"),
      ]);
      setCategories((c.data ?? []) as Category[]);
      setProducts((p.data ?? []) as Product[]);
      setLoading(false);
    })();
  }, [restaurantId]);

  return { categories, products, loading };
}

export interface NewLine {
  product_id: string;
  name: string;
  unit_price: number;
  quantity: number;
}

/** Create a dine-in order taken by a waiter at a table. */
export async function createDineInOrder(input: {
  restaurantId: string;
  waiterId: string;
  tableId: string;
  shiftId: string | null;
  paymentMethod: "cash" | "card";
  lines: NewLine[];
}): Promise<number> {
  const { data: order, error } = await supabase
    .from("orders")
    .insert({
      restaurant_id: input.restaurantId,
      order_number: 0, // trigger assigns
      channel: "restaurant",
      type: "dine_in",
      status: "pending",
      payment_method: input.paymentMethod,
      table_id: input.tableId,
      assigned_waiter_id: input.waiterId,
      shift_id: input.shiftId,
      placed_at: new Date().toISOString(),
    })
    .select("id, order_number")
    .single();
  if (error) throw error;

  const items = input.lines.map((l) => ({
    order_id: order.id,
    product_id: l.product_id,
    name: l.name,
    unit_price: l.unit_price,
    quantity: l.quantity,
  }));
  const { error: itemsErr } = await supabase.from("order_items").insert(items);
  if (itemsErr) throw itemsErr;
  return order.order_number as number;
}
