// /functions/api/manual-recovery.js
// Use this to manually process a payment that failed

import Stripe from 'stripe';
import JSZip from 'jszip';

export async function onRequestPost(context) {
    try {
        const { request, env } = context;
        const { stripeSessionId } = await request.json();

        if (!stripeSessionId) {
            throw new Error('stripeSessionId is required');
        }

        const stripe = new Stripe(env.STRIPE_SECRET_KEY);
        
        // Retrieve the session from Stripe
        const session = await stripe.checkout.sessions.retrieve(stripeSessionId);
        
        console.log('Retrieved session:', session.id);
        console.log('Payment status:', session.payment_status);
        console.log('Metadata:', session.metadata);

        if (session.payment_status !== 'paid') {
            throw new Error('Payment not completed');
        }

        // Check if file already exists in R2
        const listed = await env.WEBSITE_FILES.list();
        const existing = listed.objects.find(obj => 
            obj.key.includes(session.metadata.businessName.replace(/[^a-zA-Z0-9]/g, '_'))
        );

        if (existing) {
            return new Response(JSON.stringify({
                success: true,
                message: 'File already exists',
                downloadUrl: `${env.SITE_URL}/download/${existing.key}`
            }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Reconstruct site data
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        const fileName = `${session.metadata.businessName.replace(/[^a-zA-Z0-9]/g, '_')}-${timestamp}-${randomCode}`;
        
        const siteData = {
            email: session.metadata.email,
            businessName: session.metadata.businessName,
            siteHTML: session.metadata.siteHTML,
            fileName,
            wantHosting: session.metadata.wantHosting === 'true',
            expiresAt: Date.now() + (3 * 24 * 60 * 60 * 1000)
        };

        // Ensure HTML is complete
        if (!siteData.siteHTML.includes('</html>')) {
            siteData.siteHTML += '\n</body>\n</html>';
        }

        // Create ZIP
        const zip = new JSZip();
        zip.file('index.html', siteData.siteHTML);
        zip.file('README.txt', `Website for ${siteData.businessName}

Your website is ready to deploy!

Need help? Contact support@yourdsgn.pro

Built with DSGN LABS Web Builder
https://web.yourdsgn.pro`);

        const zipBlob = await zip.generateAsync({ type: 'uint8array' });
        const zipFileName = `${siteData.fileName}.zip`;
        
        // Store in R2
        await env.WEBSITE_FILES.put(zipFileName, zipBlob, {
            httpMetadata: {
                contentType: 'application/zip'
            },
            customMetadata: {
                email: siteData.email,
                businessName: siteData.businessName,
                expiresAt: siteData.expiresAt.toString(),
                stripeSessionId: session.id,
                manualRecovery: 'true'
            }
        });

        const downloadUrl = `${env.SITE_URL}/download/${zipFileName}`;

        // Send email
        const emailHtml = `
            <h2>Your ${siteData.businessName} Website Files Are Ready!</h2>
            <p>Thank you for your patience. Your website files are now ready to download.</p>
            
            <p><strong>Download your website files:</strong><br>
            <a href="${downloadUrl}" style="display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin: 10px 0;">Download Website Files</a></p>
            
            <p style="background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; border-radius: 4px;">
            <strong>⏰ Important:</strong> Your download link will expire in 3 days.
            </p>
            
            ${siteData.wantHosting ? `
            <p><strong>🌐 Free Lifetime Hosting:</strong></p>
            <p>We're setting up your hosting now. You'll receive another email with your live URL within 3 business days.</p>
            ` : ''}
            
            <p>Questions? Reply to this email or contact support@yourdsgn.pro</p>
            
            <p style="color: #666; font-size: 12px; margin-top: 30px;">
            Built with DSGN LABS Web Builder<br>
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
                subject: `Your ${siteData.businessName} Website Files Are Ready! 🎉`,
                html: emailHtml
            })
        });

        return new Response(JSON.stringify({
            success: true,
            message: 'Recovery successful',
            downloadUrl,
            email: siteData.email
        }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Recovery error:', error);
        return new Response(JSON.stringify({
            error: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
