export const Verification_Email_Template = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify Your Email</title>
      <style>
          body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 0;
              background-color: #f4f4f4;
          }
          .container {
              max-width: 600px;
              margin: 30px auto;
              background: #ffffff;
              border-radius: 8px;
              box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
              overflow: hidden;
              border: 1px solid #ddd;
          }
          .header {
              background-color: #4CAF50;
              color: white;
              padding: 20px;
              text-align: center;
              font-size: 26px;
              font-weight: bold;
          }
          .content {
              padding: 25px;
              color: #333;
              line-height: 1.8;
          }
          .verification-code {
              display: block;
              margin: 20px 0;
              font-size: 22px;
              color: #4CAF50;
              background: #e8f5e9;
              border: 1px dashed #4CAF50;
              padding: 10px;
              text-align: center;
              border-radius: 5px;
              font-weight: bold;
              letter-spacing: 2px;
          }
          .footer {
              background-color: #f4f4f4;
              padding: 15px;
              text-align: center;
              color: #777;
              font-size: 12px;
              border-top: 1px solid #ddd;
          }
          p {
              margin: 0 0 15px;
          }
      </style>
  </head>
  <body>
      <div class="container">
          <div class="header">Verify Your Email</div>
          <div class="content">
              <p>Hello,</p>
              <p>Thank you for signing up! Please confirm your email address by entering the code below:</p>
              <span class="verification-code">{verificationCode}</span>
              <p>If you did not create an account, no further action is required. If you have any questions, feel free to contact our support team.</p>
          </div>
          <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Your Company. All rights reserved.</p>
          </div>
      </div>
  </body>
  </html>
`;

export const SEND_EMAIL_LINK = (link) => `
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Password</title>
      <style>
          body {
              font-family: Arial, sans-serif;
              background-color: #f9f9f9;
              color: #333;
          }
          .email-container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #ffffff;
              border: 1px solid #ddd;
              border-radius: 8px;
          }
          .email-header {
              text-align: center;
              margin-bottom: 20px;
          }
          .email-header h2 {
              color: #4CAF50;
              margin-bottom: 10px;
          }
          .email-body p {
              color: #444;
          }
          .email-button {
              text-align: center;
              margin: 20px 0;
          }
          .email-button a {
              display: inline-block;
              padding: 12px 20px;
              font-size: 16px;
              color: #fff;
              background-color: #4CAF50;
              text-decoration: none;
              border-radius: 5px;
          }
          .email-footer {
              text-align: center;
              font-size: 12px;
              color: #aaa;
          }
          .email-footer a {
              color: #4CAF50;
          }
      </style>
  </head>
  <body>
      <div class="email-container">
          <div class="email-header">
              <h2>Password Reset Request</h2>
              <p>We're here to help you reset your password securely.</p>
          </div>
          <div class="email-body">
              <p>Hello,</p>
              <p>
                  We received a request to reset your password. To proceed, please click the button below. This link will expire in <strong>30 minutes</strong>.
              </p>
          </div>
          <div class="email-button">
              <a href="${link}" target="_blank">
                  Reset Your Password
              </a>
          </div>
          <div class="email-body">
              <p>If you did not request this, you can safely ignore this email.</p>
              <p>Thank you,<br><strong>Meraki Team</strong></p>
          </div>
          <hr>
          <div class="email-footer">
              <p>
                  If you are having trouble clicking the button, copy and paste the link below into your browser:<br>
                  <a href="${link}" target="_blank">${link}</a>
              </p>
          </div>
      </div>
  </body>
  </html>
`;

export const Welcome_Email_Template = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Our Community</title>
      <style>
          body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 0;
              background-color: #f4f4f4;
              color: #333;
          }
          .container {
              max-width: 600px;
              margin: 30px auto;
              background: #ffffff;
              border-radius: 8px;
              box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
              overflow: hidden;
              border: 1px solid #ddd;
          }
          .header {
              background-color: #007BFF;
              color: white;
              padding: 20px;
              text-align: center;
              font-size: 26px;
              font-weight: bold;
          }
          .content {
              padding: 25px;
              line-height: 1.8;
          }
          .welcome-message {
              font-size: 18px;
              margin: 20px 0;
          }
          .button {
              display: inline-block;
              padding: 12px 25px;
              margin: 20px 0;
              background-color: #007BFF;
              color: white;
              text-decoration: none;
              border-radius: 5px;
              text-align: center;
              font-size: 16px;
              font-weight: bold;
              transition: background-color 0.3s;
          }
          .button:hover {
              background-color: #0056b3;
          }
          .footer {
              background-color: #f4f4f4;
              padding: 15px;
              text-align: center;
              color: #777;
              font-size: 12px;
              border-top: 1px solid #ddd;
          }
          p {
              margin: 0 0 15px;
          }
      </style>
  </head>
  <body>
      <div class="container">
          <div class="header">Welcome to Our Community!</div>
          <div class="content">
              <p class="welcome-message">Hello {name},</p>
              <p>We're thrilled to have you join us! Your registration was successful, and we're committed to providing you with the best experience possible.</p>
              <p>Here's how you can get started:</p>
              <ul>
                  <li>Explore our features and customize your experience.</li>
                  <li>Stay informed by checking out our blog for the latest updates and tips.</li>
                  <li>Reach out to our support team if you have any questions or need assistance.</li>
              </ul>
              <a href="#" class="button">Get Started</a>
              <p>If you need any help, don't hesitate to contact us. We're here to support you every step of the way.</p>
          </div>
          <div class="footer">
              <p>&copy; ${new Date().getFullYear()} La. All rights reserved.</p>
          </div>
      </div>
  </body>
  </html>
`;

// ─── Dispute Templates (your logic) ──────────────────────────────────────────

export const Dispute_Created_Template = ({ projectTitle, disputeId, reason, deadline }) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Dispute Opened</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 30px auto; background: #fff; border-radius: 8px; border: 1px solid #ddd; overflow: hidden; }
    .header { background: #EF4444; color: #fff; padding: 20px; text-align: center; font-size: 22px; font-weight: bold; }
    .content { padding: 25px; color: #333; line-height: 1.8; }
    .badge { display: inline-block; background: #FEF2F2; color: #B91C1C; padding: 6px 14px; border-radius: 6px; font-weight: bold; border: 1px solid #FCA5A5; }
    .deadline { background: #FFFBEB; border: 1px solid #FCD34D; border-radius: 6px; padding: 10px 16px; color: #92400E; margin-top: 14px; }
    .footer { background: #f4f4f4; padding: 14px; text-align: center; color: #888; font-size: 12px; border-top: 1px solid #ddd; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">Dispute Opened</div>
    <div class="content">
      <p>A dispute has been opened for project: <strong>${projectTitle}</strong>.</p>
      <p>Reference: <span class="badge">#DISP-${disputeId}</span></p>
      <p><strong>Reason:</strong> ${reason}</p>
      ${deadline ? `<div class="deadline">⏰ You have until <strong>${deadline}</strong> to respond to this dispute.</div>` : ''}
      <p>Please log in to the platform to review the dispute details and provide your response.</p>
    </div>
    <div class="footer"><p>&copy; ${new Date().getFullYear()} Meraki. All rights reserved.</p></div>
  </div>
</body>
</html>`;

export const Dispute_Status_Template = ({ projectTitle, disputeId, status, message }) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Dispute Update</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 30px auto; background: #fff; border-radius: 8px; border: 1px solid #ddd; overflow: hidden; }
    .header { background: #444751; color: #fff; padding: 20px; text-align: center; font-size: 22px; font-weight: bold; }
    .content { padding: 25px; color: #333; line-height: 1.8; }
    .status-badge { display: inline-block; background: #F3F4F6; color: #374151; padding: 6px 14px; border-radius: 6px; font-weight: bold; border: 1px solid #D1D5DB; }
    .footer { background: #f4f4f4; padding: 14px; text-align: center; color: #888; font-size: 12px; border-top: 1px solid #ddd; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">Dispute Status Update</div>
    <div class="content">
      <p>Your dispute for project <strong>${projectTitle}</strong> has been updated.</p>
      <p>Reference: <strong>#DISP-${disputeId}</strong></p>
      <p>New Status: <span class="status-badge">${status}</span></p>
      ${message ? `<p>${message}</p>` : ''}
      <p>Please log in to view the full details.</p>
    </div>
    <div class="footer"><p>&copy; ${new Date().getFullYear()} Meraki. All rights reserved.</p></div>
  </div>
</body>
</html>`;

export const Dispute_Resolved_Template = ({ projectTitle, disputeId, decision, adminNotes }) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Dispute Resolved</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 30px auto; background: #fff; border-radius: 8px; border: 1px solid #ddd; overflow: hidden; }
    .header { background: ${decision === 'resolved' ? '#10B981' : '#6B7280'}; color: #fff; padding: 20px; text-align: center; font-size: 22px; font-weight: bold; }
    .content { padding: 25px; color: #333; line-height: 1.8; }
    .notes { background: #F9FAFB; border-left: 4px solid #D1D5DB; padding: 12px 16px; border-radius: 4px; margin-top: 14px; }
    .footer { background: #f4f4f4; padding: 14px; text-align: center; color: #888; font-size: 12px; border-top: 1px solid #ddd; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">Dispute ${decision === 'resolved' ? 'Resolved' : 'Closed'}</div>
    <div class="content">
      <p>Your dispute for project <strong>${projectTitle}</strong> (Ref: #DISP-${disputeId}) has been <strong>${decision === 'resolved' ? 'resolved' : 'closed'}</strong> by our team.</p>
      ${adminNotes ? `<div class="notes"><strong>Admin Notes:</strong><br>${adminNotes}</div>` : ''}
      <p>Please log in to view the outcome and any next steps.</p>
    </div>
    <div class="footer"><p>&copy; ${new Date().getFullYear()} Meraki. All rights reserved.</p></div>
  </div>
</body>
</html>`;

export const Dispute_Question_Template = ({ disputeId, question }) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Admin Question</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 30px auto; background: #fff; border-radius: 8px; border: 1px solid #ddd; overflow: hidden; }
    .header { background: #1D4ED8; color: #fff; padding: 20px; text-align: center; font-size: 22px; font-weight: bold; }
    .content { padding: 25px; color: #333; line-height: 1.8; }
    .question-box { background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 8px; padding: 16px; color: #1E3A5F; margin: 14px 0; }
    .footer { background: #f4f4f4; padding: 14px; text-align: center; color: #888; font-size: 12px; border-top: 1px solid #ddd; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">Admin Has a Question</div>
    <div class="content">
      <p>Our dispute resolution team has a question regarding dispute <strong>#DISP-${disputeId}</strong>:</p>
      <div class="question-box">${question}</div>
      <p>Please log in to the Resolution Center and reply at your earliest convenience.</p>
    </div>
    <div class="footer"><p>&copy; ${new Date().getFullYear()} Meraki. All rights reserved.</p></div>
  </div>
</body>
</html>`;

// ─── Milestone Templates (senior's logic) ────────────────────────────────────

export const MilestoneApprovalEmailTemplate = ({ project, client, freelancer, milestone }) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Milestone Approved — Payment Release Required</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
    .container { max-width: 640px; margin: 30px auto; background: #ffffff; border-radius: 10px; box-shadow: 0 4px 18px rgba(0,0,0,0.1); overflow: hidden; border: 1px solid #ddd; }
    .header { background-color: #282A32; color: #ffffff; padding: 24px 28px; text-align: center; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.3px; }
    .header p { margin: 8px 0 0; font-size: 14px; color: #A5B4FC; }
    .alert-banner { background-color: #4F46E5; color: #ffffff; padding: 14px 28px; text-align: center; font-size: 15px; font-weight: 700; letter-spacing: 0.3px; }
    .content { padding: 28px; color: #333; line-height: 1.7; }
    .section { margin-bottom: 24px; }
    .section-title { font-size: 13px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 10px; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px; }
    .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #F1F5F9; }
    .detail-label { color: #64748B; font-size: 13px; font-weight: 600; }
    .detail-value { color: #1E293B; font-size: 13px; font-weight: 700; text-align: right; }
    .milestone-box { background: #F0FDF4; border: 2px solid #86EFAC; border-radius: 10px; padding: 18px; margin-bottom: 24px; }
    .milestone-box .ms-title { font-size: 17px; font-weight: 800; color: #15803D; margin-bottom: 8px; }
    .milestone-box .ms-amount { font-size: 26px; font-weight: 900; color: #16A34A; margin-bottom: 4px; }
    .milestone-box .ms-status { display: inline-block; background: #DCFCE7; color: #16A34A; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px; }
    .action-box { background: #FFF7ED; border: 2px solid #FED7AA; border-radius: 10px; padding: 20px; margin-bottom: 24px; }
    .action-box .action-title { font-size: 15px; font-weight: 800; color: #92400E; margin-bottom: 8px; }
    .action-box .action-text { font-size: 14px; color: #78350F; line-height: 1.6; }
    .footer { background-color: #F8FAFC; padding: 16px 28px; text-align: center; color: #94A3B8; font-size: 12px; border-top: 1px solid #E2E8F0; }
    p { margin: 0 0 14px; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 6px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Meraki Freelance Platform</h1>
      <p>Admin Payment Release Notification</p>
    </div>
    <div class="alert-banner">ACTION REQUIRED: Please Release Payment to Freelancer</div>
    <div class="content">
      <p>Hello Admin,</p>
      <p>A milestone has been <strong>approved by the client</strong> on the Meraki platform. Please process the payment release to the freelancer at your earliest convenience.</p>
      <div class="milestone-box">
        <div class="ms-title">${milestone.title}</div>
        <div class="ms-amount">$${Number(milestone.amount || 0).toFixed(2)} USD</div>
        <span class="ms-status">Approved — Awaiting Payment</span>
        ${milestone.description ? `<p style="margin-top:10px;font-size:13px;color:#374151;">${milestone.description}</p>` : ''}
      </div>
      <div class="section">
        <div class="section-title">Project Details</div>
        <table>
          <tr><td class="detail-label">Project Title</td><td class="detail-value">${project.title}</td></tr>
          <tr><td class="detail-label">Project ID</td><td class="detail-value" style="font-family:monospace;font-size:11px;">${project.id}</td></tr>
          <tr><td class="detail-label">Project Budget</td><td class="detail-value">$${Number(project.budget || 0).toFixed(2)} USD</td></tr>
          <tr><td class="detail-label">Project Status</td><td class="detail-value">${project.status}</td></tr>
          ${project.description ? `<tr><td class="detail-label">Description</td><td class="detail-value" style="font-size:12px;max-width:240px;">${project.description.substring(0, 120)}${project.description.length > 120 ? '...' : ''}</td></tr>` : ''}
        </table>
      </div>
      <div class="section">
        <div class="section-title">Client Information</div>
        <table>
          <tr><td class="detail-label">Name</td><td class="detail-value">${client.userName || client.user_name || 'N/A'}</td></tr>
          <tr><td class="detail-label">Email</td><td class="detail-value">${client.email || 'N/A'}</td></tr>
          <tr><td class="detail-label">Client ID</td><td class="detail-value" style="font-family:monospace;font-size:11px;">${client.id}</td></tr>
        </table>
      </div>
      <div class="section">
        <div class="section-title">Freelancer Information (Payment Recipient)</div>
        <table>
          <tr><td class="detail-label">Name</td><td class="detail-value">${freelancer.userName || freelancer.user_name || 'N/A'}</td></tr>
          <tr><td class="detail-label">Email</td><td class="detail-value">${freelancer.email || 'N/A'}</td></tr>
          <tr><td class="detail-label">Freelancer ID</td><td class="detail-value" style="font-family:monospace;font-size:11px;">${freelancer.id}</td></tr>
        </table>
      </div>
      <div class="section">
        <div class="section-title">Milestone Details</div>
        <table>
          <tr><td class="detail-label">Milestone Name</td><td class="detail-value">${milestone.title}</td></tr>
          <tr><td class="detail-label">Amount to Release</td><td class="detail-value" style="color:#16A34A;font-size:16px;">$${Number(milestone.amount || 0).toFixed(2)} USD</td></tr>
          <tr><td class="detail-label">Status</td><td class="detail-value">Approved</td></tr>
          <tr><td class="detail-label">Milestone ID</td><td class="detail-value" style="font-family:monospace;font-size:11px;">${milestone.id}</td></tr>
          ${milestone.approvedAt ? `<tr><td class="detail-label">Approved At</td><td class="detail-value">${new Date(milestone.approvedAt).toLocaleString()}</td></tr>` : ''}
        </table>
      </div>
      <div class="action-box">
        <div class="action-title">Required Action</div>
        <div class="action-text">
          Please release <strong>$${Number(milestone.amount || 0).toFixed(2)} USD</strong> to the freelancer
          <strong>${freelancer.userName || freelancer.user_name || freelancer.email}</strong>
          (${freelancer.email}) for the approved work on project "<strong>${project.title}</strong>".
        </div>
      </div>
      <p style="color:#64748B;font-size:13px;">This is an automated notification from the Meraki Freelance Platform. Please do not reply to this email.</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Meraki Freelance Platform. All rights reserved.</p>
      <p>This email was sent because a milestone was approved on the platform.</p>
    </div>
  </div>
</body>
</html>
`;

/** Freelancer submitted work — notify admin to pay freelancer (client pays platform separately). */
export const MilestoneSubmittedAdminEmailTemplate = ({ project, client, freelancer, milestone }) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Milestone Submitted — Payment to Freelancer</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
    .container { max-width: 640px; margin: 30px auto; background: #ffffff; border-radius: 10px; box-shadow: 0 4px 18px rgba(0,0,0,0.1); overflow: hidden; border: 1px solid #ddd; }
    .header { background-color: #1E3A5F; color: #ffffff; padding: 24px 28px; text-align: center; }
    .alert-banner { background-color: #0D9488; color: #ffffff; padding: 14px 28px; text-align: center; font-size: 15px; font-weight: 700; }
    .content { padding: 28px; color: #333; line-height: 1.7; }
    .section-title { font-size: 13px; font-weight: 700; color: #64748B; text-transform: uppercase; margin-bottom: 10px; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px; }
    .milestone-box { background: #F0FDFA; border: 2px solid #5EEAD4; border-radius: 10px; padding: 18px; margin-bottom: 24px; }
    .action-box { background: #FFF7ED; border: 2px solid #FED7AA; border-radius: 10px; padding: 20px; margin-top: 20px; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 6px 0; font-size: 13px; }
    .detail-label { color: #64748B; font-weight: 600; }
    .detail-value { color: #1E293B; font-weight: 700; text-align: right; }
    .footer { background-color: #F8FAFC; padding: 16px 28px; text-align: center; color: #94A3B8; font-size: 12px; border-top: 1px solid #E2E8F0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin:0;font-size:22px;">Meraki Freelance Platform</h1>
      <p style="margin:8px 0 0;font-size:14px;opacity:0.9;">Milestone work submitted</p>
    </div>
    <div class="alert-banner">Please release payment to the freelancer</div>
    <div class="content">
      <p>Hello Admin,</p>
      <p>A freelancer has <strong>submitted milestone work</strong> for client review. The client has already paid the platform; please arrange payment to the freelancer as agreed.</p>
      <div class="milestone-box">
        <div style="font-size:17px;font-weight:800;color:#0F766E;margin-bottom:8px;">${milestone.title}</div>
        <div style="font-size:24px;font-weight:900;color:#0D9488;">$${Number(milestone.amount || 0).toFixed(2)} USD</div>
        <div style="font-size:12px;color:#64748B;margin-top:8px;">Status: Submitted — awaiting client accept/reject</div>
        ${milestone.description ? `<p style="margin-top:10px;font-size:13px;">${String(milestone.description).substring(0, 200)}</p>` : ''}
      </div>
      <div class="section-title">Project</div>
      <table>
        <tr><td class="detail-label">Title</td><td class="detail-value">${project.title}</td></tr>
        <tr><td class="detail-label">Project ID</td><td class="detail-value" style="font-family:monospace;font-size:11px;">${project.id}</td></tr>
        <tr><td class="detail-label">Budget</td><td class="detail-value">$${Number(project.budget || 0).toFixed(2)} USD</td></tr>
      </table>
      <div class="section-title" style="margin-top:20px;">Client</div>
      <table>
        <tr><td class="detail-label">Name</td><td class="detail-value">${client.userName || client.user_name || 'N/A'}</td></tr>
        <tr><td class="detail-label">Email</td><td class="detail-value">${client.email || 'N/A'}</td></tr>
      </table>
      <div class="section-title" style="margin-top:20px;">Freelancer (payee)</div>
      <table>
        <tr><td class="detail-label">Name</td><td class="detail-value">${freelancer.userName || freelancer.user_name || 'N/A'}</td></tr>
        <tr><td class="detail-label">Email</td><td class="detail-value">${freelancer.email || 'N/A'}</td></tr>
      </table>
      <div class="action-box">
        <strong style="color:#92400E;">Required action:</strong>
        <p style="margin:8px 0 0;color:#78350F;">Please release <strong>$${Number(milestone.amount || 0).toFixed(2)} USD</strong> to <strong>${freelancer.userName || freelancer.user_name || freelancer.email}</strong> for this milestone.</p>
      </div>
      <p style="color:#64748B;font-size:12px;">Automated message — do not reply.</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Meraki Freelance Platform</p>
    </div>
  </div>
</body>
</html>
`;

// ─── 2FA Template ─────────────────────────────────────────────────────────────

export const TwoFA_Email_Template = (otp) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Two-Factor Authentication</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
    .container { max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); overflow: hidden; border: 1px solid #ddd; }
    .header { background-color: #444751; color: white; padding: 20px; text-align: center; font-size: 22px; font-weight: bold; }
    .content { padding: 25px; color: #333; line-height: 1.8; }
    .otp-code { display: block; margin: 20px 0; font-size: 28px; color: #444751; background: #f4f4f8; border: 2px dashed #444751; padding: 14px; text-align: center; border-radius: 8px; font-weight: bold; letter-spacing: 6px; }
    .footer { background-color: #f4f4f4; padding: 15px; text-align: center; color: #777; font-size: 12px; border-top: 1px solid #ddd; }
    p { margin: 0 0 15px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">Two-Factor Authentication</div>
    <div class="content">
      <p>Hello,</p>
      <p>You requested to change your Two-Factor Authentication setting. Use the code below to confirm this action:</p>
      <span class="otp-code">${otp}</span>
      <p>This code expires in <strong>10 minutes</strong>. If you did not request this, please ignore this email.</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Meraki. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;
