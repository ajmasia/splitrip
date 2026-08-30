import { createSupabaseServerClient } from '@/lib/supabase/server'

export type Viewer = {
  id: string
  email: string | null
  /** An identity a device was handed, rather than an account somebody signed in to. */
  isAnonymous: boolean
}

export async function getViewer(): Promise<Viewer | null> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  return {
    id: user.id,
    email: user.email ?? null,
    isAnonymous: user.is_anonymous ?? false,
  }
}
