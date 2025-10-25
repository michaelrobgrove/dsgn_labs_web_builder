// /functions/api/get-download.js
// Get download URL for a completed payment

import Stripe from 'stripe';

export async function onRequestGet(context) {
    try {
        const { request, env } = context;
        const url = new URL(request.url);
        const sessionId = url.searchParams.get('session_id');

        if (!sessionId) {
            return new Response(JSON.stringify({
                error: 'Session ID is required'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const stripe = new Stripe(env.STRIPE_SECRET_KEY);
        
        // Retrieve the Stripe session
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        
        if (session.payment_status !== 'paid') {
            return new Response(JSON.stringify({
                error: 'Payment not completed'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Find the file in R2 using metadata
        const listed = await env.WEBSITE_FILES.list();
        const fileObj = listed.objects.find(obj => {
            // Files are stored with metadata including stripeSessionId
            return obj.key.includes(session.metadata.businessName.replace(/[^a-zA-Z0-9]/g, '_'));
        });

        if (!fileObj) {
            return new Response(JSON.stringify({
                error: 'File not found. Please contact support.'
            }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Get full file details to check metadata
        const file = await env.WEBSITE_FILES.get(fileObj.key);
        
        if (!file) {
            return new Response(JSON.stringify({
                error: 'File not found'
            }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Check if file has expired
        if (file.customMetadata && file.customMetadata.expiresAt) {
            const expiresAt = parseInt(file.customMetadata.expiresAt);
            if (Date.now() > expiresAt) {
                return new Response(JSON.stringify({
                    error: 'Download link has expired. Please contact support for assistance.'
                }), {
                    status: 410,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        }

        const downloadUrl = `${env.SITE_URL}/download/${fileObj.key}`;

        return new Response(JSON.stringify({
            success: true,
            downloadUrl,
            fileName: fileObj.key,
            businessName: session.metadata.businessName
        }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Get download error:', error);
        return new Response(JSON.stringify({
            error: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
