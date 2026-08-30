'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { errorCopyKey } from '@/lib/errors'
import type { CopyKey } from '@/lib/i18n'
import { parseAmount, type ParsedAmount } from '@/lib/money/amount'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export type NewExpenseState = {
  error: CopyKey | null
  /** The cents just recorded, when the form is staying open for the next one. */
  recorded: number | null
  /**
   * When it was recorded. Two identical expenses in a row would otherwise produce two identical
   * results, and the form would have no way of telling that the second one happened.
   */
  at: number
}

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
  const stay = text(formData.get('mode')) === 'many'
  const refused = (error: CopyKey): NewExpenseState => ({ error, recorded: null, at: 0 })

  if (description === '') return refused('error.description_required')

  const amount = parseAmount(text(formData.get('amount')))
  if (!amount.ok) return refused(WHY[amount.reason])

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

  if (error) return refused(errorCopyKey(error.code))

  revalidatePath(`/trips/${tripId}`)

  // Entering several in a row means never leaving the form. The list behind it is revalidated all
  // the same, so whatever was recorded is already there when the last one is done.
  if (stay) return { error: null, recorded: amount.amountCents, at: Date.now() }

  redirect(`/trips/${tripId}`)
}

export type EditExpenseState = { error: CopyKey | null }

/**
 * Every argument the form controls is sent, and the ones it does not are left out: `update_expense`
 * reads an absent argument as "leave it as it is", so a traveller correcting the wording of an
 * expense an organiser attributed elsewhere does not accidentally claim it back.
 */
export async function updateExpense(
  _previous: EditExpenseState,
  formData: FormData,
): Promise<EditExpenseState> {
  const tripId = text(formData.get('trip_id'))
  const expenseId = text(formData.get('expense_id'))
  const description = text(formData.get('description')).trim()

  if (description === '') return { error: 'error.description_required' }

  const amount = parseAmount(text(formData.get('amount')))
  if (!amount.ok) return { error: WHY[amount.reason] }

  const kind = text(formData.get('type'))
  const type = kind === '' ? null : kind === 'contribution' ? 'contribution' : 'shared'
  const paidBy = text(formData.get('paid_by')).trim()
  const split = formData.getAll('split').filter((id): id is string => typeof id === 'string')

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.rpc('update_expense', {
    p_expense_id: expenseId,
    p_description: description,
    p_amount_cents: amount.amountCents,
    p_type: type,
    p_spent_on: dateOrNull(formData.get('spent_on')),
    p_paid_by: paidBy === '' ? null : paidBy,
    p_split_participant_ids: split.length === 0 ? null : split,
  })

  if (error) return { error: errorCopyKey(error.code) }

  revalidatePath(`/trips/${tripId}`)
  redirect(`/trips/${tripId}/expenses/${expenseId}`)
}

export async function deleteExpense(
  _previous: EditExpenseState,
  formData: FormData,
): Promise<EditExpenseState> {
  const tripId = text(formData.get('trip_id'))
  const supabase = await createSupabaseServerClient()

  const { error } = await supabase.rpc('delete_expense', {
    p_expense_id: text(formData.get('expense_id')),
  })

  if (error) return { error: errorCopyKey(error.code) }

  revalidatePath(`/trips/${tripId}`)
  redirect(`/trips/${tripId}`)
}
