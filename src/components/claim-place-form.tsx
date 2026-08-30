'use client'

import { useActionState } from 'react'

import { joinTrip, type JoinState } from '@/app/actions/join'
import { translator, type Locale } from '@/lib/i18n'

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
  name,
  locale,
}: {
  token: string
  name: string
  locale: Locale
}) {
  const t = translator(locale)
  const [state, action, pending] = useActionState(joinTrip, EMPTY)

  return (
    <form action={action} className="flex max-w-prose flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="display_name" value={name} />

      {state.error !== null ? (
        <p role="alert" className="rounded-card bg-debt-soft px-3 py-2 text-sm text-debt">
          {t(state.error)}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="min-h-touch w-fit cursor-pointer rounded-card bg-accent px-4 font-semibold text-accent-ink disabled:opacity-50"
      >
        {pending ? t('join.pending') : t('join.place.submit', { name })}
      </button>
    </form>
  )
}
