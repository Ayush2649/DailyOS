export interface UserLike {
  id?: string | null;
  email?: string | null;
}

export interface SessionWithUser {
  user?: UserLike | null;
}

export type SessionLike = SessionWithUser | UserLike | null | undefined;

/** Single source of truth for the per-user key used in push routes and settings. */
export function getUserKey(sessionOrUser: SessionLike): string | null {
  if (!sessionOrUser) return null;
  const asSession = sessionOrUser as SessionWithUser;
  if (asSession.user) {
    return asSession.user.id ?? asSession.user.email ?? null;
  }
  const asUser = sessionOrUser as UserLike;
  return asUser.id ?? asUser.email ?? null;
}