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
  /** Whether that name is a place nobody is on, rather than a seat a device is answering from. */
  unclaimed: boolean
}

const text = (value: FormDataEntryValue | null) => (typeof value === 'string' ? value : '')

export async function joinTrip(_previous: JoinState, formData: FormData): Promise<JoinState> {
  const displayName = text(formData.get('display_name')).trim()
  const continueAsExisting = formData.get('continue_as_existing') === 'yes'

  // The database is the authority on an empty name; this only refuses one before minting an
  // identity, so an empty submission does not leave a stray user behind.
  if (displayName === '') return { error: 'error.name_required', taken: null, unclaimed: false }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Here, and nowhere earlier. Opening an invitation link costs nothing: whoever follows one and
  // does not type a name takes no identity with them.
  if (user === null) {
    const { error } = await supabase.auth.signInAnonymously()
    if (error) return { error: 'error.unexpected', taken: null, unclaimed: false }
  }

  const { data, error } = await supabase.rpc('join_trip', {
    p_token: text(formData.get('token')),
    p_display_name: displayName,
    p_continue_as_existing: continueAsExisting,
  })

  // A name already on the trip is never simply refused: the screen asks which of the three it is.
  // A second traveller who happens to share it picks another; the same traveller arriving from a
  // new phone confirms and is rebound; and somebody the organiser added by name claims the place
  // waiting for them, which the database tells apart from the other two.
  if (error) {
    const known = error.code === 'SP013' || error.code === 'SP026'

    return {
      error: errorCopyKey(error.code),
      // The database sends the name as it stands on the list as the DETAIL of its refusal, which is
      // how it is spelled back to the reader rather than however they happened to type it.
      taken: known ? (error.details ?? displayName) : null,
      unclaimed: error.code === 'SP026',
    }
  }

  revalidatePath('/', 'layout')
  redirect(`/trips/${(data as { trip_id: string }).trip_id}`)
}
