import { useEffect, useState } from "react"
import { toast } from "sonner"
import { LocateFixed, MapPin, Navigation } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ButtonLoader } from "@/components/ui/loader"
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { AvailabilityEditor } from "@/components/professional/AvailabilityEditor"
import { cn } from "@/lib/utils"
import { getAuthErrorMessage } from "@/utils/auth"
import { getMyMembership, updateMyAvailability } from "@/utils/careconnect/services/teamService"
import { DEFAULT_AVAILABILITY, type WeeklyAvailability } from "@/utils/professional/availabilityStore"

type AvailabilityModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type AvailabilityStep = "location" | "schedule"

const LOCATION_SUGGESTION_HINTS = ["3rd Gate total filling station", "Delcam senior high school"]

export function AvailabilityModal({ open, onOpenChange }: AvailabilityModalProps) {
  const [step, setStep] = useState<AvailabilityStep>("location")
  const [value, setValue] = useState<WeeklyAvailability>(DEFAULT_AVAILABILITY)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  // Coverage area — no field exists yet to persist this, so it's local-only for now.
  const [locationQuery, setLocationQuery] = useState("")
  const [locatingCurrent, setLocatingCurrent] = useState(false)

  // Load the professional's stored availability from the backend each time it opens.
  useEffect(() => {
    if (!open) return
    setStep("location")
    setLocationQuery("")
    setLocatingCurrent(false)
    let active = true
    setLoading(true)
    getMyMembership()
      .then((result) => {
        if (active && result.member?.availability) setValue(result.member.availability)
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [open])

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Location isn't available on this device")
      return
    }
    setLocatingCurrent(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationQuery(`Current location (${position.coords.latitude.toFixed(3)}, ${position.coords.longitude.toFixed(3)})`)
        setLocatingCurrent(false)
      },
      () => {
        toast.error("Couldn't get your current location")
        setLocatingCurrent(false)
      },
    )
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateMyAvailability(value)
      toast.success("Availability updated")
      onOpenChange(false)
    } catch (error) {
      toast.error(getAuthErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton className="p-0 max-w-160">
        <DialogHeader className="px-6 pt-6 text-left">
          <DialogTitle className="text-xl font-semibold text-[#151922]">Availability</DialogTitle>
          <p className="text-sm text-[#657080]">
            Set up your availability to streamline your schedule and enhance your business efficiency!
          </p>
          <div className="mt-2 flex gap-2">
            <span className={cn("h-1.5 flex-1 rounded-full", step === "location" ? "bg-[#00b4b8]" : "bg-[#e3f8f8]")} />
            <span className={cn("h-1.5 flex-1 rounded-full", step === "schedule" ? "bg-[#00b4b8]" : "bg-[#e3f8f8]")} />
          </div>
        </DialogHeader>

        {step === "location" ? (
          <DialogBody className="px-6 pt-4 pb-2 space-y-4 text-sm">
            <div>
              <label className="mb-2 block text-sm font-medium text-[#151922]">Enter your location</label>
              <div className="relative">
                <Input
                  value={locationQuery}
                  onChange={(event) => setLocationQuery(event.target.value)}
                  placeholder="Enter your location"
                  className="pr-10"
                />
                <LocateFixed className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#8a8f98]" />
              </div>
            </div>

            <div className="rounded-xl border border-[#eef1f3]">
              {locationQuery.trim() &&
                LOCATION_SUGGESTION_HINTS.map((hint) => (
                  <button
                    key={hint}
                    type="button"
                    onClick={() => setLocationQuery(`${locationQuery.trim()} Municipality`)}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-[#f2f6f8]"
                  >
                    <MapPin className="size-4 shrink-0 text-[#657080]" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-[#151922]">{locationQuery.trim()} Municipality</span>
                      <span className="block truncate text-xs text-[#8a8f98]">{hint}</span>
                    </span>
                  </button>
                ))}
              <button
                type="button"
                onClick={useCurrentLocation}
                disabled={locatingCurrent}
                className="flex w-full items-center gap-3 border-t border-[#eef1f3] px-3 py-2.5 text-left first:border-t-0 hover:bg-[#f2f6f8]"
              >
                <Navigation className="size-4 shrink-0 text-[#151922]" />
                <span className="text-sm font-medium text-[#151922]">{locatingCurrent ? "Locating…" : "Use current location"}</span>
              </button>
            </div>
          </DialogBody>
        ) : (
          <DialogBody className="px-6 pt-2 pb-2">
            {loading ? (
              <div className="space-y-3 py-2">
                {Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton key={index} className="h-10 rounded-lg" />
                ))}
              </div>
            ) : (
              <AvailabilityEditor value={value} onChange={setValue} />
            )}
          </DialogBody>
        )}

        <DialogFooter className="px-6 pb-6">
          {step === "location" ? (
            <>
              <Button type="button" variant="outline" onClick={() => setStep("schedule")}>
                Update schedule
              </Button>
              <Button type="button" disabled className="bg-[#00b4b8] text-white opacity-60">
                Save changes
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={() => setStep("location")}>
                Update coverage
              </Button>
              <Button onClick={handleSave} disabled={loading || saving} className="bg-[#00b4b8] text-white hover:opacity-90">
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <ButtonLoader />
                    Saving...
                  </span>
                ) : (
                  "Save changes"
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
