/**
 * Email validation utility
 * Validates email format using RFC 5322 compliant regex
 */

import dns from 'dns';
import { promisify } from 'util';

const resolveMx = promisify(dns.resolveMx);

/**
 * Validates email format
 * @param {string} email - Email address to validate
 * @returns {boolean} - Returns true if email is valid, false otherwise
 */
export const isValidEmail = (email) => {
    if (!email || typeof email !== 'string') {
        return false;
    }

    // Trim whitespace
    const trimmedEmail = email.trim().toLowerCase();

    // Basic length check
    if (trimmedEmail.length === 0 || trimmedEmail.length > 254) {
        return false;
    }

    // RFC 5322 compliant email regex (simplified but robust)
    // This regex checks for:
    // - Valid local part (before @)
    // - Valid domain part (after @)
    // - Proper TLD (top-level domain)
    const emailRegex = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

    if (!emailRegex.test(trimmedEmail)) {
        return false;
    }

    // Additional checks
    // - No consecutive dots
    if (trimmedEmail.includes('..')) {
        return false;
    }

    // - Local part should not start or end with dot
    const [localPart, domainPart] = trimmedEmail.split('@');
    if (!localPart || !domainPart) {
        return false;
    }

    if (localPart.startsWith('.') || localPart.endsWith('.')) {
        return false;
    }

    // - Domain part should not start or end with dot or hyphen
    if (domainPart.startsWith('.') || domainPart.endsWith('.') || 
        domainPart.startsWith('-') || domainPart.endsWith('-')) {
        return false;
    }

    // - Domain should have at least one dot (for TLD)
    if (!domainPart.includes('.')) {
        return false;
    }

    // - TLD should be at least 2 characters
    const tld = domainPart.split('.').pop();
    if (!tld || tld.length < 2) {
        return false;
    }

    return true;
};

/**
 * Validates if email domain exists (DNS MX record check)
 * @param {string} email - Email address to validate
 * @returns {Promise<{valid: boolean, message: string}>} - Returns validation result
 */
export const isValidEmailDomain = async (email) => {
    try {
        if (!email || typeof email !== 'string') {
            return { valid: false, message: 'Email is required' };
        }

        const trimmedEmail = email.trim().toLowerCase();
        const parts = trimmedEmail.split('@');
        
        if (parts.length !== 2) {
            return { valid: false, message: 'Invalid email format' };
        }

        const domain = parts[1];

        // Check if domain has MX records (mail exchange servers)
        try {
            const addresses = await resolveMx(domain);
            if (addresses && addresses.length > 0) {
                return { valid: true, message: 'Email domain is valid' };
            } else {
                return { valid: false, message: 'Email domain does not exist or cannot receive emails' };
            }
        } catch (dnsError) {
            // DNS lookup failed - domain doesn't exist
            if (dnsError.code === 'ENOTFOUND' || dnsError.code === 'ENODATA') {
                return { valid: false, message: `Email domain '${domain}' does not exist. Please check for typos` };
            }
            // Other DNS errors (timeout, etc.) - we'll allow it to avoid blocking legitimate emails
            console.warn(`DNS lookup warning for ${domain}:`, dnsError.message);
            return { valid: true, message: 'Email domain check skipped due to DNS timeout' };
        }
    } catch (error) {
        console.error('Email domain validation error:', error);
        // On unexpected errors, allow the email to avoid blocking users
        return { valid: true, message: 'Email domain validation skipped' };
    }
};

/**
 * Validates username format
 * @param {string} username - Username to validate
 * @returns {boolean} - Returns true if username is valid, false otherwise
 */
export const isValidUsername = (username) => {
    if (!username || typeof username !== 'string') {
        return false;
    }

    const trimmedUsername = username.trim();

    // Username should be 3-30 characters
    if (trimmedUsername.length < 3 || trimmedUsername.length > 30) {
        return false;
    }

    // Username should only contain alphanumeric characters, underscores, and hyphens
    const usernameRegex = /^[a-zA-Z0-9_-]+$/;
    
    return usernameRegex.test(trimmedUsername);
};

/**
 * Validates password strength
 * @param {string} password - Password to validate
 * @returns {object} - Returns { valid: boolean, message: string }
 */
export const isValidPassword = (password) => {
    if (!password || typeof password !== 'string') {
        return { valid: false, message: 'Password is required' };
    }

    if (password.length < 6) {
        return { valid: false, message: 'Password must be at least 6 characters long' };
    }

    if (password.length > 128) {
        return { valid: false, message: 'Password must be less than 128 characters' };
    }

    return { valid: true, message: 'Password is valid' };
};

