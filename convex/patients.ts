import { mutation, query, internalQuery, MutationCtx } from './_generated/server'
import { v } from 'convex/values'
import { Id } from './_generated/dataModel'
import { requireStaffUser } from './lib/auth'

export const listPatients = query({
  args: { includeArchived: v.optional(v.boolean()) },
  handler: async (ctx, { includeArchived }) => {
    const staffUser = await requireStaffUser(ctx)
    const patients = await ctx.db
      .query('patients')
      .withIndex('by_clinic', (q) => q.eq('clinicId', staffUser.clinicId))
      .collect()
    return includeArchived ? patients : patients.filter((p) => !p.archivedAt)
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
    .withIndex('by_clinic_phone', (q) => q.eq('clinicId', args.clinicId).eq('phone', args.phone))
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
    // Dedup by phone within the clinic, same as the booking-request flow —
    // manual staff entry shouldn't be able to create a second record for a
    // patient who already exists.
    return await findOrCreatePatient(ctx, {
      clinicId: staffUser.clinicId,
      name,
      phone,
      email: email?.trim() || undefined,
    })
  },
})

// Fixes a typo'd name/phone/email, or edits staff notes. Does not enforce
// phone uniqueness on edit — findOrCreatePatient's dedup only runs at
// creation time; duplicate detection for existing rows is a display-only
// hint in the UI (listPatients doesn't merge/reassign records).
export const updatePatient = mutation({
  args: {
    patientId: v.id('patients'),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { patientId, name, email, phone, notes }) => {
    const staffUser = await requireStaffUser(ctx)
    const patient = await ctx.db.get(patientId)
    if (!patient || patient.clinicId !== staffUser.clinicId) {
      throw new Error('Patient not found')
    }

    const updates: Record<string, unknown> = {}
    if (name !== undefined) {
      const trimmed = name.trim()
      if (!trimmed) throw new Error('Name is required')
      updates.name = trimmed
    }
    if (phone !== undefined) {
      const trimmed = phone.trim()
      if (!trimmed) throw new Error('Phone is required')
      updates.phone = trimmed
    }
    if (email !== undefined) updates.email = email.trim() || undefined
    if (notes !== undefined) updates.notes = notes.trim() || undefined

    await ctx.db.patch(patientId, updates)
    return patientId
  },
})

export const archivePatient = mutation({
  args: { patientId: v.id('patients') },
  handler: async (ctx, { patientId }) => {
    const staffUser = await requireStaffUser(ctx)
    const patient = await ctx.db.get(patientId)
    if (!patient || patient.clinicId !== staffUser.clinicId) {
      throw new Error('Patient not found')
    }
    await ctx.db.patch(patientId, { archivedAt: Date.now() })
    return patientId
  },
})

export const unarchivePatient = mutation({
  args: { patientId: v.id('patients') },
  handler: async (ctx, { patientId }) => {
    const staffUser = await requireStaffUser(ctx)
    const patient = await ctx.db.get(patientId)
    if (!patient || patient.clinicId !== staffUser.clinicId) {
      throw new Error('Patient not found')
    }
    await ctx.db.patch(patientId, { archivedAt: undefined })
    return patientId
  },
})
