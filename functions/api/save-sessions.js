// /functions/api/save-session.js
// Saves approved design for 3 days, triggers reminder emails

export async function onRequestPost(context) {
    try {
        const { request, env } = context;
        const { email, businessName, siteHTML, wantHosting } = await request.json();

        if (!email || !businessName || !siteHTML) {
            throw new Error('Missing required data');
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        const sessionId = `${businessName.replace(/[^a-zA-Z0-9]/g, '_')}-${randomCode}`;
        const fileName = `${businessName.replace(/[^a-zA-Z0-9]/g, '_')}-${timestamp}-${randomCode}`;

        const sessionData = {
            email,
            businessName,
            siteHTML,
            fileName,
            wantHosting,
            createdAt: Date.now(),
            expiresAt: Date.now() + (3 * 24 * 60 * 60 * 1000), // 3 days
            remindersSent: 0,
            lastReminderAt: 0
        };

        // Store session for 3 days
        await env.SITE_STORAGE.put(
            `session/${sessionId}`,
            JSON.stringify(sessionData),
            {
                expirationTtl: 3 * 24 * 60 * 60 // 3 days in seconds
            }
        );

        // Send initial confirmation email
        await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${env.RESEND_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: 'DSGN LABS <noreply@yourdsgn.pro>',
                to: [email],
                subject: `Your ${businessName} Website is Ready! 🎉`,
                html: `
                    <h2>Your website looks amazing!</h2>
                    <p>Great job working with Danny to create your custom ${businessName} website.</p>
                    
                    <p><strong>Your website is saved and ready to download!</strong></p>
                    
                    <p>When you're ready to get your files and go live, just click the button below:</p>
                    
                    <p style="text-align: center; margin: 30px 0;">
                    <a href="${env.SITE_URL}/checkout/${sessionId}" style="display: inline-block; padding: 16px 32px; background: #667eea; color: white; text-decoration: none; border-radius: 8px; font-size: 18px; font-weight: 600;">Download My Website ($50)</a>
                    </p>
                    
                    <p><strong>What you'll get:</strong></p>
                    <ul>
                        <li>Complete website files (HTML, CSS, JavaScript)</li>
                        <li>Immediate download access</li>
                        <li>${wantHosting ? 'Free lifetime hosting (setup within 3 business days)' : 'Self-hosting instructions and support'}</li>
                        <li>Full ownership of all code and design</li>
                    </ul>
                    
                    <p style="background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; border-radius: 4px;">
                    <strong>⏰ Note:</strong> Your website is saved for 3 days. After that, you'll need to rebuild it with Danny.
                    </p>
                    
                    <p>Questions? Just reply to this email!</p>
                    
                    <p style="color: #666; font-size: 12px; margin-top: 30px;">
                    Built with ❤️ by DSGN LABS<br>
                    <a href="https://web.yourdsgn.pro">web.yourdsgn.pro</a>
                    </p>
                `
            })
        });

        return new Response(JSON.stringify({
            success: true,
            sessionId,
            checkoutUrl: `/checkout/${sessionId}`
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