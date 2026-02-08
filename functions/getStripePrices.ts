import Stripe from 'npm:stripe';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"), {
  apiVersion: '2023-10-16',
});

Deno.serve(async (req) => {
  try {
    // Return the hardcoded price ID created via Stripe integration (no trial)
    return Response.json({
      premium_price_id: 'price_1SsoVLGkJwjLzI2pADjSmRzS',
      premium_product_id: 'prod_TqVWj9hWCzkizs',
    });
    
  } catch (error) {
    console.error('❌ Error fetching Stripe prices:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});