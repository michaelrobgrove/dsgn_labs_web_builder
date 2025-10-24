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
            const siteDataObj = await env.SITE_STORAGE.get(`pending/${session.id}.json`);
            
            if (siteDataObj) {
                console.log('Found site data in KV storage');
                siteData = JSON.parse(await siteDataObj.text());
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
            if (siteDataObj) {
                await env.SITE_STORAGE.delete(`pending/${session.id}.json`);
                console.log('Deleted pending session from KV');
            }

            // Send email with download link
            const downloadUrl = `${env.SITE_URL}/download/${zipFileName}`;
            console.log(`Download URL: ${downloadUrl}`);
            
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

            console.log(`Sending email to: ${siteData.email}`);
            const emailResponse = await fetch('https://api.resend.com/emails', {
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

            const emailResult = await emailResponse.json();
            
            if (!emailResponse.ok) {
                console.error('Email send failed:', emailResult);
                throw new Error(`Email failed: ${JSON.stringify(emailResult)}`);
            }

            console.log(`Email sent successfully. Email ID: ${emailResult.id}`);
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
