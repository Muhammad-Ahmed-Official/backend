/**
 * Email Domain Typo Checker
 * Detects common typos in popular email domains
 */

// Popular email domains (correct versions)
const POPULAR_DOMAINS = [
    'gmail.com',
    'yahoo.com',
    'outlook.com',
    'hotmail.com',
    'live.com',
    'msn.com',
    'icloud.com',
    'me.com',
    'aol.com',
    'protonmail.com',
    'yandex.com',
    'mail.com',
    'zoho.com',
];

// Common typos mapping: typo -> correct domain
const COMMON_TYPOS = {
    // Gmail typos
    'gmail.co': 'gmail.com',
    'gmai.com': 'gmail.com',
    'gmial.com': 'gmail.com',
    'gmali.com': 'gmail.com',
    'gmaill.com': 'gmail.com',
    'gmail.con': 'gmail.com',
    'gmail.cm': 'gmail.com',
    'gmail.om': 'gmail.com',
    'gnail.com': 'gmail.com',
    'gmsil.com': 'gmail.com',
    
    // Yahoo typos
    'yahoo.co': 'yahoo.com',
    'yaho.com': 'yahoo.com',
    'yahooo.com': 'yahoo.com',
    'yahoo.con': 'yahoo.com',
    'yahoo.cm': 'yahoo.com',
    'yhoo.com': 'yahoo.com',
    'yhaoo.com': 'yahoo.com',
    
    // Outlook typos
    'outlook.co': 'outlook.com',
    'outlok.com': 'outlook.com',
    'outloo.com': 'outlook.com',
    'outlook.con': 'outlook.com',
    'otlook.com': 'outlook.com',
    
    // Hotmail typos
    'hotmail.co': 'hotmail.com',
    'hotmai.com': 'hotmail.com',
    'hotmal.com': 'hotmail.com',
    'hotmial.com': 'hotmail.com',
    'hotmail.con': 'hotmail.com',
    'htmail.com': 'hotmail.com',
    
    // iCloud typos
    'icloud.co': 'icloud.com',
    'iclod.com': 'icloud.com',
    'icloud.con': 'icloud.com',
    'icould.com': 'icloud.com',
};

/**
 * Calculate Levenshtein distance between two strings
 * Used for fuzzy matching of domain names
 */
function levenshteinDistance(str1, str2) {
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));

    for (let i = 0; i <= len1; i++) matrix[i][0] = i;
    for (let j = 0; j <= len2; j++) matrix[0][j] = j;

    for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
            const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,      // deletion
                matrix[i][j - 1] + 1,      // insertion
                matrix[i - 1][j - 1] + cost // substitution
            );
        }
    }

    return matrix[len1][len2];
}

/**
 * Find the closest matching popular domain
 */
function findClosestDomain(domain, threshold = 2) {
    let closestDomain = null;
    let minDistance = Infinity;

    for (const popularDomain of POPULAR_DOMAINS) {
        const distance = levenshteinDistance(domain.toLowerCase(), popularDomain.toLowerCase());
        
        if (distance <= threshold && distance < minDistance) {
            minDistance = distance;
            closestDomain = popularDomain;
        }
    }

    return closestDomain;
}

/**
 * Check if email domain is a common typo
 * @param {string} email - Email address to check
 * @returns {object} - { isTypo: boolean, suggestion: string|null, message: string }
 */
export function checkEmailDomainTypo(email) {
    if (!email || typeof email !== 'string') {
        return { isTypo: false, suggestion: null, message: '' };
    }

    const parts = email.toLowerCase().trim().split('@');
    if (parts.length !== 2) {
        return { isTypo: false, suggestion: null, message: '' };
    }

    const domain = parts[1];

    // Check if it's a known typo
    if (COMMON_TYPOS[domain]) {
        return {
            isTypo: true,
            suggestion: COMMON_TYPOS[domain],
            message: `Did you mean ${parts[0]}@${COMMON_TYPOS[domain]}?`,
            severity: 'error' // This is definitely a typo
        };
    }

    // Use fuzzy matching to find similar domains
    const closestDomain = findClosestDomain(domain);
    if (closestDomain && closestDomain !== domain) {
        return {
            isTypo: true,
            suggestion: closestDomain,
            message: `Did you mean ${parts[0]}@${closestDomain}?`,
            severity: 'warning' // This might be a typo
        };
    }

    return { isTypo: false, suggestion: null, message: '' };
}

/**
 * Check if domain is a popular email provider
 */
export function isPopularDomain(domain) {
    return POPULAR_DOMAINS.includes(domain.toLowerCase());
}

export { POPULAR_DOMAINS, COMMON_TYPOS };

