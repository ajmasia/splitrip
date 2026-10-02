'use client'

import { useActionState } from 'react'

import { reopenTrip, type TripStatusState } from '@/app/actions/trips'
import { translator, type Locale } from '@/lib/i18n'

const EMPTY: TripStatusState = { error: null }

/**
 * Reopening takes one step: it loses nothing, since the expenses were never touched, and closing
 * again freezes a fresh summary from whatever was changed in between.
 */
export function ReopenTripButton({ tripId, locale }: { tripId: string; locale: Locale }) {
  const t = translator(locale)
  const [state, action, pending] = useActionState(reopenTrip, EMPTY)

  return (
    <form action={action} className="flex flex-col gap-1">
      <input type="hidden" name="trip_id" value={tripId} />
      <button
        type="submit"
        disabled={pending}
        className="flex min-h-touch w-fit cursor-pointer items-center rounded-card border border-rule px-4 text-sm font-semibold disabled:opacity-50"
      >
        {pending ? t('trip.reopening') : t('trip.reopen')}
      </button>
      {state.error ? (
        <p role="alert" className="text-sm text-debt">
          {t(state.error)}
        </p>
      ) : null}
    </form>
  )
}
