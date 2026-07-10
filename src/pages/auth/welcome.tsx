import { useEffect, useRef } from "react"
import confetti from "canvas-confetti"
import { CheckCircle2 } from "lucide-react"
import { useNavigate } from "react-router"
import { Button } from "@/components/ui/button"
import { AuthOnboardingLayout } from "@/components/auth/AuthOnboardingLayout"
import { Routes } from "@/routes/constants"

export default function WelcomePage() {
  const navigate = useNavigate()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current) return
    const fire = confetti.create(canvasRef.current, { resize: true, useWorker: true })
    const colors = ["#087fff", "#5a4ee0", "#10ad58", "#ffc95c"]
    const end = Date.now() + 1500

    const frame = () => {
      fire({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 }, colors })
      fire({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors })
      if (Date.now() < end) requestAnimationFrame(frame)
    }
    frame()

    return () => fire.reset()
  }, [])

  return (
    <AuthOnboardingLayout showLogo showFooter={false} className="min-h-0 items-center justify-center">
      <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-50 h-full w-full" />
      <div className="flex flex-1 flex-col items-center justify-center px-5 py-10 text-center sm:px-10">
        <div className="relative flex items-center justify-center">
          <span className="absolute size-16 rounded-full bg-[#087fff] animate-check-ring" />
          <CheckCircle2 className="relative size-16 text-[#087fff] animate-check-pop" />
        </div>
        <h1 className="mt-6 text-[26px] font-medium leading-none">You&apos;re all set, Joseph!</h1>
        <p className="mt-3 max-w-md text-sm text-[#565656]">
          Your profile is ready to go. Head over to your dashboard to explore jobs, connect with agencies, and
          grow your career.
        </p>
        <Button
          type="button"
          onClick={() => navigate(Routes.app.user.dashboard)}
          className="mt-8 h-11 w-full max-w-70 bg-[#087fff]"
        >
          Go to dashboard
        </Button>
      </div>
    </AuthOnboardingLayout>
  )
}
