/**
 * Test script for User Profiles API endpoints
 * Tests the new user_profiles table integration
 * 
 * Usage: node tests/test-user-profiles.js
 */

import dotenv from 'dotenv';
import { supabase } from './src/config/supabase.js';

dotenv.config();

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api/v1/auth`;

// Test user credentials (update these with your test user)
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'test123456';
const TEST_USERNAME = process.env.TEST_USERNAME || 'testuser';

let accessToken = null;
let userId = null;

// Helper function to make API calls
async function apiCall(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include',
    });

    const data = await response.json();
    return { response, data };
  } catch (error) {
    console.error('API Call Error:', error.message);
    throw error;
  }
}

// Test 1: Check if user_profiles table exists
async function testTableExists() {
  console.log('\n📋 Test 1: Checking if user_profiles table exists...');
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ user_profiles table does not exist or is not accessible');
      console.error('Error:', error.message);
      return false;
    }

    console.log('✅ user_profiles table exists and is accessible');
    return true;
  } catch (error) {
    console.error('❌ Error checking table:', error.message);
    return false;
  }
}

// Test 2: Signup a new user (creates profile automatically)
async function testSignup() {
  console.log('\n📋 Test 2: Testing user signup (should create profile)...');
  try {
    const uniqueUsername = `${TEST_USERNAME}_${Date.now()}`;
    const uniqueEmail = `test_${Date.now()}@example.com`;

    const { response, data } = await apiCall('/signup', {
      method: 'POST',
      body: JSON.stringify({
        userName: uniqueUsername,
        email: uniqueEmail,
        password: TEST_PASSWORD,
        role: 'Freelancer'
      }),
    });

    if (response.ok) {
      console.log('✅ Signup successful');
      accessToken = data.data?.accessToken;
      userId = data.data?.user?.id;
      console.log('   User ID:', userId);
      console.log('   Access Token:', accessToken ? '✓ Received' : '✗ Missing');

      // Check if profile was created
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError || !profileData) {
        console.error('❌ Profile was not created automatically');
        console.error('Error:', profileError?.message);
        return false;
      }

      console.log('✅ Profile created automatically');
      console.log('   Profile ID:', profileData.id);
      console.log('   Default rating:', profileData.rating);
      console.log('   Default reviews_count:', profileData.reviews_count);
      return true;
    } else {
      console.error('❌ Signup failed');
      console.error('Response:', JSON.stringify(data, null, 2));
      return false;
    }
  } catch (error) {
    console.error('❌ Signup test error:', error.message);
    return false;
  }
}

// Test 3: Get user info (should include profile data)
async function testGetUserInfo() {
  console.log('\n📋 Test 3: Testing getUserInfo (should include profile)...');
  try {
    if (!accessToken) {
      console.log('⚠️  Skipping - No access token available');
      return false;
    }

    const { response, data } = await apiCall('/isUser', {
      method: 'POST',
    });

    if (response.ok) {
      console.log('✅ getUserInfo successful');
      const user = data.data || data;
      console.log('   User ID:', user.id);
      console.log('   Username:', user.userName);
      console.log('   Email:', user.email);
      console.log('   Profile fields:');
      console.log('     - bio:', user.bio || 'null');
      console.log('     - skills:', user.skills || 'null');
      console.log('     - hourlyRate:', user.hourlyRate || 'null');
      console.log('     - phone:', user.phone || 'null');
      console.log('     - rating:', user.rating || 0);
      console.log('     - reviewsCount:', user.reviewsCount || 0);
      console.log('     - projectsCompleted:', user.projectsCompleted || 0);
      return true;
    } else {
      console.error('❌ getUserInfo failed');
      console.error('Response:', JSON.stringify(data, null, 2));
      return false;
    }
  } catch (error) {
    console.error('❌ getUserInfo test error:', error.message);
    return false;
  }
}

// Test 4: Update user profile
async function testUpdateProfile() {
  console.log('\n📋 Test 4: Testing profile update...');
  try {
    if (!accessToken) {
      console.log('⚠️  Skipping - No access token available');
      return false;
    }

    const updateData = {
      bio: 'Test bio updated via API',
      skills: ['React', 'Node.js', 'TypeScript'],
      hourlyRate: 50,
      phone: '+1234567890',
      about: 'This is a test about section',
    };

    const { response, data } = await apiCall('/update-user', {
      method: 'POST',
      body: JSON.stringify(updateData),
    });

    if (response.ok) {
      console.log('✅ Profile update successful');
      const user = data.data?.user || data.user || data;
      console.log('   Updated fields:');
      console.log('     - bio:', user.bio);
      console.log('     - skills:', user.skills);
      console.log('     - hourlyRate:', user.hourlyRate);
      console.log('     - phone:', user.phone);
      console.log('     - about:', user.about);

      // Verify in database
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError) {
        console.error('❌ Could not verify profile in database');
        console.error('Error:', profileError.message);
        return false;
      }

      console.log('✅ Profile verified in database:');
      console.log('     - bio:', profileData.bio);
      console.log('     - skills:', profileData.skills);
      console.log('     - hourly_rate:', profileData.hourly_rate);
      console.log('     - phone:', profileData.phone);
      return true;
    } else {
      console.error('❌ Profile update failed');
      console.error('Response:', JSON.stringify(data, null, 2));
      return false;
    }
  } catch (error) {
    console.error('❌ Update profile test error:', error.message);
    return false;
  }
}

// Test 5: Verify profile data structure
async function testProfileStructure() {
  console.log('\n📋 Test 5: Verifying profile data structure...');
  try {
    if (!userId) {
      console.log('⚠️  Skipping - No user ID available');
      return false;
    }

    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (profileError) {
      console.error('❌ Could not fetch profile');
      console.error('Error:', profileError.message);
      return false;
    }

    console.log('✅ Profile structure verified:');
    console.log('   Required fields:');
    console.log('     - id:', profileData.id ? '✓' : '✗');
    console.log('     - user_id:', profileData.user_id ? '✓' : '✗');
    console.log('     - rating:', typeof profileData.rating === 'number' ? '✓' : '✗');
    console.log('     - reviews_count:', typeof profileData.reviews_count === 'number' ? '✓' : '✗');
    console.log('     - projects_completed:', typeof profileData.projects_completed === 'number' ? '✓' : '✗');
    console.log('   Optional fields:');
    console.log('     - bio:', profileData.bio !== undefined ? '✓' : '✗');
    console.log('     - skills:', Array.isArray(profileData.skills) ? '✓' : '✗');
    console.log('     - hourly_rate:', profileData.hourly_rate !== undefined ? '✓' : '✗');
    console.log('     - phone:', profileData.phone !== undefined ? '✓' : '✗');
    console.log('     - about:', profileData.about !== undefined ? '✓' : '✗');
    return true;
  } catch (error) {
    console.error('❌ Profile structure test error:', error.message);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('🧪 Starting User Profiles API Tests...');
  console.log('=====================================\n');

  const results = {
    tableExists: false,
    signup: false,
    getUserInfo: false,
    updateProfile: false,
    profileStructure: false,
  };

  // Test 1: Check table
  results.tableExists = await testTableExists();
  if (!results.tableExists) {
    console.log('\n❌ Cannot proceed - user_profiles table does not exist');
    console.log('Please run the SQL script in backend/database/add_profile_columns.sql');
    return;
  }

  // Test 2: Signup
  results.signup = await testSignup();
  if (!results.signup) {
    console.log('\n⚠️  Signup failed - some tests may be skipped');
  }

  // Test 3: Get user info
  results.getUserInfo = await testGetUserInfo();

  // Test 4: Update profile
  results.updateProfile = await testUpdateProfile();

  // Test 5: Verify structure
  results.profileStructure = await testProfileStructure();

  // Summary
  console.log('\n\n📊 Test Summary');
  console.log('=====================================');
  console.log('Table Exists:', results.tableExists ? '✅' : '❌');
  console.log('Signup:', results.signup ? '✅' : '❌');
  console.log('Get User Info:', results.getUserInfo ? '✅' : '❌');
  console.log('Update Profile:', results.updateProfile ? '✅' : '❌');
  console.log('Profile Structure:', results.profileStructure ? '✅' : '❌');

  const allPassed = Object.values(results).every(r => r === true);
  if (allPassed) {
    console.log('\n🎉 All tests passed!');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the errors above.');
  }
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

