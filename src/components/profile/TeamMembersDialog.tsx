import { UserRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { TeamMember } from "@/utils/careconnect/types"

type TeamMembersDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  members: TeamMember[]
  onWithdrawInvite: (id: string) => void
}

/** Roster view — same list/actions as the profile page's Team tab, reused wherever a quick "view team" popup is needed. */
export function TeamMembersDialog({ open, onOpenChange, members, onWithdrawInvite }: TeamMembersDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton className="p-0 max-w-140">
        <DialogHeader className="px-6 pt-6 text-left">
          <DialogTitle className="text-xl font-semibold text-[#151922]">Team members</DialogTitle>
        </DialogHeader>
        <DialogBody className="max-h-[60vh] space-y-4 overflow-y-auto px-6 pt-4 pb-6">
          {members.length === 0 ? (
            <p className="rounded-3xl border border-dashed border-[#e5ecf5] p-6 text-center text-sm text-[#657080]">
              No team members yet.
            </p>
          ) : (
            members.map((member) => (
              <div key={member.id} className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-[#e5ecf5] p-5">
                <div className="flex items-center gap-4">
                  <div className={`flex size-12 items-center justify-center rounded-full ${member.avatarBg}`}>
                    <UserRound className="text-white size-7" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#151922]">{member.name}</p>
                    {/* A member without a set role (invited, or a backend "Unknown"
                        placeholder) gets a blank line rather than showing "Unknown". */}
                    <p className="mt-1 text-sm text-[#656f80]">
                      {member.status === "invited" || !member.role || member.role.trim().toLowerCase() === "unknown"
                        ? " "
                        : member.role}
                    </p>
                  </div>
                </div>
                {member.status === "invited" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full border-[#00b4b8] text-[#00b4b8] hover:bg-[#e3f8f8]"
                    onClick={() => onWithdrawInvite(member.id)}
                  >
                    Withdraw invite
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" className="rounded-full border-[#00b4b8] text-[#00b4b8] hover:bg-[#e3f8f8]">
                    Message
                  </Button>
                )}
              </div>
            ))
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
