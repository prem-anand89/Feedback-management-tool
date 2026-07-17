import { mutation } from './_generated/server'
import { v } from 'convex/values'
import { requireOwner } from './lib/auth'
import { findOrCreatePatient } from './patients'
import { insertHistoricalVisit } from './visits'

// Bulk roster + historical-visit import. Rows are grouped into whole
// patients client-side (never split across chunk calls, so the same phone
// can't hit findOrCreatePatient twice concurrently). Commits valid rows and
// skips invalid ones rather than failing the whole batch — one bad row 900
// rows in shouldn't block everything else.
export const importBatch = mutation({
  args: {
    patients: v.array(
      v.object({
        name: v.string(),
        phone: v.string(),
        email: v.optional(v.string()),
        visits: v.array(
          v.object({
            completedAt: v.number(),
            serviceContext: v.optional(v.string()),
            therapistId: v.id('staffUsers'),
            notes: v.optional(v.string()),
          }),
        ),
      }),
    ),
  },
  handler: async (ctx, { patients }) => {
    // requireOwner independently re-verifies the caller here — the UI-only
    // "Import CSV" button gate is not sufficient defense against a crafted
    // client call. All matching is resolved server-side from the caller's
    // own clinicId, never trusting anything the client supplied.
    const staffUser = await requireOwner(ctx)

    let patientsCreated = 0
    let patientsMatched = 0
    let visitsCreated = 0
    const errors: { rowIndex: number; message: string }[] = []

    for (let i = 0; i < patients.length; i++) {
      const row = patients[i]
      try {
        const name = row.name.trim()
        const phone = row.phone.trim()
        if (!name || !phone) throw new Error('Name and phone are required')

        const existing = await ctx.db
          .query('patients')
          .withIndex('by_clinic_phone', (q) => q.eq('clinicId', staffUser.clinicId).eq('phone', phone))
          .first()

        const patientId = await findOrCreatePatient(ctx, {
          clinicId: staffUser.clinicId,
          name,
          phone,
          email: row.email?.trim() || undefined,
        })

        if (existing) patientsMatched++
        else patientsCreated++

        for (const visit of row.visits) {
          if (visit.completedAt > Date.now()) {
            errors.push({ rowIndex: i, message: `Visit date is in the future — visit skipped, patient still imported` })
            continue
          }

          const therapist = await ctx.db.get(visit.therapistId)
          if (!therapist || therapist.clinicId !== staffUser.clinicId) {
            errors.push({ rowIndex: i, message: `Therapist not found in this clinic — visit skipped, patient still imported` })
            continue
          }

          await insertHistoricalVisit(ctx, {
            clinicId: staffUser.clinicId,
            patientId,
            therapistId: visit.therapistId,
            completedAt: visit.completedAt,
            serviceContext: visit.serviceContext,
            notes: visit.notes,
          })
          visitsCreated++
        }
      } catch (err) {
        errors.push({ rowIndex: i, message: err instanceof Error ? err.message : 'Unknown error' })
      }
    }

    await ctx.db.insert('automationLogs', {
      clinicId: staffUser.clinicId,
      workflow: 'bulk_patient_import',
      result: 'success',
      errorMessage: JSON.stringify({ patientsCreated, patientsMatched, visitsCreated, errorCount: errors.length }),
      timestamp: Date.now(),
    })

    return { patientsCreated, patientsMatched, visitsCreated, errors }
  },
})
