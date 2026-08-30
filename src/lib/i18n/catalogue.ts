import type { es } from './es'

export type CopyKey = keyof typeof es

export type Catalogue = Record<CopyKey, string>
