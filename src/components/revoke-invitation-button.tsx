'use client'

import { useActionState, useEffect, useRef } from 'react'

import { revokeInvitation, type RevokeInvitationState } from '@/app/actions/invitations'
import { translator, type Locale } from '@/lib/i18n'

const EMPTY: RevokeInvitationState = { error: null }

export function RevokeInvitationButton({
  invitationId,
  tripId,
  locale,
  onRevoked,
}: {
  invitationId: string
  tripId: string
  locale: Locale
  /** For the caller that is showing the link: once it is dead, there is nothing left to show. */
  onRevoked?: () => void
}) {
  const t = translator(locale)
  const [state, action, pending] = useActionState(revokeInvitation, EMPTY)
  const done = useRef(false)

  useEffect(() => {
    if (pending) done.current = true
    if (!pending && done.current && state.error === null) onRevoked?.()
  }, [pending, state.error, onRevoked])

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="invitation_id" value={invitationId} />
      <input type="hidden" name="trip_id" value={tripId} />
      <button
        type="submit"
        disabled={pending}
        className="min-h-touch w-fit cursor-pointer rounded-card border border-rule px-4 text-sm text-ink-soft disabled:opacity-50"
      >
        {pending ? t('invite.revoking') : t('invite.revoke')}
      </button>
      {state.error ? (
        <p role="alert" className="text-sm text-debt">
          {t(state.error)}
        </p>
      ) : null}
    </form>
  )
}
