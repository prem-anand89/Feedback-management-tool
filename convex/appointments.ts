import { mutation, query, internalQuery, MutationCtx } from './_generated/server'
import { v } from 'convex/values'
import { internal } from './_generated/api'
import { Doc, Id } from './_generated/dataModel'
import { requireStaffUser } from './lib/auth'
import { insertCompletedVisit } from './visits'

const DEFAULT_REMINDER_LEAD_HOURS = 24
// Used only for overlap math when an appointment has no explicit duration
// set — matches the same assumption the public booking form's fixed
// half-hour/hour slot list implies.
const DEFAULT_DURATION_MINUTES = 60

// Standard interval-overlap check: two ranges overlap if each starts before
// the other ends. Only considers 'scheduled' appointments for the same
// therapist — cancelled/completed/no-show appointments no longer occupy a
// slot, and a different therapist can legitimately see the same patient at
// the same time (double-booking is a per-provider conflict, not a
// per-patient or per-clinic one).
async function findOverlappingAppointment(
  ctx: MutationCtx,
  args: {
    therapistId: Id<'staffUsers'>
    scheduledAt: number
    durationMinutes?: number
    excludeAppointmentId?: Id<'appointments'>
  },
): Promise<Doc<'appointments'> | undefined> {
  const duration = (args.durationMinutes ?? DEFAULT_DURATION_MINUTES) * 60 * 1000
  const start = args.scheduledAt
  const end = start + duration

  const appointments = await ctx.db
    .query('appointments')
    .withIndex('by_therapist', (idx) => idx.eq('therapistId', args.therapistId))
    .collect()

  return appointments.find((a) => {
    if (a.status !== 'scheduled') return false
    if (args.excludeAppointmentId && a._id === args.excludeAppointmentId) return false
    const aDuration = (a.durationMinutes ?? DEFAULT_DURATION_MINUTES) * 60 * 1000
    const aEnd = a.scheduledAt + aDuration
    return start < aEnd && a.scheduledAt < end
  })
}

// Schedules both the WhatsApp reminder to the patient and the companion
// email reminder to the assigned therapist, returning each scheduled job's
// id (stored as strings so either can be cancelled later if the appointment
// is rescheduled or cancelled before the reminders fire). Skips scheduling
// a reminder if its fire time has already passed (e.g. a same-day booking
// made inside the lead window) rather than firing immediately.
async function scheduleReminders(
  ctx: MutationCtx,
  args: {
    appointmentId: Id<'appointments'>
    clinicId: Id<'clinics'>
    patientId: Id<'patients'>
    therapistId: Id<'staffUsers'>
    scheduledAt: number
  },
): Promise<{ reminderJobId: string | undefined; therapistReminderJobId: string | undefined }> {
  const clinic = await ctx.db.get(args.clinicId)
  const leadHours = clinic?.appointmentReminderLeadHours ?? DEFAULT_REMINDER_LEAD_HOURS
  const reminderAt = args.scheduledAt - leadHours * 60 * 60 * 1000
  const delay = reminderAt - Date.now()
  if (delay <= 0) return { reminderJobId: undefined, therapistReminderJobId: undefined }

  const reminderJobId = await ctx.scheduler.runAfter(delay, internal.whatsapp.sendAppointmentReminder, {
    appointmentId: args.appointmentId,
    clinicId: args.clinicId,
    patientId: args.patientId,
  })
  const therapistReminderJobId = await ctx.scheduler.runAfter(delay, internal.emails.sendTherapistAppointmentReminder, {
    appointmentId: args.appointmentId,
    clinicId: args.clinicId,
    patientId: args.patientId,
    therapistId: args.therapistId,
  })
  return {
    reminderJobId: reminderJobId as unknown as string,
    therapistReminderJobId: therapistReminderJobId as unknown as string,
  }
}

async function cancelReminderIfAny(ctx: MutationCtx, reminderJobId: string | undefined) {
  if (!reminderJobId) return
  try {
    await ctx.scheduler.cancel(reminderJobId as unknown as Id<'_scheduled_functions'>)
  } catch {
    // Already fired or otherwise gone — nothing to do.
  }
}

async function cancelRemindersIfAny(ctx: MutationCtx, appointment: Doc<'appointments'>) {
  await cancelReminderIfAny(ctx, appointment.reminderJobId)
  await cancelReminderIfAny(ctx, appointment.therapistReminderJobId)
}

async function requireOwnedAppointment(ctx: MutationCtx, appointmentId: Id<'appointments'>) {
  const staffUser = await requireStaffUser(ctx)
  const appointment = await ctx.db.get(appointmentId)
  if (!appointment || appointment.clinicId !== staffUser.clinicId) {
    throw new Error('Appointment not found')
  }
  return { staffUser, appointment }
}

export const listAppointments = query({
  args: {
    from: v.optional(v.number()),
    to: v.optional(v.number()),
  },
  handler: async (ctx, { from, to }) => {
    const staffUser = await requireStaffUser(ctx)
    // Each branch returns its own independently-typed range builder chain —
    // Convex's fluent index range builder narrows its type on every call
    // (.eq -> .gte -> .lte), so reassigning across a shared mutable variable
    // doesn't type-check.
    return await ctx.db
      .query('appointments')
      .withIndex('by_clinic_scheduled', (idx) => {
        if (from !== undefined && to !== undefined) {
          return idx.eq('clinicId', staffUser.clinicId).gte('scheduledAt', from).lte('scheduledAt', to)
        }
        if (from !== undefined) {
          return idx.eq('clinicId', staffUser.clinicId).gte('scheduledAt', from)
        }
        if (to !== undefined) {
          return idx.eq('clinicId', staffUser.clinicId).lte('scheduledAt', to)
        }
        return idx.eq('clinicId', staffUser.clinicId)
      })
      .collect()
  },
})

export const listUpcomingAppointments = query({
  args: {},
  handler: async (ctx) => {
    const staffUser = await requireStaffUser(ctx)
    const appointments = await ctx.db
      .query('appointments')
      .withIndex('by_clinic', (idx) => idx.eq('clinicId', staffUser.clinicId))
      .collect()
    return appointments
      .filter((a) => a.status === 'scheduled')
      .sort((a, b) => a.scheduledAt - b.scheduledAt)
  },
})

export const listAppointmentsForPatient = query({
  args: { patientId: v.id('patients') },
  handler: async (ctx, { patientId }) => {
    const staffUser = await requireStaffUser(ctx)
    const appointments = await ctx.db
      .query('appointments')
      .withIndex('by_patient', (idx) => idx.eq('patientId', patientId))
      .collect()
    return appointments
      .filter((a) => a.clinicId === staffUser.clinicId)
      .sort((a, b) => a.scheduledAt - b.scheduledAt)
  },
})

export const getAppointment = query({
  args: { appointmentId: v.id('appointments') },
  handler: async (ctx, { appointmentId }) => {
    const staffUser = await requireStaffUser(ctx)
    const appointment = await ctx.db.get(appointmentId)
    if (!appointment || appointment.clinicId !== staffUser.clinicId) return null
    return appointment
  },
})

// Internal-only: used by the WhatsApp reminder action, which has no caller
// identity.
export const getAppointmentInternal = internalQuery({
  args: { appointmentId: v.id('appointments') },
  handler: async (ctx, { appointmentId }) => {
    return await ctx.db.get(appointmentId)
  },
})

// Shared by the staff-scheduled createAppointment mutation below and by
// appointmentRequests.confirmAppointmentRequest, so both paths — staff
// booking a visit directly, and staff confirming a patient's public request
// — funnel through the same insertion + reminder-scheduling logic.
export async function insertScheduledAppointment(
  ctx: MutationCtx,
  args: {
    clinicId: Id<'clinics'>
    patientId: Id<'patients'>
    therapistId: Id<'staffUsers'>
    scheduledAt: number
    durationMinutes?: number
    serviceContext?: string
    notes?: string
  },
) {
  const conflict = await findOverlappingAppointment(ctx, {
    therapistId: args.therapistId,
    scheduledAt: args.scheduledAt,
    durationMinutes: args.durationMinutes,
  })
  if (conflict) {
    throw new Error('This therapist already has an appointment scheduled during this time')
  }

  const trimmedService = args.serviceContext?.trim()
  const appointmentId = await ctx.db.insert('appointments', {
    clinicId: args.clinicId,
    patientId: args.patientId,
    therapistId: args.therapistId,
    ...(trimmedService ? { serviceContext: trimmedService } : {}),
    scheduledAt: args.scheduledAt,
    durationMinutes: args.durationMinutes,
    status: 'scheduled',
    notes: args.notes,
    createdAt: Date.now(),
  })

  const { reminderJobId, therapistReminderJobId } = await scheduleReminders(ctx, {
    appointmentId,
    clinicId: args.clinicId,
    patientId: args.patientId,
    therapistId: args.therapistId,
    scheduledAt: args.scheduledAt,
  })
  if (reminderJobId || therapistReminderJobId) {
    await ctx.db.patch(appointmentId, { reminderJobId, therapistReminderJobId })
  }

  return appointmentId
}

export const createAppointment = mutation({
  args: {
    patientId: v.id('patients'),
    therapistId: v.id('staffUsers'),
    scheduledAt: v.number(),
    durationMinutes: v.optional(v.number()),
    serviceContext: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { patientId, therapistId, scheduledAt, durationMinutes, serviceContext, notes }) => {
    const staffUser = await requireStaffUser(ctx)

    const patient = await ctx.db.get(patientId)
    if (!patient || patient.clinicId !== staffUser.clinicId) {
      throw new Error('Patient not found in this clinic')
    }
    const therapist = await ctx.db.get(therapistId)
    if (!therapist || therapist.clinicId !== staffUser.clinicId) {
      throw new Error('Therapist not found in this clinic')
    }
    if (scheduledAt <= Date.now()) {
      throw new Error('Appointment time must be in the future')
    }

    return await insertScheduledAppointment(ctx, {
      clinicId: staffUser.clinicId,
      patientId,
      therapistId,
      scheduledAt,
      durationMinutes,
      serviceContext,
      notes,
    })
  },
})

export const rescheduleAppointment = mutation({
  args: {
    appointmentId: v.id('appointments'),
    scheduledAt: v.number(),
  },
  handler: async (ctx, { appointmentId, scheduledAt }) => {
    const { appointment } = await requireOwnedAppointment(ctx, appointmentId)
    if (appointment.status === 'completed') {
      throw new Error('Completed appointments cannot be rescheduled')
    }
    if (scheduledAt <= Date.now()) {
      throw new Error('Appointment time must be in the future')
    }

    const conflict = await findOverlappingAppointment(ctx, {
      therapistId: appointment.therapistId,
      scheduledAt,
      durationMinutes: appointment.durationMinutes,
      excludeAppointmentId: appointmentId,
    })
    if (conflict) {
      throw new Error('This therapist already has an appointment scheduled during this time')
    }

    await cancelRemindersIfAny(ctx, appointment)

    const { reminderJobId, therapistReminderJobId } = await scheduleReminders(ctx, {
      appointmentId,
      clinicId: appointment.clinicId,
      patientId: appointment.patientId,
      therapistId: appointment.therapistId,
      scheduledAt,
    })

    await ctx.db.patch(appointmentId, {
      scheduledAt,
      status: 'scheduled',
      cancelledAt: undefined,
      cancelReason: undefined,
      reminderJobId,
      therapistReminderJobId,
    })

    return appointmentId
  },
})

export const cancelAppointment = mutation({
  args: {
    appointmentId: v.id('appointments'),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, { appointmentId, reason }) => {
    const { appointment } = await requireOwnedAppointment(ctx, appointmentId)
    if (appointment.status === 'completed') {
      throw new Error('Completed appointments cannot be cancelled')
    }

    await cancelRemindersIfAny(ctx, appointment)

    await ctx.db.patch(appointmentId, {
      status: 'cancelled',
      cancelledAt: Date.now(),
      cancelReason: reason,
      reminderJobId: undefined,
      therapistReminderJobId: undefined,
    })

    return appointmentId
  },
})

export const markNoShow = mutation({
  args: { appointmentId: v.id('appointments') },
  handler: async (ctx, { appointmentId }) => {
    const { appointment } = await requireOwnedAppointment(ctx, appointmentId)
    if (appointment.status === 'completed') {
      throw new Error('Completed appointments cannot be marked no-show')
    }

    await cancelRemindersIfAny(ctx, appointment)

    await ctx.db.patch(appointmentId, {
      status: 'no-show',
      reminderJobId: undefined,
      therapistReminderJobId: undefined,
    })

    return appointmentId
  },
})

// Completing an appointment creates the visit record for it and hands off to
// the same feedback pipeline every other completed visit uses — no separate
// data entry step for staff.
export const completeAppointment = mutation({
  args: {
    appointmentId: v.id('appointments'),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { appointmentId, notes }) => {
    const { appointment } = await requireOwnedAppointment(ctx, appointmentId)
    if (appointment.status === 'completed') return appointment.visitId
    if (appointment.status === 'cancelled') {
      throw new Error('Cancelled appointments cannot be completed')
    }

    await cancelRemindersIfAny(ctx, appointment)

    const visitId = await insertCompletedVisit(ctx, {
      clinicId: appointment.clinicId,
      patientId: appointment.patientId,
      therapistId: appointment.therapistId,
      serviceContext: appointment.serviceContext,
      notes,
    })

    await ctx.db.patch(appointmentId, {
      status: 'completed',
      visitId,
      completedAt: Date.now(),
      reminderJobId: undefined,
      therapistReminderJobId: undefined,
    })

    return visitId
  },
})

export type AppointmentDoc = Doc<'appointments'>
