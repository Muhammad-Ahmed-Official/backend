import dotenv from 'dotenv';
import { supabase } from './src/config/supabase.js';

dotenv.config();

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api/v1/auth`;

async function testOTPVerification() {
  console.log('🔐 Testing OTP Verification Flow...\n');
  
  const testEmail = process.env.TEST_EMAIL || process.env.PORTAL_EMAIL || 'nomanu222555@gmail.com';
  const testPassword = 'test123456';
  
  let accessToken = null;
  let userId = null;
  
  try {
    // Step 1: Try to signup, if user exists then signin
    console.log('Step 1: Checking user and getting access token...\n');
    
    // Try signup first
    const signupResponse = await fetch(`${API_BASE}/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userName: `testuser${Date.now()}`,
        email: testEmail,
        password: testPassword
      })
    });
    
    const signupData = await signupResponse.json();
    
    if (signupResponse.ok) {
      console.log('✅ New user signed up successfully!');
      accessToken = signupData.data?.accessToken;
      userId = signupData.data?.user?.id;
      console.log('User ID:', userId);
      console.log('Access Token:', accessToken ? '✓ Received' : '✗ Missing');
      console.log('\n📧 OTP has been sent to:', testEmail);
    } else if (signupData.message?.includes('already exists') || signupData.message?.includes('USER_EXISTS')) {
      console.log('⚠️  User already exists. Signing in instead...\n');
      
      // User exists, try to signin
      const signinResponse = await fetch(`${API_BASE}/signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword
        })
      });
      
      const signinData = await signinResponse.json();
      
      if (signinResponse.ok) {
        console.log('✅ Signin successful!');
        accessToken = signinData.data?.accessToken;
        userId = signinData.data?.user?.id;
        console.log('User ID:', userId);
        console.log('Access Token:', accessToken ? '✓ Received' : '✗ Missing');
        
        // Check if user needs OTP resend
        console.log('\n📧 Checking if OTP is needed...');
        console.log('User verified:', signinData.data?.user?.isVerified);
        
        if (!signinData.data?.user?.isVerified) {
          console.log('⚠️  User not verified. You can use /resend-otp to get new OTP');
        }
      } else {
        console.error('❌ Signin failed:', signinData);
        console.log('\n💡 Trying to fetch OTP from database for existing user...');
      }
    } else {
      console.error('❌ Signup failed:', signupData);
      return;
    }
    
    if (!accessToken) {
      console.log('\n⚠️  No access token. Trying to get OTP from database directly...\n');
    } else {
      console.log('\n✅ Access token obtained successfully!\n');
    }
    
    // Step 2: Get OTP from database or command line
    console.log('Step 2: Getting OTP...\n');
    
    let testOTP = process.argv[2]; // Get OTP from command line argument
    
    // If OTP not provided, try to fetch from database
    if (!testOTP) {
      console.log('⚠️  No OTP provided. Trying to fetch from database...\n');
      
      try {
        const { data, error } = await supabase
          .from('f_users')
          .select('otp, expires_in, email, id')
          .eq('email', testEmail)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        if (error || !data) {
          console.log('❌ Could not fetch OTP from database:', error?.message || 'User not found');
          console.log('\n📝 Please provide OTP manually:');
          console.log('Usage: node test-otp-verification.js <OTP_CODE>');
          console.log('Example: node test-otp-verification.js 123456\n');
          console.log('Or check your email inbox for the OTP code.');
          console.log('\n💡 You can also use /resend-otp endpoint to get a new OTP');
          return;
        }
        
        testOTP = data.otp;
        if (!userId) userId = data.id;
        
        console.log('✅ OTP fetched from database:', testOTP);
        console.log('Expires at:', data.expires_in ? new Date(data.expires_in).toLocaleString() : 'N/A');
        console.log('Is Expired:', data.expires_in && data.expires_in < Date.now() ? 'Yes ❌' : 'No ✓');
        
        if (data.expires_in && data.expires_in < Date.now()) {
          console.log('\n⚠️  OTP has expired! Please use /resend-otp to get a new one');
          return;
        }
        
        console.log('');
        
      } catch (dbError) {
        console.log('⚠️  Could not fetch from database. Please provide OTP manually.');
        console.log('Usage: node test-otp-verification.js <OTP_CODE>\n');
        return;
      }
    } else {
      console.log('✅ Using OTP from command line:', testOTP);
    }
    
    // If still no access token, we need to get it
    if (!accessToken) {
      console.log('\n⚠️  No access token available. Cannot verify OTP without authentication.');
      console.log('💡 Please signin first or use Swagger UI to get access token');
      return;
    }
    
    // Step 3: Verify OTP
    console.log('\nStep 3: Verifying OTP...\n');
    console.log('Access Token (first 20 chars):', accessToken.substring(0, 20) + '...');
    console.log('OTP to verify:', testOTP);
    
    const verifyResponse = await fetch(`${API_BASE}/verify-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({ otp: testOTP })
    });
    
    const verifyData = await verifyResponse.json();
    
    if (verifyResponse.ok) {
      console.log('\n✅ OTP Verification Successful!');
      console.log('Response:', JSON.stringify(verifyData, null, 2));
      console.log('\n✓ Email verified:', verifyData.data?.isVerified);
      console.log('✓ User email:', verifyData.data?.email);
    } else {
      console.error('\n❌ OTP Verification Failed!');
      console.error('Status:', verifyResponse.status);
      console.error('Error:', JSON.stringify(verifyData, null, 2));
      
      if (verifyData.message?.includes('Invalid OTP') || verifyData.message?.includes('INVALID_OTP')) {
        console.log('\n💡 Tip: Make sure you entered the correct OTP from your email');
        console.log('   Or check database if OTP was saved correctly');
        console.log('   Current OTP in DB:', testOTP);
      } else if (verifyData.message?.includes('expired') || verifyData.message?.includes('OTP_EXPIRED')) {
        console.log('\n💡 Tip: OTP has expired. Request a new one using /resend-otp');
      } else if (verifyResponse.status === 401) {
        console.log('\n💡 Tip: Authentication failed. Check if access token is valid');
        console.log('   Access Token:', accessToken.substring(0, 30) + '...');
        console.log('   Try signing in again to get a fresh token');
      }
    }
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    console.error('Full error:', error);
  }
}

testOTPVerification();
