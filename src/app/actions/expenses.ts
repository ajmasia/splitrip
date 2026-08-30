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

  // Payer and split are left out on purpose: the database reads their absence as "whoever is
  // recording this" and "everybody on the trip", so the defaults live in one place.
  const { error } = await supabase.rpc('create_expense', {
    p_trip_id: tripId,
    p_description: description,
    p_amount_cents: amount.amountCents,
    p_spent_on: dateOrNull(formData.get('spent_on')),
  })

  if (error) return { error: errorCopyKey(error.code) }

  revalidatePath(`/trips/${tripId}`)
  redirect(`/trips/${tripId}`)
}
