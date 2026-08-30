/**
 * Checks the guarantee the design calls its gravest risk: that a client cannot receive the changes
 * of a trip it does not belong to.
 *
 * The `trip_id` filter a subscription carries is a convenience, not the guarantee — a client is
 * free to omit it, or to ask for somebody else's trip on purpose, which is exactly what this does.
 * The guarantee is Row Level Security, which Realtime evaluates against each subscriber before
 * delivering. That cannot be checked by reading the policies: it has to be a real socket, a real
 * session and a real write.
 *
 * It needs the local stack running, so it is not part of `npm test`, which must stay runnable
 * without Docker. Run with: npm run test:realtime
 */

import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'

import { createClient } from '@supabase/supabase-js'

/** How long to wait before concluding that an event is not coming. */
const SILENCE = 4000
/** How long to wait for an event that should come. Failing this means the test itself is broken. */
const DELIVERY = 8000

const status = JSON.parse(
  execFileSync('npx', ['--no-install', 'supabase', 'status', '-o', 'json'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }),
)

const URL = status.API_URL
const ANON = status.ANON_KEY
const SERVICE = status.SERVICE_ROLE_KEY

if (!URL || !ANON || !SERVICE) {
  console.error('Could not read the local stack from `supabase status`. Start it: npm run db:start')
  process.exit(1)
}

/** Writes as the database owner, which is what a fixture is allowed to do and a client is not. */
const admin = createClient(URL, SERVICE, { auth: { persistSession: false } })

const failures = []
const pass = (message) => console.log(`✓ ${message}`)
const fail = (message) => {
  failures.push(message)
  console.error(`✗ ${message}`)
}

/** A traveller: a real anonymous session, the kind the application hands out through an invitation. */
async function traveller() {
  const client = createClient(URL, ANON, { auth: { persistSession: false } })
  const { data, error } = await client.auth.signInAnonymously()
  if (error) throw new Error(`Could not create a session: ${error.message}`)
  return { client, userId: data.user.id }
}

/**
 * Subscribes exactly as a trip screen does, and collects what arrives. The filter names the trip
 * asked for, which is not always the trip the subscriber belongs to — that is the point.
 */
async function watch(client, tripId) {
  const received = []
  const channel = client.channel(`test:${tripId}:${randomUUID()}`)

  for (const [table, column] of [
    ['expenses', 'trip_id'],
    ['participants', 'trip_id'],
  ]) {
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table, filter: `${column}=eq.${tripId}` },
      (message) => received.push(`${message.table}.${message.eventType}`),
    )
  }

  const {
    data: { session },
  } = await client.auth.getSession()
  if (session) client.realtime.setAuth(session.access_token)

  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('the subscription never opened')), 15000)
    channel.subscribe((state) => {
      if (state === 'SUBSCRIBED') {
        clearTimeout(timer)
        resolve()
      }
    })
  })

  // The socket says "subscribed" the moment the channel is joined, but the change feed reads the
  // write-ahead log on its own clock and takes an instant to start including this subscriber. A
  // person opening a screen is slower than that; a script is not, and without this pause the test
  // would report a leak-proof application as a broken one.
  await new Promise((resolve) => setTimeout(resolve, 1500))

  return {
    received,
    /** Waits for something to arrive, or gives up. Resolves either way; the caller decides. */
    async settle(milliseconds) {
      const until = Date.now() + milliseconds
      while (Date.now() < until) {
        if (received.length > 0) {
          // Let anything that travels with it land too, so a count is a count.
          await new Promise((resolve) => setTimeout(resolve, 500))
          return received
        }
        await new Promise((resolve) => setTimeout(resolve, 200))
      }
      return received
    },
    close: () => client.removeChannel(channel),
  }
}

async function trip(name) {
  const id = randomUUID()
  const { error } = await admin.from('trips').insert({ id, name })
  if (error) throw new Error(`Could not create ${name}: ${error.message}`)
  return id
}

async function join(tripId, userId, displayName, role = 'admin') {
  const id = randomUUID()
  const { error } = await admin
    .from('participants')
    .insert({ id, trip_id: tripId, user_id: userId, display_name: displayName, role })
  if (error) throw new Error(`Could not add ${displayName}: ${error.message}`)
  return id
}

async function spend(tripId, participantId, description, amountCents) {
  const { error } = await admin.from('expenses').insert({
    trip_id: tripId,
    type: 'shared',
    description,
    amount_cents: amountCents,
    paid_by: participantId,
    created_by: participantId,
  })
  if (error) throw new Error(`Could not record ${description}: ${error.message}`)
}

const created = { trips: [], users: [] }

async function main() {
  const ana = await traveller()
  const beto = await traveller()
  created.users.push(ana.userId, beto.userId)

  const tripA = await trip('Isolation A')
  const tripB = await trip('Isolation B')
  created.trips.push(tripA, tripB)

  const anaOnA = await join(tripA, ana.userId, 'Ana')
  const betoOnB = await join(tripB, beto.userId, 'Beto')

  // ---------------------------------------------------------------- a trip somebody belongs to
  const own = await watch(ana.client, tripA)
  await spend(tripA, anaOnA, 'Her own trip', 1000)
  const mine = await own.settle(DELIVERY)
  if (mine.includes('expenses.INSERT')) {
    pass('a participant receives the changes of their own trip')
  } else {
    fail('a participant receives NOTHING for their own trip — the rest of this proves nothing')
  }
  await own.close()

  // ------------------------------------------------- somebody else's trip, asked for on purpose
  const trespass = await watch(ana.client, tripB)
  await spend(tripB, betoOnB, 'Not her business', 5000)
  const stolen = await trespass.settle(SILENCE)
  if (stolen.length === 0) {
    pass('subscribing to another trip on purpose delivers nothing at all')
  } else {
    fail(`another trip leaked ${stolen.length} event(s): ${stolen.join(', ')}`)
  }
  await trespass.close()

  // ------------------------------------------------------------------- and once she is removed
  const anaOnB = await join(tripB, ana.userId, 'Ana', 'participant')
  const guest = await watch(ana.client, tripB)
  await spend(tripB, betoOnB, 'While she is still on it', 2000)
  const asMember = await guest.settle(DELIVERY)
  if (asMember.includes('expenses.INSERT')) {
    pass('a participant added to a trip starts receiving it')
  } else {
    fail('a participant added to a trip receives nothing — the removal below proves nothing')
  }

  const { error: removed } = await admin.from('participants').delete().eq('id', anaOnB)
  if (removed) throw new Error(`Could not remove her: ${removed.message}`)
  // The deletion is itself an event on a trip she was still on when it was published.
  await new Promise((resolve) => setTimeout(resolve, 1500))
  guest.received.length = 0

  await spend(tripB, betoOnB, 'After she was removed', 3000)
  const afterwards = await guest.settle(SILENCE)
  if (afterwards.length === 0) {
    pass('a removed participant stops receiving the trip')
  } else {
    fail(`a removed participant still received ${afterwards.length} event(s): ${afterwards.join(', ')}`)
  }
  await guest.close()

  await ana.client.auth.signOut()
  await beto.client.auth.signOut()
}

try {
  await main()
} catch (error) {
  fail(error instanceof Error ? error.message : String(error))
} finally {
  for (const id of created.trips) await admin.from('trips').delete().eq('id', id)
  for (const id of created.users) await admin.auth.admin.deleteUser(id).catch(() => {})
}

if (failures.length > 0) {
  console.error(`\n${failures.length} check(s) failed.`)
  process.exit(1)
}

console.log('\nReal time is isolated per trip.')
process.exit(0)
