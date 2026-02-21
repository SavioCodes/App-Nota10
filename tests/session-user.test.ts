import { describe, expect, it, vi } from "vitest";

import { resolveMobileSessionUser, toAuthUser, type ApiSessionUser } from "../lib/_core/session-user";

function buildApiUser(overrides: Partial<ApiSessionUser> = {}): ApiSessionUser {
  return {
    id: 1,
    openId: "openid_1",
    name: "Alice",
    email: "alice@example.com",
    loginMethod: "oauth",
    lastSignedIn: "2026-02-21T10:00:00.000Z",
    ...overrides,
  };
}

describe("toAuthUser", () => {
  it("maps API user and parses lastSignedIn to Date", () => {
    const user = toAuthUser(buildApiUser());
    expect(user.lastSignedIn).toBeInstanceOf(Date);
    expect(Number.isNaN(user.lastSignedIn.getTime())).toBe(false);
  });

  it("falls back to current date when lastSignedIn is invalid", () => {
    const user = toAuthUser(buildApiUser({ lastSignedIn: "invalid-date" }));
    expect(user.lastSignedIn).toBeInstanceOf(Date);
    expect(Number.isNaN(user.lastSignedIn.getTime())).toBe(false);
  });
});

describe("resolveMobileSessionUser", () => {
  it("clears cached user and returns null when token is missing", async () => {
    const getSessionToken = vi.fn(async () => null);
    const getCachedUser = vi.fn(async () => null);
    const getMe = vi.fn(async () => null);
    const setCachedUser = vi.fn(async () => {});
    const clearCachedUser = vi.fn(async () => {});

    const result = await resolveMobileSessionUser({
      getSessionToken,
      getCachedUser,
      getMe,
      setCachedUser,
      clearCachedUser,
    });

    expect(result).toBeNull();
    expect(clearCachedUser).toHaveBeenCalledTimes(1);
    expect(getCachedUser).not.toHaveBeenCalled();
    expect(getMe).not.toHaveBeenCalled();
    expect(setCachedUser).not.toHaveBeenCalled();
  });

  it("returns cached user when token and local cache are available", async () => {
    const cachedUser = toAuthUser(buildApiUser());
    const getMe = vi.fn(async () => null);
    const setCachedUser = vi.fn(async () => {});

    const result = await resolveMobileSessionUser({
      getSessionToken: async () => "token",
      getCachedUser: async () => cachedUser,
      getMe,
      setCachedUser,
      clearCachedUser: async () => {},
    });

    expect(result).toEqual(cachedUser);
    expect(getMe).not.toHaveBeenCalled();
    expect(setCachedUser).not.toHaveBeenCalled();
  });

  it("fetches and persists user when token exists but cache is empty", async () => {
    const apiUser = buildApiUser({ id: 42, openId: "openid_42" });
    const setCachedUser = vi.fn(async () => {});

    const result = await resolveMobileSessionUser({
      getSessionToken: async () => "token",
      getCachedUser: async () => null,
      getMe: async () => apiUser,
      setCachedUser,
      clearCachedUser: async () => {},
    });

    expect(result?.id).toBe(42);
    expect(result?.openId).toBe("openid_42");
    expect(setCachedUser).toHaveBeenCalledTimes(1);
  });

  it("returns null when token exists but backend user is unavailable", async () => {
    const setCachedUser = vi.fn(async () => {});

    const result = await resolveMobileSessionUser({
      getSessionToken: async () => "token",
      getCachedUser: async () => null,
      getMe: async () => null,
      setCachedUser,
      clearCachedUser: async () => {},
    });

    expect(result).toBeNull();
    expect(setCachedUser).not.toHaveBeenCalled();
  });
});
