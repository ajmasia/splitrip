'use server'

import { revalidatePath } from 'next/cache'

import { errorCopyKey } from '@/lib/errors'
import type { CopyKey } from '@/lib/i18n'
import { qrCode } from '@/lib/qr'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { appOrigin, joinPath } from '@/lib/trips/invitations'

/** Everything the screen needs to hand a link over, without going anywhere to find it. */
export type MintedInvitation = {
  url: string
  expiresAt: string
  /** The QR modules, computed here so the encoder never travels to the browser. */
  qr: { size: number; path: string }
}

export type CreateInvitationState = {
  error: CopyKey | null
  /** Set when the invitation was minted for one person, and is to be shown then and there. */
  minted: MintedInvitation | null
}

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

  // A place, when the invitation is for somebody already on the list. The role travels with the
  // place in that case, so the form beside a name sends none and the database takes theirs.
  const participantId = text(formData.get('participant_id')).trim()
  const role = text(formData.get('role')).trim()

  const { data, error } = await supabase.rpc('create_invitation', {
    p_trip_id: tripId,
    p_role: role === '' ? null : role,
    p_participant_id: participantId === '' ? null : participantId,
  })

  if (error) return { error: errorCopyKey(error.code), minted: null }

  revalidatePath(`/trips/${tripId}/invite`)
  revalidatePath(`/trips/${tripId}`)

  // A link minted beside somebody's name is handed over on the spot: sending whoever pressed the
  // button to another screen to look for it would lose the one thing they wanted.
  if (participantId === '') return { error: null, minted: null }

  const invitation = data as { token: string; expires_at: string }
  const url = `${await appOrigin()}${joinPath(invitation.token)}`

  return {
    error: null,
    minted: { url, expiresAt: invitation.expires_at, qr: qrCode(url) },
  }
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
