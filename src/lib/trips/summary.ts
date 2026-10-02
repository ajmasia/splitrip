import type { ParticipantBalance, TripRole } from '@/lib/trips/queries'
import { planFor, type SettlementLine } from '@/lib/trips/settlement'

export type SummaryParticipant = ParticipantBalance & {
  role: TripRole
  settlementsPaidCents: number
  settlementsReceivedCents: number
}

export type SummaryContribution = {
  expenseId: string
  description: string
  amountCents: number
  spentOn: string
  payerName: string
}

export type SummaryPayment = {
  paymentId: string
  fromName: string
  toName: string
  amountCents: number
  paidOn: string
  voided: boolean
}

/** A trip as it stood the moment it was closed. */
export type ClosingSummary = {
  name: string
  startDate: string | null
  endDate: string | null
  participantCount: number
  expenseCount: number
  totalCents: number
  sharedCents: number
  contributionsCents: number
  costPerPersonCents: number
  participants: SummaryParticipant[]
  contributions: SummaryContribution[]
  payments: SummaryPayment[]
  /** What is still to be handed over, worked out from the frozen balances. */
  plan: SettlementLine[]
}

/** PostgREST hands a `bigint` inside JSON back as a number, but a string has been seen too. */
const cents = (value: unknown) => Number(value ?? 0)
const text = (value: unknown) => (typeof value === 'string' ? value : '')
const maybeText = (value: unknown) => (typeof value === 'string' ? value : null)
const rows = (value: unknown) => (Array.isArray(value) ? value : []) as Record<string, unknown>[]

/**
 * The summary `close_trip` froze, read into the shape the screen needs.
 *
 * The settlement is not part of what was frozen and does not have to be: it is a pure function of
 * the frozen balances, so working it out again gives the same transfers every time the summary is
 * read, for as long as the trip stays closed.
 */
export function readClosingSummary(
  snapshot: unknown,
  yourParticipantId: string | null,
): ClosingSummary {
  const json = (snapshot ?? {}) as Record<string, unknown>

  const participants = rows(json.participants).map((row) => ({
    participantId: text(row.participant_id),
    displayName: text(row.display_name),
    role: (row.role === 'admin' ? 'admin' : 'participant') as TripRole,
    isYou: row.participant_id === yourParticipantId,
    paidCents: cents(row.paid_cents),
    contributedCents: cents(row.contributed_cents),
    chargedCents: cents(row.charged_cents),
    settlementsPaidCents: cents(row.settlements_paid_cents),
    settlementsReceivedCents: cents(row.settlements_received_cents),
    netCents: cents(row.net_cents),
  }))

  return {
    name: text(json.name),
    startDate: maybeText(json.start_date),
    endDate: maybeText(json.end_date),
    participantCount: cents(json.participant_count),
    expenseCount: cents(json.expense_count),
    totalCents: cents(json.total_cents),
    sharedCents: cents(json.shared_cents),
    contributionsCents: cents(json.contributions_cents),
    costPerPersonCents: cents(json.cost_per_person_cents),
    participants,
    contributions: rows(json.contributions).map((row) => ({
      expenseId: text(row.expense_id),
      description: text(row.description),
      amountCents: cents(row.amount_cents),
      spentOn: text(row.spent_on),
      payerName: text(row.payer_name),
    })),
    payments: rows(json.payments).map((row) => ({
      paymentId: text(row.payment_id),
      fromName: text(row.from_name),
      toName: text(row.to_name),
      amountCents: cents(row.amount_cents),
      paidOn: text(row.paid_on),
      voided: row.voided === true,
    })),
    plan: planFor(participants),
  }
}
