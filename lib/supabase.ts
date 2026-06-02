import { createClient as _createClient } from '@supabase/supabase-js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = ReturnType<typeof _createClient<any>>

let _client: Client | null = null

/**
 * Returns the Supabase browser client (singleton).
 * Returns a safe no-op stub during build when env vars are not set,
 * preventing "supabaseUrl is required" crashes during static generation.
 */
export function getSupabaseBrowser(): Client {
  if (_client) return _client

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // During build/SSR without env vars, return a no-op stub so modules load cleanly.
  if (!url || !key) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return { auth: { getUser: async () => ({ data: { user: null } }) }, from: () => ({}) } as any
  }

  _client = _createClient(url, key)
  return _client
}

// Named export — kept for backward compatibility with components that do `import { supabase }`.
// Typed as `any` so chained Supabase queries (e.g. .from().update()) don't get `never` types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase: Client = new Proxy({} as Client, {
  get(_, prop: string | symbol) {
    const client = getSupabaseBrowser()
    const val = Reflect.get(client, prop)
    return typeof val === 'function' ? (val as (...a: unknown[]) => unknown).bind(client) : val
  },
})
