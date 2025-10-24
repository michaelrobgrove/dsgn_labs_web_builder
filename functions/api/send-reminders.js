// /functions/api/send-reminders.js
// Runs daily to send reminder emails for unpaid sessions

export async function onRequest(context) {
    try {
        const { env } = context;
        const now = Date.now();
        const oneDayMs = 24 * 60 * 60 * 1000;
        let remindersSent = 0;

        // List all session keys
        const { keys } = await env.SITE_STORAGE.list({ prefix: 'session/' });

        for (const key of keys) {
            const sessionDataObj = await env.SITE_STORAGE.get(key.name);
            if (!sessionDataObj) continue;

            const sessionData = JSON.parse(await sessionDataObj.text());
            const sessionId = key.name.replace('session/', '');

            // Skip if expired
            if (now > sessionData.expiresAt) {
                await env.SITE_STORAGE.delete(key.name);
                continue;
            }

            // Calculate days remaining
            const daysRemaining = Math.ceil((sessionData.expiresAt - now) / oneDayMs);
            
            // Check if we should send a reminder
            // Send on Day 1, Day 2, and Day 3 (final day)
            const shouldSendReminder = 
                sessionData.remindersSent < 3 && 
                (now - sessionData.lastReminderAt) > (oneDayMs - (60 * 60 * 1000)); // At least 23 hours since last

            if (!shouldSendReminder) continue;

            // Determine email content based on day
            let subject, heading, urgency;
            
            if (daysRemaining === 3) {
                subject = `Don't Forget Your ${sessionData.businessName} Website!`;
                heading = 'Your Website is Waiting!';
                urgency = 'You have 3 days to complete your purchase.';
            } else if (daysRemaining === 2) {
                subject = `Only 2 Days Left for Your ${sessionData.businessName} Website`;
                heading = 'Time is Running Out!';
                urgency = 'Only 2 days remaining to download your website.';
            } else {
                subject = `Final Day: Your ${sessionData.businessName} Website Expires Today!`;
                heading = 'Last Chance!';
                urgency = 'This is your final day to download your website before it expires.';
            }

            // Send reminder email
            await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${env.RESEND_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    from: 'DSGN LABS <noreply@yourdsgn.pro>',
                    to: [sessionData.email],
                    subject: subject,
                    html: `
                        <h2>${heading}</h2>
                        <p>You worked hard with Danny to create your custom ${sessionData.businessName} website, and it looks amazing!</p>
                        
                        <p style="background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; border-radius: 4px; font-size: 18px; font-weight: 600;">
                        ⏰ ${urgency}
                        </p>
                        
                        <p>Your website is still saved and ready to download:</p>
                        
                        <p style="text-align: center; margin: 30px 0;">
                        <a href="${env.SITE_URL}/checkout/${sessionId}" style="display: inline-block; padding: 16px 32px; background: #667eea; color: white; text-decoration: none; border-radius: 8px; font-size: 18px; font-weight: 600;">Download My Website ($50)</a>
                        </p>
                        
                        <p><strong>What you'll get:</strong></p>
                        <ul>
                            <li>Complete website files (HTML, CSS, JavaScript)</li>
                            <li>Immediate download access</li>
                            <li>${sessionData.wantHosting ? 'Free lifetime hosting (setup within 3 business days)' : 'Self-hosting instructions and support'}</li>
                            <li>Full ownership of all code and design</li>
                        </ul>
                        
                        ${daysRemaining === 1 ? `
                        <p style="background: #f8d7da; padding: 15px; border-left: 4px solid #dc3545; border-radius: 4px; color: #721c24;">
                        <strong>⚠️ Final Warning:</strong> After today, your website will be permanently deleted and you'll need to rebuild it from scratch.
                        </p>
                        ` : ''}
                        
                        <p>Questions? Just reply to this email!</p>
                        
                        <p style="color: #666; font-size: 12px; margin-top: 30px;">
                        Built with ❤️ by DSGN LABS<br>
                        <a href="https://web.yourdsgn.pro">web.yourdsgn.pro</a>
                        </p>
                    `
                })
            });

            // Update reminder tracking
            sessionData.remindersSent++;
            sessionData.lastReminderAt = now;

            await env.SITE_STORAGE.put(
                key.name,
                JSON.stringify(sessionData),
                {
                    expirationTtl: Math.ceil((sessionData.expiresAt - now) / 1000)
                }
            );

            remindersSent++;
            console.log(`Reminder sent to ${sessionData.email} for ${sessionData.businessName} (Day ${4 - daysRemaining})`);
        }

        return new Response(JSON.stringify({
            success: true,
            remindersSent,
            message: `Sent ${remindersSent} reminder email(s)`
        }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Reminder error:', error);
        return new Response(JSON.stringify({
            error: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}