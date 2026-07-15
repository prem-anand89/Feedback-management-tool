import { httpRouter } from 'convex/server'
import { httpAction } from './_generated/server'
import { internal } from './_generated/api'

const visitComplete = httpAction(async (ctx, request) => {
  const secret = request.headers.get('x-webhook-secret')
  if (!process.env.VISIT_COMPLETE_SECRET || secret !== process.env.VISIT_COMPLETE_SECRET) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const body = await request.json()
    const { visitId } = body

    if (!visitId) {
      return new Response(JSON.stringify({ error: 'visitId required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const result = await ctx.runMutation(internal.visits.completeVisit, {
      visitId,
    })

    return new Response(JSON.stringify({ success: true, visitId: result }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error in visitComplete:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }
})

const getFeedbackLink = httpAction(async (ctx, request) => {
  try {
    const url = new URL(request.url)
    const token = url.searchParams.get('token')

    if (!token) {
      return new Response(JSON.stringify({ error: 'token required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const feedbackRequest = await ctx.runQuery(internal.feedback.getFeedbackRequestByToken, {
      token,
    })

    if (!feedbackRequest) {
      return new Response(JSON.stringify({ error: 'Feedback request not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ feedbackRequest }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error in getFeedbackLink:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }
})

const http = httpRouter()

http.route({
  path: '/api/visitComplete',
  method: 'POST',
  handler: visitComplete,
})

http.route({
  path: '/api/getFeedbackLink',
  method: 'GET',
  handler: getFeedbackLink,
})

export default http
