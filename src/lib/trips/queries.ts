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

export type ExpenseType = 'shared' | 'contribution'

export type TripExpense = {
  id: string
  description: string
  amountCents: number
  type: ExpenseType
  spentOn: string
  paidByName: string
  /** Zero for a contribution, which is split among nobody. */
  splitCount: number
}

type ExpenseRow = {
  id: string
  description: string
  amount_cents: number | string
  type: ExpenseType
  spent_on: string
  paid_by_name: string
  split_count: number | string
}

/**
 * Most recent first, and within a day the most recently recorded first: several expenses carry the
 * same date, and leaving their order to the database would shuffle the list between two reads. The
 * identifier settles the last of it — two expenses recorded in the same statement share a timestamp
 * as well as a date, and an arbitrary order is fine as long as it is the same one every time.
 */
export async function listExpenses(tripId: string): Promise<TripExpense[]> {
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('expense_overview')
    .select('id, description, amount_cents, type, spent_on, paid_by_name, split_count')
    .eq('trip_id', tripId)
    .order('spent_on', { ascending: false })
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })

  if (error) throw new Error(error.message)

  return (data as ExpenseRow[]).map((row) => ({
    id: row.id,
    description: row.description,
    amountCents: count(row.amount_cents),
    type: row.type,
    spentOn: row.spent_on,
    paidByName: row.paid_by_name,
    splitCount: count(row.split_count),
  }))
}

export type ExpenseShare = {
  participantId: string
  displayName: string
  amountCents: number
}

export type ExpenseDetail = {
  id: string
  tripId: string
  description: string
  amountCents: number
  type: ExpenseType
  spentOn: string
  paidBy: string
  paidByName: string
  createdBy: string
  createdByName: string
  shares: ExpenseShare[]
}

/**
 * One expense, with what each person in it was charged. The names are joined here rather than
 * embedded in the query because the screen already has the trip's participants for its form, and
 * two reads of the same list would be two chances for them to disagree.
 */
export async function getExpense(
  id: string,
  participants: TripParticipant[],
): Promise<ExpenseDetail | null> {
  const supabase = await createSupabaseServerClient()

  const [expense, shares] = await Promise.all([
    supabase
      .from('expense_overview')
      .select(
        'id, trip_id, description, amount_cents, type, spent_on, paid_by, paid_by_name, created_by',
      )
      .eq('id', id)
      .maybeSingle(),
    supabase.from('expense_shares').select('participant_id, amount_cents').eq('expense_id', id),
  ])

  if (expense.error) throw new Error(expense.error.message)
  if (shares.error) throw new Error(shares.error.message)
  if (!expense.data) return null

  const row = expense.data as ExpenseRow & {
    trip_id: string
    paid_by: string
    created_by: string
  }
  const named = new Map(
    participants.map((participant) => [participant.id, participant.displayName]),
  )

  return {
    id: row.id,
    tripId: row.trip_id,
    description: row.description,
    amountCents: count(row.amount_cents),
    type: row.type,
    spentOn: row.spent_on,
    paidBy: row.paid_by,
    paidByName: row.paid_by_name,
    createdBy: row.created_by,
    createdByName: named.get(row.created_by) ?? row.paid_by_name,
    shares: shares.data
      .map((share) => ({
        participantId: share.participant_id as string,
        displayName: named.get(share.participant_id as string) ?? '',
        amountCents: count(share.amount_cents as number | string),
      }))
      .sort((one, other) => one.displayName.localeCompare(other.displayName)),
  }
}

export type ParticipantBalance = {
  participantId: string
  displayName: string
  isYou: boolean
  /** What they fronted in `shared` expenses, which is what the group owes them back. */
  paidCents: number
  /** What they fronted and asked nobody to share. It changes no balance; it explains one. */
  contributedCents: number
  chargedCents: number
  /** Positive means the group owes them; negative, that they owe the group. */
  netCents: number
}

type BalanceRow = {
  participant_id: string
  paid_cents: number | string
  contributed_cents: number | string
  charged_cents: number | string
  net_cents: number | string
}

/**
 * The balances of a trip, in the same order the participants are listed everywhere else: by name,
 * which stays put, rather than by amount, which would reshuffle the sheet as expenses land.
 *
 * The arithmetic is the view's, not this function's. A balance recomputed here would be a second
 * opinion about the same rows, and two opinions about money is one too many.
 */
export async function listBalances(
  tripId: string,
  participants: TripParticipant[],
): Promise<ParticipantBalance[]> {
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('participant_balances')
    .select('participant_id, paid_cents, contributed_cents, charged_cents, net_cents')
    .eq('trip_id', tripId)

  if (error) throw new Error(error.message)

  const balances = new Map((data as BalanceRow[]).map((row) => [row.participant_id, row]))

  return participants.map((participant) => {
    const row = balances.get(participant.id)

    return {
      participantId: participant.id,
      displayName: participant.displayName,
      isYou: participant.isYou,
      paidCents: count(row?.paid_cents ?? 0),
      contributedCents: count(row?.contributed_cents ?? 0),
      chargedCents: count(row?.charged_cents ?? 0),
      netCents: count(row?.net_cents ?? 0),
    }
  })
}

export type TripPayment = {
  id: string
  fromName: string
  toName: string
  amountCents: number
  paidOn: string
  /** Set when the payment was taken back. It stays on the list, struck out rather than gone. */
  voided: boolean
  createdBy: string
}

type PaymentRow = {
  id: string
  from_participant_id: string
  to_participant_id: string
  amount_cents: number | string
  paid_on: string
  voided_at: string | null
  created_by: string
}

/**
 * The trip's settlements, most recent first. Voided ones are read too: a payment that was recorded
 * and taken back is part of what happened, and a history that quietly drops it leaves somebody
 * wondering whether they imagined writing it down.
 */
export async function listPayments(
  tripId: string,
  participants: TripParticipant[],
): Promise<TripPayment[]> {
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('payments')
    .select(
      'id, from_participant_id, to_participant_id, amount_cents, paid_on, voided_at, created_by',
    )
    .eq('trip_id', tripId)
    .order('paid_on', { ascending: false })
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })

  if (error) throw new Error(error.message)

  const named = new Map(
    participants.map((participant) => [participant.id, participant.displayName]),
  )

  return (data as PaymentRow[]).map((row) => ({
    id: row.id,
    fromName: named.get(row.from_participant_id) ?? '',
    toName: named.get(row.to_participant_id) ?? '',
    amountCents: count(row.amount_cents),
    paidOn: row.paid_on,
    voided: row.voided_at !== null,
    createdBy: row.created_by,
  }))
}
