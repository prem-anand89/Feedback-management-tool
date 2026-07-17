import { useState } from 'react'
import { createRoute, Link } from '@tanstack/react-router'
import { Route as RootRoute } from './__root'
import { StaffLayout } from '@/components/staff-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Upload, Download, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react'
import { useMutation, useQuery, useConvexAuth } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { parseImportCsv, resolveTherapists, sampleCsvTemplate, type ParsedPatientGroup, type RowError } from '@/lib/csv'

const CHUNK_SIZE = 150

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

type Step = 'upload' | 'preview' | 'importing' | 'results'

interface ImportResults {
  patientsCreated: number
  patientsMatched: number
  visitsCreated: number
  errors: RowError[]
}

function PatientsImportPage() {
  const { isAuthenticated } = useConvexAuth()
  const staffList = useQuery(api.clinics.listStaff, isAuthenticated ? {} : 'skip') ?? []
  const importBatch = useMutation(api.patientImport.importBatch)

  const [step, setStep] = useState<Step>('upload')
  const [fileError, setFileError] = useState('')
  const [rowErrors, setRowErrors] = useState<RowError[]>([])
  const [groups, setGroups] = useState<ParsedPatientGroup[]>([])
  const [fallbackTherapistId, setFallbackTherapistId] = useState('')
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [results, setResults] = useState<ImportResults | null>(null)

  const handleFile = async (file: File) => {
    setFileError('')
    const text = await file.text()
    const parsed = await parseImportCsv(text)
    if (parsed.fileError) {
      setFileError(parsed.fileError)
      return
    }
    setRowErrors(parsed.rowErrors)
    setGroups(resolveTherapists(parsed.groups, staffList))
    setStep('preview')
  }

  const unresolvedVisitCount = groups.reduce(
    (sum, g) => sum + g.visits.filter((v) => !v.therapistId && !v.dateError).length,
    0,
  )

  const runImport = async () => {
    setStep('importing')
    const effectiveGroups = groups.map((g) => ({
      ...g,
      visits: g.visits.map((v) => (!v.therapistId && fallbackTherapistId ? { ...v, therapistId: fallbackTherapistId } : v)),
    }))

    // Visits that still have no therapistId (no match, no fallback chosen) or
    // a bad date can't be sent — never silently dropped, reported as errors
    // in the final results instead.
    const clientSkippedErrors: RowError[] = []
    const chunks: ParsedPatientGroup[][] = []
    for (let i = 0; i < effectiveGroups.length; i += CHUNK_SIZE) {
      chunks.push(effectiveGroups.slice(i, i + CHUNK_SIZE))
    }

    setProgress({ done: 0, total: effectiveGroups.length })
    const totals: ImportResults = { patientsCreated: 0, patientsMatched: 0, visitsCreated: 0, errors: [] }

    for (const chunk of chunks) {
      const payload = chunk.map((g) => ({
        name: g.name,
        phone: g.phone,
        email: g.email,
        visits: g.visits
          .filter((v) => {
            if (v.completedAt === null || v.dateError) {
              clientSkippedErrors.push({ rowIndex: v.rowIndex, message: v.dateError || 'Invalid visit date' })
              return false
            }
            if (!v.therapistId) {
              clientSkippedErrors.push({ rowIndex: v.rowIndex, message: 'No therapist could be resolved for this visit' })
              return false
            }
            return true
          })
          .map((v) => ({
            completedAt: v.completedAt as number,
            serviceContext: v.serviceContext,
            therapistId: v.therapistId as any,
            notes: v.notes,
          })),
      }))

      const result = await importBatch({ patients: payload })
      totals.patientsCreated += result.patientsCreated
      totals.patientsMatched += result.patientsMatched
      totals.visitsCreated += result.visitsCreated
      totals.errors.push(...result.errors)
      setProgress((p) => ({ ...p, done: p.done + chunk.length }))
    }

    totals.errors.push(...clientSkippedErrors, ...rowErrors)
    setResults(totals)
    setStep('results')
  }

  const downloadErrorReport = () => {
    if (!results) return
    const lines = ['row,message', ...results.errors.map((e) => `${e.rowIndex},"${e.message.replace(/"/g, '""')}"`)]
    downloadTextFile('import-errors.csv', lines.join('\n'))
  }

  return (
    <StaffLayout>
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link to="/patients">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Back to Patients
            </Link>
          </Button>
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Import Patients</h1>
          <p className="text-muted-foreground">Bring in a patient roster and their visit history from a CSV file.</p>
        </div>

        {step === 'upload' && (
          <Card>
            <CardHeader>
              <CardTitle>Upload CSV</CardTitle>
              <CardDescription>
                One row per visit, with patient columns repeated. A blank <code>visit_date</code> imports a
                roster-only patient with no visit history.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm">
                <p className="mb-2 font-medium">Expected columns</p>
                <code className="block overflow-x-auto whitespace-pre text-xs text-muted-foreground">
                  patient_name, phone, email, visit_date, service, therapist_name, notes
                </code>
                <p className="mt-2 text-xs text-muted-foreground">
                  <code>phone</code> is used to match against existing patients and to de-duplicate repeat visits for
                  the same patient within the file. <code>therapist_name</code> must match a staff member's name
                  exactly (case-insensitive) — unmatched names can be assigned a fallback therapist in the next step.
                </p>
              </div>

              <Button variant="outline" onClick={() => downloadTextFile('patient-import-sample.csv', sampleCsvTemplate())}>
                <Download className="mr-2 h-4 w-4" />
                Download sample CSV
              </Button>

              <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border p-8 text-center transition hover:border-primary hover:bg-accent">
                <Upload className="h-6 w-6 text-muted-foreground" />
                <span className="text-sm font-medium">Click to choose a CSV file</span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFile(file)
                    e.target.value = ''
                  }}
                />
              </label>

              {fileError && <div className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{fileError}</div>}
            </CardContent>
          </Card>
        )}

        {step === 'preview' && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Preview</CardTitle>
                <CardDescription>
                  {groups.length} patient{groups.length === 1 ? '' : 's'} found, {groups.reduce((s, g) => s + g.visits.length, 0)} visit
                  row{groups.reduce((s, g) => s + g.visits.length, 0) === 1 ? '' : 's'}.
                  {rowErrors.length > 0 && ` ${rowErrors.length} row(s) will be skipped due to errors.`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-96 overflow-y-auto rounded-xl border border-border">
                  <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 bg-muted/60 text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2">Patient</th>
                        <th className="px-3 py-2">Phone</th>
                        <th className="px-3 py-2">Visits</th>
                        <th className="px-3 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groups.slice(0, 500).map((g) => {
                        const unresolved = g.visits.filter((v) => !v.therapistId && !v.dateError).length
                        const dateErrors = g.visits.filter((v) => v.dateError).length
                        return (
                          <tr key={g.key} className="border-t border-border">
                            <td className="px-3 py-2 font-medium">{g.name}</td>
                            <td className="px-3 py-2 text-muted-foreground">{g.phone}</td>
                            <td className="px-3 py-2 text-muted-foreground">{g.visits.length}</td>
                            <td className="px-3 py-2">
                              {unresolved === 0 && dateErrors === 0 ? (
                                <span className="inline-flex items-center gap-1 text-xs text-secondary">
                                  <CheckCircle2 className="h-3.5 w-3.5" /> Ready
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                                  <AlertCircle className="h-3.5 w-3.5" />
                                  {unresolved > 0 && `${unresolved} unmatched therapist`}
                                  {unresolved > 0 && dateErrors > 0 && ', '}
                                  {dateErrors > 0 && `${dateErrors} date issue`}
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  {groups.length > 500 && (
                    <p className="p-3 text-xs text-muted-foreground">Showing first 500 of {groups.length} patients.</p>
                  )}
                </div>

                {rowErrors.length > 0 && (
                  <div className="mt-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
                    <p className="mb-1 font-medium">{rowErrors.length} row(s) excluded:</p>
                    <ul className="max-h-32 space-y-0.5 overflow-y-auto text-xs">
                      {rowErrors.slice(0, 50).map((e, i) => (
                        <li key={i}>
                          Row {e.rowIndex}: {e.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {unresolvedVisitCount > 0 && (
                  <div className="mt-4 space-y-2 rounded-xl border border-border p-4">
                    <p className="text-sm font-medium">
                      {unresolvedVisitCount} visit{unresolvedVisitCount === 1 ? '' : 's'} have no matching therapist name.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Choose a fallback therapist to assign them to, or leave blank to skip those visits (the patient
                      will still be imported).
                    </p>
                    <select
                      value={fallbackTherapistId}
                      onChange={(e) => setFallbackTherapistId(e.target.value)}
                      className="w-full max-w-xs rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">Skip unmatched visits</option>
                      {staffList.map((s) => (
                        <option key={s._id} value={s._id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button onClick={runImport} disabled={groups.length === 0}>
                Import {groups.length} patient{groups.length === 1 ? '' : 's'}
              </Button>
              <Button variant="outline" onClick={() => setStep('upload')}>
                Choose a different file
              </Button>
            </div>
          </>
        )}

        {step === 'importing' && (
          <Card>
            <CardContent className="space-y-3 py-8 text-center">
              <p className="text-sm font-medium">Importing patients…</p>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${progress.total ? Math.round((progress.done / progress.total) * 100) : 0}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {progress.done} / {progress.total} patients processed
              </p>
            </CardContent>
          </Card>
        )}

        {step === 'results' && results && (
          <Card>
            <CardHeader>
              <CardTitle>Import complete</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl border border-border p-4">
                  <p className="text-2xl font-semibold">{results.patientsCreated}</p>
                  <p className="text-xs text-muted-foreground">New patients</p>
                </div>
                <div className="rounded-xl border border-border p-4">
                  <p className="text-2xl font-semibold">{results.patientsMatched}</p>
                  <p className="text-xs text-muted-foreground">Matched existing</p>
                </div>
                <div className="rounded-xl border border-border p-4">
                  <p className="text-2xl font-semibold">{results.visitsCreated}</p>
                  <p className="text-xs text-muted-foreground">Visits imported</p>
                </div>
              </div>

              {results.errors.length > 0 && (
                <div className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
                  <p className="mb-1 font-medium">{results.errors.length} row(s) had issues.</p>
                  <Button size="sm" variant="outline" onClick={downloadErrorReport} className="mt-2">
                    <Download className="mr-2 h-3.5 w-3.5" />
                    Download error report
                  </Button>
                </div>
              )}

              <div className="flex gap-2">
                <Button asChild>
                  <Link to="/patients">Back to Patients</Link>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep('upload')
                    setGroups([])
                    setRowErrors([])
                    setResults(null)
                    setFallbackTherapistId('')
                  }}
                >
                  Import another file
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </StaffLayout>
  )
}

export const Route = createRoute({
  getParentRoute: () => RootRoute,
  path: '/patients/import',
  component: PatientsImportPage,
})
