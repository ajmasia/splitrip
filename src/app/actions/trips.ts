'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { errorCopyKey } from '@/lib/errors'
import type { CopyKey } from '@/lib/i18n'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export type CreateTripState = { error: CopyKey | null }

const text = (value: FormDataEntryValue | null) => (typeof value === 'string' ? value : '')

/** An empty date field arrives as '', which is not a date and must not be stored as one. */
const dateOrNull = (value: FormDataEntryValue | null) => text(value).trim() || null

export async function createTrip(
  _previous: CreateTripState,
  formData: FormData,
): Promise<CreateTripState> {
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase.rpc('create_trip', {
    p_name: text(formData.get('name')),
    p_display_name: text(formData.get('display_name')),
    p_start_date: dateOrNull(formData.get('start_date')),
    p_end_date: dateOrNull(formData.get('end_date')),
  })

  if (error) return { error: errorCopyKey(error.code) }

  revalidatePath('/')
  redirect(`/trips/${(data as { id: string }).id}`)
}

export type TripStatusState = { error: CopyKey | null }

/**
 * Every screen whose content depends on whether the trip is open: the trip itself, which turns
 * read-only, and the screens that read the frozen summary or the running figures.
 */
function revalidateTrip(tripId: string) {
  for (const path of ['', '/balances', '/dashboard', '/dashboard/expenses', '/summary']) {
    revalidatePath(`/trips/${tripId}${path}`)
  }
}

export async function closeTrip(
  _previous: TripStatusState,
  formData: FormData,
): Promise<TripStatusState> {
  const tripId = text(formData.get('trip_id'))
  const supabase = await createSupabaseServerClient()

  const { error } = await supabase.rpc('close_trip', { p_trip_id: tripId })
  if (error) return { error: errorCopyKey(error.code) }

  revalidateTrip(tripId)
  redirect(`/trips/${tripId}/summary`)
}

export async function reopenTrip(
  _previous: TripStatusState,
  formData: FormData,
): Promise<TripStatusState> {
  const tripId = text(formData.get('trip_id'))
  const supabase = await createSupabaseServerClient()

  const { error } = await supabase.rpc('reopen_trip', { p_trip_id: tripId })
  if (error) return { error: errorCopyKey(error.code) }

  revalidateTrip(tripId)
  return { error: null }
}
