import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, useNavigate } from "react-router"

const listProfiles = vi.fn()
const listJobs = vi.fn()
vi.mock("@/utils/careconnect/services/profilesService", () => ({ listProfiles: (...args: unknown[]) => listProfiles(...args) }))
vi.mock("@/utils/careconnect/services/jobsService", () => ({ listJobs: (...args: unknown[]) => listJobs(...args) }))

const { GlobalSearch } = await import("@/components/app/GlobalSearch")

const navigate = vi.fn()

beforeEach(() => {
  vi.mocked(useNavigate).mockReturnValue(navigate)
  localStorage.clear()
  listProfiles.mockImplementation(async ({ type }: { type: string }) =>
    type === "individual" ? [{ uid: "u1", name: "Ada Obi", subtitle: "ICU nurse", photo: null }] : [],
  )
  listJobs.mockResolvedValue([{ id: "j1", title: "Night nurse", company: "St Mary's", location: "Lagos" }])
})

describe("GlobalSearch", () => {
  it("searches people and jobs as you type, grouped, and opens the chosen one", async () => {
    render(
      <MemoryRouter>
        <GlobalSearch flow="user" />
      </MemoryRouter>,
    )
    await userEvent.click(screen.getByRole("button", { name: "Search" }))
    await userEvent.type(screen.getByLabelText("Search", { selector: "input" }), "nur")

    expect(await screen.findByText("People")).toBeInTheDocument()
    expect(screen.getByText("Jobs")).toBeInTheDocument()
    expect(listProfiles).toHaveBeenCalledWith(expect.objectContaining({ search: "nur", type: "individual" }))

    await userEvent.keyboard("{Enter}")
    expect(navigate).toHaveBeenCalledWith(expect.stringContaining("u1"))
    // Remembered for next time.
    expect(JSON.parse(localStorage.getItem("careconnect-recent-searches") ?? "[]")).toEqual(["nur"])
  })

  it("does not look for jobs on an agency account", async () => {
    render(
      <MemoryRouter>
        <GlobalSearch flow="agency" />
      </MemoryRouter>,
    )
    await userEvent.click(screen.getByRole("button", { name: "Search" }))
    await userEvent.type(screen.getByLabelText("Search", { selector: "input" }), "ada")
    await screen.findByText("People")
    expect(listJobs).not.toHaveBeenCalled()
  })
})
