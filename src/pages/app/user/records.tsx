import { useEffect, useState } from "react"
import { Link } from "react-router"
import { ChevronLeft } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { RecordCard } from "@/components/records/RecordCard"
import { RecordViewerDialog } from "@/components/records/RecordViewerDialog"
import { Routes } from "@/routes/constants"
import { useAuthUser } from "@/utils/auth"
import { listMyRecords } from "@/utils/careconnect/services/clinicalService"
import type { VisitRecord } from "@/utils/careconnect/types"

/** The client's own visit history. Signed records only — drafts never reach them. */
export default function MyRecordsPage() {
  const { user } = useAuthUser()
  const [loading, setLoading] = useState(true)
  const [records, setRecords] = useState<VisitRecord[]>([])
  const [openRecord, setOpenRecord] = useState<VisitRecord | null>(null)

  useEffect(() => {
    let active = true
    listMyRecords()
      .then((list) => {
        if (active) setRecords(list)
      })
      .catch(() => {
        if (active) setRecords([])
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="space-y-6 p-5 sm:p-8">
      <div>
        <Link
          to={Routes.app.user.healthProfile}
          className="inline-flex items-center gap-1 text-sm font-semibold text-[#657080] hover:text-[#151922]"
        >
          <ChevronLeft className="size-4" />
          My health
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-[#151922]">My visit records</h1>
        <p className="mt-1 text-sm text-[#657080]">
          Written by the professionals who visited you. You can read them any time.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : records.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[#e5ecf5] p-8 text-center text-sm text-[#657080]">
          No visit records yet. One appears here after a professional writes and signs it.
        </p>
      ) : (
        <div className="space-y-3">
          {records.map((record) => (
            <RecordCard
              key={record.id}
              record={record}
              viewerUid={user?.uid ?? null}
              onOpen={setOpenRecord}
            />
          ))}
        </div>
      )}

      <RecordViewerDialog
        record={openRecord}
        open={openRecord !== null}
        onOpenChange={(next) => {
          if (!next) setOpenRecord(null)
        }}
        viewerUid={user?.uid ?? null}
      />
    </div>
  )
}
