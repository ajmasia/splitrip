'use client'

import { useActionState } from 'react'

import { setParticipantRole, type ChangeRoleState } from '@/app/actions/participants'
import { translator, type CopyKey, type Locale } from '@/lib/i18n'
import type { TripRole } from '@/lib/trips/queries'

const EMPTY: ChangeRoleState = { error: null }

/** What the button says, and what it would make of the person it sits beside. */
const MOVE: Record<TripRole, { becomes: TripRole; action: CopyKey; label: CopyKey }> = {
  participant: {
    becomes: 'admin',
    action: 'trip.role.promote',
    label: 'trip.role.promote.label',
  },
  admin: {
    becomes: 'participant',
    action: 'trip.role.demote',
    label: 'trip.role.demote.label',
  },
}

export function ChangeRoleButton({
  participantId,
  tripId,
  role,
  name,
  locale,
}: {
  participantId: string
  tripId: string
  role: TripRole
  name: string
  locale: Locale
}) {
  const t = translator(locale)
  const [state, action, pending] = useActionState(setParticipantRole, EMPTY)
  const move = MOVE[role]

  return (
    <form action={action} className="flex flex-col items-start gap-1">
      <input type="hidden" name="participant_id" value={participantId} />
      <input type="hidden" name="trip_id" value={tripId} />
      <input type="hidden" name="role" value={move.becomes} />
      <button
        type="submit"
        disabled={pending}
        aria-label={t(move.label, { name })}
        className="min-h-touch cursor-pointer rounded-card border border-rule px-3 text-sm text-ink-soft disabled:opacity-50"
      >
        {pending ? t('trip.role.changing') : t(move.action)}
      </button>
      {state.error ? (
        <p role="alert" className="text-sm text-debt">
          {t(state.error)}
        </p>
      ) : null}
    </form>
  )
}
