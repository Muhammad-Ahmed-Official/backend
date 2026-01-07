import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { StatusCodes } from "http-status-codes";
import { asyncHandler } from "../utils/asyncHandler.js";
import { isValidEmail, isValidEmailDomain } from "../utils/validators.js";
import { checkEmailDomainTypo } from "../utils/emailDomainChecker.js";
import { verifyEmailViaSMTP } from "../utils/smtpEmailVerifier.js";

/**
 * @desc    Validate email format and domain
 * @route   POST /api/v1/validation/check-email
 * @access  Public
 */
export const validateEmailEndpoint = asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Email is required");
    }

    // Check email format
    const formatValid = isValidEmail(email);
    
    if (!formatValid) {
        return res.status(StatusCodes.BAD_REQUEST).send(
            new ApiResponse(StatusCodes.BAD_REQUEST, "Invalid email format", {
                isValid: false,
                email,
                formatValid: false,
                domainValid: false,
                message: "Please enter a valid email address"
            })
        );
    }

    // Check for common domain typos (FIRST - before DNS check)
    const typoCheck = checkEmailDomainTypo(email);
    
    if (typoCheck.isTypo && typoCheck.severity === 'error') {
        // Definite typo detected
        return res.status(StatusCodes.BAD_REQUEST).send(
            new ApiResponse(StatusCodes.BAD_REQUEST, typoCheck.message, {
                isValid: false,
                email,
                formatValid: true,
                domainValid: false,
                isTypo: true,
                suggestion: typoCheck.suggestion,
                suggestedEmail: email.split('@')[0] + '@' + typoCheck.suggestion,
                message: typoCheck.message
            })
        );
    }

    // Check email domain (DNS)
    const domainCheck = await isValidEmailDomain(email);
    
    if (!domainCheck.valid) {
        return res.status(StatusCodes.BAD_REQUEST).send(
            new ApiResponse(StatusCodes.BAD_REQUEST, domainCheck.message, {
                isValid: false,
                email,
                formatValid: true,
                domainValid: false,
                message: domainCheck.message
            })
        );
    }

    // Verify if email actually exists using FREE SMTP verification
    console.log('[Validation] Performing SMTP email verification...');
    const smtpCheck = await verifyEmailViaSMTP(email);
    
    // If email definitely doesn't exist, block it
    if (!smtpCheck.exists && smtpCheck.definitive) {
        return res.status(StatusCodes.BAD_REQUEST).send(
            new ApiResponse(StatusCodes.BAD_REQUEST, smtpCheck.message, {
                isValid: false,
                email,
                formatValid: true,
                domainValid: true,
                emailExists: false,
                message: smtpCheck.message
            })
        );
    }

    // Email is valid, but check if there's a warning-level typo suggestion
    if (typoCheck.isTypo && typoCheck.severity === 'warning') {
        return res.status(StatusCodes.OK).send(
            new ApiResponse(StatusCodes.OK, "Email is valid, but check the domain", {
                isValid: true,
                email,
                formatValid: true,
                domainValid: true,
                hasWarning: true,
                suggestion: typoCheck.suggestion,
                suggestedEmail: email.split('@')[0] + '@' + typoCheck.suggestion,
                message: typoCheck.message + " (Current domain is valid but might be a typo)"
            })
        );
    }

    // Email is valid (either verified or will be verified via OTP)
    return res.status(StatusCodes.OK).send(
        new ApiResponse(StatusCodes.OK, "Email is valid", {
            isValid: true,
            email,
            formatValid: true,
            domainValid: true,
            emailExists: smtpCheck.exists,
            verified: smtpCheck.definitive,
            requiresOTP: smtpCheck.requiresOTP,
            message: smtpCheck.message || "Email is valid and can receive messages"
        })
    );
});

