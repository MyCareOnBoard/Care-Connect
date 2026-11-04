import { beforeEach, describe, expect, it, vi } from "vitest"

const get = vi.fn()
const del = vi.fn()
vi.mock("@/lib/axios", () => ({
  default: { get: (...args: unknown[]) => get(...args), delete: (...args: unknown[]) => del(...args) },
}))

import { SAVED_TIPS_PATH, deleteSavedHealthTip, listSavedHealthTips } from "../savedHealthTipsService"

const ID = "0123456789abcdef0123456789abcdef"

beforeEach(() => {
  get.mockReset()
  del.mockReset()
})

describe("listSavedHealthTips", () => {
  it("returns readable tips and the limit, dropping rows it cannot read", async () => {
    get.mockResolvedValue({
      data: {
        data: {
          tips: [
            { id: ID, tip: { id: "tip-1", title: "T", summary: "S", steps: ["a", 1] }, savedAt: "2026-11-04T10:00:00Z" },
            { id: "bad", tip: { title: "T", summary: "S" } },
            { id: ID, tip: { title: "", summary: "S" } },
            null,
          ],
          max: 50,
        },
      },
    })
    const out = await listSavedHealthTips()
    expect(get).toHaveBeenCalledWith(SAVED_TIPS_PATH)
    expect(out.tips).toHaveLength(1)
    expect(out.tips[0].tip.steps).toEqual(["a"])
    expect(out.max).toBe(50)
  })

  it("falls back to an empty list and the default limit on a strange reply", async () => {
    get.mockResolvedValue({ data: {} })
    expect(await listSavedHealthTips()).toEqual({ tips: [], max: 50 })
  })
})

describe("deleteSavedHealthTip", () => {
  it("removes by id", async () => {
    del.mockResolvedValue({})
    await deleteSavedHealthTip(ID)
    expect(del).toHaveBeenCalledWith(`${SAVED_TIPS_PATH}/${ID}`)
  })

  it("refuses an id that is not one of ours without calling the server", async () => {
    await expect(deleteSavedHealthTip("../x")).rejects.toThrow()
    expect(del).not.toHaveBeenCalled()
  })
})
