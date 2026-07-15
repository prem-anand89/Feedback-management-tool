import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

export const listPatients = query({
  args: { clinicId: v.id('clinics') },
  handler: async (ctx, { clinicId }) => {
    return await ctx.db
      .query('patients')
      .withIndex('by_clinic', (q) => q.eq('clinicId', clinicId))
      .collect()
  },
})

export const getPatient = query({
  args: { patientId: v.id('patients') },
  handler: async (ctx, { patientId }) => {
    return await ctx.db.get(patientId)
  },
})

export const createPatient = mutation({
  args: {
    clinicId: v.id('clinics'),
    name: v.string(),
    email: v.string(),
    phone: v.string(),
  },
  handler: async (ctx, { clinicId, name, email, phone }) => {
    const patientId = await ctx.db.insert('patients', {
      clinicId,
      name,
      email,
      phone,
      createdAt: Date.now(),
    })
    return patientId
  },
})
