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
