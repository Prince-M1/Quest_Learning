import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { rateLimitByIp, tooManyRequestsResponse } from './utils/rateLimit.js';
import { validate, schema } from './utils/validator.js';

Deno.serve(async (req) => {
  try {
    // Only accept POST requests
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    // Rate limiting: 5 requests per minute per IP (public endpoint)
    const rateLimit = rateLimitByIp(req, {
      maxRequests: 5,
      windowMs: 60000
    });

    if (!rateLimit.allowed) {
      console.log("⚠️ [WAITLIST] Rate limit exceeded");
      return tooManyRequestsResponse(rateLimit);
    }

    // Strict input validation
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return Response.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    // Validate and sanitize input - reject unexpected fields
    const validated = validate(body, {
      firstName: schema.requiredString({ minLength: 1, maxLength: 100 }),
      lastName: schema.requiredString({ minLength: 1, maxLength: 100 }),
      email: schema.requiredEmail(),
      role: schema.requiredEnum(['student', 'teacher']),
      organization: schema.string({ minLength: 0, maxLength: 255 })
    }, { strict: true, throwOnUnexpected: true });

    const base44 = createClientFromRequest(req);

    // Create waitlist entry with validated data only
    await base44.asServiceRole.entities.Waitlist.create({
      firstName: validated.firstName,
      lastName: validated.lastName,
      email: validated.email,
      role: validated.role,
      organization: validated.organization || ""
    });

    return Response.json({ success: true });
  } catch (error) {
    // Log error for debugging
    console.error('Error adding to waitlist:', error.message);
    
    // Return generic error message to client for security
    const status = error.message.includes('validation') ? 400 : 500;
    const message = status === 400 ? 'Invalid request data' : 'Failed to add to waitlist';
    
    return Response.json({ error: message }, { status });
  }
});