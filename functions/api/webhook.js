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

${siteData.wantHosting ? `FREE LIFETIME HOSTING:
Your website will be live within 3 business days. We'll send you the URL via email once it's ready.

` : ''}TO SELF-HOST:
Your website can be deployed to any static hosting service:

Option 1 - Cloudflare Pages (Recommended):
1. Go to https://pages.cloudflare.com
2. Create a new project
3. Upload this folder
4. Your site will be live in minutes!

Option 2 - Other Hosting:
- Netlify: Drag and drop to https://app.netlify.com/drop
- Vercel: Use their CLI or web interface
- GitHub Pages: Push to a repository
- Any web host: Upload via FTP

DOWNLOAD LINK EXPIRES:
Your download link will be available for 3 days from payment date.
After that, please contact support if you need the files again.

Need help? Contact support@yourdsgn.pro

Built with DSGN LABS Web Builder
https://web.yourdsgn.pro`);

            const zipBlob = await zip.generateAsync({ type: 'uint8array' });

            // Store ZIP in R2 with 3-day expiration
            const zipFileName = `${siteData.fileName}.zip`;
            await env.WEBSITE_FILES.put(zipFileName, zipBlob, {
                httpMetadata: {
                    contentType: 'application/zip'
                },
                customMetadata: {
                    email: siteData.email,
                    businessName: siteData.businessName,
                    expiresAt: siteData.expiresAt.toString()
                }
            });

            // Delete pending data
            await env.SITE_STORAGE.delete(`pending/${session.id}.json`);

            // Send email with download link
            const downloadUrl = `${env.SITE_URL}/download/${zipFileName}`;
            
            const emailHtml = siteData.wantHosting ? `
                <h2>Congratulations! Your website is ready.</h2>
                <p>Thank you for choosing DSGN LABS Web Builder!</p>
                
                <p><strong>Download your website files:</strong><br>
                <a href="${downloadUrl}" style="display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin: 10px 0;">Download Website Files</a></p>
                
                <p style="background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; border-radius: 4px;">
                <strong>⏰ Important:</strong> Your download link will expire in 3 days. Please download your files soon!
                </p>
                
                <p><strong>🌐 Free Lifetime Hosting - What's Next?</strong></p>
                <ul>
                    <li>Your website files are ready to download now</li>
                    <li>We're setting up your free lifetime hosting</li>
                    <li><strong>Within 3 business days</strong>, we'll send you another email with your live website URL</li>
                    <li>No monthly fees, no renewal costs - hosting is free for life</li>
                </ul>
                
                <p><strong>Need your files after 3 days?</strong><br>
                No problem! Just reply to this email and we'll send you a new download link.</p>
                
                <p>Questions? Reply to this email or contact support@yourdsgn.pro</p>
                
                <p style="color: #666; font-size: 12px; margin-top: 30px;">
                Built with ❤️ by DSGN LABS<br>
                <a href="https://web.yourdsgn.pro">web.yourdsgn.pro</a>
                </p>
            ` : `
                <h2>Congratulations! Your website is ready.</h2>
                <p>Thank you for choosing DSGN LABS Web Builder!</p>
                
                <p><strong>Download your website files:</strong><br>
                <a href="${downloadUrl}" style="display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin: 10px 0;">Download Website Files</a></p>
                
                <p style="background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; border-radius: 4px;">
                <strong>⏰ Important:</strong> Your download link will expire in 3 days. Please download your files soon!
                </p>
                
                <p><strong>📦 What's Included:</strong></p>
                <ul>
                    <li>Complete website files (HTML, CSS, JavaScript)</li>
                    <li>README.txt with deployment instructions</li>
                    <li>Ready to upload to any hosting service</li>
                </ul>
                
                <p><strong>🚀 Deployment Options:</strong></p>
                <ul>
                    <li><strong>Cloudflare Pages:</strong> Free, fast, and easy (recommended)</li>
                    <li><strong>Netlify:</strong> Drag-and-drop deployment</li>
                    <li><strong>Vercel:</strong> Great for modern sites</li>
                    <li><strong>GitHub Pages:</strong> Free hosting from GitHub</li>
                    <li><strong>Your own hosting:</strong> Upload via FTP to any web host</li>
                </ul>
                
                <p>Detailed instructions are included in the README.txt file inside your download.</p>
                
                <p><strong>Need your files after 3 days?</strong><br>
                No problem! Just reply to this email and we'll send you a new download link.</p>
                
                <p>Questions? Reply to this email or contact support@yourdsgn.pro</p>
                
                <p style="color: #666; font-size: 12px; margin-top: 30px;">
                Built with ❤️ by DSGN LABS<br>
                <a href="https://web.yourdsgn.pro">web.yourdsgn.pro</a>
                </p>
            `;

            await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${env.RESEND_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    from: 'DSGN LABS <noreply@yourdsgn.pro>',
                    to: [siteData.email],
                    subject: `Your ${siteData.businessName} Website is Ready! 🎉`,
                    html: emailHtml
                })
            });

            console.log(`Payment processed for ${siteData.businessName}, email sent to ${siteData.email}, hosting: ${siteData.wantHosting}`);
        }

        return new Response('Webhook processed', { status: 200 });

    } catch (error) {
        console.error('Webhook error:', error);
        return new Response(`Webhook error: ${error.message}`, { status: 500 });
    }
}