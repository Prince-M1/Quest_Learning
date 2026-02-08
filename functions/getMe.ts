import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { rateLimitByUser, tooManyRequestsResponse } from './utils/rateLimit.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting: 100 requests per minute per authenticated user
    const rateLimit = rateLimitByUser(user.id, {
      maxRequests: 100,
      windowMs: 60000
    });

    if (!rateLimit.allowed) {
      return tooManyRequestsResponse(rateLimit);
    }

    return Response.json(user);
  } catch (error) {
    // Don't expose internal error details
    console.error('Error fetching user:', error.message);
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
});