// /functions/api/create-checkout.js

import Stripe from 'stripe';

export async function onRequestPost(context) {
    try {
        const { request, env } = context;
        const { email, businessName, siteHTML, wantHosting } = await request.json();

        if (!email || !businessName || !siteHTML) {
            throw new Error('Missing required data');
        }

        const stripe = new Stripe(env.STRIPE_SECRET_KEY);

        // Create checkout session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            customer_email: email,
            line_items: [{
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: 'Website Download + Lifetime Hosting',
                        description: `For ${businessName} - ${wantHosting ? 'Includes free lifetime hosting' : 'Self-hosting option'}`,
                    },
                    unit_amount: 5000, // $50.00
                },
                quantity: 1,
            }],
            mode: 'payment',
            success_url: `${new URL(request.url).origin}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${new URL(request.url).origin}`,
            metadata: {
                businessName,
                email,
                wantHosting: wantHosting.toString(),
                siteHTML: siteHTML.substring(0, 500) // Stripe metadata limit
            }
        });

        // Store the full site HTML with session ID for retrieval after payment
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        const fileName = `${businessName.replace(/[^a-zA-Z0-9]/g, '_')}-${timestamp}-${randomCode}`;

        // Store session data temporarily (will be converted to ZIP after payment)
        await env.SITE_STORAGE.put(
            `pending/${session.id}.json`,
            JSON.stringify({
                email,
                businessName,
                siteHTML,
                fileName,
                wantHosting,
                timestamp: Date.now(),
                expiresAt: Date.now() + (3 * 24 * 60 * 60 * 1000) // 3 days from now
            }),
            {
                expirationTtl: 3600 // 1 hour expiration for pending payments
            }
        );

        return new Response(JSON.stringify({
            sessionId: session.id,
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