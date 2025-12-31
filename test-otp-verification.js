import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api/v1/auth`;

async function testOTPVerification() {
  console.log('🔐 Testing OTP Verification Flow...\n');
  
  // Step 1: Signup to get OTP
  console.log('Step 1: Signing up user to receive OTP...');
  const testUser = {
    userName: `testuser${Date.now()}`,
    email: process.env.TEST_EMAIL || process.env.PORTAL_EMAIL || 'nomanu222555@gmail.com',
    password: 'test123456'
  };
  
  try {
    // Signup request
    const signupResponse = await fetch(`${API_BASE}/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testUser)
    });
    
    const signupData = await signupResponse.json();
    
    if (!signupResponse.ok) {
      console.error('❌ Signup failed:', signupData);
      return;
    }
    
    console.log('✅ Signup successful!');
    console.log('User:', signupData.data?.user);
    console.log('Access Token:', signupData.data?.accessToken ? '✓ Received' : '✗ Missing');
    
    // Extract access token from cookies or response
    const cookies = signupResponse.headers.get('set-cookie');
    let accessToken = signupData.data?.accessToken;
    
    if (!accessToken && cookies) {
      // Try to extract from cookies
      const cookieMatch = cookies.match(/accessToken=([^;]+)/);
      if (cookieMatch) {
        accessToken = cookieMatch[1];
      }
    }
    
    if (!accessToken) {
      console.error('❌ No access token received. Cannot proceed with OTP verification.');
      return;
    }
    
    console.log('\n📧 OTP has been sent to:', testUser.email);
    console.log('Please check your email for the OTP code.\n');
    
    // Step 2: Get OTP from user or database
    console.log('Step 2: Verifying OTP...');
    console.log('Note: In real scenario, user enters OTP from email\n');
    
    // For testing, we can fetch OTP from database
    // But in production, user enters it manually
    const testOTP = process.argv[2]; // Get OTP from command line argument
    
    if (!testOTP) {
      console.log('⚠️  No OTP provided as argument.');
      console.log('Usage: node test-otp-verification.js <OTP_CODE>');
      console.log('Example: node test-otp-verification.js 123456\n');
      console.log('Or enter OTP manually when prompted...');
      
      // In a real scenario, you would prompt the user
      // For now, we'll show how to test with Postman/curl
      console.log('\n📝 To test OTP verification:');
      console.log(`POST ${API_BASE}/verify-email`);
      console.log('Headers:');
      console.log('  Authorization: Bearer <access_token>');
      console.log('  Content-Type: application/json');
      console.log('Body:');
      console.log('  { "otp": "123456" }');
      return;
    }
    
    // Step 3: Verify OTP
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
      console.log('✅ OTP Verification Successful!');
      console.log('Response:', verifyData);
      console.log('\n✓ Email verified:', verifyData.data?.isVerified);
    } else {
      console.error('❌ OTP Verification Failed!');
      console.error('Error:', verifyData);
      
      if (verifyData.message?.includes('Invalid OTP')) {
        console.log('\n💡 Tip: Make sure you entered the correct OTP from your email');
      } else if (verifyData.message?.includes('expired')) {
        console.log('\n💡 Tip: OTP has expired. Request a new one using /resend-otp');
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error(error);
  }
}

testOTPVerification();