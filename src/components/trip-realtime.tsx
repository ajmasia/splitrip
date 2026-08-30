import { TripChannel } from '@/components/trip-channel'
import { getAccessToken } from '@/lib/auth/viewer'

/**
 * The trip's live connection, with the reader's token read on the server and handed down.
 *
 * A server component in front of a client one for one reason: the token. Everything else about the
 * subscription happens in the browser, but only the server can be sure of who is asking.
 */
export async function TripRealtime(props: {
  tripId: string
  youParticipantId?: string | null
  feed?: boolean
}) {
  return <TripChannel {...props} accessToken={await getAccessToken()} />
}
