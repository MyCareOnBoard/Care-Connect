import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import type { AxiosAdapter } from "axios"

/**
 * Regression test for the 401 retry loop in `src/lib/axios.ts`.
 *
 * The handler cleared the token cache, force-refreshed, and retried the request through the
 * same instance — with nothing marking the retry. The retried request hit the same
 * interceptor, so a 401 that a fresh token could not fix refreshed and retried forever.
 *
 * It is not a hypothetical. The backend answers 401 "Unauthorized - User not found" when
 * the account has no `users` record in the database that build points at, which happens
 * whenever two apps disagree about `x-environment`. Refreshing a token cannot conjure a
 * missing document, so the loop never terminated: Firebase's token endpoint took a request
 * per iteration, and the `window.location.href = login` fallback below the retry was never
 * reached, so the user sat on a spinner instead of being told to sign in again.
 *
 * The first test is the one that matters — it fails by hanging or by a large request count
 * on the unguarded version.
 */

const mockAuth: { currentUser: { uid: string } | null } = { currentUser: { uid: "u1" } }
const getIdToken = vi.fn<(forceRefresh?: boolean) => Promise<string | null>>()

vi.mock("@/lib/firebase", () => ({
  auth: mockAuth,
  isFirebaseConfigured: true,
  db: {},
}))

vi.mock("@/utils/auth", () => ({ getIdToken }))

const axiosModule = await import("@/lib/axios")
const axiosClient = axiosModule.default
const { clearAuthCache } = axiosModule

/** Counts requests and answers however the test says. */
function countingAdapter(status: number) {
  const calls: string[] = []
  return {
    calls,
    adapter: vi.fn(async (config: { url?: string }) => {
      calls.push(config.url || "")
      if (status === 200) {
        return { status: 200, statusText: "OK", data: { ok: true }, headers: {}, config }
      }
      // Shaped the way axios reports a rejected response, so the interceptor sees it.
      const error = Object.assign(new Error(`Request failed with status code ${status}`), {
        isAxiosError: true,
        config,
        response: { status, statusText: "Unauthorized", data: { error: "Unauthorized - User not found" }, headers: {}, config },
      })
      throw error
    }),
  }
}

let originalHref: string
const redirects: string[] = []

beforeEach(() => {
  clearAuthCache()
  getIdToken.mockReset()
  getIdToken.mockResolvedValue("a-fresh-token")
  mockAuth.currentUser = { uid: "u1" }
  redirects.length = 0

  // jsdom will not let the interceptor assign to location.href, and the assignment is how
  // the handler gives up, so it is captured rather than performed.
  originalHref = window.location.href
  Object.defineProperty(window, "location", {
    configurable: true,
    value: {
      ...window.location,
      pathname: "/user/dashboard",
      get href() {
        return originalHref
      },
      set href(value: string) {
        redirects.push(value)
      },
    },
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("a 401 that a fresh token cannot fix", () => {
  it("is retried exactly once, not forever", async () => {
    const { adapter, calls } = countingAdapter(401)
    axiosClient.defaults.adapter = adapter as unknown as AxiosAdapter

    await expect(axiosClient.get("/users/profile")).rejects.toThrow()

    // The original request plus one retry. Before the guard this did not terminate.
    expect(calls).toHaveLength(2)
  })

  it("refreshes the token once rather than once per attempt", async () => {
    const { adapter } = countingAdapter(401)
    axiosClient.defaults.adapter = adapter as unknown as AxiosAdapter

    await expect(axiosClient.get("/users/profile")).rejects.toThrow()

    // Each loop iteration used to mint a token. One forced refresh is the whole point.
    const forced = getIdToken.mock.calls.filter(([force]) => force === true)
    expect(forced).toHaveLength(1)
  })

  it("sends the user to sign in again instead of leaving them on a spinner", async () => {
    const { adapter } = countingAdapter(401)
    axiosClient.defaults.adapter = adapter as unknown as AxiosAdapter

    await expect(axiosClient.get("/users/profile")).rejects.toThrow()

    // The fallback below the retry was unreachable while the loop ran.
    expect(redirects).toHaveLength(1)
    expect(redirects[0]).toContain("/auth/login")
  })

  it("still rejects, so the caller can show its own error", async () => {
    const { adapter } = countingAdapter(401)
    axiosClient.defaults.adapter = adapter as unknown as AxiosAdapter

    await expect(axiosClient.get("/users/profile")).rejects.toMatchObject({
      response: { status: 401 },
    })
  })
})

describe("a 401 a fresh token does fix", () => {
  it("succeeds on the retry, which is the case the retry exists for", async () => {
    // An genuinely expired token: the first attempt fails, the refreshed one works.
    const calls: string[] = []
    let attempt = 0
    axiosClient.defaults.adapter = vi.fn(async (config: { url?: string }) => {
      calls.push(config.url || "")
      attempt += 1
      if (attempt === 1) {
        throw Object.assign(new Error("401"), {
          isAxiosError: true,
          config,
          response: { status: 401, data: {}, headers: {}, config, statusText: "Unauthorized" },
        })
      }
      return { status: 200, statusText: "OK", data: { ok: true }, headers: {}, config }
    }) as unknown as AxiosAdapter

    await expect(axiosClient.get("/users/profile")).resolves.toMatchObject({
      data: { ok: true },
    })
    expect(calls).toHaveLength(2)
    expect(redirects).toHaveLength(0)
  })
})
