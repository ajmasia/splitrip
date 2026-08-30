'use client'

import { useActionState } from 'react'

import { removeParticipant, type RemoveParticipantState } from '@/app/actions/participants'
import { translator, type Locale } from '@/lib/i18n'

const EMPTY: RemoveParticipantState = { error: null, count: 0 }

export function RemoveParticipantButton({
  participantId,
  tripId,
  name,
  locale,
}: {
  participantId: string
  tripId: string
  name: string
  locale: Locale
}) {
  const t = translator(locale)
  const [state, action, pending] = useActionState(removeParticipant, EMPTY)

  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <input type="hidden" name="participant_id" value={participantId} />
      <input type="hidden" name="trip_id" value={tripId} />
      <button
        type="submit"
        disabled={pending}
        aria-label={t('trip.remove.label', { name })}
        className="min-h-touch cursor-pointer rounded-card border border-rule px-3 text-sm text-ink-soft disabled:opacity-50"
      >
        {pending ? t('trip.removing') : t('trip.remove')}
      </button>
      {state.error ? (
        <p role="alert" className="text-right text-sm text-debt">
          {t(state.error, { count: state.count })}
        </p>
      ) : null}
    </form>
  )
}
