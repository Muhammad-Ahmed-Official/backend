import { supabase } from './src/config/supabase.js';
import dotenv from 'dotenv';

dotenv.config();

async function testConnection() {
  console.log('🔍 Testing Supabase connection...\n');
  
  // Check environment variables
  console.log('Environment Variables:');
  console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✓ Set' : '✗ Missing');
  console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '✓ Set' : '✗ Missing');
  console.log('');
  
  try {
    // Test 1: Simple query
    console.log('Test 1: Querying users table...');
    const { data, error, count } = await supabase
      .from('users')
      .select('*', { count: 'exact' })
      .limit(1);
    
    if (error) {
      console.error('❌ Connection Failed!');
      console.error('Error:', error.message);
      console.error('Details:', error);
      return;
    }
    
    console.log('✅ Connection Successful!');
    console.log('Table: users');
    console.log('Total Records:', count || 0);
    console.log('Sample Data:', data);
    
    // Test 2: Check table structure
    console.log('\nTest 2: Checking table structure...');
    const { data: structureData, error: structureError } = await supabase
      .from('users')
      .select('id, user_name, email, is_verified')
      .limit(0);
    
    if (!structureError) {
      console.log('✅ Table structure is correct');
    } else {
      console.log('⚠️  Structure check:', structureError.message);
    }
    
  } catch (error) {
    console.error('❌ Unexpected Error:', error.message);
    console.error(error);
  }
}

testConnection();