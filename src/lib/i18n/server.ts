import { cookies, headers } from 'next/headers'

import { LOCALE_COOKIE, resolveLocale, translator, type Locale, type Translate } from './index'

export async function getLocale(): Promise<Locale> {
  const [cookieStore, headerList] = await Promise.all([cookies(), headers()])

  return resolveLocale(cookieStore.get(LOCALE_COOKIE)?.value, headerList.get('accept-language'))
}

export async function getCopy(): Promise<{ locale: Locale; t: Translate }> {
  const locale = await getLocale()
  return { locale, t: translator(locale) }
}
