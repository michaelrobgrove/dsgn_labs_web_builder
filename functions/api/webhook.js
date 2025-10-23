// /functions/api/webhook.js

import Stripe from 'stripe';
import JSZip from 'jszip';

export async function onRequestPost(context) {
    try {
        const { request, env } = context;
        const stripe = new Stripe(env.STRIPE_SECRET_KEY);
        
        const signature = request.headers.get('stripe-signature');
        const body = await request.text();

        // Verify webhook signature
        let event;
        try {
            event = stripe.webhooks.constructEvent(
                body,
                signature,
                env.STRIPE_WEBHOOK_SECRET
            );
        } catch (err) {
            return new Response(`Webhook signature verification failed: ${err.message}`, { status: 400 });
        }

        // Handle successful payment
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;

            // Retrieve stored site data
            const siteDataObj = await env.SITE_STORAGE.get(`pending/${session.id}.json`);
            if (!siteDataObj) {
                throw new Error('Site data not found');
            }

            const siteData = JSON.parse(await siteDataObj.text());

            // Create ZIP file
            const zip = new JSZip();
            zip.file('index.html', siteData.siteHTML);
            zip.file('README.txt', `Website for ${siteData.businessName}

Your website is ready to deploy!

To deploy on Cloudflare Pages:
1. Go to https://pages.cloudflare.com
2. Create a new project
3. Upload this folder
4. Your site will be live in minutes!

Your hosting is included for life as part of your purchase.

Need help? Contact support@yourdsgn.pro

Built with DSGN LABS Web Builder
https://web.yourdsgn.pro`);

            const zipBlob = await zip.generateAsync({ type: 'uint8array' });

            // Store ZIP in R2
            const zipFileName = `${siteData.fileName}.zip`;
            await env.WEBSITE_FILES.put(zipFileName, zipBlob, {
                httpMetadata: {
                    contentType: 'application/zip'
                }
            });

            // Delete pending data
            await env.SITE_STORAGE.delete(`pending/${session.id}.json`);

            // Send email with download link
            const downloadUrl = `${env.SITE_URL}/download/${zipFileName}`;
            
            await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${env.RESEND_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    from: 'DSGN LABS <noreply@yourdsgn.pro>',
                    to: [session.customer_details.email],
                    subject: `Your ${siteData.businessName} Website is Ready!`,
                    html: `
                        <h2>Congratulations! Your website is ready.</h2>
                        <p>Thank you for using DSGN LABS Web Builder!</p>
                        
                        <p><strong>Download your website:</strong><br>
                        <a href="${downloadUrl}" style="display: inline-block; padding: 12px 24px; background: #2196F3; color: white; text-decoration: none; border-radius: 4px; margin: 10px 0;">Download Website Files</a></p>
                        
                        <p><strong>What's Next?</strong></p>
                        <ul>
                            <li>Your website files are ready to download</li>
                            <li>Free lifetime hosting will be set up within 3 business days</li>
                            <li>We'll send you your live website URL once hosting is ready</li>
                        </ul>
                        
                        <p>Questions? Reply to this email or contact support@yourdsgn.pro</p>
                        
                        <p style="color: #666; font-size: 12px; margin-top: 30px;">
                        Built with ❤️ by DSGN LABS<br>
                        <a href="https://web.yourdsgn.pro">web.yourdsgn.pro</a>
                        </p>
                    `
                })
            });

            console.log(`Payment processed for ${siteData.businessName}, email sent to ${session.customer_details.email}`);
        }

        return new Response('Webhook processed', { status: 200 });

    } catch (error) {
        console.error('Webhook error:', error);
        return new Response(`Webhook error: ${error.message}`, { status: 500 });
    }
}
