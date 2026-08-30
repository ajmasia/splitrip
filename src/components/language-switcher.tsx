import { setLocale } from '@/app/actions/locale'
import { LOCALES, type Locale, type Translate } from '@/lib/i18n'

/**
 * A plain form with a server function behind it, so switching language works before any JavaScript
 * has loaded and survives a reload: the choice lives in a cookie the server reads on every request.
 */
export function LanguageSwitcher({ locale, t }: { locale: Locale; t: Translate }) {
  return (
    <form action={setLocale}>
      <fieldset>
        <legend>{t('language.label')}</legend>
        {LOCALES.map((candidate) => (
          <button
            key={candidate}
            name="locale"
            value={candidate}
            aria-current={candidate === locale}
            disabled={candidate === locale}
          >
            {t(`language.${candidate}`)}
          </button>
        ))}
      </fieldset>
    </form>
  )
}
