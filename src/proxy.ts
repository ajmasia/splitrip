import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@/lib/supabase/env'

/**
 * Refreshes whatever session the request already carries, and mints none.
 *
 * Handing an anonymous identity to every first page view meant every crawler that ever reached the
 * deployment took one with it, and they accumulate in the auth table for nobody's benefit. An
 * identity is now issued where one is actually wanted — opening an invitation, or signing in — and
 * a visit costs nothing.
 *
 * Named `proxy`, not `middleware`: the convention was renamed in Next.js 16.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value)
        }
        response = NextResponse.next({ request })
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options)
        }
      },
    },
  })

  // getUser, not getSession: it asks the auth server, which both validates the token and refreshes
  // it when it has expired. A session read from the cookie alone would be whatever was written to
  // it last.
  await supabase.auth.getUser()

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
