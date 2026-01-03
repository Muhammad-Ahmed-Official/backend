import dotenv from 'dotenv';
import nodemailer from "nodemailer";
import { SEND_EMAIL_LINK, Verification_Email_Template } from "../constant/emailTemplate.js";

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

export { sendEmailOTP, sendEmailLink }