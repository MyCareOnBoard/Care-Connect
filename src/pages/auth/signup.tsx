import { FormEvent, useState } from "react"
import { Link, useNavigate } from "react-router"
import { ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AuthOnboardingLayout } from "@/components/auth/AuthOnboardingLayout"
import { Routes } from "@/routes/constants"

export default function SignUpPage() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    navigate(Routes.auth.verifyContact)
  }

  return (
    <AuthOnboardingLayout>
      <div className="flex flex-col justify-center flex-1 w-full px-5 py-10 mx-auto max-w-123 sm:px-0">
        <h1 className="mb-9 text-[34px] font-normal leading-none">Create your account</h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="fullName" className="font-semibold">
              Full name
            </Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Enter your full name here"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="font-semibold">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Enter your email  here"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="font-semibold">
              Phone number
            </Label>
            <div className="flex h-12 items-center rounded-xl border border-[#d7d7d8] bg-white px-4 focus-within:border-[#087fff] focus-within:ring-2 focus-within:ring-[#087fff]/20">
              <span className="mr-3 text-lg rounded-sm" aria-hidden="true">
                GH
              </span>
              <span className="mr-1 text-sm font-semibold">+233</span>
              <ChevronDown className="mr-3 size-4" />
              <input
                id="phone"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="Enter your phone number  here"
                required
                className="h-full min-w-0 flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-[#737780]"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="font-semibold">
                Password
              </Label>
              <div className="flex items-center gap-2 text-sm text-[#565656]">
                <span>Security level</span>
                <span className="h-2 w-5 rounded-full bg-[#10ad58]" />
                <span className="h-2 w-5 rounded-full bg-[#10ad58]" />
                <span className="h-2 w-5 rounded-full bg-[#10ad58]" />
              </div>
            </div>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password  here"
              required
            />
          </div>

          <Button type="submit" className="mt-4 h-11 w-full text-white bg-[#087fff]">
            Continue
          </Button>
        </form>

        <p className="mt-7 text-center text-sm text-[#087fff]">
          Already have an account?{" "}
          <Link to={Routes.auth.login} className="font-semibold hover:underline">
            Sign in here
          </Link>
        </p>
      </div>
    </AuthOnboardingLayout>
  )
}
