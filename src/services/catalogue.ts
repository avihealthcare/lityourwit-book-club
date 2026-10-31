import { loadFinance } from "./payments";
import { resolveBookPhotos } from "./bookPhotos";
import { supabase } from "../lib/supabase";
import type { Book, NewBook, Plan, LedgerEntry, FamilyProfile } from "../types";
export async function loadCatalogue(): Promise<Book[]> {
  if (!supabase) throw new Error("Live connection is unavailable.");
  const { data, error } = await supabase
    .from("catalogue")
    .select("*")
    .limit(1000);
  if (error) throw error;
  return resolveBookPhotos((data ?? []) as Book[]);
}
export async function loadAccount(userId: string) {
  if (!supabase) throw new Error("Live connection is unavailable.");
  const results = await Promise.all([
    supabase
      .from("profiles")
      .select("id,display_name,chapter_id,trust_level")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("bookcoin_wallets")
      .select("balance")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("bookcoin_transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase.rpc("is_admin"),
    supabase.from("membership_plans").select("*"),
    supabase
      .from("configuration")
      .select("value")
      .eq("key", "economy")
      .single(),
  ]);
  for (const result of results) if (result.error) throw result.error;
  const primaryChapter = results[0].data?.chapter_id;
  const chapterResult = primaryChapter
    ? await supabase
        .from("chapters")
        .select("id,name,area,city,description,active")
        .eq("id", primaryChapter)
        .maybeSingle()
    : null;
  if (chapterResult?.error) throw chapterResult.error;
  const finance = await loadFinance();
  return {
    finance,
    chapter: chapterResult?.data ?? null,
    profile: results[0].data as FamilyProfile | null,
    balance: (results[1].data as { balance: number } | null)?.balance ?? 0,
    ledger: (results[2].data ?? []) as LedgerEntry[],
    isAdmin: results[3].data === true,
    plans: (results[4].data ?? []) as Plan[],
    economy: results[5].data?.value as Record<string, number>,
  };
}
export async function saveBook(book: NewBook) {
  if (!supabase) throw new Error("Live connection is unavailable.");
  const { data, error } = await supabase.rpc("submit_book", { p_book: book });
  if (error) throw error;
  return data as string;
}
