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

// Marks the click, then redirects the patient's browser straight to the
// clinic's Google review page — the reviewRequest doc already carries the
// URL it was created with, so no extra param is needed on the link.
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

    const reviewRequest = await ctx.runMutation(internal.reviews.trackReviewClick, {
      reviewRequestId: reviewRequestId as any,
    })

    if (!reviewRequest) {
      return new Response(JSON.stringify({ error: 'Review request not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(null, {
      status: 302,
      headers: { Location: reviewRequest.googleReviewUrl },
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

// The widget is meant to be embedded on a clinic's own external website, so
// this endpoint (and submitWidgetFeedback below) must be reachable
// cross-origin. CONVEX_SITE_URL is Convex's built-in env var for this
// deployment's HTTP Actions base URL (the .convex.site domain).
const SITE_URL = process.env.CONVEX_SITE_URL || ''

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
      var CLINIC_ID = ${JSON.stringify(clinicId)};
      var SUBMIT_URL = ${JSON.stringify(SITE_URL + '/api/submitWidgetFeedback')};

      var style = document.createElement('link');
      style.rel = 'stylesheet';
      style.href = ${JSON.stringify(SITE_URL)} + '/widget.css';
      document.head.appendChild(style);

      var button = document.createElement('button');
      button.className = 'feedback-widget-button';
      button.innerHTML = '💬';
      button.title = 'Share your feedback';
      document.body.appendChild(button);

      var modal = document.createElement('div');
      modal.className = 'feedback-widget-modal';
      modal.innerHTML = '<div class="feedback-widget-content">' +
        '<button class="feedback-widget-close">×</button>' +
        '<div id="fwForm">' +
        '<div class="feedback-widget-header"><h2>Share Your Feedback</h2><p>Help us improve your experience</p></div>' +
        '<div class="feedback-widget-body">' +
        '<div class="feedback-widget-form-group">' +
        '<label class="feedback-widget-label">How was your experience?</label>' +
        '<div class="feedback-widget-rating" id="fwRating">' +
        '<span class="feedback-widget-star" data-rating="1">☆</span>' +
        '<span class="feedback-widget-star" data-rating="2">☆</span>' +
        '<span class="feedback-widget-star" data-rating="3">☆</span>' +
        '<span class="feedback-widget-star" data-rating="4">☆</span>' +
        '<span class="feedback-widget-star" data-rating="5">☆</span>' +
        '</div></div>' +
        '<div class="feedback-widget-form-group">' +
        '<label class="feedback-widget-label">Any comments?</label>' +
        '<textarea class="feedback-widget-textarea" id="fwComment" placeholder="Tell us what we can improve..." rows="4"></textarea>' +
        '</div>' +
        '<button class="feedback-widget-submit" id="fwSubmit">Submit Feedback</button>' +
        '</div></div>' +
        '<div id="fwSuccess" class="feedback-widget-success" style="display:none;">' +
        '<div class="feedback-widget-success-icon">✓</div><h3>Thank You!</h3><p>We appreciate your feedback.</p>' +
        '</div>' +
        '</div>';
      document.body.appendChild(modal);

      var rating = 0;
      var stars = modal.querySelectorAll('.feedback-widget-star');
      var formDiv = modal.querySelector('#fwForm');
      var successDiv = modal.querySelector('#fwSuccess');
      var commentField = modal.querySelector('#fwComment');

      function paintStars() {
        stars.forEach(function(s) {
          s.textContent = parseInt(s.dataset.rating, 10) <= rating ? '★' : '☆';
        });
      }

      stars.forEach(function(star) {
        star.addEventListener('click', function() {
          rating = parseInt(star.dataset.rating, 10);
          paintStars();
        });
      });

      function resetWidget() {
        rating = 0;
        commentField.value = '';
        paintStars();
        formDiv.style.display = 'block';
        successDiv.style.display = 'none';
      }

      button.addEventListener('click', function() { modal.classList.add('active'); });
      modal.querySelector('.feedback-widget-close').addEventListener('click', function() {
        modal.classList.remove('active');
        resetWidget();
      });
      modal.addEventListener('click', function(e) {
        if (e.target === modal) {
          modal.classList.remove('active');
          resetWidget();
        }
      });

      modal.querySelector('#fwSubmit').addEventListener('click', function() {
        if (rating === 0) {
          alert('Please select a rating');
          return;
        }
        fetch(SUBMIT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clinicId: CLINIC_ID, rating: rating, comment: commentField.value }),
        }).then(function(res) {
          if (res.ok) {
            formDiv.style.display = 'none';
            successDiv.style.display = 'block';
            setTimeout(function() {
              modal.classList.remove('active');
              resetWidget();
            }, 2000);
          } else {
            alert('Error submitting feedback. Please try again.');
          }
        }).catch(function() {
          alert('Error submitting feedback. Please try again.');
        });
      });
    })();
    `

    return new Response(widgetCode, {
      status: 200,
      headers: {
        'Content-Type': 'application/javascript',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error) {
    console.error('Error in getWidget:', error)
    return new Response('console.error("Widget loading error");', {
      status: 500,
      headers: { 'Content-Type': 'application/javascript' },
    })
  }
})

const corsJsonHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
}

const submitWidgetFeedback = httpAction(async (ctx, request) => {
  try {
    const body = await request.json()
    const { clinicId, rating, comment } = body

    if (!clinicId || !rating) {
      return new Response(JSON.stringify({ error: 'clinicId and rating required' }), {
        status: 400,
        headers: corsJsonHeaders,
      })
    }

    await ctx.runMutation(internal.reviews.createWidgetFeedback, {
      clinicId: clinicId as any,
      rating,
      comment: comment || '',
    })

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: corsJsonHeaders,
    })
  } catch (error) {
    console.error('Error in submitWidgetFeedback:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: corsJsonHeaders,
      },
    )
  }
})

const submitWidgetFeedbackOptions = httpAction(async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
})

const getWidgetCss = httpAction(async () => {
  return new Response(WIDGET_CSS, {
    status: 200,
    headers: {
      'Content-Type': 'text/css',
      'Access-Control-Allow-Origin': '*',
    },
  })
})

const WIDGET_CSS = `
.feedback-widget-button{position:fixed;bottom:20px;right:20px;width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;border:none;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,.15);font-size:24px;display:flex;align-items:center;justify-content:center;z-index:9999;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
.feedback-widget-modal{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);display:none;align-items:center;justify-content:center;z-index:10000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
.feedback-widget-modal.active{display:flex}
.feedback-widget-content{background:#fff;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,.3);width:90%;max-width:500px;max-height:90vh;overflow-y:auto;position:relative}
.feedback-widget-close{position:absolute;top:16px;right:16px;background:none;border:none;font-size:24px;cursor:pointer;color:#999}
.feedback-widget-header{padding:24px 24px 16px;border-bottom:1px solid #eee}
.feedback-widget-header h2{font-size:20px;margin-bottom:4px;color:#333}
.feedback-widget-header p{font-size:14px;color:#999}
.feedback-widget-body{padding:24px}
.feedback-widget-form-group{margin-bottom:20px}
.feedback-widget-label{display:block;font-size:14px;font-weight:500;color:#333;margin-bottom:8px}
.feedback-widget-rating{display:flex;gap:8px}
.feedback-widget-star{font-size:32px;cursor:pointer}
.feedback-widget-textarea{width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;font-family:inherit;font-size:14px;resize:vertical;min-height:80px}
.feedback-widget-submit{width:100%;padding:10px 16px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:500}
.feedback-widget-success{text-align:center;padding:40px 24px}
.feedback-widget-success-icon{font-size:48px;margin-bottom:16px}
.feedback-widget-success h3{font-size:18px;color:#333;margin-bottom:8px}
.feedback-widget-success p{font-size:14px;color:#999}
`

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

http.route({
  path: '/api/submitWidgetFeedback',
  method: 'OPTIONS',
  handler: submitWidgetFeedbackOptions,
})

http.route({
  path: '/widget.css',
  method: 'GET',
  handler: getWidgetCss,
})

export default http
