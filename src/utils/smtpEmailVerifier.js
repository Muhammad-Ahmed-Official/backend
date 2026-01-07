/**
 * Free SMTP Email Verification
 * No API keys needed - completely free
 * Verifies if email address actually exists by checking with mail server
 */

import net from 'net';
import dns from 'dns';
import { promisify } from 'util';

const resolveMx = promisify(dns.resolveMx);

/**
 * Verify if email exists using SMTP protocol
 * This is FREE and doesn't require any API keys
 * 
 * @param {string} email - Email address to verify
 * @returns {Promise<Object>} Verification result
 */
export async function verifyEmailViaSMTP(email) {
    try {
        console.log(`[SMTP Verifier] Checking email: ${email}`);
        
        // Extract domain from email
        const domain = email.split('@')[1];
        
        if (!domain) {
            return {
                exists: false,
                deliverable: false,
                message: 'Invalid email format'
            };
        }

        // Step 1: Get MX (Mail Exchange) records for the domain
        let mxRecords;
        try {
            mxRecords = await resolveMx(domain);
        } catch (error) {
            console.error(`[SMTP Verifier] No MX records found for ${domain}`);
            return {
                exists: false,
                deliverable: false,
                message: `Email domain '${domain}' does not have mail servers configured`
            };
        }

        if (!mxRecords || mxRecords.length === 0) {
            return {
                exists: false,
                deliverable: false,
                message: `Email domain '${domain}' cannot receive emails`
            };
        }

        // Sort MX records by priority (lower number = higher priority)
        mxRecords.sort((a, b) => a.priority - b.priority);
        
        // Step 2: Try to verify email with the mail server
        // We'll try the first 2 MX servers in case the first one fails
        for (let i = 0; i < Math.min(2, mxRecords.length); i++) {
            const mailServer = mxRecords[i].exchange;
            console.log(`[SMTP Verifier] Trying mail server: ${mailServer}`);
            
            const result = await checkEmailWithSMTP(mailServer, email, domain);
            
            // If we get a definitive result (exists or doesn't exist), return it
            if (result.definitive) {
                return result;
            }
            
            // If inconclusive, try next server
            console.log(`[SMTP Verifier] Result inconclusive, trying next server...`);
        }

        // If all servers were inconclusive, we'll be lenient and allow signup
        // Email will be verified via OTP anyway
        console.log(`[SMTP Verifier] Could not verify definitively, allowing with OTP verification`);
        return {
            exists: true,
            deliverable: true,
            message: 'Email could not be fully verified. Verification will be done via OTP.',
            requiresOTP: true
        };

    } catch (error) {
        console.error('[SMTP Verifier] Error:', error);
        // On error, allow signup but require OTP verification
        return {
            exists: true,
            deliverable: true,
            message: 'Email verification skipped. Verification will be done via OTP.',
            requiresOTP: true
        };
    }
}

/**
 * Check email existence with SMTP server
 * @param {string} mailServer - Mail server hostname
 * @param {string} email - Email to verify
 * @param {string} domain - Email domain
 */
function checkEmailWithSMTP(mailServer, email, domain) {
    return new Promise((resolve) => {
        const timeout = 15000; // 15 second timeout (increased)
        let step = 0;
        let responseData = '';
        let allResponses = ''; // Track all responses for debugging

        // Create TCP connection to mail server on port 25 (SMTP port)
        const socket = net.createConnection(25, mailServer);
        
        // Set socket timeout
        socket.setTimeout(timeout);

        // Set timeout
        const timer = setTimeout(() => {
            socket.destroy();
            console.log('[SMTP Verifier] Connection timeout');
            console.log('[SMTP Verifier] All responses:', allResponses);
            resolve({
                exists: true,
                deliverable: true,
                definitive: false,
                message: 'Verification timeout',
                requiresOTP: true
            });
        }, timeout);

        socket.on('connect', () => {
            console.log(`[SMTP Verifier] Connected to ${mailServer}`);
        });

        socket.on('data', (data) => {
            responseData = data.toString();
            allResponses += responseData;
            console.log(`[SMTP Verifier] Step ${step} Response:`, responseData.trim());

            try {
                // SMTP conversation flow
                if (step === 0 && responseData.includes('220')) {
                    // Server ready, send EHLO/HELO
                    console.log(`[SMTP Verifier] Sending EHLO ${domain}`);
                    socket.write(`EHLO ${domain}\r\n`);
                    step = 1;
                } 
                else if (step === 1 && responseData.includes('250')) {
                    // EHLO accepted, send MAIL FROM
                    console.log('[SMTP Verifier] Sending MAIL FROM');
                    socket.write('MAIL FROM:<verify@example.com>\r\n');
                    step = 2;
                } 
                else if (step === 2 && responseData.includes('250')) {
                    // MAIL FROM accepted, send RCPT TO (this is the KEY step)
                    console.log(`[SMTP Verifier] Sending RCPT TO for ${email}`);
                    socket.write(`RCPT TO:<${email}>\r\n`);
                    step = 3;
                } 
                else if (step === 3) {
                    // This is the CRITICAL response that tells us if email exists
                    clearTimeout(timer);
                    
                    console.log('[SMTP Verifier] ========================================');
                    console.log('[SMTP Verifier] FINAL RESPONSE:', responseData);
                    console.log('[SMTP Verifier] ========================================');
                    
                    // Send QUIT to close connection properly
                    socket.write('QUIT\r\n');
                    
                    // Wait a bit for QUIT response, then close
                    setTimeout(() => {
                        socket.end();
                    }, 500);

                    // Parse the response codes
                    const code = responseData.substring(0, 3);
                    console.log('[SMTP Verifier] Response Code:', code);

                    // SUCCESS CODES - Email EXISTS
                    if (code === '250' || code === '251' || code === '252') {
                        // 250 = Requested mail action okay, completed
                        // 251 = User not local; will forward
                        // 252 = Cannot VRFY user, but will accept message
                        console.log('[SMTP Verifier] ✅ Email VERIFIED - EXISTS');
                        resolve({
                            exists: true,
                            deliverable: true,
                            definitive: true,
                            message: 'Email address verified successfully'
                        });
                    } 
                    // ERROR CODES - Email DOESN'T EXIST
                    else if (
                        code === '550' ||  // Mailbox unavailable / doesn't exist
                        code === '551' ||  // User not local
                        code === '553' ||  // Mailbox name not allowed
                        responseData.includes('5.1.1') ||   // Bad destination mailbox
                        responseData.includes('does not exist') ||
                        responseData.includes('Recipient address rejected') ||
                        responseData.includes('User unknown') ||
                        responseData.includes('No such user')
                    ) {
                        console.log('[SMTP Verifier] ❌ Email DOES NOT EXIST');
                        resolve({
                            exists: false,
                            deliverable: false,
                            definitive: true,
                            message: 'This email address does not exist'
                        });
                    }
                    // TEMPORARY ERROR CODES - Allow with OTP
                    else if (
                        code === '450' ||  // Mailbox busy
                        code === '451' ||  // Local error
                        code === '452' ||  // Insufficient storage
                        code === '421'     // Service not available
                    ) {
                        console.log('[SMTP Verifier] ⚠️ Temporary error - allowing with OTP');
                        resolve({
                            exists: true,
                            deliverable: true,
                            definitive: false,
                            message: 'Email verification inconclusive (temporary server error)',
                            requiresOTP: true
                        });
                    }
                    // GREYLISTING or CATCH-ALL - Allow with OTP
                    else if (responseData.includes('Greylisted') || responseData.includes('try again')) {
                        console.log('[SMTP Verifier] ⚠️ Greylisted - allowing with OTP');
                        resolve({
                            exists: true,
                            deliverable: true,
                            definitive: false,
                            message: 'Email verification delayed by server. Will verify via OTP.',
                            requiresOTP: true
                        });
                    }
                    else {
                        // Unknown/ambiguous response - be safe and allow with OTP
                        console.log('[SMTP Verifier] ⚠️ Unknown response code - allowing with OTP');
                        console.log('[SMTP Verifier] Full response:', responseData);
                        resolve({
                            exists: true,
                            deliverable: true,
                            definitive: false,
                            message: 'Email could not be fully verified. Verification will be done via OTP.',
                            requiresOTP: true
                        });
                    }
                }
            } catch (error) {
                clearTimeout(timer);
                socket.destroy();
                console.error('[SMTP Verifier] Error in SMTP conversation:', error);
                resolve({
                    exists: true,
                    deliverable: true,
                    definitive: false,
                    message: 'Email verification error',
                    requiresOTP: true
                });
            }
        });

        socket.on('error', (error) => {
            clearTimeout(timer);
            console.error('[SMTP Verifier] Socket error:', error.message);
            resolve({
                exists: true,
                deliverable: true,
                definitive: false,
                message: 'Could not connect to mail server',
                requiresOTP: true
            });
        });

        socket.on('timeout', () => {
            clearTimeout(timer);
            socket.destroy();
            console.log('[SMTP Verifier] Socket timeout');
            resolve({
                exists: true,
                deliverable: true,
                definitive: false,
                message: 'Mail server timeout',
                requiresOTP: true
            });
        });

        socket.on('close', () => {
            clearTimeout(timer);
        });
    });
}


