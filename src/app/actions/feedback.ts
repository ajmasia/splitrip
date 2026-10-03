'use server'

import { errorCopyKey } from '@/lib/errors'
import { applicationPath, FEEDBACK_MAX_LENGTH, isFeedbackKind, tripIdOrNull } from '@/lib/feedback'
import type { CopyKey } from '@/lib/i18n'
import { getLocale } from '@/lib/i18n/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { APP_VERSION } from '@/lib/version'

export type FeedbackState = {
  error: CopyKey | null
  sent: boolean
  /** What was typed, handed back with a refusal so a page rendered without JavaScript keeps it too. */
  message: string
}

const text = (value: FormDataEntryValue | null) => (typeof value === 'string' ? value : '')

export async function submitFeedback(
  _previous: FeedbackState,
  formData: FormData,
): Promise<FeedbackState> {
  const typed = text(formData.get('message'))
  const message = typed.trim()
  const kind = text(formData.get('kind'))

  // The database is the authority on both limits; these only refuse before minting an identity, so
  // an empty or oversized submission does not leave a stray user behind.
  if (message === '') return { error: 'error.feedback_required', sent: false, message: typed }
  if (message.length > FEEDBACK_MAX_LENGTH)
    return { error: 'error.feedback_too_long', sent: false, message: typed }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Here, and nowhere earlier, as when joining a trip: opening the form costs no identity, sending
  // from it is what does.
  if (user === null) {
    const { error } = await supabase.auth.signInAnonymously()
    if (error) return { error: 'error.unexpected', sent: false, message: typed }
  }

  // The version and the language are the server's to say, not the form's: they are what was
  // actually running and what the reader was actually shown.
  const { error } = await supabase.rpc('submit_feedback', {
    p_message: message,
    p_kind: isFeedbackKind(kind) ? kind : null,
    p_path: applicationPath(text(formData.get('from'))),
    p_trip_id: tripIdOrNull(text(formData.get('trip'))),
    p_app_version: APP_VERSION,
    p_locale: await getLocale(),
  })

  if (error) return { error: errorCopyKey(error.code), sent: false, message: typed }

  return { error: null, sent: true, message: '' }
}
