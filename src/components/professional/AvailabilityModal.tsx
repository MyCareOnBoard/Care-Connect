import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AvailabilityEditor } from "@/components/professional/AvailabilityEditor"
import { DEFAULT_AVAILABILITY, getAvailability, saveAvailability, type WeeklyAvailability } from "@/utils/professional/availabilityStore"

type AvailabilityModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  uid: string | null | undefined
}

export function AvailabilityModal({ open, onOpenChange, uid }: AvailabilityModalProps) {
  const [value, setValue] = useState<WeeklyAvailability>(DEFAULT_AVAILABILITY)

  useEffect(() => {
    if (open && uid) setValue(getAvailability(uid))
  }, [open, uid])

  const handleSave = () => {
    if (uid) saveAvailability(uid, value)
    onOpenChange(false)
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
          <AvailabilityEditor value={value} onChange={setValue} />
        </DialogBody>
        <DialogFooter className="px-6 pb-6">
          <Button onClick={handleSave} className="bg-[#087fff] text-white hover:opacity-90">
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
