import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router"
import { Building2, Inbox, Search, Send, Users } from "lucide-react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar } from "@/components/app/DashboardAvatar"
import { ConnectionsSection, type Connection } from "@/components/app/ConnectionsSection"
import { SuggestionGrid } from "@/components/app/SuggestionGrid"
import { avatarColor } from "@/components/app/avatarColor"
import { InvitationRow } from "@/components/app/InvitationRow"
import { NetworkConnectionRow } from "@/components/app/NetworkConnectionRow"
import { MarketplacePromoCard } from "@/components/app/MarketplacePromoCard"
import { useCareFlow } from "@/components/app/useCareFlow"
import { Routes } from "@/routes/constants"
import { cn, getInitials } from "@/lib/utils"
import { getAuthErrorMessage } from "@/utils/auth"
import {
  getProfile,
  listProfiles,
  listProfileViewers,
  listSuggestedPeople,
  type ProfileViewer,
} from "@/utils/careconnect/services/profilesService"
import {
  isEstablished,
  listConnections,
  unfollow,
  follow,
  listRequests,
  acceptRequest,
  declineRequest,
  type Connection as ServiceConnection,
  type ConnectionRequest,
} from "@/utils/careconnect/services/connectionsService"
import type { CareConnectProfile } from "@/utils/careconnect/types"

const tabs = [
  { key: "invitations", label: "Invitations", icon: Inbox },
  { key: "connections", label: "Connections", icon: Users },
  { key: "agencies", label: "Healthcare Providers", icon: Building2 },
] as const
type NetworkTab = (typeof tabs)[number]["key"]

/*
 * Connection dates used to be invented here from each record's id, and shown as
 * "Connected on <date>". A made-up date read as a real one, so it is gone; a connection
 * shows its date again once the record carries one.
 */

function toConnection(
  profile: CareConnectProfile & { reason?: string },
  _index: number,
  viewProfile: (id: string) => string,
): Connection {
  return {
    name: profile.name || "Care Connect user",
    subtitle: profile.subtitle,
    initials: getInitials(profile.name),
    avatarClassName: avatarColor(profile.uid),
    photo: profile.photo,
    profileHref: viewProfile(profile.uid),
    uid: profile.uid,
    isFollowing: profile.isFollowing,
    reason: profile.reason,
  }
}

type ResolvedConnection = {
  connectionId: string
  uid: string
  name: string
  subtitle: string
  initials: string
  avatarClassName: string
  photo?: string | null
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

  const [invitations, setInvitations] = useState<ConnectionRequest[]>([])
  const [invitationSearch, setInvitationSearch] = useState("")

  const [viewers, setViewers] = useState<ProfileViewer[]>([])
  const [connectedViewers, setConnectedViewers] = useState<Set<string>>(new Set())

  const [connections, setConnections] = useState<ResolvedConnection[]>([])
  // Connect requests you sent that have not been accepted yet — kept apart from connections.
  const [sentRequests, setSentRequests] = useState<ResolvedConnection[]>([])
  const [connectionSearch, setConnectionSearch] = useState("")

  const [agencies, setAgencies] = useState<ResolvedConnection[]>([])
  const [agencySearch, setAgencySearch] = useState("")

  const [suggestedPeople, setSuggestedPeople] = useState<Connection[]>([])
  const [suggestedAgencies, setSuggestedAgencies] = useState<Connection[]>([])

  const [removingId, setRemovingId] = useState<string | null>(null)

  const resolveConnections = async (list: ServiceConnection[]): Promise<ResolvedConnection[]> => {
    const resolved = await Promise.all(
      list.map(async (connection): Promise<ResolvedConnection | null> => {
        try {
          const profile = await getProfile(connection.targetId)
          return {
            connectionId: connection.id,
            uid: connection.targetId,
            name: profile.name || "Care Connect user",
            subtitle: profile.subtitle || "",
            initials: getInitials(profile.name),
            avatarClassName: avatarColor(connection.targetId),
            photo: profile.photo,
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

        const [resolvedConnections, resolvedSent, resolvedAgencies, individuals, companies, requests, viewerList] = await Promise.all([
          resolveConnections(connectRelations.filter(isEstablished)),
          resolveConnections(connectRelations.filter((relation) => !isEstablished(relation))),
          resolveConnections(subscribeRelations),
          // Ranked by shared skills/experience, with a reason per person. Falls back to
          // the plain directory listing so the tab is never empty if suggestions fail.
          listSuggestedPeople().catch(() => listProfiles({ type: "individual", limit: 8 }).catch(() => [])),
          // Agencies keep the directory listing — org-to-org similarity is a different
          // signal set and out of scope here.
          listProfiles({ type: "company", limit: 8 }).catch(() => []),
          listRequests().catch(() => []),
          listProfileViewers().catch(() => []),
        ])
        if (!active) return

        setConnections(resolvedConnections)
        setSentRequests(resolvedSent)
        setAgencies(resolvedAgencies)
        setInvitations(requests)
        setViewers(viewerList)
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

  const acceptInvitation = async (request: ConnectionRequest) => {
    setInvitations((current) => current.filter((item) => item.id !== request.id))
    try {
      await acceptRequest(request.id)
      toast.success(`You're now connected with ${request.requester.name || "them"}`)
    } catch (error) {
      setInvitations((current) => [request, ...current])
      toast.error(getAuthErrorMessage(error))
    }
  }

  const declineInvitation = async (request: ConnectionRequest) => {
    setInvitations((current) => current.filter((item) => item.id !== request.id))
    try {
      await declineRequest(request.id)
    } catch (error) {
      setInvitations((current) => [request, ...current])
      toast.error(getAuthErrorMessage(error))
    }
  }

  const connectWithViewer = async (viewer: ProfileViewer) => {
    if (connectedViewers.has(viewer.uid)) return
    setConnectedViewers((current) => new Set(current).add(viewer.uid))
    try {
      await follow(viewer.uid, "connect", "individual")
      toast.success(`Connection request sent to ${viewer.name || "them"}`)
    } catch (error) {
      setConnectedViewers((current) => {
        const next = new Set(current)
        next.delete(viewer.uid)
        return next
      })
      toast.error(getAuthErrorMessage(error))
    }
  }

  const removeConnection = async (connectionId: string, uid: string, label: string) => {
    setRemovingId(connectionId)
    try {
      await unfollow(uid)
      setConnections((current) => current.filter((item) => item.connectionId !== connectionId))
      setSentRequests((current) => current.filter((item) => item.connectionId !== connectionId))
      setAgencies((current) => current.filter((item) => item.connectionId !== connectionId))
      toast.success(label)
    } catch (error) {
      toast.error(getAuthErrorMessage(error))
    } finally {
      setRemovingId(null)
    }
  }

  const visibleInvitations = invitationSearch
    ? invitations.filter((item) => {
        const q = invitationSearch.toLowerCase()
        return (
          (item.requester.name || "").toLowerCase().includes(q) ||
          (item.requester.subtitle || "").toLowerCase().includes(q)
        )
      })
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
        <aside className="scrollbar-hide space-y-6 xl:sticky xl:top-24 xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto">
          <section className="rounded-2xl border border-white/60 bg-white/85 p-3 shadow-[0_4px_20px_rgba(16,20,26,0.05)] backdrop-blur-md">
            <h2 className="mb-2 px-2 pt-1 text-xs font-semibold uppercase tracking-wide text-[#8a94a3]">Your network</h2>
            <div className="space-y-1">
              {tabs.map((item) => {
                const count = item.key === "invitations" ? invitations.length : item.key === "connections" ? connections.length : agencies.length
                const Icon = item.icon
                const waiting = item.key === "invitations" && count > 0
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setTab(item.key)}
                    aria-current={tab === item.key ? "page" : undefined}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-150 active:scale-[0.98]",
                      tab === item.key ? "bg-[#e3f8f8] text-[#00898c]" : "text-[#151922] hover:bg-[#f2f6f8]",
                    )}
                  >
                    <Icon className="size-[18px] shrink-0" aria-hidden="true" />
                    <span className="flex-1 text-left">{item.label}</span>
                    <span
                      className={cn(
                        "min-w-6 rounded-full px-1.5 text-center text-xs font-bold leading-6",
                        waiting ? "bg-[#ff3e66] text-white" : "bg-[#eef1f3] text-[#657080]",
                      )}
                    >
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
          </section>

          {tab === "agencies" ? (
            suggestedAgencies.length > 0 && (
              <ConnectionsSection
                title="Top healthcare providers around you"
                items={suggestedAgencies}
                actionLabel="Subscribe"
                activeLabel="Subscribed"
                relation="subscribe"
                targetType="company"
                showViewAll={false}
              />
            )
          ) : (
            <section className="rounded-2xl border border-white/60 bg-white/85 p-4 shadow-[0_4px_20px_rgba(16,20,26,0.05)] backdrop-blur-md">
              <h2 className="mb-4 text-base font-bold">People who viewed your profile</h2>
              <div className="space-y-4">
                {viewers.length === 0 ? (
                  <p className="text-sm text-[#657080]">No profile views yet.</p>
                ) : (
                  viewers.map((viewer, index) => {
                    const requested = connectedViewers.has(viewer.uid)
                    return (
                      <div
                        key={viewer.uid}
                        style={{ animationDelay: `${index * 60}ms` }}
                        className="flex items-center gap-3 px-2 py-1 -mx-2 transition-colors duration-200 animate-fade-in-up rounded-xl hover:bg-white/70"
                      >
                        <Avatar className={avatarColor(viewer.uid)} initials={getInitials(viewer.name || undefined)} src={viewer.photo} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold truncate">{viewer.name || "Care Connect user"}</p>
                          <p className="mt-1 truncate text-sm text-[#657080]">{viewer.subtitle || ""}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => connectWithViewer(viewer)}
                          disabled={requested}
                          className={cn(
                            "h-9 shrink-0 rounded-full border px-4 text-sm font-medium transition-transform duration-150 hover:scale-105 active:scale-95 disabled:hover:scale-100",
                            requested ? "border-[#d9d9d9] text-[#657080]" : "border-[#00b4b8] text-[#00b4b8]",
                          )}
                        >
                          {requested ? "Requested" : "Connect"}
                        </button>
                      </div>
                    )
                  })
                )}
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
                <h1 className="text-xl font-bold text-[#151922]">
                  Invitations <span className="text-[#8a94a3]">({invitations.length})</span>
                </h1>
                <div className="relative w-full max-w-sm">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a8f98]" />
                  <Input value={invitationSearch} onChange={(e) => setInvitationSearch(e.target.value)} placeholder="Role, Name, keyword etc." className="pl-9" />
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {visibleInvitations.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-[#d7dde3] bg-white/60 p-10 text-center">
                    <Inbox className="mx-auto size-9 text-[#9aa4b2]" aria-hidden="true" />
                    <p className="mt-3 text-sm font-semibold text-[#151922]">You&apos;re all caught up</p>
                    <p className="mt-1 text-sm text-[#657080]">New connection requests will appear here.</p>
                  </div>
                ) : (
                  visibleInvitations.map((request, index) => (
                    <InvitationRow
                      key={request.id}
                      person={{
                        name: request.requester.name || "Care Connect user",
                        role: request.requester.subtitle || "",
                        avatarBg: avatarColor(request.requester.uid),
                        photo: request.requester.photo,
                      }}
                      onAccept={() => acceptInvitation(request)}
                      onDecline={() => declineInvitation(request)}
                      style={{ animationDelay: `${index * 60}ms` }}
                    />
                  ))
                )}
              </div>

              {suggestedPeople.length > 0 && (
                <div className="mt-10">
                  <SuggestionGrid
                    title="People you may know"
                    items={suggestedPeople}
                    actionLabel="Connect"
                    activeLabel="Pending"
                    relation="connect"
                    targetType="individual"
                  />
                </div>
              )}
            </>
          )}

          {tab === "connections" && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h1 className="text-xl font-bold text-[#151922]">
                  Connections <span className="text-[#8a94a3]">({connections.length})</span>
                </h1>
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
                      photo={item.photo}
                      profileHref={viewProfile(item.uid)}
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

          {tab === "connections" && sentRequests.length > 0 && (
            <section className="mt-8">
              <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-[#151922]">
                <Send className="size-4 text-[#8a94a3]" aria-hidden="true" />
                Requests you&apos;ve sent <span className="text-[#8a94a3]">({sentRequests.length})</span>
              </h2>
              <div className="space-y-3">
                {sentRequests.map((item, index) => (
                  <NetworkConnectionRow
                    key={item.connectionId}
                    name={item.name}
                    subtitle={item.subtitle}
                    initials={item.initials}
                    avatarClassName={item.avatarClassName}
                    photo={item.photo}
                    profileHref={viewProfile(item.uid)}
                    dateLabel="Waiting for them to accept"
                    messageHref={`${routes.messages}?to=${item.uid}`}
                    removeLabel="Withdraw"
                    removing={removingId === item.connectionId}
                    onRemove={() => removeConnection(item.connectionId, item.uid, "Request withdrawn")}
                    style={{ animationDelay: `${index * 60}ms` }}
                  />
                ))}
              </div>
            </section>
          )}

          {tab === "agencies" && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h1 className="text-xl font-bold text-[#151922]">
                  Healthcare providers <span className="text-[#8a94a3]">({agencies.length})</span>
                </h1>
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
                      photo={item.photo}
                      profileHref={viewProfile(item.uid)}
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
