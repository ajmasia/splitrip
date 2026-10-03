/**
 * The broadcast a trip's channel carries when the trip has been deleted.
 *
 * It travels as a broadcast because a deleted row cannot: Realtime checks each change against the
 * reader's policies, which ask whether they are on the trip, and by then nobody is.
 */
export const TRIP_DELETED_EVENT = 'trip_deleted'

/** Where everybody lands once a trip is gone: their list, with the notice that says why. */
export const TRIP_DELETED_LANDING = '/?deleted'
