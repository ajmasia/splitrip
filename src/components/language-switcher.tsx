import { setLocale } from '@/app/actions/locale'
import { LOCALES, type Locale, type Translate } from '@/lib/i18n'

/**
 * A plain form with a server function behind it, so switching language works before any JavaScript
 * has loaded and survives a reload: the choice lives in a cookie the server reads on every request.
 */
export function LanguageSwitcher({ locale, t }: { locale: Locale; t: Translate }) {
  return (
    <form action={setLocale} className="flex items-center gap-1">
      <span className="sr-only">{t('language.label')}</span>
      {LOCALES.map((candidate) => (
        <button
          key={candidate}
          name="locale"
          value={candidate}
          aria-current={candidate === locale}
          disabled={candidate === locale}
          className="min-h-touch cursor-pointer rounded-card px-3 font-mono text-xs tracking-widest uppercase text-ink-soft aria-[current=true]:bg-accent-soft aria-[current=true]:text-accent disabled:cursor-default"
        >
          {candidate}
        </button>
      ))}
    </form>
  )
}
