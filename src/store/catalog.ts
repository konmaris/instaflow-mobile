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

// A table's order is "open" (occupied / can receive more items) only in these
// pre-completion states. 'served'/'completed' are done — a new order starts fresh.
export const OPEN_STATUSES = ["pending", "accepted", "preparing", "ready"] as const;
export interface ModOption {
  id: string;
  name: string;
  price_delta: number;
}
export interface ModGroup {
  id: string;
  name: string;
  min_select: number;
  max_select: number;
  options: ModOption[];
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
        .in("status", OPEN_STATUSES),
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

/** Active menu (categories + products + modifier groups) for building an order. */
export function useCatalog(restaurantId: string | null) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [modifiers, setModifiers] = useState<Record<string, ModGroup[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!restaurantId) return;
    (async () => {
      const [c, p, g] = await Promise.all([
        supabase.from("categories").select("id,name,sort_order").eq("restaurant_id", restaurantId).eq("is_active", true).order("sort_order"),
        supabase
          .from("products")
          .select("id,name,price,category_id,is_available")
          .eq("restaurant_id", restaurantId)
          .eq("is_active", true)
          .eq("is_available", true)
          .order("sort_order"),
        supabase
          .from("modifier_groups")
          .select("id,name,min_select,max_select,product_id,sort_order,modifier_options(id,name,price_delta,is_available,sort_order)")
          .eq("restaurant_id", restaurantId)
          .order("sort_order"),
      ]);
      setCategories((c.data ?? []) as Category[]);
      setProducts((p.data ?? []) as Product[]);

      const byProduct: Record<string, ModGroup[]> = {};
      for (const grp of (g.data ?? []) as any[]) {
        const options: ModOption[] = (grp.modifier_options ?? [])
          .filter((o: any) => o.is_available)
          .sort((a: any, b: any) => a.sort_order - b.sort_order)
          .map((o: any) => ({ id: o.id, name: o.name, price_delta: Number(o.price_delta) }));
        (byProduct[grp.product_id] ??= []).push({
          id: grp.id,
          name: grp.name,
          min_select: grp.min_select,
          max_select: grp.max_select,
          options,
        });
      }
      setModifiers(byProduct);
      setLoading(false);
    })();
  }, [restaurantId]);

  return { categories, products, modifiers, loading };
}

export interface SelectedOption {
  group: string;
  option: string;
  price_delta: number;
}
export interface NewLine {
  line_id: string; // client-side unique key (same product w/ different options = distinct)
  product_id: string;
  name: string;
  base_price: number;
  unit_price: number; // base + option deltas
  quantity: number;
  selected_options: SelectedOption[];
  notes?: string;
}

const toItems = (orderId: string, lines: NewLine[]) =>
  lines.map((l) => ({
    order_id: orderId,
    product_id: l.product_id,
    name: l.name,
    unit_price: l.unit_price,
    quantity: l.quantity,
    selected_options: l.selected_options,
    notes: l.notes || null,
  }));

/** Find a table's current open dine-in order, if any (to append to it). */
export async function findOpenOrderForTable(tableId: string) {
  const { data } = await supabase
    .from("orders")
    .select("id, order_number")
    .eq("table_id", tableId)
    .eq("type", "dine_in")
    .in("status", OPEN_STATUSES)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as { id: string; order_number: number } | null;
}

/** Append items to an existing open order (totals recalc via DB trigger). */
export async function appendToOrder(orderId: string, lines: NewLine[]) {
  const { error } = await supabase.from("order_items").insert(toItems(orderId, lines) as never);
  if (error) throw error;
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

  const { error: itemsErr } = await supabase.from("order_items").insert(toItems(order.id, input.lines) as never);
  if (itemsErr) throw itemsErr;
  return order.order_number as number;
}
