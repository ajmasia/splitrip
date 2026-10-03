import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'

import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from './env'
import { SESSION_COOKIE, forwardedFor, serverSupabaseUrl } from './options'

export async function createSupabaseServerClient() {
  const cookieStore = await cookies()
  const requestHeaders = await headers()

  return createServerClient(
    serverSupabaseUrl(SUPABASE_URL, process.env.SUPABASE_INTERNAL_URL),
    SUPABASE_PUBLISHABLE_KEY,
    {
      cookieOptions: { name: SESSION_COOKIE },
      global: { headers: forwardedFor(requestHeaders) },
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
    },
  )
}
