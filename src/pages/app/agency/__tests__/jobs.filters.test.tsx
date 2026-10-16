import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes as RouterRoutes, useLocation } from "react-router"
import { describe, expect, it, vi } from "vitest"
import AgencyJobsPage from "../jobs"
import type { Job } from "@/utils/careconnect/types"

const listMyJobs = vi.hoisted(() => vi.fn())
vi.mock("@/utils/careconnect/services/jobsService", () => ({
  listMyJobs,
  createJob: vi.fn(),
  deleteJob: vi.fn(),
  updateJob: vi.fn(),
}))
vi.mock("@/utils/careconnect/services/applicationsService", () => ({
  listMyApplications: vi.fn().mockResolvedValue({ applications: [] }),
  updateApplicationStatus: vi.fn(),
}))
vi.mock("@/utils/auth", () => ({
  getAuthErrorMessage: (error: unknown) => String(error),
  useAuthUser: () => ({ user: { uid: "agency-1", fullName: "Sunrise Care" } }),
}))

// The shared setup pins useLocation; the address bar is what these tests check, so the
// real one is used here.
vi.mock("react-router", async () => vi.importActual("react-router"))

function job(id: string, extra: Partial<Job>): Job {
  return {
    id,
    posterId: "agency-1",
    posterName: "Sunrise Care",
    title: id,
    company: "Sunrise Care",
    location: "Lagos",
    employmentType: "full_time" as never,
    tags: [],
    description: "",
    benefits: [],
    status: "open",
    viewsCount: 0,
    applicationsCount: 0,
    savedCount: 0,
    ...extra,
  }
}

const postings = [
  job("Night nurse", { status: "open", applicationsCount: 2, viewsCount: 50 }),
  job("Care assistant", { status: "closed", applicationsCount: 9, viewsCount: 10 }),
  job("Physio", { status: "open", applicationsCount: 5, viewsCount: 90 }),
  job("Draft role", { status: "draft" }),
]

let search = ""
function Address() {
  search = useLocation().search
  return null
}

async function openAt(path: string) {
  listMyJobs.mockResolvedValue(postings)
  render(
    <MemoryRouter initialEntries={[path]}>
      <RouterRoutes>
        <Route
          path="*"
          element={
            <>
              <AgencyJobsPage />
              <Address />
            </>
          }
        />
      </RouterRoutes>
    </MemoryRouter>,
  )
  await screen.findByRole("group", { name: "Filter postings" })
}

const titles = () => screen.getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent)

describe("Agency jobs — filters in the address", () => {
  it("opens on the status the link asks for", async () => {
    await openAt("/agency/jobs?status=open")
    expect(titles()).toEqual(["Night nurse", "Physio"])
    expect(screen.getByRole("button", { name: "Open 2" })).toHaveAttribute("aria-pressed", "true")
  })

  it("sorts by applications or views when asked", async () => {
    await openAt("/agency/jobs?sort=applications")
    expect(titles()).toEqual(["Care assistant", "Physio", "Night nurse", "Draft role"])
  })

  it("counts each status on its chip", async () => {
    await openAt("/agency/jobs")
    const chips = screen.getByRole("group", { name: "Filter postings" })
    expect(within(chips).getByRole("button", { name: "All 4" })).toBeInTheDocument()
    expect(within(chips).getByRole("button", { name: "Open 2" })).toBeInTheDocument()
    expect(within(chips).getByRole("button", { name: "Draft 1" })).toBeInTheDocument()
  })

  it("writes a chosen filter back into the address", async () => {
    await openAt("/agency/jobs")
    await userEvent.click(screen.getByRole("button", { name: "Most viewed" }))
    expect(search).toContain("sort=views")
    expect(titles()[0]).toBe("Physio")

    await userEvent.click(screen.getByRole("button", { name: "Closed 1" }))
    expect(search).toContain("status=closed")
    expect(titles()).toEqual(["Care assistant"])
  })

  it("opens a posting straight from ?job=", async () => {
    listMyJobs.mockResolvedValue(postings)
    render(
      <MemoryRouter initialEntries={["/agency/jobs?job=Physio"]}>
        <AgencyJobsPage />
      </MemoryRouter>,
    )
    expect(await screen.findByRole("heading", { level: 1, name: "Physio" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Back to job postings" })).toBeInTheDocument()
  })
})
