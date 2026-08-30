import type { Catalogue, CopyKey } from './catalogue'
import { en } from './en'
import { es } from './es'

export type { Catalogue, CopyKey }

export const LOCALES = ['es', 'en'] as const

export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'es'

export const LOCALE_COOKIE = 'splitrip.locale'

/**
 * The tag handed to `Intl`, which wants a region to decide how a date reads. British English rather
 * than American: this is a euro-area product, and "1 July 2026" is the order its readers expect.
 */
const INTL_LOCALE: Record<Locale, string> = {
  es: 'es-ES',
  en: 'en-GB',
}

const CATALOGUES: Record<Locale, Catalogue> = { es, en }

export type Translate = (key: CopyKey, values?: Record<string, string | number>) => string

export function isLocale(candidate: string): candidate is Locale {
  return (LOCALES as readonly string[]).includes(candidate)
}

export function intlLocale(locale: Locale): string {
  return INTL_LOCALE[locale]
}

export function translator(locale: Locale): Translate {
  const catalogue = CATALOGUES[locale]

  return (key, values) => {
    const copy = catalogue[key]
    if (values === undefined) return copy

    return copy.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
      name in values ? String(values[name]) : placeholder,
    )
  }
}

/**
 * Stored preference first, then what the browser asked for, then Spanish. Quality values are
 * honoured because a browser sending `en;q=0.9, es;q=1.0` is stating an order, not a list.
 */
export function resolveLocale(stored: string | undefined, acceptLanguage: string | null): Locale {
  if (stored !== undefined && isLocale(stored)) return stored

  const offered = (acceptLanguage ?? '')
    .split(',')
    .map((entry) => {
      const [tag = '', ...parameters] = entry.trim().split(';')
      const quality = parameters
        .map((parameter) => /^\s*q=([\d.]+)\s*$/.exec(parameter))
        .find((match) => match !== null)
      return { tag: tag.trim().toLowerCase(), quality: quality ? Number(quality[1]) : 1 }
    })
    .filter((entry) => entry.tag !== '' && !Number.isNaN(entry.quality))
    .sort((one, other) => other.quality - one.quality)

  for (const { tag } of offered) {
    const [primary = ''] = tag.split('-')
    if (isLocale(primary)) return primary
  }

  return DEFAULT_LOCALE
}
