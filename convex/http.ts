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

    const result = await ctx.runMutation(internal.visits.completeVisitInternal, {
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

const trackReviewClick = httpAction(async (ctx, request) => {
  try {
    const url = new URL(request.url)
    const reviewRequestId = url.searchParams.get('reviewRequestId')

    if (!reviewRequestId) {
      return new Response(JSON.stringify({ error: 'reviewRequestId required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    await ctx.runMutation(internal.reviews.trackReviewClick, {
      reviewRequestId: reviewRequestId as any,
    })

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error in trackReviewClick:', error)
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

const getWidget = httpAction(async (ctx, request) => {
  try {
    const url = new URL(request.url)
    const clinicId = url.searchParams.get('clinicId')

    if (!clinicId) {
      return new Response(
        `console.error("clinicId parameter is required");`,
        {
          status: 400,
          headers: { 'Content-Type': 'application/javascript' },
        },
      )
    }

    const widgetCode = `
    (function() {
      const script = document.createElement('link');
      script.rel = 'stylesheet';
      script.href = '${process.env.VITE_FEEDBACK_FORM_URL || 'http://localhost:5173'}/widget.css';
      document.head.appendChild(script);

      const button = document.createElement('button');
      button.className = 'feedback-widget-button';
      button.innerHTML = '💬';
      button.title = 'Share your feedback';
      document.body.appendChild(button);

      const modal = document.createElement('div');
      modal.className = 'feedback-widget-modal';
      modal.innerHTML = \`<div class="feedback-widget-content">
        <button class="feedback-widget-close">×</button>
        <div class="feedback-widget-header">
          <h2>Share Your Feedback</h2>
          <p>Help us improve your experience</p>
        </div>
        <div class="feedback-widget-body">
          <div class="feedback-widget-form-group">
            <label class="feedback-widget-label">How was your experience?</label>
            <div class="feedback-widget-rating">
              <span class="feedback-widget-star" data-rating="1">☆</span>
              <span class="feedback-widget-star" data-rating="2">☆</span>
              <span class="feedback-widget-star" data-rating="3">☆</span>
              <span class="feedback-widget-star" data-rating="4">☆</span>
              <span class="feedback-widget-star" data-rating="5">☆</span>
            </div>
          </div>
          <div class="feedback-widget-form-group">
            <label class="feedback-widget-label">Any comments?</label>
            <textarea class="feedback-widget-textarea" placeholder="Tell us what we can improve..." rows="4"></textarea>
          </div>
          <button class="feedback-widget-submit">Submit Feedback</button>
        </div>
      </div>\`;
      document.body.appendChild(modal);

      button.addEventListener('click', () => modal.classList.add('active'));
      modal.querySelector('.feedback-widget-close').addEventListener('click', () => modal.classList.remove('active'));
    })();
    `

    return new Response(widgetCode, {
      status: 200,
      headers: { 'Content-Type': 'application/javascript' },
    })
  } catch (error) {
    console.error('Error in getWidget:', error)
    return new Response('console.error("Widget loading error");', {
      status: 500,
      headers: { 'Content-Type': 'application/javascript' },
    })
  }
})

const submitWidgetFeedback = httpAction(async (ctx, request) => {
  try {
    const body = await request.json()
    const { clinicId, rating, comment } = body

    if (!clinicId || !rating) {
      return new Response(JSON.stringify({ error: 'clinicId and rating required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    await ctx.runMutation(internal.reviews.createWidgetFeedback, {
      clinicId: clinicId as any,
      rating,
      comment: comment || '',
    })

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error in submitWidgetFeedback:', error)
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

http.route({
  path: '/api/trackReviewClick',
  method: 'GET',
  handler: trackReviewClick,
})

http.route({
  path: '/api/getWidget',
  method: 'GET',
  handler: getWidget,
})

http.route({
  path: '/api/submitWidgetFeedback',
  method: 'POST',
  handler: submitWidgetFeedback,
})

export default http
