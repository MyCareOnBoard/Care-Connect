/**
 * Ask the post composer to open with a starter.
 *
 * The welcome strip and the empty feed both offer "introduce yourself"-style shortcuts, and
 * neither owns the composer. A window event keeps them decoupled, the same way
 * POST_CREATED_EVENT already carries new posts back to the feed.
 */

export const COMPOSE_EVENT = "careconnect:compose"

export interface ComposeDetail {
  /** Text to start the post with. The composer does not overwrite a draft already typed. */
  text?: string
}

export function openComposer(detail: ComposeDetail = {}): void {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent<ComposeDetail>(COMPOSE_EVENT, { detail }))
}
