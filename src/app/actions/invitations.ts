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

export type RevokeInvitationState = { error: CopyKey | null }

export async function revokeInvitation(
  _previous: RevokeInvitationState,
  formData: FormData,
): Promise<RevokeInvitationState> {
  const tripId = text(formData.get('trip_id'))
  const supabase = await createSupabaseServerClient()

  const { error } = await supabase.rpc('revoke_invitation', {
    p_invitation_id: text(formData.get('invitation_id')),
  })

  // SP010 here is not the joiner's broken link but a race: the invitation was listed a moment ago
  // and is gone now. The copy for the join screen would be addressed to the wrong person.
  if (error)
    return { error: error.code === 'SP010' ? 'error.unexpected' : errorCopyKey(error.code) }

  revalidatePath(`/trips/${tripId}/invite`)
  return { error: null }
}
