// /functions/api/webhook.js

import Stripe from 'stripe';
import JSZip from 'jszip';

export async function onRequestPost(context) {
    try {
        const { request, env } = context;
        const stripe = new Stripe(env.STRIPE_SECRET_KEY);
        
        const signature = request.headers.get('stripe-signature');
        const body = await request.text();

        // Verify webhook signature (ASYNC for Cloudflare Workers)
        let event;
        try {
            event = await stripe.webhooks.constructEventAsync(
                body,
                signature,
                env.STRIPE_WEBHOOK_SECRET
            );
        } catch (err) {
            console.error('Webhook signature verification failed:', err.message);
            return new Response(`Webhook signature verification failed: ${err.message}`, { status: 400 });
        }

        console.log(`Webhook received: ${event.type}`);

        // Handle successful payment
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;
            
            console.log(`Processing payment for session: ${session.id}`);
            console.log(`Customer email: ${session.customer_email}`);
            console.log(`Metadata:`, session.metadata);

            // Try to retrieve stored site data from KV
            let siteData;
            const siteDataStr = await env.SITE_STORAGE.get(`pending/${session.id}.json`);
            
            if (siteDataStr) {
                console.log('Found site data in KV storage');
                siteData = JSON.parse(siteDataStr);
            } else {
                // Fallback: reconstruct from metadata if KV data is missing
                console.log('Site data not found in KV, reconstructing from metadata');
                
                if (!session.metadata.siteHTML || !session.metadata.email || !session.metadata.businessName) {
                    throw new Error('Missing required data in session metadata');
                }
                
                // Reconstruct site data from metadata
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
                const fileName = `${session.metadata.businessName.replace(/[^a-zA-Z0-9]/g, '_')}-${timestamp}-${randomCode}`;
                
                siteData = {
                    email: session.metadata.email,
                    businessName: session.metadata.businessName,
                    siteHTML: session.metadata.siteHTML, // This might be truncated!
                    fileName,
                    wantHosting: session.metadata.wantHosting === 'true',
                    timestamp: Date.now(),
                    expiresAt: Date.now() + (3 * 24 * 60 * 60 * 1000)
                };
                
                console.log('Reconstructed site data:', { 
                    fileName: siteData.fileName, 
                    email: siteData.email,
                    htmlLength: siteData.siteHTML.length 
                });
            }

            // Check if HTML seems complete
            if (!siteData.siteHTML.includes('</html>')) {
                console.error('WARNING: HTML appears truncated!');
                // Try to close the HTML properly
                siteData.siteHTML += '\n</body>\n</html>';
            }

            // Create ZIP file
            console.log('Creating ZIP file...');
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
            console.log(`ZIP file created: ${zipBlob.length} bytes`);

            // Store ZIP in R2 with 3-day expiration
            const zipFileName = `${siteData.fileName}.zip`;
            console.log(`Storing in R2: ${zipFileName}`);
            
            await env.WEBSITE_FILES.put(zipFileName, zipBlob, {
                httpMetadata: {
                    contentType: 'application/zip'
                },
                customMetadata: {
                    email: siteData.email,
                    businessName: siteData.businessName,
                    expiresAt: siteData.expiresAt.toString(),
                    stripeSessionId: session.id
                }
            });

            console.log('ZIP file stored successfully in R2');

            // Delete pending data from KV if it exists
            if (siteDataStr) {
                await env.SITE_STORAGE.delete(`pending/${session.id}.json`);
                console.log('Deleted pending session from KV');
            }

            // Prepare URLs
            const successPageUrl = `${env.SITE_URL}/success.html?session_id=${session.id}`;
            const downloadUrl = `${env.SITE_URL}/download/${zipFileName}`;
            const expirationDate = new Date(siteData.expiresAt).toLocaleDateString('en-US', { 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric' 
            });

            // Send customer email
            console.log(`Sending customer email to: ${siteData.email}`);
            const customerEmailHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .email-container {
            background-color: #ffffff;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        .logo-container {
            text-align: center;
            background-color: #ffffff;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
        }
        .logo {
            max-width: 200px;
            height: auto;
        }
        h1 {
            color: #6366f1;
            margin-bottom: 20px;
            font-size: 28px;
        }
        p {
            margin-bottom: 15px;
            color: #333;
        }
        .button {
            display: inline-block;
            padding: 16px 32px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #ffffff;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            margin: 20px 0;
            text-align: center;
        }
        .button:hover {
            opacity: 0.9;
        }
        .info-box {
            background-color: #f8f9fa;
            border-left: 4px solid #6366f1;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .warning-box {
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
            color: #666;
            font-size: 14px;
        }
        .footer a {
            color: #6366f1;
            text-decoration: none;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="logo-container">
            <img src="${env.SITE_URL}/DSGN.png" alt="DSGN LABS" class="logo">
        </div>
        
        <h1>Your Website Files from DSGN LABS</h1>
        
        <p>Thank you for choosing DSGN LABS! Your website files are now available.</p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="${successPageUrl}" class="button">📥 Go to Your Download Page</a>
        </div>
        
        <div class="warning-box">
            <strong>⏰ Important:</strong> For security, this download page will remain active for 3 days. After that the files will be deleted.
        </div>
        
        ${siteData.wantHosting ? `
        <div class="info-box">
            <strong>🌐 Free Lifetime Hosting Included!</strong><br>
            Your plan includes free lifetime hosting. We will send your live URL in a separate email within 3 business days.
        </div>
        ` : ''}
        
        <p style="margin-top: 30px;">If you have any questions or need assistance, simply reply to this email or contact us at <a href="mailto:support@yourdsgn.pro" style="color: #6366f1;">support@yourdsgn.pro</a></p>
        
        <div class="footer">
            <p>Built with ❤️ by DSGN LABS<br>
            <a href="https://web.yourdsgn.pro">web.yourdsgn.pro</a></p>
        </div>
    </div>
</body>
</html>
            `;

            const customerEmailResponse = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${env.RESEND_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    from: 'Danny at DSGN LABS <danny@yourdsgn.pro>',
                    to: [siteData.email],
                    subject: 'Your Website Files from DSGN LABS',
                    html: customerEmailHtml
                })
            });

            const customerEmailResult = await customerEmailResponse.json();
            
            if (!customerEmailResponse.ok) {
                console.error('Customer email send failed:', customerEmailResult);
                throw new Error(`Customer email failed: ${JSON.stringify(customerEmailResult)}`);
            }

            console.log(`Customer email sent successfully. Email ID: ${customerEmailResult.id}`);

            // Send admin notification email
            console.log('Sending admin notification email...');
            const adminEmailHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            padding: 20px;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
        }
        h2 {
            color: #6366f1;
            margin-bottom: 20px;
        }
        .info-row {
            margin: 10px 0;
            padding: 10px;
            background: white;
            border-radius: 4px;
        }
        .label {
            font-weight: 600;
            color: #666;
        }
        .value {
            color: #333;
            margin-left: 10px;
        }
        a {
            color: #6366f1;
            text-decoration: none;
        }
        a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="container">
        <h2>New DSGN Site Purchase</h2>
        
        <div class="info-row">
            <span class="label">Business Name:</span>
            <span class="value">${siteData.businessName}</span>
        </div>
        
        <div class="info-row">
            <span class="label">Email:</span>
            <span class="value">${siteData.email}</span>
        </div>
        
        <div class="info-row">
            <span class="label">Download page:</span>
            <span class="value"><a href="${successPageUrl}">${successPageUrl}</a></span>
        </div>
        
        <div class="info-row">
            <span class="label">Direct download:</span>
            <span class="value"><a href="${downloadUrl}">${zipFileName}</a></span>
        </div>
        
        <div class="info-row">
            <span class="label">Deletion date (3 days):</span>
            <span class="value">${expirationDate}</span>
        </div>
        
        <div class="info-row">
            <span class="label">Wants hosting:</span>
            <span class="value">${siteData.wantHosting ? 'Yes' : 'No'}</span>
        </div>
        
        <div class="info-row">
            <span class="label">Stripe Session ID:</span>
            <span class="value">${session.id}</span>
        </div>
    </div>
</body>
</html>
            `;

            const adminEmailResponse = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${env.RESEND_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    from: 'DSGN LABS Notifications <notifications@yourdsgn.pro>',
                    to: ['michael@yourdsgn.pro'],
                    subject: 'New DSGN site',
                    html: adminEmailHtml
                })
            });

            const adminEmailResult = await adminEmailResponse.json();
            
            if (!adminEmailResponse.ok) {
                console.error('Admin email send failed:', adminEmailResult);
                // Don't throw error - customer email already sent successfully
                console.log('Admin notification failed but continuing...');
            } else {
                console.log(`Admin email sent successfully. Email ID: ${adminEmailResult.id}`);
            }

            console.log(`Payment processed for ${siteData.businessName}, hosting: ${siteData.wantHosting}`);
        }

        return new Response(JSON.stringify({ received: true }), { 
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Webhook error:', error);
        console.error('Error stack:', error.stack);
        
        return new Response(JSON.stringify({ 
            error: error.message,
            stack: error.stack 
        }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
