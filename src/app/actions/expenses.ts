'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { errorCopyKey } from '@/lib/errors'
import type { CopyKey } from '@/lib/i18n'
import { parseAmount, type ParsedAmount } from '@/lib/money/amount'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export type NewExpenseState = { error: CopyKey | null }

const text = (value: FormDataEntryValue | null) => (typeof value === 'string' ? value : '')

/** An empty date field arrives as '', and the database reads a missing date as today. */
const dateOrNull = (value: FormDataEntryValue | null) => text(value).trim() || null

const WHY: Record<Extract<ParsedAmount, { ok: false }>['reason'], CopyKey> = {
  missing: 'error.amount_required',
  malformed: 'error.amount_malformed',
  'too-precise': 'error.amount_too_precise',
  'not-positive': 'error.amount_not_positive',
}

export async function createExpense(
  _previous: NewExpenseState,
  formData: FormData,
): Promise<NewExpenseState> {
  const tripId = text(formData.get('trip_id'))
  const description = text(formData.get('description')).trim()

  // The constraint on the table is still the authority on a blank description. This only catches it
  // before the round trip, because a check violation arrives as a code with no message worth
  // showing, and a field of spaces satisfies `required` in the browser.
  if (description === '') return { error: 'error.description_required' }

  const amount = parseAmount(text(formData.get('amount')))
  if (!amount.ok) return { error: WHY[amount.reason] }

  const supabase = await createSupabaseServerClient()

  // The split is sent as the people who were on screen, rather than left out: somebody joining
  // between opening the form and sending it should not silently end up in a dinner they missed.
  const split = formData.getAll('split').filter((id): id is string => typeof id === 'string')

  // The payer is left out unless one was chosen, and the database reads its absence as "whoever is
  // recording this". A form that offers no choice therefore sends nothing, and a forged one is
  // refused there rather than here.
  const paidBy = text(formData.get('paid_by')).trim()

  // Anything but the one word is read as the ordinary kind, so a form with no type control — which
  // is what a traveller sees — records a shared expense and nothing else.
  const type = text(formData.get('type')) === 'contribution' ? 'contribution' : 'shared'

  const { error } = await supabase.rpc('create_expense', {
    p_trip_id: tripId,
    p_description: description,
    p_amount_cents: amount.amountCents,
    p_type: type,
    p_spent_on: dateOrNull(formData.get('spent_on')),
    p_paid_by: paidBy === '' ? null : paidBy,
    // A contribution is split among nobody, and the database refuses one that arrives with a split.
    p_split_participant_ids: type === 'contribution' ? null : split,
  })

  if (error) return { error: errorCopyKey(error.code) }

  revalidatePath(`/trips/${tripId}`)
  redirect(`/trips/${tripId}`)
}
