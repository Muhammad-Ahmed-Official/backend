import dotenv from 'dotenv';
import nodemailer from "nodemailer";
import {
  SEND_EMAIL_LINK,
  Verification_Email_Template,
  TwoFA_Email_Template,
  Dispute_Created_Template,
  Dispute_Status_Template,
  Dispute_Resolved_Template,
  Dispute_Question_Template,
} from "../constant/emailTemplate.js";

dotenv.config();

// Function to send OTP via email
const getEmailConfig = () => {
    if (!process.env.PORTAL_EMAIL || !process.env.PORTAL_PASSWORD) {
        throw new Error('PORTAL_EMAIL and PORTAL_PASSWORD must be set in environment variables');
    }
    
    return {
        service: "gmail",
        auth: {
            user: process.env.PORTAL_EMAIL,
            pass: process.env.PORTAL_PASSWORD,
        },
    };
};
// 825f32
async function sendEmailOTP(mail, otp) { 
    const emailConfig = getEmailConfig();
    const transporter = nodemailer.createTransport(emailConfig);
    const mailOptions = {
        from: process.env.PORTAL_EMAIL,
        to: mail, 
        subject: "OTP Verification",
        html: Verification_Email_Template.replace("{verificationCode}",otp), // html body 
    };

    try {
        await transporter.sendMail(mailOptions);
        return `OTP sent to ${mail} via email`;
    } catch (error) {
        throw `Error sending OTP to ${mail} via email: ${error}`;
    }
}


async function sendEmailLink(mail, link) { 
    const emailConfig = getEmailConfig();
    const transporter = nodemailer.createTransport(emailConfig);
    const mailOptions = {
        from: process.env.PORTAL_EMAIL,
        to: mail, 
        subject: "RESET PASSWORD",
        html: SEND_EMAIL_LINK(link), // html body 
    };

    try {
        await transporter.sendMail(mailOptions);
        return `OTP sent to ${mail} via email`;
    } catch (error) {
        throw `Error sending OTP to ${mail} via email: ${error}`;
    }
}

async function sendEmail2FA(mail, otp) {
    const emailConfig = getEmailConfig();
    const transporter = nodemailer.createTransport(emailConfig);
    const mailOptions = {
        from: process.env.PORTAL_EMAIL,
        to: mail,
        subject: "Two-Factor Authentication Code",
        html: TwoFA_Email_Template(otp),
    };
    try {
        await transporter.sendMail(mailOptions);
        return `2FA OTP sent to ${mail}`;
    } catch (error) {
        console.error('[sendEmail2FA] Error:', error);
        throw `Error sending 2FA OTP to ${mail}: ${error}`;
    }
}

// Silently swallow errors so dispute flows are never blocked by email failure
async function sendDisputeCreatedEmail(mail, { projectTitle, disputeId, reason, deadline }) {
  try {
    const emailConfig = getEmailConfig();
    const transporter = nodemailer.createTransport(emailConfig);
    await transporter.sendMail({
      from: process.env.PORTAL_EMAIL,
      to: mail,
      subject: `Dispute Opened — ${projectTitle}`,
      html: Dispute_Created_Template({ projectTitle, disputeId, reason, deadline }),
    });
  } catch (err) {
    console.error('[sendDisputeCreatedEmail] Error:', err);
  }
}

async function sendDisputeStatusEmail(mail, { projectTitle, disputeId, status, message }) {
  try {
    const emailConfig = getEmailConfig();
    const transporter = nodemailer.createTransport(emailConfig);
    await transporter.sendMail({
      from: process.env.PORTAL_EMAIL,
      to: mail,
      subject: `Dispute Update — ${status}`,
      html: Dispute_Status_Template({ projectTitle, disputeId, status, message }),
    });
  } catch (err) {
    console.error('[sendDisputeStatusEmail] Error:', err);
  }
}

async function sendDisputeResolvedEmail(mail, { projectTitle, disputeId, decision, adminNotes }) {
  try {
    const emailConfig = getEmailConfig();
    const transporter = nodemailer.createTransport(emailConfig);
    await transporter.sendMail({
      from: process.env.PORTAL_EMAIL,
      to: mail,
      subject: `Your Dispute Has Been ${decision === 'resolved' ? 'Resolved' : 'Closed'}`,
      html: Dispute_Resolved_Template({ projectTitle, disputeId, decision, adminNotes }),
    });
  } catch (err) {
    console.error('[sendDisputeResolvedEmail] Error:', err);
  }
}

async function sendDisputeQuestionEmail(mail, { disputeId, question }) {
  try {
    const emailConfig = getEmailConfig();
    const transporter = nodemailer.createTransport(emailConfig);
    await transporter.sendMail({
      from: process.env.PORTAL_EMAIL,
      to: mail,
      subject: `Action Required: Admin Question on Dispute #DISP-${disputeId}`,
      html: Dispute_Question_Template({ disputeId, question }),
    });
  } catch (err) {
    console.error('[sendDisputeQuestionEmail] Error:', err);
  }
}

export {
  sendEmailOTP,
  sendEmailLink,
  sendEmail2FA,
  sendDisputeCreatedEmail,
  sendDisputeStatusEmail,
  sendDisputeResolvedEmail,
  sendDisputeQuestionEmail,
}