/**
 * Test script for SMTP Email Verification
 * Run this to test email verification without starting the full server
 */

import { verifyEmailViaSMTP } from './src/utils/smtpEmailVerifier.js';

const testEmails = [
    'test@gmail.com',           // Likely doesn't exist
    'nomanu222555@gmail.com',   // Your email (should exist if real)
    'admin@example.com',        // Definitely doesn't exist
    'fake123@yahoo.com',        // Likely doesn't exist
];

async function testEmailVerification() {
    console.log('🧪 Testing SMTP Email Verification\n');
    console.log('='.repeat(60));
    
    for (const email of testEmails) {
        console.log(`\n📧 Testing: ${email}`);
        console.log('-'.repeat(60));
        
        try {
            const result = await verifyEmailViaSMTP(email);
            
            console.log('Result:', {
                exists: result.exists,
                deliverable: result.deliverable,
                definitive: result.definitive,
                message: result.message
            });
            
            if (result.definitive) {
                console.log(result.exists ? '✅ VERIFIED - Email EXISTS' : '❌ VERIFIED - Email DOES NOT EXIST');
            } else {
                console.log('⚠️ INCONCLUSIVE - Will use OTP verification');
            }
            
        } catch (error) {
            console.error('❌ Error:', error.message);
        }
        
        console.log('-'.repeat(60));
        
        // Wait between tests to avoid being flagged as spam
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Test complete!\n');
    console.log('Note: SMTP verification accuracy depends on mail server configuration.');
    console.log('Some servers block this type of verification.');
    console.log('That\'s why we have OTP verification as backup!');
}

testEmailVerification().catch(console.error);

