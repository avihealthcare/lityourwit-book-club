import type { LedgerEntry } from "../types";
import { supabase } from "../lib/supabase";
export interface CoinPack {
  coins: number;
  price: number;
}
export interface PaidMembership {
  id: string;
  plan_id: string;
  plan_name?: string;
  status: string;
  starts_at: string;
  ends_at: string;
  billing_interval: "monthly" | "annual";
  user_id?: string;
}
export interface PaymentRequest {
  id: string;
  user_id: string;
  kind: "membership" | "coin_pack";
  plan_id: string | null;
  plan_name: string | null;
  billing_interval: string | null;
  amount: number;
  coins: number;
  payer_name: string;
  transaction_reference: string;
  status: "pending" | "approved" | "rejected";
  admin_notes: string;
  created_at: string;
  reviewed_at: string | null;
  display_name?: string;
}
export interface MemberFinance {
  ready: boolean;
  balance?: number;
  ledger?: LedgerEntry[];
  active: boolean;
  membership: PaidMembership | null;
  requests: PaymentRequest[];
  packs: CoinPack[];
  upi_mobile: string;
}
export const previewPacks: CoinPack[] = [
  { coins: 25, price: 100 },
  { coins: 75, price: 250 },
  { coins: 200, price: 500 },
];
export const emptyFinance: MemberFinance = {
  ready: true,
  active: false,
  membership: null,
  requests: [],
  packs: previewPacks,
  upi_mobile: "9820737429",
};
export async function loadFinance(): Promise<MemberFinance> {
  if (!supabase) return emptyFinance;
  const { data, error } = await supabase.rpc("member_finance");
  if (error) {
    if (error.code === "PGRST202" || error.code === "42883")
      return { ...emptyFinance, ready: false };
    throw new Error(error.message);
  }
  return { ...data, ready: true } as MemberFinance;
}
export async function requestUpiPayment(input: {
  kind: "membership" | "coin_pack";
  amount: number;
  plan?: string;
  interval?: "monthly" | "annual";
  coins?: number;
  payer: string;
  reference: string;
}) {
  if (!supabase)
    throw new Error("Sign in to submit a real UPI payment for review.");
  const { data, error } = await supabase.rpc("request_upi_payment", {
    p_kind: input.kind,
    p_plan: input.plan || null,
    p_interval: input.interval || null,
    p_coins: input.coins || null,
    p_payer: input.payer,
    p_reference: input.reference,
    p_expected_amount: input.amount,
  });
  if (error) throw new Error(error.message);
  if (typeof window !== "undefined")
    window.dispatchEvent(new Event("lityourwit-account-changed"));
  return data as string;
}
export async function reviewUpiPayment(
  id: string,
  approve: boolean,
  notes: string,
) {
  if (!supabase) throw new Error("Live connection required.");
  const { error } = await supabase.rpc("review_upi_payment", {
    p_id: id,
    p_approve: approve,
    p_notes: notes,
  });
  if (error) throw new Error(error.message);
  if (typeof window !== "undefined")
    window.dispatchEvent(new Event("lityourwit-account-changed"));
}
