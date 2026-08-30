import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, type Locale } from './index'

/**
 * The language for a component that runs in the browser and cannot ask the server.
 *
 * The root layout stamps the resolved language on `<html lang>`, so reading it back is exact. The
 * cookie is the fallback for the one place the layout is gone: `global-error` replaces the whole
 * document when it renders.
 */
export function localeFromDocument(): Locale {
  if (typeof document === 'undefined') return DEFAULT_LOCALE

  const stamped = document.documentElement.lang
  if (isLocale(stamped)) return stamped

  const cookie = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${LOCALE_COOKIE}=`))
    ?.split('=')[1]

  return cookie !== undefined && isLocale(cookie) ? cookie : DEFAULT_LOCALE
}
