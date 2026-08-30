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
export function TripChannel({
  tripId,
  accessToken,
  youParticipantId = null,
  feed = false,
}: {
  tripId: string
  /**
   * The reader's token, handed down from the server rather than looked up here.
   *
   * The browser client cannot always find the session for itself: it derives the name it stores
   * one under from the Supabase address, and locally that address is rewritten so a phone can
   * reach it — which leaves it looking under a name the server never wrote. It would then open the
   * socket as a stranger, subscribe happily, and receive nothing at all, because Row Level Security
   * is doing exactly its job. The token is no more exposed here than in the cookie it comes from,
   * which the browser reads too.
   */
  accessToken: string | null
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

    // Closing a channel reports itself as a channel that closed, and that report arrives after the
    // screen has already gone. Without this the notice would be raised on the way out and left
    // there, with nothing subscribed any more to take it back.
    let cancelled = false

    // A subscription that comes back has been away, and everything that happened in between arrived
    // nowhere. Re-reading on the way back is the whole of the recovery: the events are gone, but
    // the state they described is still in the database, and that is what the screen asks for.
    let away = false
    const restored = () => {
      if (cancelled) return
      setLiveConnection(true)
      if (!away) return
      away = false
      refresh()
    }
    const lost = () => {
      if (cancelled) return
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
    // whether an event reaches this reader at all. Opening it as an anonymous stranger would
    // subscribe successfully and be told nothing, which is the hardest kind of nothing to debug.
    if (accessToken !== null) supabase.realtime.setAuth(accessToken)
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') restored()
      else lost()
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
      void supabase.removeChannel(channel)
      // Leaving the trip is not losing the connection, and the notice belongs to the screen that
      // had one. Said last, so nothing on the way out can contradict it.
      setLiveConnection(true)
    }
    // A refreshed token means a new socket: the old one was authorised with what has expired.
  }, [tripId, router, feed, youParticipantId, accessToken])

  return null
}
