'use client'

import { useActionState, useState } from 'react'

import { deleteExpense, updateExpense, type EditExpenseState } from '@/app/actions/expenses'
import { translator, type Locale } from '@/lib/i18n'
import type { ExpenseDetail, TripParticipant, TripRole } from '@/lib/trips/queries'

const EMPTY: EditExpenseState = { error: null }

/** Cents back into something the amount field can show, with the reader's own separator. */
function editable(amountCents: number, locale: Locale): string {
  const whole = Math.trunc(amountCents / 100)
  const rest = String(amountCents % 100).padStart(2, '0')
  return `${whole}${locale === 'es' ? ',' : '.'}${rest}`
}

export function EditExpenseForm({
  expense,
  participants,
  yourRole,
  locale,
}: {
  expense: ExpenseDetail
  participants: TripParticipant[]
  yourRole: TripRole
  locale: Locale
}) {
  const t = translator(locale)
  const [state, action, pending] = useActionState(updateExpense, EMPTY)
  const [removal, remove, removing] = useActionState(deleteExpense, EMPTY)
  const [type, setType] = useState(expense.type)

  const field = 'min-h-touch rounded-card border border-rule bg-surface px-3 text-ink'
  const inSplit = new Set(expense.shares.map((share) => share.participantId))

  return (
    <div className="flex max-w-prose flex-col gap-5">
      <form action={action} className="flex flex-col gap-5">
        <input type="hidden" name="trip_id" value={expense.tripId} />
        <input type="hidden" name="expense_id" value={expense.id} />

        <div className="flex flex-col gap-1">
          <label htmlFor="description" className="text-sm font-medium">
            {t('newExpense.description.label')}
          </label>
          <input
            id="description"
            name="description"
            defaultValue={expense.description}
            required
            className={field}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="amount" className="text-sm font-medium">
            {t('newExpense.amount.label')}
          </label>
          <input
            id="amount"
            name="amount"
            defaultValue={editable(expense.amountCents, locale)}
            required
            inputMode="decimal"
            autoComplete="off"
            className={`tabular ${field}`}
          />
          <span className="text-sm text-ink-soft">{t('newExpense.amount.hint')}</span>
        </div>

        {yourRole === 'admin' ? (
          <div className="flex flex-col gap-1">
            <label htmlFor="paid_by" className="text-sm font-medium">
              {t('newExpense.payer.label')}
            </label>
            <select id="paid_by" name="paid_by" defaultValue={expense.paidBy} className={field}>
              {participants.map((participant) => (
                <option key={participant.id} value={participant.id}>
                  {participant.displayName}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {yourRole === 'admin' ? (
          <fieldset className="flex flex-col gap-2">
            <legend className="pb-1 text-sm font-medium">{t('newExpense.type.label')}</legend>
            <div className="flex flex-wrap gap-2">
              {(['shared', 'contribution'] as const).map((candidate) => (
                <label
                  key={candidate}
                  className="flex min-h-touch cursor-pointer items-center gap-2 rounded-card border border-rule bg-surface px-3 text-sm"
                >
                  <input
                    type="radio"
                    name="type"
                    value={candidate}
                    checked={type === candidate}
                    onChange={() => setType(candidate)}
                    className="accent-accent"
                  />
                  {t(
                    candidate === 'shared' ? 'expenses.type.shared' : 'expenses.type.contribution',
                  )}
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}

        {type === 'contribution' ? null : (
          <fieldset className="flex flex-col gap-1">
            <legend className="pb-1 text-sm font-medium">{t('newExpense.split.label')}</legend>
            <div className="flex flex-col">
              {participants.map((participant) => (
                <label
                  key={participant.id}
                  className="flex min-h-touch cursor-pointer items-center gap-3 border-b border-rule last:border-b-0"
                >
                  <input
                    type="checkbox"
                    name="split"
                    value={participant.id}
                    defaultChecked={inSplit.has(participant.id)}
                    className="size-5 accent-accent"
                  />
                  {participant.displayName}
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <div className="flex flex-col gap-1">
          <label htmlFor="spent_on" className="text-sm font-medium">
            {t('newExpense.date.label')}
          </label>
          <input
            id="spent_on"
            name="spent_on"
            type="date"
            defaultValue={expense.spentOn}
            className={`tabular ${field}`}
          />
        </div>

        {state.error ? (
          <p role="alert" className="rounded-card bg-debt-soft px-3 py-2 text-sm text-debt">
            {t(state.error)}
          </p>
        ) : null}

        <div>
          <button
            type="submit"
            disabled={pending}
            className="min-h-touch cursor-pointer rounded-card bg-accent px-4 font-semibold text-accent-ink disabled:opacity-50"
          >
            {pending ? t('expense.saving') : t('expense.save')}
          </button>
        </div>
      </form>

      {/* Its own form, so a stray Enter in the fields above can never reach it. */}
      <form action={remove} className="flex flex-col gap-1 border-t border-rule pt-5">
        <input type="hidden" name="trip_id" value={expense.tripId} />
        <input type="hidden" name="expense_id" value={expense.id} />
        <button
          type="submit"
          disabled={removing}
          className="min-h-touch w-fit cursor-pointer rounded-card border border-debt px-4 text-sm font-semibold text-debt disabled:opacity-50"
        >
          {removing ? t('expense.deleting') : t('expense.delete')}
        </button>
        {removal.error ? (
          <p role="alert" className="text-sm text-debt">
            {t(removal.error)}
          </p>
        ) : null}
      </form>
    </div>
  )
}
