import { mutation, query, internalQuery } from './_generated/server'
import { v } from 'convex/values'
import { internal } from './_generated/api'
import { requireStaffUser, requireOwner } from './lib/auth'

// Internal-only: used by scheduleFollowUp and other server-side workflows
// that already have a trusted clinicId, not tied to a request identity.
export const getClinic = internalQuery({
  args: { clinicId: v.id('clinics') },
  handler: async (ctx, { clinicId }) => {
    return await ctx.db.get(clinicId)
  },
})

// Returns the clinic owned by the caller's own staff record.
export const getMyClinic = query({
  args: {},
  handler: async (ctx) => {
    const staffUser = await requireStaffUser(ctx)
    return await ctx.db.get(staffUser.clinicId)
  },
})

// Clinics owned by the calling Clerk user — used during onboarding to check
// whether this user already runs a clinic.
export const listMyClinics = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return []

    return await ctx.db
      .query('clinics')
      .withIndex('by_owner', (q) => q.eq('ownerUserId', identity.subject))
      .collect()
  },
})

export const createClinic = mutation({
  args: {
    name: v.string(),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    googleReviewUrl: v.optional(v.string()),
  },
  handler: async (ctx, { name, contactEmail, contactPhone, googleReviewUrl }) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const resolvedEmail = contactEmail ?? identity.email
    if (!resolvedEmail) throw new Error('No contact email available for this account')

    const clinicId = await ctx.db.insert('clinics', {
      ownerUserId: identity.subject,
      name,
      contactEmail: resolvedEmail,
      contactPhone,
      googleReviewUrl,
      feedbackDelay: 24,
      reminderDelay: 48,
      checkInMessage: `Thank you for visiting {clinic_name}. How are you feeling after today's session?`,
      reminderMessage: `We'd love to hear about your experience. Have you had a chance to share your feedback?`,
      // Universal starter list — clinics customize this in Settings.
      services: ['Consultation', 'Follow-up', 'Treatment', 'Procedure', 'Review'],
      createdAt: Date.now(),
    })

    await ctx.db.insert('staffUsers', {
      clinicId,
      userId: identity.subject,
      name: identity.name ?? resolvedEmail,
      email: resolvedEmail,
      role: 'owner',
      createdAt: Date.now(),
    })

    await ctx.scheduler.runAfter(0, internal.emails.sendWelcomeEmail, {
      staffEmail: resolvedEmail,
      staffName: identity.name ?? resolvedEmail,
      clinicName: name,
    })

    return clinicId
  },
})

export const updateClinicSettings = mutation({
  args: {
    name: v.optional(v.string()),
    feedbackDelay: v.optional(v.number()),
    reminderDelay: v.optional(v.number()),
    googleReviewUrl: v.optional(v.string()),
    checkInMessage: v.optional(v.string()),
    reminderMessage: v.optional(v.string()),
    services: v.optional(v.array(v.string())),
  },
  handler: async (ctx, updates) => {
    const staffUser = await requireOwner(ctx)
    await ctx.db.patch(staffUser.clinicId, updates)
    return staffUser.clinicId
  },
})

export const addStaffMember = mutation({
  args: {
    userId: v.string(),
    name: v.string(),
    email: v.string(),
    role: v.union(v.literal('owner'), v.literal('therapist'), v.literal('receptionist')),
  },
  handler: async (ctx, { userId, name, email, role }) => {
    const caller = await requireOwner(ctx)

    const staffId = await ctx.db.insert('staffUsers', {
      clinicId: caller.clinicId,
      userId,
      name,
      email,
      role,
      createdAt: Date.now(),
    })
    return staffId
  },
})

// Returns the calling Clerk user's own staff record, or null if they haven't
// been added to a clinic yet (used to detect "needs onboarding").
export const getMyStaffUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null

    return await ctx.db
      .query('staffUsers')
      .withIndex('by_user', (q) => q.eq('userId', identity.subject))
      .first()
  },
})

export const listStaff = query({
  args: {},
  handler: async (ctx) => {
    const staffUser = await requireStaffUser(ctx)
    return await ctx.db
      .query('staffUsers')
      .withIndex('by_clinic', (q) => q.eq('clinicId', staffUser.clinicId))
      .collect()
  },
})

// Internal-only: used by server-side workflows (email/WhatsApp notifications)
// that need the clinic's staff list without a caller identity.
export const listStaffInternal = internalQuery({
  args: { clinicId: v.id('clinics') },
  handler: async (ctx, { clinicId }) => {
    return await ctx.db
      .query('staffUsers')
      .withIndex('by_clinic', (q) => q.eq('clinicId', clinicId))
      .collect()
  },
})
