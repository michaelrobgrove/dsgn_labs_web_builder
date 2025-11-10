// functions/lib/validation.js
// Input validation utilities

export function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required' };
  }
  
  if (email.length > 254) {
    return { valid: false, error: 'Email is too long' };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email format' };
  }
  
  return { valid: true };
}

export function validateBusinessName(name) {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Business name is required' };
  }
  
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 100) {
    return { valid: false, error: 'Business name must be 2-100 characters' };
  }
  
  return { valid: true, value: trimmed };
}

export function validateMessage(message) {
  if (!message || typeof message !== 'string') {
    return { valid: false, error: 'Message is required' };
  }
  
  const trimmed = message.trim();
  if (trimmed.length < 1 || trimmed.length > 5000) {
    return { valid: false, error: 'Message must be 1-5000 characters' };
  }
  
  return { valid: true, value: trimmed };
}

export function validateSessionId(sessionId) {
  if (!sessionId || typeof sessionId !== 'string') {
    return { valid: false, error: 'Session ID is required' };
  }
  
  // Alphanumeric, dash, underscore only
  if (!/^[a-zA-Z0-9_-]+$/.test(sessionId)) {
    return { valid: false, error: 'Invalid session ID format' };
  }
  
  if (sessionId.length > 100) {
    return { valid: false, error: 'Session ID is too long' };
  }
  
  return { valid: true };
}

export function validateHTML(html) {
  if (!html || typeof html !== 'string') {
    return { valid: false, error: 'HTML is required' };
  }
  
  if (html.length < 100) {
    return { valid: false, error: 'HTML is too short' };
  }
  
  if (html.length > 500000) { // 500KB
    return { valid: false, error: 'HTML is too large (max 500KB)' };
  }
  
  return { valid: true };
}

export function sanitizeFileName(name) {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_');
}

// Standardized response helpers
export function errorResponse(message, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

export function successResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}