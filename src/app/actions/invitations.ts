'use server'

import { revalidatePath } from 'next/cache'

import { errorCopyKey } from '@/lib/errors'
import type { CopyKey } from '@/lib/i18n'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export type CreateInvitationState = { error: CopyKey | null }

const text = (value: FormDataEntryValue | null) => (typeof value === 'string' ? value : '')

/**
 * The token is not among the arguments, and deliberately: the database draws it. Everything this
 * hands over is what the invitation carries, never what it is called.
 */
export async function createInvitation(
  _previous: CreateInvitationState,
  formData: FormData,
): Promise<CreateInvitationState> {
  const tripId = text(formData.get('trip_id'))
  const supabase = await createSupabaseServerClient()

  const { error } = await supabase.rpc('create_invitation', {
    p_trip_id: tripId,
    p_role: text(formData.get('role')),
  })

  if (error) return { error: errorCopyKey(error.code) }

  revalidatePath(`/trips/${tripId}/invite`)
  return { error: null }
}
