'use client'

import { useActionState } from 'react'

import { signIn, type SignInState } from '@/app/actions/auth'
import { translator, type Locale } from '@/lib/i18n'

const EMPTY: SignInState = { error: null }

export function SignInForm({ locale }: { locale: Locale }) {
  const t = translator(locale)
  const [state, action, pending] = useActionState(signIn, EMPTY)

  const field = 'min-h-touch rounded-card border border-rule bg-surface px-3 text-ink'

  return (
    <form action={action} className="flex max-w-prose flex-col gap-5">
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium">
          {t('signIn.email.label')}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          autoFocus
          className={field}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium">
          {t('signIn.password.label')}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={field}
        />
      </div>

      {state.error ? (
        <p role="alert" className="rounded-card bg-debt-soft px-3 py-2 text-sm text-debt">
          {t(state.error)}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="min-h-touch w-fit cursor-pointer rounded-card bg-accent px-4 font-semibold text-accent-ink disabled:opacity-50"
      >
        {pending ? t('signIn.pending') : t('signIn.submit')}
      </button>

      <p className="text-sm text-ink-soft">{t('signIn.note')}</p>
    </form>
  )
}
