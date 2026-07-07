import { Button } from "@/components/ui/button"
import { useAuth } from "@/utils/auth"

export default function DashboardPage() {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold">Welcome{user?.fullName ? `, ${user.fullName}` : ""}</h1>
      <p className="text-muted-foreground">This is a placeholder dashboard — build your app here.</p>
      <Button variant="outline" onClick={() => logout()}>
        Log out
      </Button>
    </div>
  )
}
