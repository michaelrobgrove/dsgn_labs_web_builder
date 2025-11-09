// /functions/api/webhook.js

import Stripe from 'stripe';
import JSZip from 'jszip';
import { insertGeneratedSite } from '../lib/db.js';

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const stripe = new Stripe(env.STRIPE_SECRET_KEY);

    const signature = request.headers.get('stripe-signature');
    const body = await request.text();

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

    if (event.type !== 'checkout.session.completed') {
      return new Response('Ignored', { status: 200 });
    }

    const session = event.data.object;

    const pendingKey = `pending/${session.id}.json`;
    const siteDataStr = await env.SITE_STORAGE.get(pendingKey);

    let siteData;
    if (siteDataStr) {
      siteData = JSON.parse(siteDataStr);
    } else {
      if (!session.metadata || !session.metadata.siteHTML || !session.metadata.email || !session.metadata.businessName) {
        throw new Error('Missing required data to build site package');
      }
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const fileName = `${session.metadata.businessName.replace(/[^a-zA-Z0-9]/g, '_')}-${timestamp}-${randomCode}`;
      siteData = {
        email: session.metadata.email,
        businessName: session.metadata.businessName,
        siteHTML: session.metadata.siteHTML,
        fileName,
        wantHosting: session.metadata.wantHosting === 'true',
        timestamp: Date.now(),
        expiresAt: Date.now() + (3 * 24 * 60 * 60 * 1000)
      };
    }

    if (!siteData.siteHTML.includes('</html>')) {
      siteData.siteHTML += '\n</body>\n</html>';
    }

    const zip = new JSZip();
    zip.file('index.html', siteData.siteHTML);
    zip.file(
      'README.txt',
      `Website for ${siteData.businessName}

Your website is ready to deploy!

${siteData.wantHosting ? `HOSTING:
If you selected hosting, we'll set it up and email your live URL.

` : ''}TO SELF-HOST:
This static site can be deployed to many providers.

Cloudflare Pages (Recommended):
1. Go to https://pages.cloudflare.com
2. Create a new project
3. Upload this folder

Other options:
- Netlify: https://app.netlify.com/drop
- Vercel: via CLI or dashboard
- GitHub Pages: push to a repository
- Any web host: upload index.html

DOWNLOAD AVAILABILITY:
Your download is available for 3 days.
If it expires, contact support.

Support: support@yourdsgn.pro

Built with DSGN LABS Web Builder
https://web.yourdsgn.pro`
    );

    const zipBlob = await zip.generateAsync({ type: 'uint8array' });
    const zipFileName = `${siteData.fileName}.zip`;

    await env.WEBSITE_FILES.put(zipFileName, zipBlob, {
      httpMetadata: { contentType: 'application/zip' },
      customMetadata: {
        email: siteData.email,
        businessName: siteData.businessName,
        expiresAt: siteData.expiresAt.toString(),
        stripeSessionId: session.id
      }
    });

    if (siteDataStr) {
      await env.SITE_STORAGE.delete(pendingKey);
    }

    await env.SITE_STORAGE.put(
      `download/${session.id}`,
      zipFileName,
      { expirationTtl: Math.ceil((siteData.expiresAt - Date.now()) / 1000) }
    );

    const userId = siteData.userId || (session.metadata && session.metadata.userId) || null;
    if (userId && env.DB) {
      await insertGeneratedSite(env, {
        id: session.id,
        userId,
        businessName: siteData.businessName,
        fileName: zipFileName
      });
    }

    const siteUrl = env.SITE_URL || '';
    const downloadUrl = `${siteUrl}/download/${zipFileName}`;
    const successPageUrl = `${siteUrl}/success.html?session_id=${session.id}`;

    if (env.RESEND_API_KEY) {
      const emailHtml = `
        <h2>Your ${siteData.businessName} Website Files Are Ready</h2>
        <p>Thanks for your purchase. Your website package is ready to download.</p>
        <p><a href="${downloadUrl}" style="display:inline-block;padding:12px 20px;background:#6366f1;color:#fff;border-radius:8px;text-decoration:none;">Download Website Files</a></p>
        <p style="background:#fff3cd;padding:12px;border-left:4px solid #ffc107;border-radius:6px;">Note: Your download link will remain available for 3 days.</p>
        ${siteData.wantHosting ? '<p>We\'re setting up your hosting and will email your live URL shortly.</p>' : ''}
        <p>Alternatively, visit your success page: <a href="${successPageUrl}">${successPageUrl}</a></p>
        <p style="color:#666;font-size:12px;margin-top:24px;">Built with DSGN LABS Web Builder - web.yourdsgn.pro</p>
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
          subject: `Your ${siteData.businessName} Website Files Are Ready`,
          html: emailHtml
        })
      });
    }

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(`Error: ${error.message}`, { status: 500 });
  }
}
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
