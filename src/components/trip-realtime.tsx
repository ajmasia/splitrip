'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

import { clearActivity, noteActivity } from '@/lib/realtime/activity'
import { setLiveConnection } from '@/lib/realtime/status'
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
export function TripRealtime({
  tripId,
  youParticipantId = null,
  feed = false,
}: {
  tripId: string
  /**
   * Who the reader is on this trip. Their own actions are not news to them, and a badge counting
   * the expense they just recorded would be the application talking to itself.
   */
  youParticipantId?: string | null
  /** True on the activity screen, where an entry is not unseen: it just appeared in front of them. */
  feed?: boolean
}) {
  const router = useRouter()

  useEffect(() => {
    if (feed) clearActivity(tripId)

    const supabase = createSupabaseBrowserClient()
    let timer: ReturnType<typeof setTimeout> | undefined

    const refresh = () => {
      clearTimeout(timer)
      timer = setTimeout(() => router.refresh(), 250)
    }

    // A subscription that comes back has been away, and everything that happened in between arrived
    // nowhere. Re-reading on the way back is the whole of the recovery: the events are gone, but
    // the state they described is still in the database, and that is what the screen asks for.
    let away = false
    const restored = () => {
      setLiveConnection(true)
      if (!away) return
      away = false
      refresh()
    }
    const lost = () => {
      away = true
      setLiveConnection(false)
    }

    const channel = supabase.channel(`trip:${tripId}`)
    for (const { table, column } of WATCHED) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter: `${column}=eq.${tripId}` },
        (message) => {
          // The one event whose payload is read, and only for who caused it. Everything else about
          // what happened is read back from the database like every other change.
          if (table === 'activity' && message.eventType === 'INSERT') {
            const actor = (message.new as { actor_participant_id?: string | null })
              .actor_participant_id
            if (feed) clearActivity(tripId)
            else if (actor !== youParticipantId) noteActivity(tripId)
          }
          refresh()
        },
      )
    }

    // The socket authorises itself once, when it opens, and Row Level Security is what decides
    // whether an event reaches this reader at all. Subscribing before the session has been read
    // would open it as an anonymous stranger, who is entitled to nothing and would be told nothing.
    let cancelled = false
    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      if (data.session) supabase.realtime.setAuth(data.session.access_token)
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') restored()
        else lost()
      })
    })

    // The socket can die without saying so — a laptop lid, a tunnel — and the browser's own signal
    // is the one that arrives promptly. Coming back this way still goes through the same door, so a
    // recovery is a recovery however it was noticed.
    const onOffline = () => lost()
    const onOnline = () => {
      if (channel.state === 'joined') restored()
    }
    window.addEventListener('offline', onOffline)
    window.addEventListener('online', onOnline)

    return () => {
      cancelled = true
      clearTimeout(timer)
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('online', onOnline)
      // Leaving the trip is not losing the connection, and the notice belongs to the screen that
      // had one.
      setLiveConnection(true)
      void supabase.removeChannel(channel)
    }
  }, [tripId, router, feed, youParticipantId])

  return null
}
