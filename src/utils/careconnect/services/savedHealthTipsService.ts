/**
 * Saved health tips — thin axios wrapper around the saved-tips endpoints.
 *
 *   GET    /careconnectHealthTips/saved       -> { tips: [{ id, tip, savedAt }], max }
 *   POST   /careconnectHealthTips/saved       { tip }
 *   DELETE /careconnectHealthTips/saved/:id
 *
 * The tips a person chose to keep (by setting a reminder with "also save this tip"). Only the
 * tip's own text travels: never the search that produced it, and never the picture.
 */

import axiosClient from "@/lib/axios"
import type { HealthTip } from "@/utils/careconnect/services/healthTipsService"

export const SAVED_TIPS_PATH = "/careconnectHealthTips/saved"

export interface SavedHealthTip {
  id: string
  tip: HealthTip
  savedAt: string
}

const SAVED_ID = /^[a-f0-9]{32}$/

function mapTip(raw: unknown): HealthTip | null {
  if (!raw || typeof raw !== "object") return null
  const t = raw as Record<string, unknown>
  if (typeof t.title !== "string" || !t.title.trim()) return null
  if (typeof t.summary !== "string" || !t.summary.trim()) return null
  const steps = Array.isArray(t.steps) ? t.steps.filter((s): s is string => typeof s === "string" && !!s.trim()) : []
  return {
    id: typeof t.id === "string" && t.id ? t.id : "tip-1",
    title: t.title,
    summary: t.summary,
    ...(steps.length ? { steps } : {}),
    ...(typeof t.whenToSeeAProfessional === "string" && t.whenToSeeAProfessional.trim()
      ? { whenToSeeAProfessional: t.whenToSeeAProfessional }
      : {}),
  }
}

function mapSaved(raw: unknown): SavedHealthTip | null {
  if (!raw || typeof raw !== "object") return null
  const r = raw as Record<string, unknown>
  if (typeof r.id !== "string" || !SAVED_ID.test(r.id)) return null
  const tip = mapTip(r.tip)
  if (!tip) return null
  return { id: r.id, tip, savedAt: typeof r.savedAt === "string" ? r.savedAt : "" }
}

/** The person's saved tips, newest first, and the most they can keep. Unreadable rows are dropped. */
export async function listSavedHealthTips(): Promise<{ tips: SavedHealthTip[]; max: number }> {
  const { data } = await axiosClient.get(SAVED_TIPS_PATH)
  const raw = Array.isArray(data?.data?.tips) ? data.data.tips : []
  const max = Number.isInteger(data?.data?.max) && data.data.max > 0 ? data.data.max : 50
  return {
    tips: raw.map(mapSaved).filter((t: SavedHealthTip | null): t is SavedHealthTip => t !== null),
    max,
  }
}

export async function deleteSavedHealthTip(id: string): Promise<void> {
  if (!SAVED_ID.test(id)) throw new Error("Not a saved tip.")
  await axiosClient.delete(`${SAVED_TIPS_PATH}/${id}`)
}
