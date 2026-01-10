import dotenv from 'dotenv';
import { supabase } from './src/config/supabase.js';

dotenv.config();

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api/v1/auth`;

async function resendOTP() {
  console.log('📧 Resending OTP...\n');
  
  const testEmail = process.env.TEST_EMAIL || process.env.PORTAL_EMAIL || 'nomanu222555@gmail.com';
  
  try {
    // First, get user ID from database
    console.log('Step 1: Fetching user from database...\n');
    
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, user_name')
      .eq('email', testEmail)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (userError || !userData) {
      console.error('❌ User not found:', userError?.message || 'User not found');
      console.log('Email:', testEmail);
      return;
    }
    
    console.log('✅ User found:');
    console.log('  ID:', userData.id);
    console.log('  Email:', userData.email);
    console.log('  Username:', userData.user_name);
    console.log('');
    
    // Call resend-otp endpoint
    console.log('Step 2: Requesting new OTP...\n');
    
    const resendResponse = await fetch(`${API_BASE}/resend-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: testEmail,
        _id: userData.id
      })
    });
    
    const resendData = await resendResponse.json();
    
    if (resendResponse.ok) {
      console.log('✅ OTP Resent Successfully!');
      console.log('Response:', resendData);
      console.log('\n📬 Please check your email inbox for the new OTP code.');
      
      // Fetch new OTP from database
      console.log('\nStep 3: Fetching new OTP from database...\n');
      
      const { data: otpData, error: otpError } = await supabase
        .from('users')
        .select('otp, expires_in')
        .eq('id', userData.id)
        .single();
      
      if (!otpError && otpData) {
        console.log('✅ New OTP:', otpData.otp);
        console.log('Expires at:', otpData.expires_in ? new Date(otpData.expires_in).toLocaleString() : 'N/A');
        console.log('\n💡 You can now use this OTP to verify:');
        console.log(`   node test-otp-verification.js ${otpData.otp}`);
      }
    } else {
      console.error('❌ Failed to resend OTP:', resendData);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
  }
}

resendOTP();

