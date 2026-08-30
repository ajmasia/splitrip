'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

import { createSupabaseBrowserClient } from '@/lib/supabase/client'

/** The trip's own row is keyed by `id`; everything else about it carries a `trip_id`. */
const WATCHED: readonly { table: string; column: string }[] = [
  { table: 'trips', column: 'id' },
  { table: 'participants', column: 'trip_id' },
  { table: 'expenses', column: 'trip_id' },
  { table: 'payments', column: 'trip_id' },
  { table: 'activity', column: 'trip_id' },
]

/**
 * One channel per trip, and every event it carries means the same thing: ask the server again.
 *
 * Nothing here reads the payload. Merging a message into what is on screen is the version of this
 * that goes wrong — it has to know how each kind of change affects each number, and it drifts the
 * moment one of them is added. Re-reading cannot drift: the screen after an event is the screen a
 * fresh visitor would get. At this data volume that costs a query and buys the whole class of bug.
 *
 * The refresh is deferred a moment because one action lands as several events: recording an expense
 * writes the expense, its shares and an activity entry in the same transaction, and three refreshes
 * for one dinner is two too many.
 */
export function TripRealtime({ tripId }: { tripId: string }) {
  const router = useRouter()

  useEffect(() => {
    const supabase = createSupabaseBrowserClient()
    let timer: ReturnType<typeof setTimeout> | undefined

    const refresh = () => {
      clearTimeout(timer)
      timer = setTimeout(() => router.refresh(), 250)
    }

    const channel = supabase.channel(`trip:${tripId}`)
    for (const { table, column } of WATCHED) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter: `${column}=eq.${tripId}` },
        refresh,
      )
    }

    // The socket authorises itself once, when it opens, and Row Level Security is what decides
    // whether an event reaches this reader at all. Subscribing before the session has been read
    // would open it as an anonymous stranger, who is entitled to nothing and would be told nothing.
    let cancelled = false
    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      if (data.session) supabase.realtime.setAuth(data.session.access_token)
      channel.subscribe()
    })

    return () => {
      cancelled = true
      clearTimeout(timer)
      void supabase.removeChannel(channel)
    }
  }, [tripId, router])

  return null
}
