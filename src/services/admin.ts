import { supabase } from "../lib/supabase";
import type { PaymentRequest, PaidMembership } from "./payments";
import type { Plan } from "../types";
export interface Chapter {
  id: string;
  name: string;
  area: string;
  city: string;
  pin_code: string | null;
  description: string;
  active: boolean;
}
export interface Member {
  id: string;
  display_name: string;
  email: string;
  chapter_id: string;
  status: string;
  suspended: boolean;
  removed_at: string | null;
  role: string;
}
export interface AdminBook {
  id: string;
  title: string;
  author: string;
  availability: string;
  owner_id: string;
  chapter_id: string;
}
export interface AdminSnapshot {
  payments: PaymentRequest[];
  memberships: PaidMembership[];
  chapters: Chapter[];
  members: Member[];
  books: AdminBook[];
  plans: Plan[];
  configuration: { key: string; value: Record<string, unknown> }[];
  activity: {
    id: string;
    action: string;
    target: string;
    created_at: string;
  }[];
}
export async function loadAdmin(): Promise<AdminSnapshot> {
  if (!supabase)
    throw new Error("Sign in to the connected app to manage your business.");
  const [base, finance] = await Promise.all([
    supabase.rpc("admin_snapshot"),
    supabase.rpc("admin_finance_snapshot"),
  ]);
  if (base.error) throw new Error(base.error.message);
  if (
    finance.error &&
    finance.error.code !== "PGRST202" &&
    finance.error.code !== "42883"
  )
    throw new Error(finance.error.message);
  return {
    ...base.data,
    payments: [],
    memberships: [],
    ...(finance.data || {}),
  } as AdminSnapshot;
}
export async function manage(action: string, data: object) {
  if (!supabase) throw new Error("Live connection required.");
  const result = await supabase.rpc("admin_manage", {
    p_action: action,
    p_data: data,
  });
  if (result.error) throw new Error(result.error.message);
}
export async function inviteMember(email: string, display_name: string) {
  if (!supabase) throw new Error("Live connection required.");
  const { data, error } = await supabase.functions.invoke("admin-invite", {
    body: { email, display_name },
  });
  if (error) {
    const response =
      "context" in error && error.context instanceof Response
        ? await error.context.json().catch(() => null)
        : null;
    throw new Error(response?.error || error.message);
  }
  if (data.error) throw new Error(data.error);
  return data.message as string;
}
