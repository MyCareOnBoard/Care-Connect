import { describe, it, expect, vi, beforeEach } from "vitest"

/**
 * Regression tests for the ID-token cache in `src/lib/axios.ts`.
 *
 * The cache used to be keyed only by expiry, so a token minted for one user was
 * served after `auth.currentUser` changed. That broke team-invite signups: the
 * invitee landed with a restored session (which cached that user's token via the
 * profile refresh), signed up, and `POST /users` went out carrying the PREVIOUS
 * user's token — so the server resolved the old uid, found that user's doc, and
 * answered 409 "User already exists". Refreshing the page cleared this module
 * state, which is why a retry after refresh always appeared to work.
 *
 * The third test below is the one that matters.
 */

const mockAuth: { currentUser: { uid: string } | null } = { currentUser: null }
const getIdToken = vi.fn<(forceRefresh?: boolean) => Promise<string | null>>()

vi.mock("@/lib/firebase", () => ({
  auth: mockAuth,
  isFirebaseConfigured: true,
  db: {},
}))

vi.mock("@/utils/auth", () => ({ getIdToken }))

// Imported after the mocks are registered, since the module reads them at load.
const { getCachedIdToken, clearAuthCache } = await import("@/lib/axios")

beforeEach(() => {
  clearAuthCache()
  getIdToken.mockReset()
  mockAuth.currentUser = null
})

describe("getCachedIdToken", () => {
  it("returns null when nobody is signed in, without asking Firebase", async () => {
    await expect(getCachedIdToken()).resolves.toBeNull()
    expect(getIdToken).not.toHaveBeenCalled()
  })

  it("mints a token for the signed-in user", async () => {
    mockAuth.currentUser = { uid: "user-a" }
    getIdToken.mockResolvedValue("token-a")

    await expect(getCachedIdToken()).resolves.toBe("token-a")
    expect(getIdToken).toHaveBeenCalledTimes(1)
  })

  it("reuses the cached token for the same user", async () => {
    mockAuth.currentUser = { uid: "user-a" }
    getIdToken.mockResolvedValue("token-a")

    await getCachedIdToken()
    await expect(getCachedIdToken()).resolves.toBe("token-a")
    // Second call served from cache.
    expect(getIdToken).toHaveBeenCalledTimes(1)
  })

  it("NEVER serves a token minted for a different user", async () => {
    // This is the 409-on-signup bug, reproduced at its source.
    mockAuth.currentUser = { uid: "previous-user" }
    getIdToken.mockResolvedValue("token-previous")
    await expect(getCachedIdToken()).resolves.toBe("token-previous")

    // createUserWithEmailAndPassword switches the current user.
    mockAuth.currentUser = { uid: "brand-new-user" }
    getIdToken.mockResolvedValue("token-new")

    const token = await getCachedIdToken()
    expect(token).toBe("token-new")
    expect(token).not.toBe("token-previous")
    expect(getIdToken).toHaveBeenCalledTimes(2)
  })

  it("stops serving a cached token once the user signs out", async () => {
    mockAuth.currentUser = { uid: "user-a" }
    getIdToken.mockResolvedValue("token-a")
    await getCachedIdToken()

    mockAuth.currentUser = null
    await expect(getCachedIdToken()).resolves.toBeNull()
  })

  it("forwards forceRefresh to Firebase, not just past the local cache", async () => {
    // Without forwarding, the 401 retry re-sent the same rejected credential:
    // it bypassed this cache while Firebase returned its own cached token.
    mockAuth.currentUser = { uid: "user-a" }
    getIdToken.mockResolvedValue("token-a")
    await getCachedIdToken()
    expect(getIdToken).toHaveBeenLastCalledWith(false)

    getIdToken.mockResolvedValue("token-a-fresh")
    await expect(getCachedIdToken(true)).resolves.toBe("token-a-fresh")
    expect(getIdToken).toHaveBeenLastCalledWith(true)
  })

  it("re-mints after clearAuthCache", async () => {
    mockAuth.currentUser = { uid: "user-a" }
    getIdToken.mockResolvedValue("token-a")
    await getCachedIdToken()

    clearAuthCache()
    getIdToken.mockResolvedValue("token-a2")
    await expect(getCachedIdToken()).resolves.toBe("token-a2")
    expect(getIdToken).toHaveBeenCalledTimes(2)
  })

  it("does not cache a null token", async () => {
    mockAuth.currentUser = { uid: "user-a" }
    getIdToken.mockResolvedValue(null)

    await expect(getCachedIdToken()).resolves.toBeNull()
    getIdToken.mockResolvedValue("token-a")
    await expect(getCachedIdToken()).resolves.toBe("token-a")
  })
})
