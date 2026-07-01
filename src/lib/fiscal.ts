import { supabase } from "./supabase";

async function invoke<T = any>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) throw error;
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return data as T;
}

export const createSimSign = (order_id: string, amount: number) =>
  invoke("fiscal-create-sim-sign", { order_id, amount });

export interface PosResult {
  nspCode: string;
  providersSignature: string;
  tid: string;
  transactionId: string;
  tipAmount: number;
}
export const sendSimInvoice = (order_id: string, pos: PosResult) =>
  invoke("fiscal-send-sim-invoice", { order_id, pos });

export const cancelSimSign = (order_id: string) =>
  invoke("fiscal-cancel-sim-sign", { order_id });

export const issueReceipt = (order_id: string) => invoke("fiscal-issue", { order_id });
