import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from './env'

export async function createSupabaseServerClient() {
  const cookieStore = await cookies()

  return createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        } catch {
          // Cookies are read-only while rendering a Server Component. The proxy has already
          // refreshed the session for this request, so there is nothing to lose by ignoring it.
        }
      },
    },
  })
}
