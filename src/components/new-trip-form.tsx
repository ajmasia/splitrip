'use client'

import Link from 'next/link'
import { useActionState } from 'react'

import { createTrip, type CreateTripState } from '@/app/actions/trips'
import { translator, type Locale } from '@/lib/i18n'

const EMPTY: CreateTripState = { error: null }

/**
 * The catalogues are plain data with no server dependency, so this reads them itself rather than
 * taking a translator as a prop: a function cannot cross into a client component.
 */
export function NewTripForm({ locale }: { locale: Locale }) {
  const t = translator(locale)
  const [state, action, pending] = useActionState(createTrip, EMPTY)

  const field = 'min-h-touch rounded-card border border-rule bg-surface px-3 text-ink'

  return (
    <form action={action} className="flex max-w-prose flex-col gap-5">
      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-sm font-medium">
          {t('newTrip.name.label')}
        </label>
        <input
          id="name"
          name="name"
          required
          autoFocus
          placeholder={t('newTrip.name.placeholder')}
          className={field}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="display_name" className="text-sm font-medium">
          {t('newTrip.you.label')}
        </label>
        <input
          id="display_name"
          name="display_name"
          required
          placeholder={t('newTrip.you.placeholder')}
          className={field}
        />
        <span className="text-sm text-ink-soft">{t('newTrip.you.hint')}</span>
      </div>

      <fieldset className="flex flex-col gap-1">
        <legend className="pb-1 text-sm font-medium">{t('newTrip.dates.hint')}</legend>
        <div className="flex flex-col gap-3 wide:flex-row">
          <div className="flex flex-1 flex-col gap-1">
            <label htmlFor="start_date" className="text-sm text-ink-soft">
              {t('newTrip.start.label')}
            </label>
            <input id="start_date" name="start_date" type="date" className={`tabular ${field}`} />
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <label htmlFor="end_date" className="text-sm text-ink-soft">
              {t('newTrip.end.label')}
            </label>
            <input id="end_date" name="end_date" type="date" className={`tabular ${field}`} />
          </div>
        </div>
      </fieldset>

      {state.error ? (
        <p role="alert" className="rounded-card bg-debt-soft px-3 py-2 text-sm text-debt">
          {t(state.error)}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="min-h-touch cursor-pointer rounded-card bg-accent px-4 font-semibold text-accent-ink disabled:opacity-50"
        >
          {pending ? t('newTrip.pending') : t('newTrip.submit')}
        </button>
        <Link
          href="/"
          className="flex min-h-touch items-center rounded-card border border-rule px-4 text-ink-soft"
        >
          {t('newTrip.cancel')}
        </Link>
      </div>
    </form>
  )
}
