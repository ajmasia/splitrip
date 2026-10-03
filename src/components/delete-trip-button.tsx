'use client'

import { useActionState, useState } from 'react'

import { deleteTrip, type DeleteTripState } from '@/app/actions/trips'
import { translator, type Locale } from '@/lib/i18n'
import { confirmsTripName } from '@/lib/trips/delete-confirmation'

const EMPTY: DeleteTripState = { error: null }

/**
 * Deleting takes the trip from everybody and nothing brings it back, so it asks more than closing
 * does: after saying what goes, it wants the trip's name typed out. The button stays disabled until
 * the name matches, by the same comparison `delete_trip` makes, which has the last word.
 */
export function DeleteTripButton({
  tripId,
  tripName,
  locale,
}: {
  tripId: string
  tripName: string
  locale: Locale
}) {
  const t = translator(locale)
  const [state, action, pending] = useActionState(deleteTrip, EMPTY)
  const [confirming, setConfirming] = useState(false)
  const [typed, setTyped] = useState('')

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="flex min-h-touch w-fit cursor-pointer items-center rounded-card border border-rule px-4 text-sm font-semibold text-debt"
      >
        {t('trip.delete')}
      </button>
    )
  }

  const matches = confirmsTripName(typed, tripName)

  return (
    <form
      action={action}
      className="flex max-w-prose flex-col gap-3 rounded-card border border-rule bg-surface p-4"
    >
      <input type="hidden" name="trip_id" value={tripId} />
      <p className="text-ink-soft">{t('trip.delete.body')}</p>
      <div className="flex flex-col gap-1">
        <label htmlFor="confirm_name" className="text-sm font-medium">
          {t('trip.delete.name', { name: tripName })}
        </label>
        <input
          id="confirm_name"
          name="confirm_name"
          type="text"
          autoComplete="off"
          spellCheck={false}
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          className="min-h-touch w-full min-w-0 rounded-card border border-rule bg-surface px-3 text-ink"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={pending || !matches}
          className="min-h-touch cursor-pointer rounded-card border border-debt px-4 text-sm font-semibold text-debt disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? t('trip.deleting') : t('trip.delete.confirm')}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setConfirming(false)
            setTyped('')
          }}
          className="min-h-touch cursor-pointer rounded-card border border-rule px-4 text-sm text-ink-soft disabled:opacity-50"
        >
          {t('trip.delete.cancel')}
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
