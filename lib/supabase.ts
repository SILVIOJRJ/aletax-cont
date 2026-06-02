import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Alias mantido para compatibilidade com os componentes existentes
export function getSupabaseBrowser() {
  return supabase
}
