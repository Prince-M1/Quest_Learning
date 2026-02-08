import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe';

// API keys loaded from environment variables - never hardcoded
const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

if (!stripeSecretKey) {
  throw new Error('STRIPE_SECRET_KEY environment variable is required');
}

if (!webhookSecret) {
  throw new Error('STRIPE_WEBHOOK_SECRET environment variable is required');
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16',
});

Deno.serve(async (req) => {
  try {
    // Webhooks should only accept POST requests
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const signature = req.headers.get('stripe-signature');
    
    // Validate signature header exists
    if (!signature) {
      console.error("❌ [WEBHOOK] Missing stripe-signature header");
      return Response.json({ error: 'Missing signature' }, { status: 400 });
    }

    const body = await req.text();
    
    // Validate body size to prevent DoS
    const bodySizeLimit = 1024 * 1024; // 1MB
    if (Buffer.byteLength(body, 'utf8') > bodySizeLimit) {
      console.error("❌ [WEBHOOK] Payload too large");
      return Response.json({ error: 'Payload too large' }, { status: 413 });
    }

    console.log("🔔 [WEBHOOK] Received webhook");

    let event;
    try {
      // Stripe's constructEventAsync handles signature verification
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        webhookSecret
      );
    } catch (err) {
      // Log error without exposing details to client
      console.error("❌ [WEBHOOK] Signature verification failed");
      return Response.json({ error: 'Signature verification failed' }, { status: 400 });
    }

    console.log("📋 [WEBHOOK] Event type:", event.type);

    const base44 = createClientFromRequest(req);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.user_id;
        
        // Validate userId format before processing
        if (!userId || typeof userId !== 'string' || userId.length > 255) {
          console.error("❌ [WEBHOOK] Invalid user ID in metadata");
          break;
        }
        
        console.log("✅ [WEBHOOK] Checkout completed");

        if (userId) {
          const trialEnd = new Date();
          trialEnd.setDate(trialEnd.getDate() + 30);
          
          await base44.asServiceRole.entities.User.update(userId, {
            subscription_status: 'trial',
            subscription_tier: 'premium',
            subscription_id: session.subscription,
            trial_end_date: trialEnd.toISOString(),
          });
          
          console.log("✅ [WEBHOOK] Updated user subscription status to trial");
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const userId = subscription.metadata?.user_id;
        
        // Validate userId format before processing
        if (!userId || typeof userId !== 'string' || userId.length > 255) {
          console.error("❌ [WEBHOOK] Invalid user ID in metadata");
          break;
        }

        console.log("🔄 [WEBHOOK] Subscription updated");

        if (userId) {
          let subscriptionStatus = 'free';
          let subscriptionTier = 'free';
          let updateData = {};
          
          // If subscription is set to cancel, put user in grace period immediately
          if (subscription.cancel_at) {
            const gracePeriodEnd = new Date(subscription.current_period_end * 1000);
            subscriptionStatus = 'grace_period';
            subscriptionTier = 'premium';
            updateData.grace_period_end_date = gracePeriodEnd.toISOString();
            console.log("📋 [WEBHOOK] Cancellation scheduled, entering grace period until:", gracePeriodEnd.toISOString());
          } else if (subscription.status === 'active') {
            const isInTrial = subscription.trial_end && new Date(subscription.trial_end * 1000) > new Date();
            subscriptionStatus = isInTrial ? 'trial' : 'premium';
            subscriptionTier = 'premium';
          }

          await base44.asServiceRole.entities.User.update(userId, {
            subscription_status: subscriptionStatus,
            subscription_tier: subscriptionTier,
            ...updateData,
          });
          
          console.log("✅ [WEBHOOK] Updated subscription status to:", subscriptionStatus);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const userId = subscription.metadata?.user_id;

        // Validate userId format before processing
        if (!userId || typeof userId !== 'string' || userId.length > 255) {
          console.error("❌ [WEBHOOK] Invalid user ID in metadata");
          break;
        }

        console.log("❌ [WEBHOOK] Subscription cancelled");

        if (userId) {
          // Use Stripe's current_period_end - user keeps access until their billing period ends
          const gracePeriodEnd = new Date(subscription.current_period_end * 1000);

          await base44.asServiceRole.entities.User.update(userId, {
            subscription_status: 'grace_period',
            subscription_tier: 'premium',
            subscription_id: null,
            grace_period_end_date: gracePeriodEnd.toISOString(),
          });

          console.log("✅ [WEBHOOK] Set user to grace period until:", gracePeriodEnd.toISOString());
        }
        break;
      }

      default:
        console.log(`ℹ️ [WEBHOOK] Unhandled event type: ${event.type}`);
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error("❌ [WEBHOOK] Error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});