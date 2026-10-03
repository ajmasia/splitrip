/**
 * The name of the cookie that carries the session, shared by every Supabase client.
 *
 * `@supabase/ssr` derives the name from the Supabase URL when none is given. The browser reaches
 * Supabase at its public address and a deployed server at an internal one, so left to derive it,
 * each would write a cookie the other never reads and every request would look signed out.
 */
export const SESSION_COOKIE = 'sb-splitrip-auth-token'

/**
 * The address the server reaches Supabase at: the internal one when the deployment provides it,
 * the public one otherwise, as in development.
 */
export function serverSupabaseUrl(publicUrl: string, internalUrl: string | undefined): string {
  return internalUrl || publicUrl
}

/**
 * The visitor's address, to be passed on to Supabase Auth so that its per-address limits count
 * each visitor and not the application server that makes the call on their behalf.
 *
 * The last entry of the forwarding header is the one the reverse proxy in front of the application
 * appended: the address it was actually connected from. Anything before it was sent by the
 * visitor and could say anything, which would let one visitor pose as many.
 */
export function forwardedFor(headers: Pick<Headers, 'get'>): Record<string, string> {
  const address = headers.get('x-forwarded-for')?.split(',').at(-1)?.trim()
  return address ? { 'X-Forwarded-For': address } : {}
}
