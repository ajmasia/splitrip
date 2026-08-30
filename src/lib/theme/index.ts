export const THEMES = ['system', 'light', 'dark'] as const

export type Theme = (typeof THEMES)[number]

export const DEFAULT_THEME: Theme = 'system'

export const THEME_COOKIE = 'splitrip.theme'

export function isTheme(candidate: string): candidate is Theme {
  return (THEMES as readonly string[]).includes(candidate)
}

/**
 * What the button switches to next. Following the system comes first because it is the answer for
 * most people most of the time — a phone already goes dark at night — and the two fixed choices are
 * for when it is wrong: a bright train at midnight, a dark room at noon.
 */
export function nextTheme(theme: Theme): Theme {
  return THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length] as Theme
}

/** The colour of the browser chrome, which cannot be a media query once a choice overrides one. */
export const THEME_COLOUR: Record<Exclude<Theme, 'system'>, string> = {
  light: '#edefec',
  dark: '#0e1211',
}
