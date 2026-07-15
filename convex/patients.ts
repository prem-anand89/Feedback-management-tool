import { mutation, query, internalQuery } from './_generated/server'
import { v } from 'convex/values'
import { requireStaffUser } from './lib/auth'

export const listPatients = query({
  args: {},
  handler: async (ctx) => {
    const staffUser = await requireStaffUser(ctx)
    return await ctx.db
      .query('patients')
      .withIndex('by_clinic', (q) => q.eq('clinicId', staffUser.clinicId))
      .collect()
  },
})

export const getPatient = query({
  args: { patientId: v.id('patients') },
  handler: async (ctx, { patientId }) => {
    const staffUser = await requireStaffUser(ctx)
    const patient = await ctx.db.get(patientId)
    if (!patient || patient.clinicId !== staffUser.clinicId) return null
    return patient
  },
})

// Internal-only: used by server-side workflows (WhatsApp notifications) that
// need patient contact info without a caller identity.
export const getPatientInternal = internalQuery({
  args: { patientId: v.id('patients') },
  handler: async (ctx, { patientId }) => {
    return await ctx.db.get(patientId)
  },
})

export const createPatient = mutation({
  args: {
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.string(),
  },
  handler: async (ctx, { name, email, phone }) => {
    const staffUser = await requireStaffUser(ctx)
    // Email is rarely collected; only persist it when actually provided.
    const trimmedEmail = email?.trim()
    const patientId = await ctx.db.insert('patients', {
      clinicId: staffUser.clinicId,
      name,
      ...(trimmedEmail ? { email: trimmedEmail } : {}),
      phone,
      createdAt: Date.now(),
    })
    return patientId
  },
})
