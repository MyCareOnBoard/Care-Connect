/**
 * Care Connect — team roster spreadsheet import.
 *
 * Parses an agency-supplied .xlsx or .csv roster entirely in the browser so the
 * agency can review and fix rows before a single invite is sent. Only rows that
 * pass validation here are posted to `POST /careconnectTeam/bulk`.
 */

/** Must stay in step with `BULK_INVITE_MAX` in the backend team-member schema. */
export const TEAM_ROSTER_MAX_ROWS = 200

/** Field limits mirror the backend Joi schema so valid rows never 400 server-side. */
const MAX_NAME = 120
const MAX_EMAIL = 200
const MAX_PHONE = 40
const MAX_ROLE = 120

/** Deliberately permissive — the backend's Joi `.email()` is the real gate. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export const TEAM_ROSTER_ACCEPT = ".xlsx,.csv"

export interface ParsedRosterRow {
  /** 1-based row number as it appears in the spreadsheet (header included). */
  rowNumber: number
  name: string
  email: string
  phone: string
  role: string
  /** Empty when the row is importable. */
  errors: string[]
}

export interface ParsedRoster {
  rows: ParsedRosterRow[]
  /** Header labels we could not map to a known column, for a gentle warning. */
  unmappedHeaders: string[]
  /** True when the file had more data rows than we are willing to import. */
  truncated: boolean
}

/** Thrown for problems with the file as a whole (wrong type, no header, empty). */
export class RosterFileError extends Error {}

type ColumnKey = "name" | "email" | "phone" | "role"

/**
 * Accepted header labels per column. Compared after lowercasing and stripping
 * every non-alphanumeric character, so "Full Name", "full_name" and "FULL-NAME"
 * all collapse to "fullname".
 */
const HEADER_ALIASES: Record<ColumnKey, string[]> = {
  name: ["name", "fullname", "membername", "teammember", "professional", "professionalname", "employeename", "staffname"],
  email: ["email", "emailaddress", "mail", "workemail"],
  phone: ["phone", "phonenumber", "mobile", "mobilenumber", "telephone", "tel", "contact", "contactnumber"],
  role: ["role", "jobtitle", "title", "position", "designation", "speciality", "specialty"],
}

function normaliseHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "")
}

/** Coerce whatever the parser handed back for a cell into trimmed text. */
function toCellText(value: unknown): string {
  if (value === null || value === undefined) return ""
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  if (typeof value === "number") {
    // Guard against Excel turning a long phone number into 1.2345e+10.
    return Number.isInteger(value) ? value.toFixed(0) : String(value)
  }
  if (typeof value === "boolean") return value ? "true" : "false"
  return String(value).trim()
}

/**
 * Minimal RFC 4180 CSV reader — handles quoted fields, escaped quotes, embedded
 * newlines and CRLF. Avoids a parser dependency for what is a very small format.
 */
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let inQuotes = false
  // Strip a UTF-8 BOM — Excel writes one and it would poison the first header.
  const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text

  for (let i = 0; i < input.length; i++) {
    const char = input[i]
    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += char
      }
      continue
    }
    if (char === '"') {
      inQuotes = true
    } else if (char === ",") {
      row.push(field)
      field = ""
    } else if (char === "\n" || char === "\r") {
      // Treat CRLF as one terminator.
      if (char === "\r" && input[i + 1] === "\n") i++
      row.push(field)
      rows.push(row)
      row = []
      field = ""
    } else {
      field += char
    }
  }
  // Flush a trailing field/row when the file has no final newline.
  if (field !== "" || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

/** `Blob.text()` isn't available everywhere (notably jsdom); `FileReader` is. */
function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "")
    reader.onerror = () => reject(reader.error ?? new Error("Could not read the file"))
    reader.readAsText(file)
  })
}

async function readRows(file: File): Promise<unknown[][]> {
  const name = file.name.toLowerCase()
  if (name.endsWith(".csv")) {
    return parseCsv(await readFileAsText(file))
  }
  if (name.endsWith(".xlsx")) {
    // Loaded on demand — keeps the xlsx reader out of the main bundle.
    const { readSheet } = await import("read-excel-file/browser")
    return (await readSheet(file)) as unknown[][]
  }
  if (name.endsWith(".xls")) {
    throw new RosterFileError(
      "Legacy .xls files aren't supported. Open the file in Excel and save it as .xlsx (or .csv), then try again.",
    )
  }
  throw new RosterFileError("Unsupported file type. Upload an .xlsx or .csv spreadsheet.")
}

/** Locate each known column in the header row. */
function mapHeader(headerRow: unknown[]) {
  const columns: Partial<Record<ColumnKey, number>> = {}
  const unmappedHeaders: string[] = []

  headerRow.forEach((cell, index) => {
    const label = toCellText(cell)
    if (!label) return
    const key = normaliseHeader(label)
    const match = (Object.keys(HEADER_ALIASES) as ColumnKey[]).find(
      (column) => columns[column] === undefined && HEADER_ALIASES[column].includes(key),
    )
    if (match) columns[match] = index
    else unmappedHeaders.push(label)
  })

  return { columns, unmappedHeaders }
}

function validateRow(row: Omit<ParsedRosterRow, "errors">): string[] {
  const errors: string[] = []

  if (!row.name) errors.push("Name is required")
  else if (row.name.length > MAX_NAME) errors.push(`Name must be ${MAX_NAME} characters or fewer`)

  // Bulk invites are delivered by email only — there is no per-row link to copy,
  // so a row without a valid address could never reach anyone.
  if (!row.email) errors.push("Email is required for spreadsheet invites")
  else if (!EMAIL_PATTERN.test(row.email)) errors.push(`"${row.email}" is not a valid email address`)
  else if (row.email.length > MAX_EMAIL) errors.push(`Email must be ${MAX_EMAIL} characters or fewer`)

  if (row.phone.length > MAX_PHONE) errors.push(`Phone must be ${MAX_PHONE} characters or fewer`)
  if (row.role.length > MAX_ROLE) errors.push(`Role must be ${MAX_ROLE} characters or fewer`)

  return errors
}

/**
 * Read and validate an uploaded roster file.
 * @throws {RosterFileError} when the file itself is unusable.
 */
export async function parseTeamRosterFile(file: File): Promise<ParsedRoster> {
  const raw = await readRows(file)

  // Drop rows that are entirely blank — spreadsheets are full of them.
  const nonEmpty = raw
    .map((cells, index) => ({ cells, rowNumber: index + 1 }))
    .filter(({ cells }) => cells.some((cell) => toCellText(cell) !== ""))

  if (nonEmpty.length === 0) throw new RosterFileError("That file is empty.")

  const [header, ...body] = nonEmpty
  const { columns, unmappedHeaders } = mapHeader(header.cells)

  if (columns.name === undefined || columns.email === undefined) {
    throw new RosterFileError(
      "Couldn't find the required columns. The first row must contain headers including \"Name\" and \"Email\" — download the template for the expected format.",
    )
  }
  if (body.length === 0) throw new RosterFileError("That file has headers but no team members.")

  const truncated = body.length > TEAM_ROSTER_MAX_ROWS
  const rows = body.slice(0, TEAM_ROSTER_MAX_ROWS).map(({ cells, rowNumber }) => {
    const at = (column: ColumnKey) => (columns[column] === undefined ? "" : toCellText(cells[columns[column]]))
    const base = {
      rowNumber,
      name: at("name"),
      email: at("email"),
      phone: at("phone"),
      role: at("role"),
    }
    return { ...base, errors: validateRow(base) }
  })

  return { rows, unmappedHeaders, truncated }
}

/** Generate and download a blank roster template with the expected headers. */
export async function downloadTeamRosterTemplate(): Promise<void> {
  const { default: writeXlsxFile } = await import("write-excel-file/browser")

  const header = ["Name", "Email", "Phone", "Role"].map((value) => ({
    value,
    type: String,
    fontWeight: "bold" as const,
  }))
  const sample = [
    ["Jane Doe", "jane.doe@example.com", "+1 555 0100", "Registered Nurse"],
    ["Samuel Lee", "samuel.lee@example.com", "+1 555 0111", "Home Health Aide"],
  ].map((cells) => cells.map((value) => ({ value, type: String })))

  await writeXlsxFile([header, ...sample], {
    sheet: "Team",
    columns: [{ width: 24 }, { width: 32 }, { width: 18 }, { width: 24 }],
  }).toFile("care-connect-team-template.xlsx")
}
