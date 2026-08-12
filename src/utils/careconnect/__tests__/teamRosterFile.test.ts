import { describe, it, expect } from "vitest"
import {
  parseTeamRosterFile,
  RosterFileError,
  TEAM_ROSTER_MAX_ROWS,
} from "@/utils/careconnect/teamRosterFile"

/** Build an in-memory .csv File the way the dropzone would hand one over. */
function csvFile(content: string, name = "roster.csv") {
  return new File([content], name, { type: "text/csv" })
}

describe("parseTeamRosterFile", () => {
  it("parses a well-formed roster", async () => {
    const roster = await parseTeamRosterFile(
      csvFile(
        [
          "Name,Email,Phone,Role",
          "Jane Doe,jane@example.com,+1 555 0100,Registered Nurse",
          "Samuel Lee,samuel@example.com,+1 555 0111,Home Health Aide",
        ].join("\n"),
      ),
    )

    expect(roster.rows).toHaveLength(2)
    expect(roster.rows[0]).toEqual({
      rowNumber: 2,
      name: "Jane Doe",
      email: "jane@example.com",
      phone: "+1 555 0100",
      role: "Registered Nurse",
      errors: [],
    })
    expect(roster.truncated).toBe(false)
    expect(roster.unmappedHeaders).toEqual([])
  })

  it("maps header aliases and ignores column order", async () => {
    const roster = await parseTeamRosterFile(
      csvFile(["Job Title,E-mail Address,Full Name,Mobile Number", "Nurse,jane@example.com,Jane Doe,555"].join("\n")),
    )

    expect(roster.rows[0]).toMatchObject({
      name: "Jane Doe",
      email: "jane@example.com",
      phone: "555",
      role: "Nurse",
      errors: [],
    })
  })

  it("reports unrecognised headers without failing", async () => {
    const roster = await parseTeamRosterFile(
      csvFile(["Name,Email,Salary", "Jane Doe,jane@example.com,90000"].join("\n")),
    )

    expect(roster.unmappedHeaders).toEqual(["Salary"])
    expect(roster.rows[0].errors).toEqual([])
  })

  it("handles quoted fields, escaped quotes and CRLF", async () => {
    const roster = await parseTeamRosterFile(
      csvFile('Name,Email,Role\r\n"Doe, Jane","jane@example.com","Nurse ""ICU"""\r\n'),
    )

    expect(roster.rows).toHaveLength(1)
    expect(roster.rows[0]).toMatchObject({
      name: "Doe, Jane",
      email: "jane@example.com",
      role: 'Nurse "ICU"',
      errors: [],
    })
  })

  it("strips a UTF-8 BOM so the first header still maps", async () => {
    const roster = await parseTeamRosterFile(csvFile("﻿Name,Email\nJane Doe,jane@example.com"))

    expect(roster.rows[0]).toMatchObject({ name: "Jane Doe", errors: [] })
  })

  it("skips fully blank rows but keeps the original row numbers", async () => {
    const roster = await parseTeamRosterFile(
      csvFile(["Name,Email", ",", "Jane Doe,jane@example.com", ",,", "Sam Lee,sam@example.com"].join("\n")),
    )

    expect(roster.rows).toHaveLength(2)
    expect(roster.rows.map((row) => row.rowNumber)).toEqual([3, 5])
  })

  it("flags rows with a missing name or an unusable email", async () => {
    const roster = await parseTeamRosterFile(
      csvFile(
        [
          "Name,Email",
          ",orphan@example.com",
          "No Email Person,",
          "Bad Email,not-an-email",
          "Jane Doe,jane@example.com",
        ].join("\n"),
      ),
    )

    expect(roster.rows[0].errors).toContain("Name is required")
    expect(roster.rows[1].errors).toContain("Email is required for spreadsheet invites")
    expect(roster.rows[2].errors).toContain('"not-an-email" is not a valid email address')
    expect(roster.rows[3].errors).toEqual([])
  })

  it("enforces the backend field length limits", async () => {
    const roster = await parseTeamRosterFile(
      csvFile(["Name,Email,Role", `${"a".repeat(121)},jane@example.com,${"r".repeat(121)}`].join("\n")),
    )

    expect(roster.rows[0].errors).toEqual([
      "Name must be 120 characters or fewer",
      "Role must be 120 characters or fewer",
    ])
  })

  it("caps the import and flags that it was truncated", async () => {
    const body = Array.from(
      { length: TEAM_ROSTER_MAX_ROWS + 5 },
      (_, index) => `Member ${index},member${index}@example.com`,
    )
    const roster = await parseTeamRosterFile(csvFile(["Name,Email", ...body].join("\n")))

    expect(roster.rows).toHaveLength(TEAM_ROSTER_MAX_ROWS)
    expect(roster.truncated).toBe(true)
  })

  it("rejects a file whose header lacks the required columns", async () => {
    await expect(parseTeamRosterFile(csvFile("Nickname,Salary\nJane,90000"))).rejects.toBeInstanceOf(RosterFileError)
  })

  it("rejects an empty file and a headers-only file", async () => {
    await expect(parseTeamRosterFile(csvFile(""))).rejects.toThrow("That file is empty.")
    await expect(parseTeamRosterFile(csvFile("Name,Email"))).rejects.toThrow(
      "That file has headers but no team members.",
    )
  })

  it("rejects unsupported extensions with actionable guidance", async () => {
    await expect(parseTeamRosterFile(csvFile("Name,Email", "roster.xls"))).rejects.toThrow(/save it as \.xlsx/)
    await expect(parseTeamRosterFile(csvFile("Name,Email", "roster.txt"))).rejects.toThrow(/Unsupported file type/)
  })
})
