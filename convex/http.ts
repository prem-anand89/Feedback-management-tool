import { httpAction } from './_generated/server'
import { internal } from './_generated/api'
import { HttpResponse } from 'convex/server'

export const visitComplete = httpAction(async (ctx, request) => {
  if (request.method !== 'POST') {
    return new HttpResponse('Method not allowed', { status: 405 })
  }

  try {
    const body = await request.json()
    const { visitId } = body

    if (!visitId) {
      return new HttpResponse(JSON.stringify({ error: 'visitId required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Mark visit as completed and trigger feedback automation
    const result = await ctx.runMutation(internal.visits.completeVisit, {
      visitId,
    })

    return new HttpResponse(JSON.stringify({ success: true, visitId: result }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error in visitComplete:', error)
    return new HttpResponse(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
})

export const getFeedbackLink = httpAction(async (ctx, request) => {
  if (request.method !== 'GET') {
    return new HttpResponse('Method not allowed', { status: 405 })
  }

  try {
    const url = new URL(request.url)
    const token = url.searchParams.get('token')

    if (!token) {
      return new HttpResponse(JSON.stringify({ error: 'token required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Query feedback request by token
    const feedbackRequest = await ctx.runQuery(internal.feedback.getFeedbackRequestByToken, {
      token,
    })

    if (!feedbackRequest) {
      return new HttpResponse(JSON.stringify({ error: 'Feedback request not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new HttpResponse(JSON.stringify({ feedbackRequest }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error in getFeedbackLink:', error)
    return new HttpResponse(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
})
