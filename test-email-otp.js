import { sendEmailOTP } from './src/utils/sendEmail.js';
import dotenv from 'dotenv';

dotenv.config();

async function testEmailOTP() {
  console.log('📧 Testing Email OTP Functionality...\n');
  
  // Check environment variables
  console.log('Environment Variables:');
  console.log('PORTAL_EMAIL:', process.env.PORTAL_EMAIL ? '✓ Set' : '✗ Missing');
  console.log('PORTAL_PASSWORD:', process.env.PORTAL_PASSWORD ? '✓ Set' : '✗ Missing');
  console.log('');
  
  if (!process.env.PORTAL_EMAIL || !process.env.PORTAL_PASSWORD) {
    console.error('❌ Missing email configuration!');
    console.error('Please add PORTAL_EMAIL and PORTAL_PASSWORD to your .env file');
    return;
  }
  
  // Test email (change this to your email)
  const testEmail = process.env.TEST_EMAIL || process.env.PORTAL_EMAIL || 'your-test-email@gmail.com';
  const testOTP = Math.floor(100000 + Math.random() * 900000).toString(); // Random 6-digit OTP
  
  console.log(`Sending test OTP to: ${testEmail}`);
  console.log(`Test OTP: ${testOTP}`);
  console.log(`From Email: ${process.env.PORTAL_EMAIL}\n`);
  
  try {
    const result = await sendEmailOTP(testEmail, testOTP);
    console.log('✅ Email sent successfully!');
    console.log('Result:', result);
    console.log('\n📬 Please check your inbox (and spam folder) for the OTP email.');
  } catch (error) {
    console.error('❌ Failed to send email!');
    console.error('Error:', error);
    console.log('\nCommon issues:');
    console.log('1. Check if PORTAL_EMAIL and PORTAL_PASSWORD are correct');
    console.log('2. For Gmail, use App Password (not regular password)');
    console.log('3. Enable "Less secure app access" or use App Password');
    console.log('4. Check if 2-Step Verification is enabled');
  }
}

testEmailOTP();