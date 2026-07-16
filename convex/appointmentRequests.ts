import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { requireStaffUser } from './lib/auth'
import { insertScheduledAppointment } from './appointments'
import { findOrCreatePatient } from './patients'

const DEFAULT_TIME_SLOTS = [
  '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM', '05:00 PM',
]
const DEFAULT_CLOSED_DAYS = [0] // Sunday
const DEFAULT_BOOKING_WINDOW_DAYS = 90

// Public, unauthenticated: powers the embeddable booking form. Only exposes
// what a patient needs to fill out the request — never staff/internal data.
export const getPublicClinicBookingInfo = query({
  args: { clinicId: v.id('clinics') },
  handler: async (ctx, { clinicId }) => {
    const clinic = await ctx.db.get(clinicId)
    if (!clinic) return null

    return {
      name: clinic.name,
      services: clinic.services ?? [],
      timeSlots: clinic.bookingTimeSlots ?? DEFAULT_TIME_SLOTS,
      closedDays: clinic.bookingClosedDays ?? DEFAULT_CLOSED_DAYS,
      windowDays: clinic.bookingWindowDays ?? DEFAULT_BOOKING_WINDOW_DAYS,
      whatsappNumber: clinic.whatsappNumber ?? clinic.contactPhone ?? '',
    }
  },
})

// Public, unauthenticated: the patient submitting has no account. This is a
// *request* — it does not touch the patients/appointments tables until staff
// confirm it.
export const createAppointmentRequest = mutation({
  args: {
    clinicId: v.id('clinics'),
    patientName: v.string(),
    phone: v.string(),
    email: v.optional(v.string()),
    preferredDate: v.string(),
    preferredTime: v.string(),
    reason: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { clinicId, patientName, phone, email, preferredDate, preferredTime, reason, notes }) => {
    const clinic = await ctx.db.get(clinicId)
    if (!clinic) throw new Error('Clinic not found')

    const name = patientName.trim()
    const trimmedPhone = phone.trim()
    if (!name || !trimmedPhone || !preferredDate || !preferredTime) {
      throw new Error('Name, phone, preferred date, and preferred time are required')
    }
    if (trimmedPhone.replace(/\D/g, '').length < 7) {
      throw new Error('Please enter a valid phone number')
    }

    const requestId = await ctx.db.insert('appointmentRequests', {
      clinicId,
      patientName: name,
      phone: trimmedPhone,
      email: email?.trim() || undefined,
      preferredDate,
      preferredTime,
      reason: reason?.trim() || undefined,
      notes: notes?.trim() || undefined,
      status: 'pending',
      source: 'widget',
      createdAt: Date.now(),
    })

    return requestId
  },
})

export const listAppointmentRequests = query({
  args: { status: v.optional(v.string()) },
  handler: async (ctx, { status }) => {
    const staffUser = await requireStaffUser(ctx)
    const requests = await ctx.db
      .query('appointmentRequests')
      .withIndex('by_clinic', (idx) => idx.eq('clinicId', staffUser.clinicId))
      .collect()
    const filtered = status ? requests.filter((r) => r.status === status) : requests
    return filtered.sort((a, b) => b.createdAt - a.createdAt)
  },
})

export const listPendingAppointmentRequests = query({
  args: {},
  handler: async (ctx) => {
    const staffUser = await requireStaffUser(ctx)
    const requests = await ctx.db
      .query('appointmentRequests')
      .withIndex('by_clinic_status', (idx) => idx.eq('clinicId', staffUser.clinicId).eq('status', 'pending'))
      .collect()
    return requests.sort((a, b) => a.createdAt - b.createdAt)
  },
})

// Turns a request into a real, reminder-backed appointment — the point where
// staff judgment (per the "Request, not Confirmation" philosophy) makes it
// official. Matches or creates the patient record since the requester had no
// prior account.
export const confirmAppointmentRequest = mutation({
  args: {
    requestId: v.id('appointmentRequests'),
    therapistId: v.id('staffUsers'),
    scheduledAt: v.number(),
    durationMinutes: v.optional(v.number()),
  },
  handler: async (ctx, { requestId, therapistId, scheduledAt, durationMinutes }) => {
    const staffUser = await requireStaffUser(ctx)
    const request = await ctx.db.get(requestId)
    if (!request || request.clinicId !== staffUser.clinicId) {
      throw new Error('Appointment request not found')
    }
    if (request.status !== 'pending') {
      throw new Error('Only pending requests can be confirmed')
    }
    const therapist = await ctx.db.get(therapistId)
    if (!therapist || therapist.clinicId !== staffUser.clinicId) {
      throw new Error('Therapist not found in this clinic')
    }
    if (scheduledAt <= Date.now()) {
      throw new Error('Appointment time must be in the future')
    }

    const patientId = await findOrCreatePatient(ctx, {
      clinicId: staffUser.clinicId,
      name: request.patientName,
      phone: request.phone,
      email: request.email,
    })

    const appointmentId = await insertScheduledAppointment(ctx, {
      clinicId: staffUser.clinicId,
      patientId,
      therapistId,
      scheduledAt,
      durationMinutes,
      serviceContext: request.reason,
      notes: request.notes,
    })

    await ctx.db.patch(requestId, {
      status: 'confirmed',
      appointmentId,
      reviewedAt: Date.now(),
    })

    return appointmentId
  },
})

// For reject / no-response / cancelled — statuses that do not create an
// appointment.
export const updateAppointmentRequestStatus = mutation({
  args: {
    requestId: v.id('appointmentRequests'),
    status: v.union(v.literal('cancelled'), v.literal('no-response'), v.literal('rejected')),
  },
  handler: async (ctx, { requestId, status }) => {
    const staffUser = await requireStaffUser(ctx)
    const request = await ctx.db.get(requestId)
    if (!request || request.clinicId !== staffUser.clinicId) {
      throw new Error('Appointment request not found')
    }

    await ctx.db.patch(requestId, { status, reviewedAt: Date.now() })
    return requestId
  },
})
