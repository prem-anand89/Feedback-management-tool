import Papa from 'papaparse'

// Expected CSV shape: one row per visit, patient columns repeated. A blank
// visit_date imports a roster-only patient (no visit row). This matches the
// shape clinics' existing spreadsheet/EMR exports already have.
const REQUIRED_COLUMNS = ['patient_name', 'phone'] as const
const KNOWN_COLUMNS = ['patient_name', 'phone', 'email', 'visit_date', 'service', 'therapist_name', 'notes'] as const

export interface RawImportRow {
  rowIndex: number
  patient_name: string
  phone: string
  email: string
  visit_date: string
  service: string
  therapist_name: string
  notes: string
}

export interface ParsedVisit {
  rowIndex: number
  completedAt: number | null
  dateError?: string
  serviceContext?: string
  therapistName?: string
  therapistId?: string
  notes?: string
}

export interface ParsedPatientGroup {
  key: string // normalized phone, used as the grouping key
  name: string
  phone: string
  email?: string
  visits: ParsedVisit[]
  rowIndexes: number[]
}

export interface RowError {
  rowIndex: number
  message: string
}

export interface ParseResult {
  groups: ParsedPatientGroup[]
  rowErrors: RowError[]
  fileError?: string
}

function normalizePhone(phone: string) {
  return phone.trim()
}

// Triggers a browser download of `rows` as a CSV file. Client-side only —
// no backend export endpoint, since every page that needs this already has
// the data loaded via existing queries.
export function downloadCsv(filename: string, rows: Record<string, string | number>[]) {
  const csv = Papa.unparse(rows)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export async function parseImportCsv(fileText: string): Promise<ParseResult> {
  const parsed = Papa.parse<Record<string, string>>(fileText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  })

  if (parsed.errors.length > 0 && parsed.data.length === 0) {
    return { groups: [], rowErrors: [], fileError: parsed.errors[0].message }
  }

  const headers = parsed.meta.fields ?? []
  const missingRequired = REQUIRED_COLUMNS.filter((c) => !headers.includes(c))
  if (missingRequired.length > 0) {
    return {
      groups: [],
      rowErrors: [],
      fileError: `Missing required column(s): ${missingRequired.join(', ')}. Expected columns: ${KNOWN_COLUMNS.join(', ')}`,
    }
  }

  const rowErrors: RowError[] = []
  const groupsByPhone = new Map<string, ParsedPatientGroup>()

  parsed.data.forEach((raw, i) => {
    const rowIndex = i + 1 // 1-based, matches a spreadsheet's data row numbering (header excluded)
    const name = (raw.patient_name || '').trim()
    const phone = normalizePhone(raw.phone || '')

    // Missing/malformed phone is a hard error — phone is the dedupe key,
    // never import an unreachable patient.
    if (!phone || phone.replace(/\D/g, '').length < 7) {
      rowErrors.push({ rowIndex, message: !phone ? 'Missing phone number' : 'Phone number looks invalid' })
      return
    }
    if (!name) {
      rowErrors.push({ rowIndex, message: 'Missing patient name' })
      return
    }

    let group = groupsByPhone.get(phone)
    if (!group) {
      group = { key: phone, name, phone, email: (raw.email || '').trim() || undefined, visits: [], rowIndexes: [] }
      groupsByPhone.set(phone, group)
    }
    group.rowIndexes.push(rowIndex)
    // First non-empty email in the file wins if rows disagree.
    if (!group.email && raw.email?.trim()) group.email = raw.email.trim()

    const visitDateRaw = (raw.visit_date || '').trim()
    if (!visitDateRaw) {
      // Blank visit_date = roster-only row for this patient, no visit to add.
      return
    }

    const parsedDate = new Date(visitDateRaw)
    const visit: ParsedVisit = {
      rowIndex,
      completedAt: Number.isNaN(parsedDate.getTime()) ? null : parsedDate.getTime(),
      serviceContext: (raw.service || '').trim() || undefined,
      therapistName: (raw.therapist_name || '').trim() || undefined,
      notes: (raw.notes || '').trim() || undefined,
    }
    if (visit.completedAt === null) {
      visit.dateError = `Unrecognized visit_date "${visitDateRaw}"`
    } else if (visit.completedAt > Date.now()) {
      visit.dateError = 'Visit date is in the future'
    }
    group.visits.push(visit)
  })

  return { groups: Array.from(groupsByPhone.values()), rowErrors }
}

// Exact case-insensitive/trim match against the clinic's staff list — no
// fuzzy matching in v1. Mutates therapistId on visits that resolve; visits
// with a name but no match are left for the Preview step's fallback UI.
export function resolveTherapists(
  groups: ParsedPatientGroup[],
  staff: { _id: string; name: string }[],
): ParsedPatientGroup[] {
  const byName = new Map(staff.map((s) => [s.name.trim().toLowerCase(), s._id]))
  return groups.map((group) => ({
    ...group,
    visits: group.visits.map((visit) => {
      if (!visit.therapistName) return visit
      const match = byName.get(visit.therapistName.trim().toLowerCase())
      return match ? { ...visit, therapistId: match } : visit
    }),
  }))
}

export function sampleCsvTemplate(): string {
  return [
    'patient_name,phone,email,visit_date,service,therapist_name,notes',
    'Jane Doe,555-0100,jane@example.com,2025-03-14,Consultation,Dr. Smith,Initial visit',
    'Jane Doe,555-0100,,2025-04-02,Follow-up,Dr. Smith,',
    'John Roe,555-0101,,,,,',
  ].join('\n')
}
