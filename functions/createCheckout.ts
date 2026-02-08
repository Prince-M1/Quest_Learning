import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe';
import { rateLimitCombined, tooManyRequestsResponse } from './utils/rateLimit.js';
import { validate, schema } from './utils/validator.js';

// API keys loaded from environment variables - never hardcoded
const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
if (!stripeSecretKey) {
  throw new Error('STRIPE_SECRET_KEY environment variable is required');
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16',
});

Deno.serve(async (req) => {
  try {
    // Rate limiting: 10 requests per minute per user + 100 per minute per IP
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    const rateLimit = rateLimitCombined(req, user?.id, {
      userMaxRequests: 10,
      ipMaxRequests: 100,
      windowMs: 60000
    });

    if (!rateLimit.allowed) {
      console.log("⚠️ [CHECKOUT] Rate limit exceeded");
      return tooManyRequestsResponse(rateLimit);
    }

    console.log("🛒 [CHECKOUT] Creating checkout session");

    if (!user) {
      console.log("❌ [CHECKOUT] User not authenticated");
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.account_type !== 'teacher') {
      console.log("❌ [CHECKOUT] User is not a teacher");
      return Response.json({ error: 'Only teachers can subscribe to premium' }, { status: 403 });
    }

    // Strict input validation - reject unexpected fields
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return Response.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const { priceId, successUrl, cancelUrl } = validate(body, {
      priceId: schema.requiredString({ minLength: 1, maxLength: 255 }),
      successUrl: schema.requiredUrl(),
      cancelUrl: schema.requiredUrl()
    }, { strict: true, throwOnUnexpected: true });
    
    // Log safely without exposing sensitive data
    console.log("📋 [CHECKOUT] User ID:", user.id);
    console.log("📋 [CHECKOUT] User Email (first 3 chars):", user.email?.substring(0, 3) + '***');

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: user.email,
      allow_promotion_codes: true,
      subscription_data: {
        trial_period_days: 30,
        metadata: {
          user_id: user.id,
          user_email: user.email,
        }
      },
      metadata: {
        base44_app_id: Deno.env.get("BASE44_APP_ID"),
        user_id: user.id,
        user_email: user.email,
      },
    });

    console.log("✅ [CHECKOUT] Session created:", session.id);
    return Response.json({ url: session.url });
  } catch (error) {
    // Log error for debugging, but don't expose internal details to client
    console.error("❌ [CHECKOUT] Error:", error.message);
    
    // Return generic error message to client
    const status = error.message.includes('validation') ? 400 : 500;
    const clientMessage = status === 400 
      ? 'Invalid request data' 
      : 'Failed to create checkout session';
    
    return Response.json({ error: clientMessage }, { status });
  }
});