'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'

import { isLocale, LOCALE_COOKIE } from '@/lib/i18n'

const A_YEAR_IN_SECONDS = 60 * 60 * 24 * 365

/**
 * A server function is reachable by anyone who can post to it, so what arrives is checked rather
 * than trusted. There is nothing here to authorise — choosing your own language harms nobody — but
 * an unrecognised value would otherwise be written into the cookie and read back on every request.
 */
export async function setLocale(formData: FormData) {
  const requested = formData.get('locale')
  if (typeof requested !== 'string' || !isLocale(requested)) return

  const cookieStore = await cookies()
  cookieStore.set(LOCALE_COOKIE, requested, {
    path: '/',
    maxAge: A_YEAR_IN_SECONDS,
    sameSite: 'lax',
  })

  revalidatePath('/', 'layout')
}
