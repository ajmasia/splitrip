import { headers } from 'next/headers'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { TripRole } from './queries'

export type Invitation = {
  id: string
  token: string
  role: TripRole
  expiresAt: string
  /** Absolute, because it is going into a chat message or into a camera. */
  url: string
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
export async function listInvitations(tripId: string): Promise<Invitation[]> {
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('invitations')
    .select('id, token, role, expires_at')
    .eq('trip_id', tripId)
    .is('revoked_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  const origin = await appOrigin()

  return data.map((row) => ({
    id: row.id,
    token: row.token,
    role: row.role as TripRole,
    expiresAt: row.expires_at,
    url: `${origin}${joinPath(row.token)}`,
  }))
}
