import { createBrowserClient } from '@supabase/ssr'

import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from './env'

const LOOPBACK = ['localhost', '127.0.0.1']

/**
 * The address of Supabase as seen from the browser that is asking.
 *
 * Locally, Supabase is configured at a loopback address, which is correct for the server and wrong
 * for anybody else: to a phone on the same wifi, `127.0.0.1` is the phone. The page loads and the
 * data arrives, because those come from the server — but the real-time socket is opened by the
 * browser, finds nothing there, and the trip quietly announces that the live connection is down.
 *
 * So a loopback address is rewritten to whatever host the page itself came from, which is a machine
 * the phone has just proved it can reach. The condition is its own limit: in production the URL is
 * a real domain and nothing here applies.
 */
function reachableFrom(configured: string): string {
  if (typeof window === 'undefined') return configured

  const url = new URL(configured)
  const servedFromLoopback = LOOPBACK.includes(window.location.hostname)

  if (!LOOPBACK.includes(url.hostname) || servedFromLoopback) return configured

  url.hostname = window.location.hostname
  return url.origin
}

export function createSupabaseBrowserClient() {
  return createBrowserClient(reachableFrom(SUPABASE_URL), SUPABASE_PUBLISHABLE_KEY)
}
