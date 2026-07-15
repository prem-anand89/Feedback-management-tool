import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { internal } from './_generated/api'

export const listVisits = query({
  args: { clinicId: v.id('clinics') },
  handler: async (ctx, { clinicId }) => {
    return await ctx.db
      .query('visits')
      .withIndex('by_clinic', (q) => q.eq('clinicId', clinicId))
      .collect()
  },
})

export const getVisit = query({
  args: { visitId: v.id('visits') },
  handler: async (ctx, { visitId }) => {
    return await ctx.db.get(visitId)
  },
})

export const createVisit = mutation({
  args: {
    clinicId: v.id('clinics'),
    patientId: v.id('patients'),
    therapistId: v.id('staffUsers'),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { clinicId, patientId, therapistId, notes }) => {
    const visitId = await ctx.db.insert('visits', {
      clinicId,
      patientId,
      therapistId,
      notes,
      createdAt: Date.now(),
    })
    return visitId
  },
})

export const completeVisit = mutation({
  args: { visitId: v.id('visits') },
  handler: async (ctx, { visitId }) => {
    const visit = await ctx.db.get(visitId)
    if (!visit) throw new Error('Visit not found')

    await ctx.db.patch(visitId, { completedAt: Date.now() })

    // Trigger feedback request automation
    await ctx.scheduler.runAfter(0, internal.feedback.scheduleFollowUp, {
      visitId,
      clinicId: visit.clinicId,
      patientId: visit.patientId,
    })

    return visitId
  },
})
