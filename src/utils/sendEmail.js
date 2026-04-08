import dotenv from 'dotenv';
import nodemailer from "nodemailer";
import { SEND_EMAIL_LINK, Verification_Email_Template, TwoFA_Email_Template, MilestoneSubmittedAdminEmailTemplate } from "../constant/emailTemplate.js";

const ADMIN_EMAIL = 'alberuni167@gmail.com';

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

async function sendMilestoneSubmittedAdminEmail({ project, client, freelancer, milestone }) {
    const emailConfig = getEmailConfig();
    const transporter = nodemailer.createTransport(emailConfig);
    const mailOptions = {
        from: `"Meraki Platform" <${process.env.PORTAL_EMAIL}>`,
        to: ADMIN_EMAIL,
        subject: `[Action Required] Milestone Submitted — Pay Freelancer | ${project.title}`,
        html: MilestoneSubmittedAdminEmailTemplate({ project, client, freelancer, milestone }),
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`[sendMilestoneSubmittedAdminEmail] Sent to ${ADMIN_EMAIL} for milestone: ${milestone.title}`);
        return `Milestone submitted email sent to admin`;
    } catch (error) {
        console.error('[sendMilestoneSubmittedAdminEmail] Error:', error);
        throw `Error sending milestone submitted email: ${error}`;
    }
}

export { sendEmailOTP, sendEmailLink, sendEmail2FA, sendMilestoneSubmittedAdminEmail }