import { cookies } from 'next/headers'

import { DEFAULT_THEME, isTheme, THEME_COOKIE, type Theme } from './index'

/**
 * There is no header to fall back to: a browser states its colour preference to CSS, never to the
 * server. So a reader who has not chosen gets `system`, and the choice is made in the stylesheet.
 */
export async function getTheme(): Promise<Theme> {
  const stored = (await cookies()).get(THEME_COOKIE)?.value
  return stored !== undefined && isTheme(stored) ? stored : DEFAULT_THEME
}
