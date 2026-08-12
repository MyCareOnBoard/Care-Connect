import { useEffect, useState } from "react"
import { AlertTriangle, CheckCircle2, Download, Loader2, XCircle } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { PhoneNumberField } from "@/components/auth/PhoneNumberField"
import { FileDropzone } from "@/components/auth/FileDropzone"
import type { BulkInviteMemberInput, BulkInviteResult } from "@/utils/careconnect/services/teamService"
import {
  downloadTeamRosterTemplate,
  parseTeamRosterFile,
  RosterFileError,
  TEAM_ROSTER_ACCEPT,
  TEAM_ROSTER_MAX_ROWS,
  type ParsedRoster,
} from "@/utils/careconnect/teamRosterFile"

type TeamInvite = { phone: string; email: string; fullName: string }

type TeamInviteDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  newTeamInvite: TeamInvite
  onNewTeamInviteChange: (value: TeamInvite) => void
  onInviteTeamMember: (input: { fullName: string; email: string; phone: string }) => Promise<void> | void
  onBulkInviteTeamMembers?: (members: BulkInviteMemberInput[]) => Promise<BulkInviteResult | undefined>
}

const modes = ["Single invite", "Upload spreadsheet"] as const
type Mode = (typeof modes)[number]

export function TeamInviteDialog({
  open,
  onOpenChange,
  newTeamInvite,
  onNewTeamInviteChange,
  onInviteTeamMember,
  onBulkInviteTeamMembers,
}: TeamInviteDialogProps) {
  const [mode, setMode] = useState<Mode>("Single invite")
  const [sendingSingle, setSendingSingle] = useState(false)

  const [file, setFile] = useState<File | null>(null)
  const [parsing, setParsing] = useState(false)
  const [roster, setRoster] = useState<ParsedRoster | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [sendingBulk, setSendingBulk] = useState(false)
  const [bulkResult, setBulkResult] = useState<BulkInviteResult | null>(null)

  const resetBulk = () => {
    setFile(null)
    setRoster(null)
    setParseError(null)
    setBulkResult(null)
  }

  // Start each visit from a clean slate so a previous import's results never
  // linger over a new one.
  useEffect(() => {
    if (open) return
    setMode("Single invite")
    setFile(null)
    setRoster(null)
    setParseError(null)
    setBulkResult(null)
  }, [open])

  const handleFileChange = async (next: File | null) => {
    setFile(next)
    setRoster(null)
    setParseError(null)
    setBulkResult(null)
    if (!next) return

    setParsing(true)
    try {
      setRoster(await parseTeamRosterFile(next))
    } catch (error) {
      setParseError(
        error instanceof RosterFileError
          ? error.message
          : "Couldn't read that file. Make sure it's a valid .xlsx or .csv spreadsheet.",
      )
    } finally {
      setParsing(false)
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      await downloadTeamRosterTemplate()
    } catch {
      toast.error("Couldn't generate the template. Please try again.")
    }
  }

  const validRows = roster?.rows.filter((row) => row.errors.length === 0) ?? []
  const invalidRows = roster?.rows.filter((row) => row.errors.length > 0) ?? []

  const handleSendBulk = async () => {
    if (!onBulkInviteTeamMembers || validRows.length === 0) return
    setSendingBulk(true)
    try {
      const result = await onBulkInviteTeamMembers(
        validRows.map((row) => ({
          name: row.name,
          email: row.email,
          phone: row.phone || undefined,
          role: row.role || undefined,
        })),
      )
      if (result) setBulkResult(result)
    } finally {
      setSendingBulk(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton className={`p-0 ${mode === "Single invite" ? "max-w-130" : "max-w-175"}`}>
        <DialogHeader className="px-6 pt-6 text-left">
          <DialogTitle className="text-xl font-semibold text-[#151922]">Team invitation</DialogTitle>
        </DialogHeader>

        <div className="px-6 pt-4">
          <div className="flex gap-1 rounded-lg bg-[#f4f4f5] p-1" role="tablist">
            {modes.map((item) => (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={mode === item}
                onClick={() => setMode(item)}
                className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  mode === item ? "bg-white text-[#151922] shadow-sm" : "text-[#657080] hover:text-[#151922]"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {mode === "Single invite" ? (
          <DialogBody className="px-6 pt-4 pb-6 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-[#151922]">Phone number</label>
              <PhoneNumberField
                value={newTeamInvite.phone}
                onChange={(value) => onNewTeamInviteChange({ ...newTeamInvite, phone: value })}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-[#151922]">Email</label>
              <Input
                value={newTeamInvite.email}
                onChange={(event) => onNewTeamInviteChange({ ...newTeamInvite, email: event.target.value })}
                placeholder="Enter your email  here"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-[#151922]">Full name</label>
              <Input
                value={newTeamInvite.fullName}
                onChange={(event) => onNewTeamInviteChange({ ...newTeamInvite, fullName: event.target.value })}
                placeholder="Enter your full name here"
              />
            </div>
            <Button
              className="w-full bg-[#00b4b8] text-white hover:opacity-90"
              disabled={sendingSingle || !newTeamInvite.fullName.trim()}
              onClick={async () => {
                if (!newTeamInvite.fullName.trim()) return
                setSendingSingle(true)
                try {
                  await onInviteTeamMember({
                    fullName: newTeamInvite.fullName.trim(),
                    email: newTeamInvite.email.trim(),
                    phone: newTeamInvite.phone.trim(),
                  })
                  onNewTeamInviteChange({ phone: "", email: "", fullName: "" })
                  onOpenChange(false)
                } finally {
                  setSendingSingle(false)
                }
              }}
            >
              {sendingSingle ? "Sending…" : "Send invitation"}
            </Button>
          </DialogBody>
        ) : (
          <DialogBody className="px-6 pt-4 pb-6 space-y-4 max-h-[70vh] overflow-y-auto">
            {bulkResult ? (
              <BulkResultSummary
                result={bulkResult}
                onImportAnother={resetBulk}
                onDone={() => onOpenChange(false)}
              />
            ) : (
              <>
                <div className="flex items-start justify-between gap-4">
                  <p className="text-sm text-[#657080]">
                    Upload a spreadsheet with a <span className="font-medium text-[#151922]">Name</span> and{" "}
                    <span className="font-medium text-[#151922]">Email</span> column. Phone and Role are optional.
                  </p>
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="flex shrink-0 items-center gap-1.5 text-sm font-medium text-[#00b4b8] hover:underline"
                  >
                    <Download className="size-4" />
                    Download template
                  </button>
                </div>

                <FileDropzone
                  file={file}
                  onFileChange={handleFileChange}
                  accept={TEAM_ROSTER_ACCEPT}
                  hint={`Excel (.xlsx) or CSV — up to ${TEAM_ROSTER_MAX_ROWS} team members`}
                />

                {parsing && (
                  <p className="flex items-center gap-2 text-sm text-[#657080]">
                    <Loader2 className="size-4 animate-spin" />
                    Reading spreadsheet…
                  </p>
                )}

                {parseError && (
                  <p className="flex items-start gap-2 rounded-lg bg-[#fff1f3] px-3 py-2.5 text-sm text-[#c2334d]">
                    <XCircle className="mt-0.5 size-4 shrink-0" />
                    <span>{parseError}</span>
                  </p>
                )}

                {roster && (
                  <RosterPreview
                    roster={roster}
                    validCount={validRows.length}
                    invalidCount={invalidRows.length}
                  />
                )}

                {roster && (
                  <Button
                    className="w-full bg-[#00b4b8] text-white hover:opacity-90"
                    disabled={sendingBulk || validRows.length === 0}
                    onClick={handleSendBulk}
                  >
                    {sendingBulk
                      ? "Sending invitations…"
                      : validRows.length === 0
                        ? "No valid rows to invite"
                        : `Send ${validRows.length} invitation${validRows.length === 1 ? "" : "s"}`}
                  </Button>
                )}
              </>
            )}
          </DialogBody>
        )}
      </DialogContent>
    </Dialog>
  )
}

function RosterPreview({
  roster,
  validCount,
  invalidCount,
}: {
  roster: ParsedRoster
  validCount: number
  invalidCount: number
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <span className="flex items-center gap-1.5 font-medium text-[#151922]">
          <CheckCircle2 className="size-4 text-[#12b76a]" />
          {validCount} ready to invite
        </span>
        {invalidCount > 0 && (
          <span className="flex items-center gap-1.5 font-medium text-[#c2334d]">
            <XCircle className="size-4" />
            {invalidCount} will be skipped
          </span>
        )}
      </div>

      {roster.truncated && (
        <p className="flex items-start gap-2 rounded-lg bg-[#fff8e6] px-3 py-2.5 text-sm text-[#8a6100]">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>
            Only the first {TEAM_ROSTER_MAX_ROWS} rows are shown — split larger files and upload them in batches.
          </span>
        </p>
      )}

      {roster.unmappedHeaders.length > 0 && (
        <p className="flex items-start gap-2 rounded-lg bg-[#fff8e6] px-3 py-2.5 text-sm text-[#8a6100]">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>Ignored unrecognised column{roster.unmappedHeaders.length === 1 ? "" : "s"}: {roster.unmappedHeaders.join(", ")}.</span>
        </p>
      )}

      <div className="max-h-72 overflow-auto rounded-lg border border-[#e6e8ec]">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-[#f9fafb] text-xs uppercase tracking-wide text-[#657080]">
            <tr>
              <th className="px-3 py-2 font-medium">Row</th>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Email</th>
              <th className="px-3 py-2 font-medium">Phone</th>
              <th className="px-3 py-2 font-medium">Role</th>
            </tr>
          </thead>
          <tbody>
            {roster.rows.map((row) => {
              const invalid = row.errors.length > 0
              return (
                <tr
                  key={row.rowNumber}
                  className={`border-t border-[#eef0f3] align-top ${invalid ? "bg-[#fff6f7]" : ""}`}
                >
                  <td className="px-3 py-2 text-[#657080]">{row.rowNumber}</td>
                  <td className="px-3 py-2">
                    <span className={invalid ? "text-[#c2334d]" : "text-[#151922]"}>{row.name || "—"}</span>
                    {invalid && <p className="mt-0.5 text-xs text-[#c2334d]">{row.errors.join(" · ")}</p>}
                  </td>
                  <td className="px-3 py-2 text-[#657080]">{row.email || "—"}</td>
                  <td className="px-3 py-2 text-[#657080]">{row.phone || "—"}</td>
                  <td className="px-3 py-2 text-[#657080]">{row.role || "—"}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function BulkResultSummary({
  result,
  onImportAnother,
  onDone,
}: {
  result: BulkInviteResult
  onImportAnother: () => void
  onDone: () => void
}) {
  const notEmailed = result.invited - result.emailed

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Stat label="Invited" value={result.invited} tone="good" />
        <Stat label="Emailed" value={result.emailed} tone={result.emailed > 0 ? "good" : "muted"} />
        {notEmailed > 0 && <Stat label="Email failed" value={notEmailed} tone="warn" />}
        {result.skipped > 0 && <Stat label="Skipped" value={result.skipped} tone="bad" />}
      </div>

      {notEmailed > 0 && (
        <p className="flex items-start gap-2 rounded-lg bg-[#fff8e6] px-3 py-2.5 text-sm text-[#8a6100]">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>
            {notEmailed} invitation{notEmailed === 1 ? " was" : "s were"} created but couldn't be emailed. Those members
            are on your roster as invited — reach out to them directly.
          </span>
        </p>
      )}

      <div className="max-h-72 overflow-auto rounded-lg border border-[#e6e8ec]">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-[#f9fafb] text-xs uppercase tracking-wide text-[#657080]">
            <tr>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Email</th>
              <th className="px-3 py-2 font-medium">Result</th>
            </tr>
          </thead>
          <tbody>
            {result.results.map((row) => (
              <tr key={row.index} className="border-t border-[#eef0f3] align-top">
                <td className="px-3 py-2 text-[#151922]">{row.name || "—"}</td>
                <td className="px-3 py-2 text-[#657080]">{row.email || "—"}</td>
                <td className="px-3 py-2">
                  {row.status === "skipped" ? (
                    <span className="flex items-start gap-1.5 text-[#c2334d]">
                      <XCircle className="mt-0.5 size-4 shrink-0" />
                      <span>Skipped{row.error ? ` — ${row.error}` : ""}</span>
                    </span>
                  ) : row.emailed ? (
                    <span className="flex items-center gap-1.5 text-[#12b76a]">
                      <CheckCircle2 className="size-4" />
                      Invited &amp; emailed
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-[#8a6100]">
                      <AlertTriangle className="size-4" />
                      Invited — email not sent
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onImportAnother}>
          Import another file
        </Button>
        <Button className="flex-1 bg-[#00b4b8] text-white hover:opacity-90" onClick={onDone}>
          Done
        </Button>
      </div>
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "good" | "warn" | "bad" | "muted" }) {
  const tones = {
    good: "bg-[#eafaf1] text-[#0b7a48]",
    warn: "bg-[#fff8e6] text-[#8a6100]",
    bad: "bg-[#fff1f3] text-[#c2334d]",
    muted: "bg-[#f4f4f5] text-[#657080]",
  } as const
  return (
    <span className={`rounded-lg px-3 py-2 text-sm font-medium ${tones[tone]}`}>
      {value} {label}
    </span>
  )
}
