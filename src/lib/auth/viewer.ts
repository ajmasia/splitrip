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

/**
 * The reader's access token, for the one thing that cannot go through the server: the real-time
 * socket, which the browser opens itself and which Row Level Security judges by this token alone.
 */
export async function getAccessToken(): Promise<string | null> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  return session?.access_token ?? null
}
