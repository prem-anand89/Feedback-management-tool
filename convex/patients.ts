import { mutation, query, internalQuery, MutationCtx } from './_generated/server'
import { v } from 'convex/values'
import { Id } from './_generated/dataModel'
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

// Matches an incoming public booking request to an existing patient by
// phone within the clinic, or creates a new one. Used when staff confirm an
// appointment request — the patient submitted a name/phone with no prior
// account, so this is the point where a real patient record gets attached.
export async function findOrCreatePatient(
  ctx: MutationCtx,
  args: { clinicId: Id<'clinics'>; name: string; phone: string; email?: string },
): Promise<Id<'patients'>> {
  const existing = await ctx.db
    .query('patients')
    .withIndex('by_clinic', (q) => q.eq('clinicId', args.clinicId))
    .filter((q) => q.eq(q.field('phone'), args.phone))
    .first()
  if (existing) return existing._id

  return await ctx.db.insert('patients', {
    clinicId: args.clinicId,
    name: args.name,
    phone: args.phone,
    ...(args.email ? { email: args.email } : {}),
    createdAt: Date.now(),
  })
}

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
