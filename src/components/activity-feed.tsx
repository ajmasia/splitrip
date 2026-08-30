import { ActivityTime } from '@/components/activity-time'
import { intlLocale, type CopyKey, type Locale, type Translate } from '@/lib/i18n'
import { formatAmount } from '@/lib/money/amount'
import type { ActivityAction, TripActivity } from '@/lib/trips/queries'

const SENTENCE: Record<ActivityAction, CopyKey> = {
  'expense.created': 'activity.expense.created',
  'expense.updated': 'activity.expense.updated',
  'expense.deleted': 'activity.expense.deleted',
  'payment.recorded': 'activity.payment.recorded',
  'payment.voided': 'activity.payment.voided',
  'participant.joined': 'activity.participant.joined',
  'participant.left': 'activity.participant.left',
  'trip.closed': 'activity.trip.closed',
  'trip.reopened': 'activity.trip.reopened',
}

/**
 * Two pairs of entries are the same row with different people in it, and only the names tell them
 * apart: somebody removed by an organiser against somebody who walked out, and a payment recorded
 * by a bystander against one recorded by whoever handed the money over. Saying "Tyrion recorded a
 * payment from Tyrion to Daenerys" is not more precise, it is just harder to read.
 */
function sentence(entry: TripActivity, t: Translate) {
  const ownPayment = entry.actorName === entry.fromName
  const key: CopyKey =
    entry.action === 'participant.joined' && entry.actorName !== entry.subject
      ? 'activity.participant.added'
      : entry.action === 'participant.left' && entry.actorName === entry.subject
        ? 'activity.participant.left.themselves'
        : entry.action === 'payment.recorded' && ownPayment
          ? 'activity.payment.recorded.own'
          : entry.action === 'payment.voided' && ownPayment
            ? 'activity.payment.voided.own'
            : SENTENCE[entry.action]

  return t(key, {
    actor: entry.actorName,
    subject: entry.subject,
    from: entry.fromName ?? '',
    to: entry.toName ?? '',
  })
}

/**
 * Who did what, and when. One column at every width: a feed is read down, and giving it a table on
 * a desk would put five words in a cell and call it a column.
 */
export function ActivityFeed({
  entries,
  locale,
  t,
}: {
  entries: TripActivity[]
  locale: Locale
  t: Translate
}) {
  if (entries.length === 0) {
    return (
      <div className="flex max-w-prose flex-col gap-2 rounded-card border border-rule bg-surface p-5">
        <h3 className="text-lg font-semibold">{t('activity.empty.title')}</h3>
        <p className="text-ink-soft">{t('activity.empty.body')}</p>
      </div>
    )
  }

  return (
    <ul className="flex max-w-prose flex-col">
      {entries.map((entry) => (
        <li
          key={entry.id}
          className="flex flex-col gap-1 border-b border-rule py-3 last:border-b-0"
        >
          {/*
            No dotted leader here, unlike the settlement: a leader joins a name to its figure across
            one line, and an entry that wraps to two would have it dangling between them.
          */}
          <span className="flex items-baseline justify-between gap-3">
            <span>{sentence(entry, t)}</span>
            {entry.amountCents === null ? null : (
              <span className="tabular font-semibold whitespace-nowrap">
                {formatAmount(entry.amountCents, intlLocale(locale))}
              </span>
            )}
          </span>
          <ActivityTime at={entry.occurredAt} locale={locale} />
        </li>
      ))}
    </ul>
  )
}
