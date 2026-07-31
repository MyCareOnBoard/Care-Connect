import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router"
import { format, addDays } from "date-fns"
import { Search } from "lucide-react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar } from "@/components/app/DashboardAvatar"
import { ConnectionsSection, type Connection } from "@/components/app/ConnectionsSection"
import { InvitationRow } from "@/components/app/InvitationRow"
import { NetworkConnectionRow } from "@/components/app/NetworkConnectionRow"
import { MarketplacePromoCard } from "@/components/app/MarketplacePromoCard"
import { useCareFlow } from "@/components/app/useCareFlow"
import { Routes } from "@/routes/constants"
import { cn, getInitials } from "@/lib/utils"
import { getAuthErrorMessage } from "@/utils/auth"
import { getProfile, listProfiles } from "@/utils/careconnect/services/profilesService"
import { listConnections, unfollow, type Connection as ServiceConnection } from "@/utils/careconnect/services/connectionsService"
import type { CareConnectProfile } from "@/utils/careconnect/types"
import { MOCK_INVITATIONS, MOCK_PROFILE_VIEWERS, type MockPerson } from "@/utils/network/mockNetworkData"

const AVATAR_PALETTE = ["bg-[#00b4b8]", "bg-[#ffa33d]", "bg-[#a782d8]", "bg-[#d193ce]", "bg-[#ffc95c]", "bg-[#33b6a6]"]

const tabs = [
  { key: "invitations", label: "Invitations" },
  { key: "connections", label: "Connections" },
  { key: "agencies", label: "Agencies" },
] as const
type NetworkTab = (typeof tabs)[number]["key"]

/** Deterministic placeholder "Connected on/Subscribed on" date — no real timestamp exists on a Connection record. */
function placeholderDate(seed: string): string {
  const hash = [...seed].reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  const daysAgo = (hash * 37) % 900
  return format(addDays(new Date(), -daysAgo), "MMMM d, yyyy")
}

function toConnection(profile: CareConnectProfile, index: number, viewProfile: (id: string) => string): Connection {
  return {
    name: profile.name || "Care Connect user",
    subtitle: profile.subtitle,
    initials: getInitials(profile.name),
    avatarClassName: AVATAR_PALETTE[index % AVATAR_PALETTE.length],
    profileHref: viewProfile(profile.uid),
    uid: profile.uid,
    isFollowing: profile.isFollowing,
  }
}

type ResolvedConnection = {
  connectionId: string
  uid: string
  name: string
  subtitle: string
  initials: string
  avatarClassName: string
}

function NetworkSkeleton() {
  return (
    <div className="p-5 sm:p-8">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
        <div className="space-y-4">
          <Skeleton className="h-40 rounded-lg" />
          <Skeleton className="h-56 rounded-lg" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-10 w-60" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      </div>
    </div>
  )
}

export default function NetworkPage() {
  const { flow } = useCareFlow()
  const routes = flow === "agency" ? Routes.app.agency : Routes.app.user
  const viewProfile = routes.viewProfile
  const [searchParams] = useSearchParams()
  const initialTab = (searchParams.get("tab") as NetworkTab | null) ?? "invitations"

  const [tab, setTab] = useState<NetworkTab>(tabs.some((t) => t.key === initialTab) ? initialTab : "invitations")
  const [loading, setLoading] = useState(true)

  const [invitations, setInvitations] = useState<MockPerson[]>(MOCK_INVITATIONS)
  const [invitationSearch, setInvitationSearch] = useState("")

  const [profileViewers, setProfileViewers] = useState<Set<string>>(new Set())

  const [connections, setConnections] = useState<ResolvedConnection[]>([])
  const [connectionSearch, setConnectionSearch] = useState("")

  const [agencies, setAgencies] = useState<ResolvedConnection[]>([])
  const [agencySearch, setAgencySearch] = useState("")

  const [suggestedPeople, setSuggestedPeople] = useState<Connection[]>([])
  const [suggestedAgencies, setSuggestedAgencies] = useState<Connection[]>([])

  const [removingId, setRemovingId] = useState<string | null>(null)

  const resolveConnections = async (list: ServiceConnection[]): Promise<ResolvedConnection[]> => {
    const resolved = await Promise.all(
      list.map(async (connection, index) => {
        try {
          const profile = await getProfile(connection.targetId)
          return {
            connectionId: connection.id,
            uid: connection.targetId,
            name: profile.name || "Care Connect user",
            subtitle: profile.subtitle || "",
            initials: getInitials(profile.name),
            avatarClassName: AVATAR_PALETTE[index % AVATAR_PALETTE.length],
          }
        } catch {
          return null
        }
      }),
    )
    return resolved.filter((item): item is ResolvedConnection => item != null)
  }

  useEffect(() => {
    let active = true
    ;(async () => {
      setLoading(true)
      try {
        const [connectRelations, subscribeRelations] = await Promise.all([
          listConnections("connect").catch(() => []),
          listConnections("subscribe").catch(() => []),
        ])
        if (!active) return
        const followedIds = new Set([...connectRelations, ...subscribeRelations].map((c) => c.targetId))

        const [resolvedConnections, resolvedAgencies, individuals, companies] = await Promise.all([
          resolveConnections(connectRelations),
          resolveConnections(subscribeRelations),
          listProfiles({ type: "individual", limit: 8 }).catch(() => []),
          listProfiles({ type: "company", limit: 8 }).catch(() => []),
        ])
        if (!active) return

        setConnections(resolvedConnections)
        setAgencies(resolvedAgencies)
        setSuggestedPeople(
          individuals
            .filter((profile) => !followedIds.has(profile.uid))
            .map((profile, index) => toConnection(profile, index, viewProfile)),
        )
        setSuggestedAgencies(
          companies
            .filter((profile) => !followedIds.has(profile.uid))
            .map((profile, index) => toConnection(profile, index, viewProfile)),
        )
      } catch (error) {
        if (active) toast.error(getAuthErrorMessage(error))
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flow])

  const acceptInvitation = (person: MockPerson) => {
    setInvitations((current) => current.filter((item) => item.id !== person.id))
    toast.success(`You're now connected with ${person.name}`)
  }

  const declineInvitation = (person: MockPerson) => {
    setInvitations((current) => current.filter((item) => item.id !== person.id))
    toast(`Invitation from ${person.name} declined`)
  }

  const toggleProfileViewerConnect = (person: MockPerson) => {
    setProfileViewers((current) => {
      const next = new Set(current)
      if (next.has(person.id)) next.delete(person.id)
      else next.add(person.id)
      return next
    })
    toast.success(`Connection request sent to ${person.name}`)
  }

  const removeConnection = async (connectionId: string, uid: string, label: string) => {
    setRemovingId(connectionId)
    try {
      await unfollow(uid)
      setConnections((current) => current.filter((item) => item.connectionId !== connectionId))
      setAgencies((current) => current.filter((item) => item.connectionId !== connectionId))
      toast.success(label)
    } catch (error) {
      toast.error(getAuthErrorMessage(error))
    } finally {
      setRemovingId(null)
    }
  }

  const visibleInvitations = invitationSearch
    ? invitations.filter(
        (item) =>
          item.name.toLowerCase().includes(invitationSearch.toLowerCase()) ||
          item.role.toLowerCase().includes(invitationSearch.toLowerCase()),
      )
    : invitations

  const visibleConnections = useMemo(
    () =>
      connectionSearch
        ? connections.filter((item) => item.name.toLowerCase().includes(connectionSearch.toLowerCase()))
        : connections,
    [connections, connectionSearch],
  )

  const visibleAgencies = useMemo(
    () =>
      agencySearch
        ? agencies.filter((item) => item.name.toLowerCase().includes(agencySearch.toLowerCase()))
        : agencies,
    [agencies, agencySearch],
  )

  if (loading) return <NetworkSkeleton />

  return (
    <div className="p-5 sm:p-8">
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="space-y-6">
          <section className="rounded-lg border border-white/60 bg-white/80 p-4 shadow-[0_4px_16px_rgba(16,20,26,0.05)] backdrop-blur-md">
            <h2 className="mb-3 text-sm font-semibold text-[#657080]">Manage network here</h2>
            <div className="space-y-1">
              {tabs.map((item) => {
                const count = item.key === "invitations" ? invitations.length : item.key === "connections" ? connections.length : agencies.length
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setTab(item.key)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg px-2 py-2 text-sm font-semibold transition-all duration-150 active:scale-[0.98]",
                      tab === item.key ? "bg-[#e3f8f8] text-[#00b4b8]" : "text-[#151922] hover:bg-[#f2f6f8]",
                    )}
                  >
                    {item.label}
                    <span>{count}</span>
                  </button>
                )
              })}
            </div>
          </section>

          {tab === "agencies" ? (
            suggestedAgencies.length > 0 && (
              <ConnectionsSection
                title="Top agencies around you"
                items={suggestedAgencies}
                actionLabel="Subscribe"
                activeLabel="Subscribed"
                relation="subscribe"
                targetType="company"
                showViewAll={false}
              />
            )
          ) : (
            <section className="rounded-lg border border-white/60 bg-white/80 p-4 shadow-[0_4px_16px_rgba(16,20,26,0.05)] backdrop-blur-md">
              <h2 className="mb-4 text-sm font-semibold">People who viewed your profile</h2>
              <div className="space-y-4">
                {MOCK_PROFILE_VIEWERS.map((person, index) => {
                  const connected = profileViewers.has(person.id)
                  return (
                    <div
                      key={person.id}
                      style={{ animationDelay: `${index * 60}ms` }}
                      className="animate-fade-in-up -mx-2 flex items-center gap-3 rounded-xl px-2 py-1 transition-colors duration-200 hover:bg-white/70"
                    >
                      <Avatar className={person.avatarBg} initials={getInitials(person.name)} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold">{person.name}</p>
                        <p className="mt-1 truncate text-sm text-[#657080]">{person.role}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleProfileViewerConnect(person)}
                        className={cn(
                          "h-9 shrink-0 rounded-full border px-4 text-sm font-medium transition-transform duration-150 hover:scale-105 active:scale-95",
                          connected ? "border-[#10ad58] bg-[#eafaf1] text-[#10ad58]" : "border-[#00b4b8] text-[#00b4b8]",
                        )}
                      >
                        {connected ? "Message" : "Connect"}
                      </button>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          <div className="hidden xl:block">
            <MarketplacePromoCard marketplaceHref={routes.marketplace} />
          </div>
        </aside>

        <main>
          {tab === "invitations" && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h1 className="text-xl font-bold text-[#151922]">Invitations({invitations.length})</h1>
                <div className="relative w-full max-w-sm">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a8f98]" />
                  <Input value={invitationSearch} onChange={(e) => setInvitationSearch(e.target.value)} placeholder="Role, Name, keyword etc." className="pl-9" />
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {visibleInvitations.length === 0 ? (
                  <p className="rounded-3xl border border-dashed border-[#e5ecf5] p-10 text-center text-sm text-[#657080]">No invitations right now.</p>
                ) : (
                  visibleInvitations.map((person, index) => (
                    <InvitationRow
                      key={person.id}
                      person={person}
                      onAccept={() => acceptInvitation(person)}
                      onDecline={() => declineInvitation(person)}
                      style={{ animationDelay: `${index * 60}ms` }}
                    />
                  ))
                )}
              </div>

              {suggestedPeople.length > 0 && (
                <div className="mt-10">
                  <ConnectionsSection title="People you may know" items={suggestedPeople} actionLabel="Connect" activeLabel="Pending" relation="connect" targetType="individual" showViewAll={false} />
                </div>
              )}
            </>
          )}

          {tab === "connections" && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h1 className="text-xl font-bold text-[#151922]">Connections({connections.length})</h1>
                <div className="relative w-full max-w-sm">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a8f98]" />
                  <Input value={connectionSearch} onChange={(e) => setConnectionSearch(e.target.value)} placeholder="Role, Name, keyword etc." className="pl-9" />
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {visibleConnections.length === 0 ? (
                  <p className="rounded-3xl border border-dashed border-[#e5ecf5] p-10 text-center text-sm text-[#657080]">No connections yet.</p>
                ) : (
                  visibleConnections.map((item, index) => (
                    <NetworkConnectionRow
                      key={item.connectionId}
                      name={item.name}
                      subtitle={item.subtitle}
                      initials={item.initials}
                      avatarClassName={item.avatarClassName}
                      profileHref={viewProfile(item.uid)}
                      dateLabel={`Connected on ${placeholderDate(item.connectionId)}`}
                      messageHref={`${routes.messages}?to=${item.uid}`}
                      removeLabel="Remove"
                      removing={removingId === item.connectionId}
                      onRemove={() => removeConnection(item.connectionId, item.uid, "Connection removed")}
                      style={{ animationDelay: `${index * 60}ms` }}
                    />
                  ))
                )}
              </div>
            </>
          )}

          {tab === "agencies" && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h1 className="text-xl font-bold text-[#151922]">Agencies connections({agencies.length})</h1>
                <div className="relative w-full max-w-sm">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a8f98]" />
                  <Input value={agencySearch} onChange={(e) => setAgencySearch(e.target.value)} placeholder="Role, Name, keyword etc." className="pl-9" />
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {visibleAgencies.length === 0 ? (
                  <p className="rounded-3xl border border-dashed border-[#e5ecf5] p-10 text-center text-sm text-[#657080]">No agency subscriptions yet.</p>
                ) : (
                  visibleAgencies.map((item, index) => (
                    <NetworkConnectionRow
                      key={item.connectionId}
                      name={item.name}
                      subtitle={item.subtitle}
                      initials={item.initials}
                      avatarClassName={item.avatarClassName}
                      profileHref={viewProfile(item.uid)}
                      dateLabel={`Subscribed on ${placeholderDate(item.connectionId)}`}
                      messageHref={`${routes.messages}?to=${item.uid}`}
                      removeLabel="Unsubscribe"
                      removing={removingId === item.connectionId}
                      onRemove={() => removeConnection(item.connectionId, item.uid, "Unsubscribed")}
                      style={{ animationDelay: `${index * 60}ms` }}
                    />
                  ))
                )}
              </div>
            </>
          )}
        </main>

        <div className="xl:hidden">
          <MarketplacePromoCard marketplaceHref={routes.marketplace} />
        </div>
      </div>
    </div>
  )
}
