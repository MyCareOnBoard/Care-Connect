import { describe, it, expect, vi, beforeEach } from "vitest"
import { Routes } from "@/routes/constants"

/**
 * The nav side of the Cowry switch.
 *
 * The resolver is tested on its own in cowryPages.test.ts; this covers the two things the
 * menu itself can get wrong — leaving an empty dropdown behind when every child is off,
 * and keeping a parent link pointed at a page that no longer exists.
 */

const enabledPaths = new Set<string>()

vi.mock("@/utils/careconnect/cowryPages", () => ({
  isCowryPathEnabled: (path: string) => enabledPaths.has(path),
}))

// Imported after the mock so the module picks it up.
const { cowryNavItem } = await import("@/components/app/AppShell")

const ALL_PATHS = [
  Routes.app.user.cowryWallet,
  Routes.app.user.cowryEarn,
  Routes.app.user.cowryRedeem,
  Routes.app.user.cowryBuy,
  Routes.app.user.cowryCreator,
  Routes.app.user.cowryWithdraw,
  Routes.app.user.cowryHistory,
]

function enableOnly(...paths: string[]) {
  enabledPaths.clear()
  for (const path of paths) enabledPaths.add(path)
}

beforeEach(() => enabledPaths.clear())

describe("the Cowry nav entry", () => {
  it("lists all seven when everything is on", () => {
    enableOnly(...ALL_PATHS)
    const [item] = cowryNavItem()

    expect(item.label).toBe("Cowry")
    expect(item.children).toHaveLength(7)
    expect(item.children?.map((c) => c.href)).toEqual(ALL_PATHS)
  })

  it("disappears completely when every page is off", () => {
    // Not an empty dropdown — no entry at all. A menu that opens onto nothing reads as
    // a bug to the person clicking it.
    expect(cowryNavItem()).toEqual([])
  })

  it("keeps only the pages that are on", () => {
    enableOnly(Routes.app.user.cowryWallet, Routes.app.user.cowryHistory)
    const [item] = cowryNavItem()

    expect(item.children?.map((c) => c.label)).toEqual(["Wallet", "History"])
  })

  it("points the parent at the first page still standing", () => {
    // The parent used to hardcode the wallet. With the wallet off, clicking "Cowry"
    // would land on a route that no longer exists.
    enableOnly(Routes.app.user.cowryEarn, Routes.app.user.cowryHistory)
    const [item] = cowryNavItem()

    expect(item.href).toBe(Routes.app.user.cowryEarn)
    expect(item.href).not.toBe(Routes.app.user.cowryWallet)
  })

  it("still works when a single page is left", () => {
    enableOnly(Routes.app.user.cowryWithdraw)
    const [item] = cowryNavItem()

    expect(item.href).toBe(Routes.app.user.cowryWithdraw)
    expect(item.children).toHaveLength(1)
  })

  it("never offers a child whose page is off", () => {
    enableOnly(Routes.app.user.cowryWallet)
    const [item] = cowryNavItem()

    for (const child of item.children ?? []) {
      expect(enabledPaths.has(child.href)).toBe(true)
    }
  })
})
