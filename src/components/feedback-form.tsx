'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'

import { submitFeedback, type FeedbackState } from '@/app/actions/feedback'
import type { CopyKey } from '@/lib/i18n'
import { FEEDBACK_KINDS, FEEDBACK_MAX_LENGTH, type FeedbackKind } from '@/lib/feedback'
import { translator, type Locale } from '@/lib/i18n'

const EMPTY: FeedbackState = { error: null, sent: false, message: '' }

const KIND: Record<FeedbackKind, CopyKey> = {
  bug: 'feedback.kind.bug',
  idea: 'feedback.kind.idea',
  other: 'feedback.kind.other',
}

export function FeedbackForm({
  locale,
  from,
  tripId,
  version,
}: {
  locale: Locale
  /** The screen it was opened from, already checked to be one of ours. */
  from: string | null
  tripId: string | null
  version: string
}) {
  const t = translator(locale)
  const [state, action, pending] = useActionState(submitFeedback, EMPTY)

  // Controlled, so a refusal keeps what was typed: a long message lost to a limit is not sent again.
  const [message, setMessage] = useState(state.message)
  const [kind, setKind] = useState<FeedbackKind | null>(null)

  const back = from ?? '/'

  if (state.sent) {
    return (
      <div role="status" className="flex max-w-prose flex-col gap-4">
        <h2 className="text-xl font-semibold">{t('feedback.sent.heading')}</h2>
        <p className="text-ink-soft">{t('feedback.sent.body')}</p>
        <Link
          href={back}
          className="flex min-h-touch w-fit items-center rounded-card bg-accent px-4 font-semibold text-accent-ink"
        >
          {t('feedback.back')}
        </Link>
      </div>
    )
  }

  return (
    <form action={action} className="flex max-w-prose flex-col gap-5">
      <input type="hidden" name="from" value={from ?? ''} />
      <input type="hidden" name="trip" value={tripId ?? ''} />

      <div className="flex flex-col gap-1">
        <label htmlFor="message" className="text-sm font-medium">
          {t('feedback.message.label')}
        </label>
        <textarea
          id="message"
          name="message"
          required
          autoFocus
          rows={6}
          maxLength={FEEDBACK_MAX_LENGTH}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder={t('feedback.message.placeholder')}
          className="rounded-card border border-rule bg-surface px-3 py-2 text-ink"
        />
        <span className="text-sm text-ink-soft">
          {t('feedback.message.hint', { max: FEEDBACK_MAX_LENGTH })}
        </span>
      </div>

      <fieldset className="flex flex-col gap-1">
        <legend className="pb-1 text-sm font-medium">{t('feedback.kind.legend')}</legend>
        {FEEDBACK_KINDS.map((candidate) => (
          <label
            key={candidate}
            className="flex min-h-touch cursor-pointer items-center gap-3 rounded-card px-1"
          >
            <input
              type="radio"
              name="kind"
              value={candidate}
              checked={kind === candidate}
              onChange={() => setKind(candidate)}
              className="size-4 accent-accent"
            />
            {t(KIND[candidate])}
          </label>
        ))}
      </fieldset>

      <div className="flex flex-col gap-1 rounded-card border border-rule bg-surface p-4 text-sm">
        <p className="font-medium">{t('feedback.sentWith.heading')}</p>
        <ul className="list-disc pl-5 text-ink-soft">
          <li>{t('feedback.sentWith.screen', { path: from ?? '—' })}</li>
          {tripId !== null ? <li>{t('feedback.sentWith.trip')}</li> : null}
          <li>{t('feedback.sentWith.version', { version })}</li>
          <li>{t('feedback.sentWith.language', { language: locale.toUpperCase() })}</li>
        </ul>
        <p className="pt-1 text-ink-soft">{t('feedback.sentWith.readers')}</p>
      </div>

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
          {pending ? t('feedback.pending') : t('feedback.submit')}
        </button>
        <Link
          href={back}
          className="flex min-h-touch items-center rounded-card border border-rule px-4 text-ink-soft"
        >
          {t('feedback.cancel')}
        </Link>
      </div>
    </form>
  )
}
