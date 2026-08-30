'use server'

import { revalidatePath } from 'next/cache'

import { errorCopyKey } from '@/lib/errors'
import type { CopyKey } from '@/lib/i18n'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export type RemoveParticipantState = {
  error: CopyKey | null
  /** How much money is in the way, when that is what refused the removal. */
  count: number
}

const text = (value: FormDataEntryValue | null) => (typeof value === 'string' ? value : '')

/** The two refusals that come with a number, which the copy has to decline for one or for many. */
const REFUSALS: Record<string, { one: CopyKey; other: CopyKey } | undefined> = {
  SP021: {
    one: 'error.participant_has_expenses.one',
    other: 'error.participant_has_expenses.other',
  },
  SP022: {
    one: 'error.participant_has_payments.one',
    other: 'error.participant_has_payments.other',
  },
  SP028: {
    one: 'error.participant_in_splits.one',
    other: 'error.participant_in_splits.other',
  },
}

/** The database sends the number of entries in the way as the DETAIL of its refusal. */
const attached = (details: string | undefined) => {
  const count = Number(details)
  return Number.isFinite(count) ? count : 0
}

export async function removeParticipant(
  _previous: RemoveParticipantState,
  formData: FormData,
): Promise<RemoveParticipantState> {
  const tripId = text(formData.get('trip_id'))
  const supabase = await createSupabaseServerClient()

  const { error } = await supabase.rpc('remove_participant', {
    p_participant_id: text(formData.get('participant_id')),
  })

  const refusal = error === null ? undefined : REFUSALS[error.code]
  if (refusal !== undefined) {
    const count = attached(error?.details)
    return { error: count === 1 ? refusal.one : refusal.other, count }
  }

  if (error) return { error: errorCopyKey(error.code), count: 0 }

  revalidatePath(`/trips/${tripId}`)
  return { error: null, count: 0 }
}

export type ChangeRoleState = { error: CopyKey | null }

export async function setParticipantRole(
  _previous: ChangeRoleState,
  formData: FormData,
): Promise<ChangeRoleState> {
  const tripId = text(formData.get('trip_id'))
  const supabase = await createSupabaseServerClient()

  const { error } = await supabase.rpc('set_participant_role', {
    p_participant_id: text(formData.get('participant_id')),
    p_role: text(formData.get('role')),
  })

  if (error) return { error: errorCopyKey(error.code) }

  revalidatePath(`/trips/${tripId}`)
  return { error: null }
}

export type AddParticipantState = { error: CopyKey | null; at: number }

/**
 * Adds somebody who is on the trip but not on the application: a child who counts in the split and
 * pays nothing, a grandmother who is not going to install anything. They exist as a participant
 * from the moment they are named, and can be handed the application later.
 */
export async function addParticipant(
  _previous: AddParticipantState,
  formData: FormData,
): Promise<AddParticipantState> {
  const tripId = text(formData.get('trip_id'))
  const displayName = text(formData.get('display_name')).trim()

  if (displayName === '') return { error: 'error.name_required', at: 0 }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.rpc('add_participant', {
    p_trip_id: tripId,
    p_display_name: displayName,
    p_role: text(formData.get('role')) === 'admin' ? 'admin' : 'participant',
  })

  if (error) return { error: errorCopyKey(error.code), at: 0 }

  revalidatePath(`/trips/${tripId}`)
  return { error: null, at: Date.now() }
}
