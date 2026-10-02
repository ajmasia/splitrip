import { networkInterfaces } from 'node:os'

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

const LOOPBACK = ['localhost', '127.0.0.1', '[::1]']
const PRIVATE_NETWORK = /^(192\.168|10|172\.(1[6-9]|2\d|3[01]))\./

/**
 * The address this machine answers to on the local network, preferring the ranges a home router
 * hands out over whatever a VPN or a virtual machine has added alongside them.
 */
function localNetworkAddress(): string | null {
  const addresses = Object.values(networkInterfaces())
    .flat()
    .flatMap((address) =>
      address !== undefined && address.family === 'IPv4' && !address.internal
        ? [address.address]
        : [],
    )
  const rank = (address: string) =>
    address.startsWith('192.168.') ? 0 : PRIVATE_NETWORK.test(address) ? 1 : 2

  return addresses.sort((a, b) => rank(a) - rank(b))[0] ?? null
}

/**
 * The origin comes from the request rather than from a setting, so the local machine, a preview
 * deployment and production each hand out a link back to themselves with nothing to configure.
 *
 * Except a loopback host in development: a link to localhost opens nothing on the phone it is
 * meant for, so it is handed out at the machine's network address instead, same port.
 */
export async function appOrigin(): Promise<string> {
  const headerList = await headers()
  let host = headerList.get('x-forwarded-host') ?? headerList.get('host') ?? 'localhost:3000'
  const hostname = host.replace(/:\d+$/, '')
  const isLoopback = LOOPBACK.includes(hostname)

  if (isLoopback && process.env.NODE_ENV === 'development') {
    const address = localNetworkAddress()
    if (address !== null) host = address + host.slice(hostname.length)
  }

  const protocol =
    headerList.get('x-forwarded-proto') ??
    (isLoopback || PRIVATE_NETWORK.test(host) ? 'http' : 'https')

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

/** The place a link opens, when it opens one in particular. */
export type InvitationPlace = {
  name: string
  /** True when a device is already answering from it, which the screen has to ask about. */
  inUse: boolean
  /** False for a place held by an account, which is entered by signing in and never taken. */
  takeable: boolean
}

/**
 * Whose place a link opens, and whether somebody is sitting in it.
 *
 * Readable without a session, because the person about to use it has none: it is the one thing the
 * join screen may say about a trip somebody is not part of, and it says only a name they were
 * given by whoever invited them.
 */
export async function invitationPlace(token: string): Promise<InvitationPlace | null> {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.rpc('invitation_place', { p_token: token })

  if (error) return null

  const [place] = (data ?? []) as {
    display_name: string
    in_use: boolean
    takeable: boolean
  }[]

  return place ? { name: place.display_name, inUse: place.in_use, takeable: place.takeable } : null
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
