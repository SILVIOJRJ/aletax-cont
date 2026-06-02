import { createBrowserClient } from "@supabase/ssr";

function makeClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Named singleton — import as: import { supabase } from '@/lib/supabase'
export const supabase = makeClient();

// Also exported for legacy call-style usage
export function getSupabaseBrowser() {
  return supabase;
}
