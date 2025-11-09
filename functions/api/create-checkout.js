// /functions/api/create-checkout.js

import Stripe from 'stripe';
import { getUserFromRequest } from '../lib/auth.js';

export async function onRequestPost(context) {
    try {
        const { request, env } = context;
        const user = await getUserFromRequest(request, env);
        const { sessionId, email, businessName, siteHTML, wantHosting } = await request.json();

        // If sessionId provided, retrieve existing session data
        let finalEmail, finalBusinessName, finalSiteHTML, finalWantHosting;

        if (sessionId) {
            const sessionDataObj = await env.SITE_STORAGE.get(`session/${sessionId}`);
            if (!sessionDataObj) {
                throw new Error('Session expired or not found');
            }
            const sessionData = JSON.parse(await sessionDataObj.text());
            finalEmail = sessionData.email;
            finalBusinessName = sessionData.businessName;
            finalSiteHTML = sessionData.siteHTML;
            finalWantHosting = sessionData.wantHosting;
        } else {
            // New checkout from main flow
            if (!email || !businessName || !siteHTML) {
                throw new Error('Missing required data');
            }
            finalEmail = email;
            finalBusinessName = businessName;
            finalSiteHTML = siteHTML;
            finalWantHosting = wantHosting;
        }

        const stripe = new Stripe(env.STRIPE_SECRET_KEY);

        // Create checkout session
        const stripeSession = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            customer_email: finalEmail,
            line_items: [{
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: 'Website Download + Lifetime Hosting',
                        description: `For ${finalBusinessName} - ${finalWantHosting ? 'Includes free lifetime hosting' : 'Self-hosting option'}`,
                    },
                    // Amounts are in cents; set to $50.00
                    unit_amount: 5000,
                },
                quantity: 1,
            }],
            mode: 'payment',
            success_url: `${new URL(request.url).origin}/success.html?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: sessionId ? `${new URL(request.url).origin}/checkout/${sessionId}` : `${new URL(request.url).origin}`,
            metadata: {
                businessName: finalBusinessName,
                email: finalEmail,
                wantHosting: finalWantHosting.toString(),
                userId: user?.sub || '',
                originalSessionId: sessionId || '',
                siteHTML: finalSiteHTML.substring(0, 500) // Stripe metadata limit
            }
        });

        // Store the full site HTML with stripe session ID for retrieval after payment
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        const fileName = `${finalBusinessName.replace(/[^a-zA-Z0-9]/g, '_')}-${timestamp}-${randomCode}`;

        // Store session data temporarily (will be converted to ZIP after payment)
        await env.SITE_STORAGE.put(
            `pending/${stripeSession.id}.json`,
            JSON.stringify({
                email: finalEmail,
                businessName: finalBusinessName,
                siteHTML: finalSiteHTML,
                fileName,
                wantHosting: finalWantHosting,
                userId: user?.sub || null,
                timestamp: Date.now(),
                expiresAt: Date.now() + (3 * 24 * 60 * 60 * 1000) // 3 days from now
            }),
            {
                expirationTtl: 3600 // 1 hour expiration for pending payments
            }
        );

        // If this was from a saved session, delete the reminder session
        if (sessionId) {
            await env.SITE_STORAGE.delete(`session/${sessionId}`);
        }

        return new Response(JSON.stringify({
            sessionId: stripeSession.id,
            publishableKey: env.STRIPE_PUBLISHABLE_KEY
        }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        return new Response(JSON.stringify({
            error: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
