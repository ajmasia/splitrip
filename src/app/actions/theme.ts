'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'

import { isTheme, THEME_COOKIE } from '@/lib/theme'

const A_YEAR_IN_SECONDS = 60 * 60 * 24 * 365

/** Checked rather than trusted, for the reason `setLocale` gives: anyone can post to this. */
export async function setTheme(formData: FormData) {
  const requested = formData.get('theme')
  if (typeof requested !== 'string' || !isTheme(requested)) return

  const cookieStore = await cookies()
  cookieStore.set(THEME_COOKIE, requested, {
    path: '/',
    maxAge: A_YEAR_IN_SECONDS,
    sameSite: 'lax',
  })

  revalidatePath('/', 'layout')
}
