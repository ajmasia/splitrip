'use client'

import Link from 'next/link'
import { useActionState } from 'react'

import { joinTrip, type JoinState } from '@/app/actions/join'
import { translator, type Locale } from '@/lib/i18n'
import type { InvitationPlace } from '@/lib/trips/invitations'

const EMPTY: JoinState = { error: null, taken: null, unclaimed: false }

/**
 * The whole of joining through a link that names a place: one button.
 *
 * The name is not a field because it is not a question — it is on the invitation, and this screen
 * is showing it back to whoever was given the link. It is still sent, so the same server function
 * handles both kinds of arrival.
 */
export function ClaimPlaceForm({
  token,
  place,
  locale,
}: {
  token: string
  place: InvitationPlace
  locale: Locale
}) {
  const t = translator(locale)
  const [state, action, pending] = useActionState(joinTrip, EMPTY)

  return (
    <form action={action} className="flex max-w-prose flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="display_name" value={place.name} />

      {state.error !== null ? (
        <p role="alert" className="rounded-card bg-debt-soft px-3 py-2 text-sm text-debt">
          {t(state.error)}
        </p>
      ) : null}

      {/*
        A place with somebody in it is taken by confirming, never in silence — the same bargain the
        general link strikes when a name is already on the list. This is what makes "invite again"
        lead somewhere: losing a phone is exactly what an organiser mints one of these for.

        A place held by an account is not offered at all. Its holder has a way in of their own, and
        a button that would be refused is worse than the sentence explaining why.
      */}
      {place.takeable ? null : (
        <Link
          href="/sign-in"
          className="flex min-h-touch w-fit items-center rounded-card bg-accent px-4 font-semibold text-accent-ink"
        >
          {t('join.place.signIn')}
        </Link>
      )}

      {place.takeable ? (
        <button
          type="submit"
          name="continue_as_existing"
          value={place.inUse ? 'yes' : 'no'}
          disabled={pending}
          className={`min-h-touch w-fit cursor-pointer rounded-card px-4 font-semibold disabled:opacity-50 ${
            place.inUse ? 'border border-debt text-debt' : 'bg-accent text-accent-ink'
          }`}
        >
          {pending
            ? t('join.pending')
            : t(place.inUse ? 'join.place.takeOver' : 'join.place.submit', { name: place.name })}
        </button>
      ) : null}
    </form>
  )
}
