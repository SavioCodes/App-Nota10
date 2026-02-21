import type * as Auth from "@/lib/_core/auth";

export type ApiSessionUser = {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  lastSignedIn: string;
};

export function toAuthUser(apiUser: ApiSessionUser): Auth.User {
  const parsedLastSignedIn = new Date(apiUser.lastSignedIn);
  const safeLastSignedIn = Number.isNaN(parsedLastSignedIn.getTime())
    ? new Date()
    : parsedLastSignedIn;

  return {
    id: apiUser.id,
    openId: apiUser.openId,
    name: apiUser.name,
    email: apiUser.email,
    loginMethod: apiUser.loginMethod,
    lastSignedIn: safeLastSignedIn,
  };
}

type ResolveMobileSessionUserDeps = {
  getSessionToken: () => Promise<string | null>;
  getCachedUser: () => Promise<Auth.User | null>;
  getMe: () => Promise<ApiSessionUser | null>;
  setCachedUser: (user: Auth.User) => Promise<void>;
  clearCachedUser: () => Promise<void>;
};

export async function resolveMobileSessionUser(
  deps: ResolveMobileSessionUserDeps,
): Promise<Auth.User | null> {
  const sessionToken = await deps.getSessionToken();
  if (!sessionToken) {
    await deps.clearCachedUser();
    return null;
  }

  const cachedUser = await deps.getCachedUser();
  if (cachedUser) {
    return cachedUser;
  }

  const apiUser = await deps.getMe();
  if (!apiUser) {
    return null;
  }

  const normalizedUser = toAuthUser(apiUser);
  await deps.setCachedUser(normalizedUser);
  return normalizedUser;
}
