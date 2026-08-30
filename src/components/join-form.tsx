'use client'

import { useActionState } from 'react'

import { joinTrip, type JoinState } from '@/app/actions/join'
import { translator, type Locale } from '@/lib/i18n'

const EMPTY: JoinState = { error: null, taken: null }

export function JoinForm({ token, locale }: { token: string; locale: Locale }) {
  const t = translator(locale)
  const [state, action, pending] = useActionState(joinTrip, EMPTY)

  return (
    <form action={action} className="flex max-w-prose flex-col gap-5">
      <input type="hidden" name="token" value={token} />

      <div className="flex flex-col gap-1">
        <label htmlFor="display_name" className="text-sm font-medium">
          {t('join.name.label')}
        </label>
        {/*
          React empties the field once the action returns, so the name comes back from the server
          and the input is remounted around it. Without that, the offer to continue as somebody
          would sit above an empty box and confirming it would ask for a name again.
        */}
        <input
          key={state.taken ?? ''}
          id="display_name"
          name="display_name"
          defaultValue={state.taken ?? ''}
          required
          autoFocus
          autoComplete="nickname"
          placeholder={t('join.name.placeholder')}
          className="min-h-touch rounded-card border border-rule bg-surface px-3 text-ink"
        />
        <span className="text-sm text-ink-soft">{t('join.name.hint')}</span>
      </div>

      {state.error !== null && state.taken === null ? (
        <p role="alert" className="rounded-card bg-debt-soft px-3 py-2 text-sm text-debt">
          {t(state.error)}
        </p>
      ) : null}

      {state.taken !== null ? (
        <div role="alert" className="flex flex-col gap-3 rounded-card bg-debt-soft px-3 py-3">
          <p className="text-sm text-debt">{t('join.taken.body', { name: state.taken })}</p>
          <button
            type="submit"
            name="continue_as_existing"
            value="yes"
            disabled={pending}
            className="min-h-touch w-fit cursor-pointer rounded-card border border-debt px-4 text-sm font-semibold text-debt disabled:opacity-50"
          >
            {t('join.taken.confirm')}
          </button>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="min-h-touch w-fit cursor-pointer rounded-card bg-accent px-4 font-semibold text-accent-ink disabled:opacity-50"
      >
        {pending ? t('join.pending') : t('join.submit')}
      </button>
    </form>
  )
}
