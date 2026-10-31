import { createClient } from "@supabase/supabase-js";
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
if (Boolean(url) !== Boolean(key))
  throw new Error(
    "Set both Supabase environment variables, or leave both empty for demo mode.",
  );
export const invitationFlow =
  new URLSearchParams(
    typeof location === "undefined" ? "" : location.hash.slice(1),
  ).get("type") === "invite";
export const supabase =
  url && key
    ? createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    : null;
export const isDemo = !supabase;
