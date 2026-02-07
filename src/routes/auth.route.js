import { Router } from "express";
import multer from "multer";
import { changeCurrentPassword, forgotPassword, googleSignin, logout, resendOtp, signin, signup, verifyEmail, getUserInfo, updateUser, refreshAccessToken, getCurrentUser, uploadProfileImage } from "../controllers/auth.controller.js";
import { verifyJwt } from "../middleware/auth.middleware.js";

const authRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 4 * 1024 * 1024 } }); // 4MB max (Vercel body limit 4.5MB)
/**
 * @swagger
 * /api/v1/auth/signup:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SignupRequest'
 *     responses:
 *       201:
 *         description: User registered successfully, OTP sent to email
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *             example:
 *               statusCode: 201
 *               message: "User Registration Successful"
 *               data:
 *                 user:
 *                   id: "123e4567-e89b-12d3-a456-426614174000"
 *                   userName: "johndoe"
 *                   email: "john@example.com"
 *                   isVerified: false
 *                 accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *       400:
 *         description: Bad request - Missing or invalid fields
 *       409:
 *         description: User already exists
 */
authRouter.route("/signup").post(signup);

/**
 * @swagger
 * /api/v1/auth/signin:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SigninRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Invalid credentials
 *       404:
 *         description: User not found
 */
authRouter.route("/signin").post(signin);

/**
 * @swagger
 * /api/v1/auth/google-signin:
 *   post:
 *     summary: Google OAuth sign in
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, userName, isVerified]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               userName:
 *                 type: string
 *               isVerified:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Google sign in successful
 *       401:
 *         description: Unauthorized
 */
authRouter.route("/google-signin").post(googleSignin);

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *       401:
 *         description: Unauthorized
 */
authRouter.route("/logout").post(verifyJwt, logout);

/**
 * @swagger
 * /api/v1/auth/verify-email:
 *   post:
 *     summary: Verify email with OTP
 *     tags: [OTP]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/OTPRequest'
 *     responses:
 *       200:
 *         description: Email verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *             example:
 *               statusCode: 200
 *               message: "Email Verified Successfully"
 *               data:
 *                 email: "john@example.com"
 *                 isVerified: true
 *       400:
 *         description: Missing OTP
 *       403:
 *         description: Invalid or expired OTP
 *       401:
 *         description: Unauthorized
 */
authRouter.route("/verify-email").post(verifyJwt, verifyEmail);

/**
 * @swagger
 * /api/v1/auth/resend-otp:
 *   post:
 *     summary: Resend OTP to user email
 *     tags: [OTP]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResendOTPRequest'
 *     responses:
 *       200:
 *         description: OTP resent successfully
 *       400:
 *         description: Missing email or user ID
 *       404:
 *         description: User not found
 */
authRouter.route("/resend-otp").post(resendOtp);

/**
 * @swagger
 * /api/v1/auth/forgot-password:
 *   post:
 *     summary: Request password reset link
 *     tags: [Password]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ForgotPasswordRequest'
 *     responses:
 *       200:
 *         description: Password reset link sent to email
 *       404:
 *         description: User not found
 *       403:
 *         description: Email not verified
 */
authRouter.route("/forgot-password").post(forgotPassword);

/**
 * @swagger
 * /api/v1/auth/change-password/{token}:
 *   post:
 *     summary: Change password using reset token
 *     tags: [Password]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Password reset token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChangePasswordRequest'
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Invalid credentials or token
 */
authRouter.route("/change-password/:token").post(changeCurrentPassword);

/**
 * @swagger
 * /api/v1/auth/current-user:
 *   get:
 *     summary: Get current authenticated user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Current user information
 *       401:
 *         description: Unauthorized
 */
authRouter.route("/current-user").get(verifyJwt, getCurrentUser);

/**
 * @swagger
 * /api/v1/auth/isUser:
 *   post:
 *     summary: Get user information by ID
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: User information
 *       401:
 *         description: Unauthorized
 */
authRouter.route("/isUser").post(verifyJwt, getUserInfo);

/**
 * @swagger
 * /api/v1/auth/update-user:
 *   post:
 *     summary: Update user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userName:
 *                 type: string
 *     responses:
 *       200:
 *         description: User updated successfully
 *       401:
 *         description: Unauthorized
 */
authRouter.route("/update-user").post(verifyJwt, updateUser);

authRouter.route("/upload-profile-image").post(verifyJwt, upload.single("image"), uploadProfileImage);

/**
 * @swagger
 * /api/v1/auth/refresh-token:
 *   post:
 *     summary: Refresh access token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *       401:
 *         description: Unauthorized
 */
authRouter.route("/refresh-token").post(refreshAccessToken);

export default authRouter;
