'use client'

import Link from 'next/link'
import { useActionState, useEffect, useRef } from 'react'

import { createExpense, type NewExpenseState } from '@/app/actions/expenses'
import { translator, type Locale } from '@/lib/i18n'
import type { TripParticipant, TripRole } from '@/lib/trips/queries'

const EMPTY: NewExpenseState = { error: null }

export function NewExpenseForm({
  tripId,
  today,
  participants,
  yourRole,
  yourParticipantId,
  locale,
}: {
  tripId: string
  /** The server's date, which is what the first paint can agree on. */
  today: string
  participants: TripParticipant[]
  yourRole: TripRole
  yourParticipantId: string
  locale: Locale
}) {
  const t = translator(locale)
  const [state, action, pending] = useActionState(createExpense, EMPTY)
  const date = useRef<HTMLInputElement>(null)

  // The day of an expense is the day where the person spending it is, not where the server is
  // hosted. The browser's date can only be read after hydration, so the server's stands in until
  // then; the two differ for a couple of hours a day and the field is corrected before it is used.
  useEffect(() => {
    const field = date.current
    if (field === null || field.value !== today) return

    const local = new Date()
    const here = `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, '0')}-${String(local.getDate()).padStart(2, '0')}`
    if (here !== today) field.value = here
  }, [today])

  const field = 'min-h-touch rounded-card border border-rule bg-surface px-3 text-ink'

  return (
    <form action={action} className="flex max-w-prose flex-col gap-5">
      <input type="hidden" name="trip_id" value={tripId} />

      <div className="flex flex-col gap-1">
        <label htmlFor="description" className="text-sm font-medium">
          {t('newExpense.description.label')}
        </label>
        <input
          id="description"
          name="description"
          required
          autoFocus
          placeholder={t('newExpense.description.placeholder')}
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
          required
          // Not type="number": it brings a spinner nobody wants on a price, and its own idea of
          // which decimal separator is valid. This asks the phone for the numeric keypad and lets
          // the amount parser decide what a number is.
          inputMode="decimal"
          autoComplete="off"
          placeholder="0,00"
          className={`tabular ${field}`}
        />
        <span className="text-sm text-ink-soft">{t('newExpense.amount.hint')}</span>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="spent_on" className="text-sm font-medium">
          {t('newExpense.date.label')}
        </label>
        <input
          ref={date}
          id="spent_on"
          name="spent_on"
          type="date"
          defaultValue={today}
          className={`tabular ${field}`}
        />
      </div>

      {/*
        Saying that somebody else paid is a claim about their money, so the choice is an organiser's
        and the database refuses it from anybody else. Choosing who a dinner is split among is not:
        whoever paid for it is the person who knows who was there.
      */}
      {yourRole === 'admin' ? (
        <div className="flex flex-col gap-1">
          <label htmlFor="paid_by" className="text-sm font-medium">
            {t('newExpense.payer.label')}
          </label>
          <select id="paid_by" name="paid_by" defaultValue={yourParticipantId} className={field}>
            {participants.map((participant) => (
              <option key={participant.id} value={participant.id}>
                {participant.displayName}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <p className="rounded-card border border-rule bg-surface-2 px-3 py-2 text-sm text-ink-soft">
          {t('newExpense.payer.you')}
        </p>
      )}

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
                defaultChecked
                className="size-5 accent-accent"
              />
              {participant.displayName}
            </label>
          ))}
        </div>
        <span className="pt-1 text-sm text-ink-soft">{t('newExpense.split.hint')}</span>
      </fieldset>

      {state.error ? (
        <p role="alert" className="rounded-card bg-debt-soft px-3 py-2 text-sm text-debt">
          {t(state.error)}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="min-h-touch cursor-pointer rounded-card bg-accent px-4 font-semibold text-accent-ink disabled:opacity-50"
        >
          {pending ? t('newExpense.pending') : t('newExpense.submit')}
        </button>
        <Link
          href={`/trips/${tripId}`}
          className="flex min-h-touch items-center rounded-card border border-rule px-4 text-ink-soft"
        >
          {t('newExpense.cancel')}
        </Link>
      </div>
    </form>
  )
}
