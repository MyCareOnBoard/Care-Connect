/**
 * Off-screen anchor for Firebase invisible reCAPTCHA.
 * Must keep non-zero size so the verifier can render (zero-size breaks INVALID_APP_CREDENTIAL).
 */
export function RecaptchaAnchor({ id }: { id: string }) {
  return (
    <div
      id={id}
      className="absolute -left-[9999px] top-0 h-px w-[300px] overflow-hidden"
      aria-hidden="true"
    />
  )
}
