// functions/lib/rate-limit.js
// KV-based rate limiting with sliding windows

export async function checkRateLimit(env, identifier, limit = 20, windowMs = 3600000) {
  const key = `rate-limit:${identifier}`;
  const now = Date.now();
  
  try {
    // Get current request timestamps
    const dataStr = await env.SITE_STORAGE.get(key);
    let timestamps = dataStr ? JSON.parse(dataStr) : [];
    
    // Remove timestamps outside the window
    timestamps = timestamps.filter(ts => now - ts < windowMs);
    
    // Check if limit exceeded
    if (timestamps.length >= limit) {
      const oldestTimestamp = Math.min(...timestamps);
      const resetTime = oldestTimestamp + windowMs;
      const retryAfter = Math.ceil((resetTime - now) / 1000);
      
      return {
        allowed: false,
        remaining: 0,
        resetTime,
        retryAfter
      };
    }
    
    // Add current timestamp
    timestamps.push(now);
    
    // Store updated timestamps
    await env.SITE_STORAGE.put(key, JSON.stringify(timestamps), {
      expirationTtl: Math.ceil(windowMs / 1000)
    });
    
    return {
      allowed: true,
      remaining: limit - timestamps.length,
      resetTime: now + windowMs
    };
  } catch (error) {
    console.error('Rate limit check failed:', error);
    // Fail open - allow request if rate limiting fails
    return { allowed: true, remaining: limit };
  }
}

export function rateLimitResponse(retryAfter) {
  return new Response(JSON.stringify({
    error: 'Too many requests. Please try again later.',
    retryAfter
  }), {
    status: 429,
    headers: {
      'Content-Type': 'application/json',
      'Retry-After': retryAfter.toString()
    }
  });
}

// Helper to get identifier from request
export function getRateLimitIdentifier(request, user) {
  // Use user ID if authenticated, otherwise use IP
  if (user && user.sub) {
    return `user:${user.sub}`;
  }
  
  // Try to get IP from headers
  const ip = request.headers.get('CF-Connecting-IP') || 
              request.headers.get('X-Forwarded-For') ||
              'unknown';
  
  return `ip:${ip}`;
}