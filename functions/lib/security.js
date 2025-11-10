// functions/lib/security.js
// Security headers and middleware

export function addSecurityHeaders(response, contentType = 'application/json') {
  const headers = new Headers(response.headers);
  
  // Content Security Policy (HTML only)
  if (contentType === 'text/html') {
    headers.set('Content-Security-Policy', 
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' https://js.stripe.com https://cdnjs.cloudflare.com; " +
      "style-src 'self' 'unsafe-inline' https://convert.yourdsgn.pro; " +
      "img-src 'self' data: https:; " +
      "font-src 'self' data:; " +
      "connect-src 'self' https://api.stripe.com https://generativelanguage.googleapis.com; " +
      "frame-src 'self'; " +
      "base-uri 'self'; " +
      "form-action 'self';"
    );
  }
  
  // Security headers for all responses
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('X-XSS-Protection', '1; mode=block');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // HSTS (only in production with HTTPS)
  headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export function addCorsHeaders(response, origin = '*') {
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', origin);
  headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  headers.set('Access-Control-Max-Age', '86400');
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}