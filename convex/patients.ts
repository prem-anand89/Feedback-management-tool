import { mutation, query } from './_generated/server'
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

export const createPatient = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    phone: v.string(),
  },
  handler: async (ctx, { name, email, phone }) => {
    const staffUser = await requireStaffUser(ctx)
    const patientId = await ctx.db.insert('patients', {
      clinicId: staffUser.clinicId,
      name,
      email,
      phone,
      createdAt: Date.now(),
    })
    return patientId
  },
})
