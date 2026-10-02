'use client'

import { useActionState, useState } from 'react'

import { closeTrip, type TripStatusState } from '@/app/actions/trips'
import { translator, type Locale } from '@/lib/i18n'

const EMPTY: TripStatusState = { error: null }

/**
 * Closing turns the trip read-only for everybody, so it takes two steps: the first says what is
 * about to happen, the second does it. Reopening exists, which is why this is a confirmation and not
 * a warning — but nobody should freeze the accounts of five people by brushing a button.
 */
export function CloseTripButton({ tripId, locale }: { tripId: string; locale: Locale }) {
  const t = translator(locale)
  const [state, action, pending] = useActionState(closeTrip, EMPTY)
  const [confirming, setConfirming] = useState(false)

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="flex min-h-touch w-fit cursor-pointer items-center rounded-card border border-rule px-4 text-sm font-semibold"
      >
        {t('trip.close')}
      </button>
    )
  }

  return (
    <form
      action={action}
      className="flex max-w-prose flex-col gap-3 rounded-card border border-rule bg-surface p-4"
    >
      <input type="hidden" name="trip_id" value={tripId} />
      <p className="text-ink-soft">{t('trip.close.body')}</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={pending}
          className="min-h-touch cursor-pointer rounded-card bg-accent px-4 text-sm font-semibold text-accent-ink disabled:opacity-50"
        >
          {pending ? t('trip.closing') : t('trip.close.confirm')}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => setConfirming(false)}
          className="min-h-touch cursor-pointer rounded-card border border-rule px-4 text-sm text-ink-soft disabled:opacity-50"
        >
          {t('trip.close.cancel')}
        </button>
      </div>
      {state.error ? (
        <p role="alert" className="text-sm text-debt">
          {t(state.error)}
        </p>
      ) : null}
    </form>
  )
}
