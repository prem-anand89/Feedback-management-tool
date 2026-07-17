import { mutation, query, internalMutation, MutationCtx } from './_generated/server'
import { v } from 'convex/values'
import { internal } from './_generated/api'
import { Doc, Id } from './_generated/dataModel'
import { requireStaffUser } from './lib/auth'

export const listVisits = query({
  args: {},
  handler: async (ctx) => {
    const staffUser = await requireStaffUser(ctx)
    return await ctx.db
      .query('visits')
      .withIndex('by_clinic', (q) => q.eq('clinicId', staffUser.clinicId))
      .collect()
  },
})

export const getVisit = query({
  args: { visitId: v.id('visits') },
  handler: async (ctx, { visitId }) => {
    const staffUser = await requireStaffUser(ctx)
    const visit = await ctx.db.get(visitId)
    if (!visit || visit.clinicId !== staffUser.clinicId) return null
    return visit
  },
})

export const createVisit = mutation({
  args: {
    patientId: v.id('patients'),
    therapistId: v.id('staffUsers'),
    serviceContext: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { patientId, therapistId, serviceContext, notes }) => {
    const staffUser = await requireStaffUser(ctx)

    const patient = await ctx.db.get(patientId)
    if (!patient || patient.clinicId !== staffUser.clinicId) {
      throw new Error('Patient not found in this clinic')
    }
    const therapist = await ctx.db.get(therapistId)
    if (!therapist || therapist.clinicId !== staffUser.clinicId) {
      throw new Error('Therapist not found in this clinic')
    }

    const trimmedService = serviceContext?.trim()
    const visitId = await ctx.db.insert('visits', {
      clinicId: staffUser.clinicId,
      patientId,
      therapistId,
      ...(trimmedService ? { serviceContext: trimmedService } : {}),
      notes,
      createdAt: Date.now(),
    })
    return visitId
  },
})

async function markVisitComplete(ctx: MutationCtx, visitId: Id<'visits'>, visit: Doc<'visits'>) {
  if (visit.completedAt) return visitId

  await ctx.db.patch(visitId, { completedAt: Date.now() })

  await ctx.scheduler.runAfter(0, internal.feedback.scheduleFollowUp, {
    visitId,
    clinicId: visit.clinicId,
    patientId: visit.patientId,
  })

  return visitId
}

// Inserts a visit that's already complete (staff confirming an appointment
// happened, rather than logging a walk-in), and kicks off the same feedback
// pipeline as any other completed visit. Used by appointments.completeAppointment
// so booking and manual visit logging both funnel into one feedback path.
export async function insertCompletedVisit(
  ctx: MutationCtx,
  args: {
    clinicId: Id<'clinics'>
    patientId: Id<'patients'>
    therapistId: Id<'staffUsers'>
    serviceContext?: string
    notes?: string
  },
) {
  const visitId = await ctx.db.insert('visits', {
    clinicId: args.clinicId,
    patientId: args.patientId,
    therapistId: args.therapistId,
    ...(args.serviceContext ? { serviceContext: args.serviceContext } : {}),
    notes: args.notes,
    completedAt: Date.now(),
    createdAt: Date.now(),
  })

  await ctx.scheduler.runAfter(0, internal.feedback.scheduleFollowUp, {
    visitId,
    clinicId: args.clinicId,
    patientId: args.patientId,
  })

  return visitId
}

// Inserts an already-completed visit with an explicit historical
// completedAt, deliberately skipping the scheduleFollowUp scheduler call —
// unlike insertCompletedVisit, this must never fire a live WhatsApp feedback
// request for a months/years-old backfilled visit. Used by patientImport.ts.
export async function insertHistoricalVisit(
  ctx: MutationCtx,
  args: {
    clinicId: Id<'clinics'>
    patientId: Id<'patients'>
    therapistId: Id<'staffUsers'>
    completedAt: number
    serviceContext?: string
    notes?: string
  },
) {
  return await ctx.db.insert('visits', {
    clinicId: args.clinicId,
    patientId: args.patientId,
    therapistId: args.therapistId,
    ...(args.serviceContext ? { serviceContext: args.serviceContext } : {}),
    notes: args.notes,
    completedAt: args.completedAt,
    createdAt: Date.now(),
  })
}

// Staff-triggered manual completion (e.g. a "mark done" button in the app).
export const completeVisit = mutation({
  args: { visitId: v.id('visits') },
  handler: async (ctx, { visitId }) => {
    const staffUser = await requireStaffUser(ctx)
    const visit = await ctx.db.get(visitId)
    if (!visit) throw new Error('Visit not found')
    if (visit.clinicId !== staffUser.clinicId) throw new Error('Not authorized for this visit')

    return await markVisitComplete(ctx, visitId, visit)
  },
})

// Server-to-server completion from the /api/visitComplete webhook. The HTTP
// action has already validated the shared secret before calling this, so no
// Clerk identity is expected or checked here.
export const completeVisitInternal = internalMutation({
  args: { visitId: v.id('visits') },
  handler: async (ctx, { visitId }) => {
    const visit = await ctx.db.get(visitId)
    if (!visit) throw new Error('Visit not found')

    return await markVisitComplete(ctx, visitId, visit)
  },
})
