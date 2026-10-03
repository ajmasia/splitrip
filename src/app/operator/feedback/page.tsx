import { notFound } from 'next/navigation'

import { ActivityTime } from '@/components/activity-time'
import { AppShell } from '@/components/app-shell'
import { Pill, type PillTone } from '@/components/pill'
import { getViewer } from '@/lib/auth/viewer'
import type { FeedbackKind } from '@/lib/feedback'
import type { CopyKey } from '@/lib/i18n'
import { getCopy } from '@/lib/i18n/server'
import { isOperator, listFeedback } from '@/lib/operators/queries'

const KIND: Record<FeedbackKind, CopyKey> = {
  bug: 'feedback.kind.bug',
  idea: 'feedback.kind.idea',
  other: 'feedback.kind.other',
}

const TONE: Record<FeedbackKind, PillTone> = { bug: 'debt', idea: 'accent', other: 'plain' }

/**
 * What the application's users have told whoever runs it. Anybody else gets the same not-found as a
 * page that does not exist, so its existence is confirmed to nobody but operators.
 */
export default async function OperatorFeedbackPage() {
  const viewer = await getViewer()
  if (!(await isOperator(viewer))) notFound()

  const { locale, t } = await getCopy()
  const entries = await listFeedback()

  return (
    <AppShell locale={locale} t={t} viewer={viewer}>
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-bold">{t('operator.feedback.heading')}</h1>

        {entries.length === 0 ? (
          <p className="max-w-prose rounded-card border border-rule bg-surface p-5 text-ink-soft">
            {t('operator.feedback.empty')}
          </p>
        ) : (
          <ol className="flex flex-col gap-4">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-col gap-3 rounded-card border border-rule bg-surface p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Pill tone={TONE[entry.kind]}>{t(KIND[entry.kind])}</Pill>
                  <ActivityTime at={entry.createdAt} locale={locale} />
                </div>
                <p className="break-words whitespace-pre-wrap">{entry.message}</p>
                {/* The screen is shown as text and never as a link: it is whatever a browser sent. */}
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm text-ink-soft">
                  <dt>{t('operator.feedback.screen')}</dt>
                  <dd className="font-mono break-all">{entry.path ?? '—'}</dd>
                  {entry.tripName !== null ? (
                    <>
                      <dt>{t('operator.feedback.trip')}</dt>
                      <dd className="break-words">{entry.tripName}</dd>
                    </>
                  ) : null}
                  <dt>{t('operator.feedback.version')}</dt>
                  <dd className="font-mono">{entry.appVersion ?? '—'}</dd>
                  <dt>{t('operator.feedback.language')}</dt>
                  <dd className="font-mono uppercase">{entry.locale ?? '—'}</dd>
                </dl>
              </li>
            ))}
          </ol>
        )}
      </div>
    </AppShell>
  )
}
