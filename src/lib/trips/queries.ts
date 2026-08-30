import { createSupabaseServerClient } from '@/lib/supabase/server'

export type TripRole = 'admin' | 'participant'
export type TripStatus = 'open' | 'closed'

export type TripSummary = {
  id: string
  name: string
  status: TripStatus
  startDate: string | null
  endDate: string | null
  totalCents: number
  expenseCount: number
  participantCount: number
  yourRole: TripRole | null
}

export type TripParticipant = {
  id: string
  displayName: string
  role: TripRole
  isYou: boolean
}

type OverviewRow = {
  id: string
  name: string
  status: TripStatus
  start_date: string | null
  end_date: string | null
  total_cents: number | string
  expense_count: number | string
  participant_count: number | string
}

/** PostgREST can hand a `bigint` back as a string, and an amount has to be a number to be added. */
const count = (value: number | string) => Number(value)

function toSummary(row: OverviewRow, yourRole: TripRole | null): TripSummary {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    startDate: row.start_date,
    endDate: row.end_date,
    totalCents: count(row.total_cents),
    expenseCount: count(row.expense_count),
    participantCount: count(row.participant_count),
    yourRole,
  }
}

const OVERVIEW_COLUMNS =
  'id, name, status, start_date, end_date, total_cents, expense_count, participant_count'

/**
 * Row Level Security decides what comes back, so this reads every trip it can see and that is
 * already the answer to "the trips you take part in".
 */
export async function listTrips(): Promise<TripSummary[]> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return []

  const [trips, mine] = await Promise.all([
    supabase
      .from('trip_overview')
      .select(OVERVIEW_COLUMNS)
      .order('created_at', { ascending: false }),
    supabase.from('participants').select('trip_id, role').eq('user_id', user.id),
  ])

  if (trips.error) throw new Error(trips.error.message)
  if (mine.error) throw new Error(mine.error.message)

  const roles = new Map(mine.data.map((row) => [row.trip_id, row.role as TripRole]))

  return trips.data.map((row) => toSummary(row as OverviewRow, roles.get(row.id) ?? null))
}

export async function getTrip(
  id: string,
): Promise<{ trip: TripSummary; participants: TripParticipant[] } | null> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const [overview, participants] = await Promise.all([
    supabase.from('trip_overview').select(OVERVIEW_COLUMNS).eq('id', id).maybeSingle(),
    supabase
      .from('participants')
      .select('id, display_name, role, user_id')
      .eq('trip_id', id)
      .order('display_name'),
  ])

  if (overview.error) throw new Error(overview.error.message)
  if (participants.error) throw new Error(participants.error.message)
  if (!overview.data) return null

  const you = participants.data.find((row) => row.user_id === user.id)

  return {
    trip: toSummary(overview.data as OverviewRow, (you?.role as TripRole | undefined) ?? null),
    participants: participants.data.map((row) => ({
      id: row.id,
      displayName: row.display_name,
      role: row.role as TripRole,
      isYou: row.user_id === user.id,
    })),
  }
}
