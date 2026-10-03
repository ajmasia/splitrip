import { isAuthApiError } from '@supabase/supabase-js'

/**
 * Whether Auth has refused the session a request carries, as opposed to being unreachable.
 *
 * A session can outlive the instance that issued it: a reinstall, or a backup restored from before
 * the secrets changed, leaves browsers holding tokens nothing will accept any more. Kept, such a
 * session is sent with every request, every query is refused, and the screen blames whatever it
 * was asking about — an invitation that is perfectly good reads as one that no longer works. So a
 * refused session is dropped, and the visit goes on as if there had been none.
 *
 * Only Auth's own refusal counts. A network failure or an Auth that is down is not a verdict on the
 * session, and signing somebody out for one would turn every hiccup into a lost sign-in.
 */
export function sessionRefused(error: unknown): boolean {
  return isAuthApiError(error) && (error.status === 401 || error.status === 403)
}
