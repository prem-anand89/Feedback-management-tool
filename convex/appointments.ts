import { mutation, query, internalQuery, MutationCtx } from './_generated/server'
import { v } from 'convex/values'
import { internal } from './_generated/api'
import { Doc, Id } from './_generated/dataModel'
import { requireStaffUser } from './lib/auth'
import { insertCompletedVisit } from './visits'

const DEFAULT_REMINDER_LEAD_HOURS = 24

// Schedules the WhatsApp reminder for an appointment and returns the
// scheduled job's id (stored as a string so it can be cancelled later if the
// appointment is rescheduled or cancelled before the reminder fires). Skips
// scheduling if the reminder time has already passed (e.g. a same-day booking
// made inside the lead window) rather than firing immediately.
async function scheduleReminder(
  ctx: MutationCtx,
  args: { appointmentId: Id<'appointments'>; clinicId: Id<'clinics'>; patientId: Id<'patients'>; scheduledAt: number },
): Promise<string | undefined> {
  const clinic = await ctx.db.get(args.clinicId)
  const leadHours = clinic?.appointmentReminderLeadHours ?? DEFAULT_REMINDER_LEAD_HOURS
  const reminderAt = args.scheduledAt - leadHours * 60 * 60 * 1000
  const delay = reminderAt - Date.now()
  if (delay <= 0) return undefined

  const jobId = await ctx.scheduler.runAfter(delay, internal.whatsapp.sendAppointmentReminder, {
    appointmentId: args.appointmentId,
    clinicId: args.clinicId,
    patientId: args.patientId,
  })
  return jobId as unknown as string
}

async function cancelReminderIfAny(ctx: MutationCtx, reminderJobId: string | undefined) {
  if (!reminderJobId) return
  try {
    await ctx.scheduler.cancel(reminderJobId as unknown as Id<'_scheduled_functions'>)
  } catch {
    // Already fired or otherwise gone — nothing to do.
  }
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
    let q = ctx.db.query('appointments').withIndex('by_clinic_scheduled', (idx) => {
      let range = idx.eq('clinicId', staffUser.clinicId)
      if (from !== undefined) range = range.gte('scheduledAt', from)
      if (to !== undefined) range = range.lte('scheduledAt', to)
      return range
    })
    return await q.collect()
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

    const trimmedService = serviceContext?.trim()
    const appointmentId = await ctx.db.insert('appointments', {
      clinicId: staffUser.clinicId,
      patientId,
      therapistId,
      ...(trimmedService ? { serviceContext: trimmedService } : {}),
      scheduledAt,
      durationMinutes,
      status: 'scheduled',
      notes,
      createdAt: Date.now(),
    })

    const reminderJobId = await scheduleReminder(ctx, {
      appointmentId,
      clinicId: staffUser.clinicId,
      patientId,
      scheduledAt,
    })
    if (reminderJobId) {
      await ctx.db.patch(appointmentId, { reminderJobId })
    }

    return appointmentId
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

    await cancelReminderIfAny(ctx, appointment.reminderJobId)

    const reminderJobId = await scheduleReminder(ctx, {
      appointmentId,
      clinicId: appointment.clinicId,
      patientId: appointment.patientId,
      scheduledAt,
    })

    await ctx.db.patch(appointmentId, {
      scheduledAt,
      status: 'scheduled',
      cancelledAt: undefined,
      cancelReason: undefined,
      reminderJobId,
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

    await cancelReminderIfAny(ctx, appointment.reminderJobId)

    await ctx.db.patch(appointmentId, {
      status: 'cancelled',
      cancelledAt: Date.now(),
      cancelReason: reason,
      reminderJobId: undefined,
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

    await cancelReminderIfAny(ctx, appointment.reminderJobId)

    await ctx.db.patch(appointmentId, {
      status: 'no-show',
      reminderJobId: undefined,
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

    await cancelReminderIfAny(ctx, appointment.reminderJobId)

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
    })

    return visitId
  },
})

export type AppointmentDoc = Doc<'appointments'>
