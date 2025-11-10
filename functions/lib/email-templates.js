// functions/lib/email-templates.js
// Reusable email templates

const emailStyles = `
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
  .logo { max-width: 200px; margin-bottom: 20px; }
  .button { display: inline-block; padding: 14px 28px; background: #6366f1; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 15px 0; }
  .warning-box { background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; border-radius: 4px; margin: 20px 0; }
  .info-box { background: #e7f3ff; padding: 15px; border-left: 4px solid #6366f1; border-radius: 4px; margin: 20px 0; }
  .footer { color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; }
`;

export function generateCustomerEmail({ businessName, successPageUrl, downloadUrl, wantHosting, siteUrl }) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><style>${emailStyles}</style></head>
<body>
  <div class="container">
    <img src="${siteUrl}/DSGN.png" alt="DSGN LABS" class="logo">
    <h1>Your Website Files from DSGN LABS</h1>
    <p>Thank you for choosing DSGN LABS! Your website files are now available.</p>
    <p style="text-align: center;">
      <a href="${successPageUrl}" class="button">📥 Go to Your Download Page</a>
    </p>
    <div class="warning-box">
      <strong>⏰ Important:</strong> For security, this download page will remain active for 3 days.
    </div>
    ${wantHosting ? `
    <div class="info-box">
      <strong>🌐 Free Lifetime Hosting Included!</strong><br>
      Your plan includes free lifetime hosting. We will send your live URL in a separate email within 3 business days.
    </div>
    ` : ''}
    <p>If you have any questions, reply to this email or contact us at <a href="mailto:support@yourdsgn.pro">support@yourdsgn.pro</a></p>
    <div class="footer">
      <p>Built with ❤️ by DSGN LABS<br><a href="https://web.yourdsgn.pro">web.yourdsgn.pro</a></p>
    </div>
  </div>
</body>
</html>`;
}

export function generateAdminEmail({ businessName, email, successPageUrl, downloadUrl, zipFileName, expirationDate, wantHosting, sessionId }) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><style>${emailStyles}</style></head>
<body>
  <div class="container">
    <h2>New DSGN Site Purchase</h2>
    <div style="background: #f8f9fa; padding: 15px; border-radius: 4px; margin: 10px 0;">
      <p><strong>Business Name:</strong> ${businessName}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Download page:</strong> <a href="${successPageUrl}">${successPageUrl}</a></p>
      <p><strong>Direct download:</strong> <a href="${downloadUrl}">${zipFileName}</a></p>
      <p><strong>Deletion date:</strong> ${expirationDate}</p>
      <p><strong>Wants hosting:</strong> ${wantHosting ? 'Yes' : 'No'}</p>
      <p><strong>Stripe Session ID:</strong> ${sessionId}</p>
    </div>
  </div>
</body>
</html>`;
}