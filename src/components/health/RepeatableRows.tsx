import { Plus, Trash2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ALLERGY_SEVERITY_LABELS,
  type Allergy,
  type AllergySeverity,
  type Medication,
} from "@/utils/careconnect/types"

/**
 * Repeatable row editors for allergies and medications.
 *
 * Rows are keyed by index, so both editors always rebuild every row from the
 * array they are given rather than holding per-row state — deleting the first of
 * two rows must not leave the second showing the deleted values.
 */

const ROW_CLASS = "rounded-xl border border-[#eef1f3] p-3 space-y-2"

function AddRowButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 text-sm font-semibold text-[#00898c] hover:opacity-80"
    >
      <Plus className="size-4" />
      {label}
    </button>
  )
}

function DeleteRowButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="text-[#657080] transition hover:text-[#ff3e66]"
    >
      <Trash2 className="size-4" />
    </button>
  )
}

export function AllergyRows({
  value,
  onChange,
}: {
  value: Allergy[]
  onChange: (next: Allergy[]) => void
}) {
  const update = (index: number, patch: Partial<Allergy>) => {
    onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  return (
    <div className="space-y-3">
      {value.map((row, index) => (
        <div key={index} className={ROW_CLASS}>
          <div className="flex items-start gap-2">
            <Input
              value={row.substance}
              onChange={(event) => update(index, { substance: event.target.value })}
              placeholder="What are they allergic to?"
              className="h-11"
            />
            <div className="pt-3">
              <DeleteRowButton
                label={`Remove allergy ${index + 1}`}
                onClick={() => onChange(value.filter((_, i) => i !== index))}
              />
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Input
              value={row.reaction ?? ""}
              onChange={(event) => update(index, { reaction: event.target.value })}
              placeholder="What happens? e.g. rash, swelling"
              className="h-11"
            />
            {/* Severity is the whole point: "penicillin" and "penicillin -
                anaphylaxis" are different visits. */}
            <Select
              value={row.severity ?? ""}
              onValueChange={(next) => update(index, { severity: next as AllergySeverity })}
            >
              <SelectTrigger className="h-11 w-full">
                <SelectValue placeholder="How severe?" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(ALLERGY_SEVERITY_LABELS) as AllergySeverity[]).map((severity) => (
                  <SelectItem key={severity} value={severity}>
                    {ALLERGY_SEVERITY_LABELS[severity]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      ))}
      <AddRowButton
        label={value.length === 0 ? "Add an allergy" : "Add another"}
        onClick={() => onChange([...value, { substance: "" }])}
      />
    </div>
  )
}

export function MedicationRows({
  value,
  onChange,
}: {
  value: Medication[]
  onChange: (next: Medication[]) => void
}) {
  const update = (index: number, patch: Partial<Medication>) => {
    onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  return (
    <div className="space-y-3">
      {value.map((row, index) => (
        <div key={index} className={ROW_CLASS}>
          <div className="flex items-start gap-2">
            <Input
              value={row.name}
              onChange={(event) => update(index, { name: event.target.value })}
              placeholder="Medication name"
              className="h-11"
            />
            <div className="pt-3">
              <DeleteRowButton
                label={`Remove medication ${index + 1}`}
                onClick={() => onChange(value.filter((_, i) => i !== index))}
              />
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Input
              value={row.dose ?? ""}
              onChange={(event) => update(index, { dose: event.target.value })}
              placeholder="Dose, e.g. 500mg"
              className="h-11"
            />
            <Input
              value={row.frequency ?? ""}
              onChange={(event) => update(index, { frequency: event.target.value })}
              placeholder="How often, e.g. twice daily"
              className="h-11"
            />
          </div>
        </div>
      ))}
      <AddRowButton
        label={value.length === 0 ? "Add a medication" : "Add another"}
        onClick={() => onChange([...value, { name: "" }])}
      />
    </div>
  )
}
