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

// Returns the clinic owned by the caller's own staff record. Every staff
// member can read this (it powers scheduling, booking config, etc.), so the
// WhatsApp access token — a real bearer secret, unlike the non-sensitive
// phone number ID — is stripped here. Only requireOwner callers see it, via
// getWhatsAppCredentials below.
export const getMyClinic = query({
  args: {},
  handler: async (ctx) => {
    const staffUser = await requireStaffUser(ctx)
    const clinic = await ctx.db.get(staffUser.clinicId)
    if (!clinic) return null
    const { whatsappAccessToken, ...rest } = clinic
    return rest
  },
})

// Owner-only: the WhatsApp access token itself. Kept out of getMyClinic
// (read by every staff member) since it's a real secret — whoever has it can
// send WhatsApp messages as this clinic.
export const getWhatsAppCredentials = query({
  args: {},
  handler: async (ctx) => {
    const staffUser = await requireOwner(ctx)
    const clinic = await ctx.db.get(staffUser.clinicId)
    return { whatsappAccessToken: clinic?.whatsappAccessToken ?? '' }
  },
})

// Not called from any UI yet — onboarding currently uses getMyStaffUser
// instead. Kept for a future multi-clinic-per-owner flow.
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

    const existingStaffUser = await ctx.db
      .query('staffUsers')
      .withIndex('by_user', (q) => q.eq('userId', identity.subject))
      .first()
    if (existingStaffUser) throw new Error("You're already staff at a clinic")

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
      appointmentReminderLeadHours: 24,
      appointmentReminderMessage: `Hi {patient_name}, this is a reminder of your appointment at {clinic_name} on {appointment_time}.`,
      whatsappNumber: contactPhone,
      bookingTimeSlots: [
        '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
        '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM', '05:00 PM',
      ],
      bookingClosedDays: [0],
      bookingWindowDays: 90,
      createdAt: Date.now(),
    })

    await ctx.db.insert('staffUsers', {
      clinicId,
      userId: identity.subject,
      name: identity.name ?? resolvedEmail,
      email: resolvedEmail,
      // Ownership comes from clinics.ownerUserId (set above), not this role —
      // the clinic creator's job title defaults to Clinician/Therapist like
      // anyone else's, editable in Settings just the same.
      role: 'therapist',
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
    appointmentReminderLeadHours: v.optional(v.number()),
    appointmentReminderMessage: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    whatsappNumber: v.optional(v.string()),
    whatsappAccessToken: v.optional(v.string()),
    whatsappPhoneNumberId: v.optional(v.string()),
    bookingTimeSlots: v.optional(v.array(v.string())),
    bookingClosedDays: v.optional(v.array(v.number())),
    bookingWindowDays: v.optional(v.number()),
  },
  handler: async (ctx, updates) => {
    const staffUser = await requireOwner(ctx)
    await ctx.db.patch(staffUser.clinicId, updates)
    return staffUser.clinicId
  },
})

// Not called from any UI yet (no real Clerk-invite flow exists) — kept for
// a future invite feature where the caller already knows the new staff
// member's real Clerk userId. Note: this lets any owner insert an arbitrary
// Clerk userId as staff with no verification that the userId corresponds to
// a real account. Fine while unreachable from the UI, but must gain proper
// verification before it's wired into one.
export const addStaffMember = mutation({
  args: {
    userId: v.string(),
    name: v.string(),
    email: v.string(),
    role: v.union(v.literal('therapist'), v.literal('receptionist'), v.literal('admin'), v.literal('staff')),
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

function generateProviderId() {
  // Deliberately distinct from Clerk's own "user_..." id format and
  // cryptographically random, so this can never collide with — or be
  // confused for — a real Clerk userId. requireStaffUser looks up staff by
  // matching identity.subject against this field, so a row using one of
  // these can never authenticate as staff; it only ever appears as a
  // selectable name in scheduling/booking dropdowns.
  return 'provider_' + crypto.getRandomValues(new Uint8Array(16)).reduce((a, b) => a + b.toString(16).padStart(2, '0'), '')
}

// Adds a named provider WITHOUT a real login — the common case for a small
// clinic that just wants "Dr. Smith" selectable for scheduling and shown as
// a preferred-therapist option on the public booking form, without needing
// to grant dashboard access (which would require a real Clerk-invite flow
// this app doesn't have yet — see addStaffMember above).
export const addProvider = mutation({
  args: {
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    role: v.union(v.literal('therapist'), v.literal('receptionist'), v.literal('admin'), v.literal('staff')),
  },
  handler: async (ctx, { name, email, phone, role }) => {
    const caller = await requireOwner(ctx)
    const trimmedName = name.trim()
    if (!trimmedName) throw new Error('Name is required')

    const staffId = await ctx.db.insert('staffUsers', {
      clinicId: caller.clinicId,
      userId: generateProviderId(),
      name: trimmedName,
      email: email?.trim() || '',
      phone: phone?.trim() || undefined,
      role,
      createdAt: Date.now(),
    })
    return staffId
  },
})

// Owner-only: removes a staff/provider row. Guards against an owner
// removing their own row (which would strand the clinic with no owner) —
// use a different owner account for that, not this.
export const removeStaffMember = mutation({
  args: { staffId: v.id('staffUsers') },
  handler: async (ctx, { staffId }) => {
    const caller = await requireOwner(ctx)
    const target = await ctx.db.get(staffId)
    if (!target || target.clinicId !== caller.clinicId) {
      throw new Error('Staff member not found')
    }
    if (target._id === caller._id) {
      throw new Error("You can't remove your own account")
    }
    await ctx.db.delete(staffId)
    return staffId
  },
})

// Owner-only: edits an existing staff/provider row's contact details and
// role — covers both fixing up a provider added without a phone, and the
// owner's own row (created at /setup with no phone prompt), since an
// owner editing their own staffId is allowed here.
export const updateStaffMember = mutation({
  args: {
    staffId: v.id('staffUsers'),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    role: v.optional(v.union(v.literal('owner'), v.literal('therapist'), v.literal('receptionist'))),
  },
  handler: async (ctx, { staffId, name, email, phone, role }) => {
    const caller = await requireOwner(ctx)
    const target = await ctx.db.get(staffId)
    if (!target || target.clinicId !== caller.clinicId) {
      throw new Error('Staff member not found')
    }

    const updates: Record<string, unknown> = {}
    if (name !== undefined) {
      const trimmed = name.trim()
      if (!trimmed) throw new Error('Name is required')
      updates.name = trimmed
    }
    if (email !== undefined) updates.email = email.trim()
    if (phone !== undefined) updates.phone = phone.trim() || undefined
    if (role !== undefined) updates.role = role

    await ctx.db.patch(staffId, updates)
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

// Internal-only: used by the therapist appointment-reminder email, which has
// no caller identity.
export const getStaffUserInternal = internalQuery({
  args: { staffId: v.id('staffUsers') },
  handler: async (ctx, { staffId }) => {
    return await ctx.db.get(staffId)
  },
})
