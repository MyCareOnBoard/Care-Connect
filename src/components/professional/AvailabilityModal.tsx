import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { ButtonLoader } from "@/components/ui/loader"
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { AvailabilityEditor } from "@/components/professional/AvailabilityEditor"
import { getAuthErrorMessage } from "@/utils/auth"
import { getMyMembership, updateMyAvailability } from "@/utils/careconnect/services/teamService"
import { DEFAULT_AVAILABILITY, type WeeklyAvailability } from "@/utils/professional/availabilityStore"

type AvailabilityModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AvailabilityModal({ open, onOpenChange }: AvailabilityModalProps) {
  const [value, setValue] = useState<WeeklyAvailability>(DEFAULT_AVAILABILITY)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Load the professional's stored availability from the backend each time it opens.
  useEffect(() => {
    if (!open) return
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
        </DialogHeader>
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
        <DialogFooter className="px-6 pb-6">
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
