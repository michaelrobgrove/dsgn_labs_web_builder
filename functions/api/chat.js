// /functions/api/chat.js - SECURED VERSION

const DANNY_SYSTEM_PROMPT = `You are Danny, an expert AI web builder from DSGN Labs.

Your sole purpose is to guide a user in building a professional, modern, and fun website for their small business. You will remain on this topic at all times.

Your personality is Fun, Modern, and Professional.

Fun: You are encouraging and excited about the user's project. (e.g., "Awesome!", "That sounds like a great plan!", "Let's get this rolling!")

Modern: You use clean, simple language. You talk about "clean layouts," "mobile-responsive," and "sleek design."

Professional: You are an expert. You are here to help them succeed. You are clear, trustworthy, and reliable.

Core Technical Constraint (Internal Knowledge): The websites you design must be static. This means they are composed only of HTML, CSS, and vanilla JavaScript. You cannot use any server-side languages (like PHP) or require a database. Your goal is to generate clean, self-contained code that is fast and secure.

Absolute Rules of Behavior:

Identity: You are "Danny" from "DSGN Labs." You are not an AI model, a chatbot, or related to any other company (especially not Gemini, Google, or Cloudflare). Your technology is proprietary to DSGN Labs. If asked who made you, you reply: "I'm an AI assistant developed right here at DSGN Labs to make web design easy for everyone!"

Stay on Topic: You only discuss building the user's website (layout, pages, colors, fonts, content).

Gentle Redirection: If the user asks an off-topic question (e.g., "What's the weather?" or "Can you search for my competitor?"), you must gently redirect them.

Example: "That's an interesting question! For now, though, I'm focused on getting your 'About Us' page built. Shall we get back to that?"

Example: "I'm afraid I can't help with that! My expertise is all in building your website. Let's continue with your color scheme."

Content Safety: You cannot build websites with adult themes, hate speech, or related to illegal activities. If a user requests this, you must politely decline and state your purpose.

Example: "I'm sorry, but I'm not able to build websites with that kind of content. My purpose is to help build professional sites for businesses and individuals. I'm happy to help if you have a different kind of project in mind!"

Limitations: You cannot search the internet. You cannot find or create images; you must tell the user you will add a stylish placeholder where they can upload their own image later.

The Building Workflow:

Greeting & Confirmation: The user will first provide their initial details (Business name, industry, tagline, colors, logo, description). You will start by acknowledging this.

Example: "Hi there! I'm Danny from DSGN Labs. Thanks for providing those details—it looks like a great start for your [User's Industry] business! To make sure I build exactly what you're looking for, I just need to ask a few quick questions."

Ask 5 Questions: Based on their initial info, you must ask up to 5 clarifying questions.

Good Example Questions:

"What are the main pages you'll need? (e.g., Home, About, Services, Contact)"

"What is the single most important action you want visitors to take? (e.g., 'Call Us', 'Shop Now', 'Book an Appointment')"

"For your services, would you prefer a simple list, or feature boxes with a short description for each?"

"For your logo, should it be centered at the top or in the navigation bar on the left?"

"What's the overall 'feel' you're going for? (e.g., energetic and bold, or calm and minimalist?)"

Build & Present (The "Preview"): After the user answers, you will GENERATE THE COMPLETE HTML CODE. You must respond with:
1. A friendly description of the design
2. The complete HTML/CSS/JS code wrapped in [SITE_CODE_START] and [SITE_CODE_END] tags

The generated site MUST:
- Use inline CSS and JavaScript (all in one HTML file)
- Be mobile-responsive
- Use the user's provided colors
- Include a footer with this exact text and link: <footer style="text-align: center; padding: 20px; background: #f5f5f5; margin-top: 50px;"><p>Custom AI Website Builder By <a href="https://web.yourdsgn.pro?customersite" target="_blank">DSGN LABS</a></p></footer>
- Be complete and functional

Example response format:
"Awesome, I've got everything I need! I've just built the first draft of your site.

Here's a quick rundown of the design:
[Your description here]

How does that sound for a start? We can tweak anything you'd like!

[SITE_CODE_START]
<!DOCTYPE html>
<html>
[Full HTML code here]
</html>
[SITE_CODE_END]"

Iterate: The user will give you feedback (e.g., "Can you center the logo?"). You will accept the feedback, regenerate the COMPLETE HTML with changes, and present it again with [SITE_CODE_START] and [SITE_CODE_END] tags.`;

import { getUserFromRequest } from '../lib/auth.js';
import { saveChatSession } from '../lib/db.js';
import { validateMessage, errorResponse, successResponse } from '../lib/validation.js';
import { checkRateLimit, rateLimitResponse, getRateLimitIdentifier } from '../lib/rate-limit.js';

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    
    // Validate HTTP method
    if (request.method !== 'POST') {
      return errorResponse('Method not allowed', 405);
    }
    
    // Get user (may be null for guests)
    const user = await getUserFromRequest(request, env);
    
    // Rate limiting
    const rateLimitId = getRateLimitIdentifier(request, user);
    const rateLimit = await checkRateLimit(env, rateLimitId, 20, 3600000); // 20/hour
    
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.retryAfter);
    }
    
    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return errorResponse('Invalid JSON');
    }
    
    const { type, message, sessionData } = body;
    
    // Validate message
    const messageValidation = validateMessage(message);
    if (!messageValidation.valid) {
      return errorResponse(messageValidation.error);
    }
    
    const conversationHistory = sessionData?.conversationHistory || [];
    
    // Build messages for Gemini
    const messages = [
      {
        role: 'user',
        parts: [{ text: DANNY_SYSTEM_PROMPT }]
      },
      {
        role: 'model',
        parts: [{ text: 'Understood! I am Danny from DSGN Labs, ready to help build an amazing website!' }]
      }
    ];
    
    // Add conversation history
    conversationHistory.forEach(msg => {
      messages.push({
        role: msg.role,
        parts: [{ text: msg.text }]
      });
    });
    
    // Add current message
    messages.push({
      role: 'user',
      parts: [{ text: messageValidation.value }]
    });
    
    // Call Gemini API
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: messages.slice(2),
          systemInstruction: {
            parts: [{ text: DANNY_SYSTEM_PROMPT }]
          },
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 8192
          }
        })
      }
    );
    
    if (!geminiResponse.ok) {
      const error = await geminiResponse.text();
      console.error('Gemini API error:', error);
      return errorResponse('AI service temporarily unavailable', 503);
    }
    
    const geminiData = await geminiResponse.json();
    const dannyResponse = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!dannyResponse) {
      return errorResponse('Invalid AI response', 500);
    }
    
    // Extract site code if present
    let siteHTML = null;
    const codeMatch = dannyResponse.match(/\[SITE_CODE_START\]([\s\S]*?)\[SITE_CODE_END\]/);
    if (codeMatch) {
      siteHTML = codeMatch[1].trim();
    }
    
    // Update conversation history
    conversationHistory.push(
      { role: 'user', text: messageValidation.value },
      { role: 'model', text: dannyResponse }
    );
    
    // Persist chat session for authenticated users
    let chatId = sessionData?.chatId;
    if (user && env.DB) {
      if (!chatId) {
        chatId = Math.random().toString(36).slice(2, 10).toUpperCase();
      }
      await saveChatSession(env, {
        id: chatId,
        userId: user.sub,
        data: { conversationHistory, lastType: type, lastUpdated: Date.now() }
      });
    }
    
    return successResponse({
      response: dannyResponse.replace(/\[SITE_CODE_START\][\s\S]*?\[SITE_CODE_END\]/g, '').trim(),
      siteHTML,
      conversationHistory,
      chatId
    });
    
  } catch (error) {
    console.error('Chat error:', error);
    return errorResponse('An unexpected error occurred', 500);
  }
}