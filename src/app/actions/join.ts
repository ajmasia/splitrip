'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { errorCopyKey } from '@/lib/errors'
import type { CopyKey } from '@/lib/i18n'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export type JoinState = {
  error: CopyKey | null
  /** The name that was already on the trip, when the answer is to offer continuing as them. */
  taken: string | null
}

const text = (value: FormDataEntryValue | null) => (typeof value === 'string' ? value : '')

export async function joinTrip(_previous: JoinState, formData: FormData): Promise<JoinState> {
  const displayName = text(formData.get('display_name')).trim()
  const continueAsExisting = formData.get('continue_as_existing') === 'yes'

  // The database is the authority on an empty name; this only refuses one before minting an
  // identity, so an empty submission does not leave a stray user behind.
  if (displayName === '') return { error: 'error.name_required', taken: null }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Here, and nowhere earlier. Opening an invitation link costs nothing: whoever follows one and
  // does not type a name takes no identity with them.
  if (user === null) {
    const { error } = await supabase.auth.signInAnonymously()
    if (error) return { error: 'error.unexpected', taken: null }
  }

  const { data, error } = await supabase.rpc('join_trip', {
    p_token: text(formData.get('token')),
    p_display_name: displayName,
    p_continue_as_existing: continueAsExisting,
  })

  // A name already on the trip has two readings the database cannot tell apart, so the screen asks
  // which it is rather than deciding: a second traveller picks another name, and the same one
  // arriving from a new phone confirms and is rebound to it.
  if (error) {
    return {
      error: errorCopyKey(error.code),
      taken: error.code === 'SP013' ? displayName : null,
    }
  }

  revalidatePath('/', 'layout')
  redirect(`/trips/${(data as { trip_id: string }).trip_id}`)
}
