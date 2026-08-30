import { headers } from 'next/headers'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { TripParticipant, TripRole } from './queries'

export type Invitation = {
  id: string
  token: string
  role: TripRole
  expiresAt: string
  /** Absolute, because it is going into a chat message or into a camera. */
  url: string
  /** Whose place this link opens, or null for the general one anybody can type a name into. */
  forName: string | null
}

/**
 * The origin comes from the request rather than from a setting, so the local machine, a preview
 * deployment and production each hand out a link back to themselves with nothing to configure.
 */
export async function appOrigin(): Promise<string> {
  const headerList = await headers()
  const host = headerList.get('x-forwarded-host') ?? headerList.get('host') ?? 'localhost:3000'
  const protocol =
    headerList.get('x-forwarded-proto') ??
    (host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https')

  return `${protocol}://${host}`
}

export function joinPath(token: string): string {
  return `/join/${token}`
}

/**
 * The invitations somebody could still use. A revoked or expired one is not shown at all: a list
 * of dead links is a list of things to mistake for live ones.
 */
export async function listInvitations(
  tripId: string,
  participants: TripParticipant[] = [],
): Promise<Invitation[]> {
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('invitations')
    .select('id, token, role, expires_at, participant_id')
    .eq('trip_id', tripId)
    .is('revoked_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  const origin = await appOrigin()
  const named = new Map<string | null, string>(
    participants.map((participant) => [participant.id, participant.displayName]),
  )

  return data.map((row) => ({
    id: row.id,
    token: row.token,
    role: row.role as TripRole,
    expiresAt: row.expires_at,
    url: `${origin}${joinPath(row.token)}`,
    forName: named.get(row.participant_id as string | null) ?? null,
  }))
}

/**
 * The name of the place a link opens, when it opens one and nobody is on it yet.
 *
 * Readable without a session, because the person about to use it has none: it is the one thing the
 * join screen may say about a trip somebody is not part of, and it says only a name they were
 * given by whoever invited them.
 */
export async function invitationPlace(token: string): Promise<string | null> {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.rpc('invitation_place', { p_token: token })

  if (error) return null

  return (data as string | null) ?? null
}

/** What the join screen may say about a token before anybody has typed a name. */
export type InvitationStatus = 'open' | 'invalid' | 'expired' | 'closed'

export async function invitationStatus(token: string): Promise<InvitationStatus> {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.rpc('invitation_status', { p_token: token })

  // A reader who cannot be told anything is told the invitation is no good, which is true enough:
  // whatever went wrong, this link is not opening a trip right now.
  if (error) return 'invalid'

  return data as InvitationStatus
}
