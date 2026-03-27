import { Router } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import {
  requestCodingTest,
  submitCodingResult,
  runCode,
  submitCertificate,
  verifyCodeforcesHandle,
  getMyBadges,
  getFreelancerBadges,
  getPendingCertificates,
  adminReviewBadge,
  adminRevokeBadge,
  getAvailableSkills,
  startQuiz,
  submitQuiz,
  getCodeforcesAuthUrl,
  codeforcesCallback,
  getGithubAuthUrl,
  githubCallback,
  getYoutubeAuthUrl,
  youtubeCallback,
} from '../controllers/badge.controller.js';
import {
  listQuestions,
  getQuestion,
  createQuestion,
  updateQuestion,
  deleteQuestion,
} from '../controllers/question.controller.js';
import { verifyJwt, verifyAdmin } from '../middleware/auth.middleware.js';

const badgeRouter = Router();

// ── Public: available skills + levels ────────────────────────
badgeRouter.get('/skills', getAvailableSkills);

// ── Freelancer routes (require login) ────────────────────────

/**
 * @swagger
 * /api/v1/badges/coding-test/request:
 *   post:
 *     summary: Get a coding test question for a skill
 *     tags: [Badges]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [skill]
 *             properties:
 *               skill:
 *                 type: string
 *                 example: Python
 *     responses:
 *       200:
 *         description: Test question returned
 */
badgeRouter.post('/coding-test/request', verifyJwt, requestCodingTest);

/**
 * @swagger
 * /api/v1/badges/coding-test/submit:
 *   post:
 *     summary: Submit code for evaluation and earn a badge
 *     tags: [Badges]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [skill, source_code]
 *             properties:
 *               skill:
 *                 type: string
 *                 example: Python
 *               source_code:
 *                 type: string
 *     responses:
 *       201:
 *         description: Badge awarded
 *       200:
 *         description: Score below threshold, no badge
 */
badgeRouter.post('/coding-test/submit', verifyJwt, submitCodingResult);
badgeRouter.post('/coding-test/run',    verifyJwt, runCode);

/**
 * @swagger
 * /api/v1/badges/codeforces/verify:
 *   post:
 *     summary: Verify a Codeforces handle and earn a Competitive Programming badge
 *     tags: [Badges]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [handle]
 *             properties:
 *               handle:
 *                 type: string
 *                 example: tourist
 *     responses:
 *       201:
 *         description: Badge awarded based on Codeforces rating
 *       200:
 *         description: User is unrated — no badge awarded
 *       404:
 *         description: Handle not found on Codeforces
 */
badgeRouter.post('/codeforces/verify', verifyJwt, verifyCodeforcesHandle);
badgeRouter.get('/github/auth-url', verifyJwt, getGithubAuthUrl);
badgeRouter.get('/github/callback', githubCallback);
badgeRouter.get('/youtube/auth-url', verifyJwt, getYoutubeAuthUrl);
badgeRouter.get('/youtube/callback', youtubeCallback);

/**
 * @swagger
 * /api/v1/badges/certificate/submit:
 *   post:
 *     summary: Submit a certificate URL for admin review
 *     tags: [Badges]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [skill, certificateUrl, provider]
 *             properties:
 *               skill:
 *                 type: string
 *                 example: Digital Marketing
 *               certificateUrl:
 *                 type: string
 *                 example: https://coursera.org/verify/ABC123
 *               provider:
 *                 type: string
 *                 example: Coursera
 *     responses:
 *       201:
 *         description: Certificate submitted for review
 */
badgeRouter.post('/certificate/submit', verifyJwt, submitCertificate);

/**
 * @swagger
 * /api/v1/badges/my-badges:
 *   get:
 *     summary: Get all badges for the logged-in freelancer
 *     tags: [Badges]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Badges fetched successfully
 */
badgeRouter.get('/my-badges', verifyJwt, getMyBadges);

// ── Public routes ─────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/badges/user/{userId}:
 *   get:
 *     summary: Get active badges for a freelancer by user ID
 *     tags: [Badges]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Freelancer badges fetched
 */
badgeRouter.get('/user/:userId', getFreelancerBadges);

// ── Admin routes (require login + admin role) ─────────────────

/**
 * @swagger
 * /api/v1/badges/admin/pending:
 *   get:
 *     summary: Get all pending certificate submissions (Admin only)
 *     tags: [Badges]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pending certificates listed
 */
badgeRouter.get('/admin/pending', verifyJwt, verifyAdmin, getPendingCertificates);

/**
 * @swagger
 * /api/v1/badges/{id}/review:
 *   patch:
 *     summary: Approve or reject a certificate submission (Admin only)
 *     tags: [Badges]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [action]
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [approve, reject]
 *               badgeLevel:
 *                 type: string
 *                 enum: [Gold, Silver, Bronze]
 *     responses:
 *       200:
 *         description: Badge reviewed
 */
badgeRouter.patch('/:id/review', verifyJwt, verifyAdmin, adminReviewBadge);

/**
 * @swagger
 * /api/v1/badges/{id}/revoke:
 *   patch:
 *     summary: Revoke an active badge (Admin only)
 *     tags: [Badges]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Badge revoked
 */
badgeRouter.patch('/:id/revoke', verifyJwt, verifyAdmin, adminRevokeBadge);

// ── Codeforces OIDC ───────────────────────────────────────────
badgeRouter.get('/codeforces/auth-url', verifyJwt, getCodeforcesAuthUrl);
badgeRouter.get('/codeforces/callback', codeforcesCallback);

// ── IP rate limiter: max 5 quiz starts per IP per hour ────────
const quizStartLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    message: 'Too many quiz attempts from this device. Maximum 5 attempts per hour. Please try again later.',
  },
  keyGenerator: (req, res) => ipKeyGenerator(req),
});

// ── Quiz routes ───────────────────────────────────────────────
badgeRouter.post('/quiz/start',  quizStartLimiter, verifyJwt, startQuiz);
badgeRouter.post('/quiz/submit', verifyJwt, submitQuiz);

// ── Admin: Question Bank CRUD ─────────────────────────────────
badgeRouter.get('/admin/questions',            verifyJwt, verifyAdmin, listQuestions);
badgeRouter.get('/admin/questions/:id',        verifyJwt, verifyAdmin, getQuestion);
badgeRouter.post('/admin/questions',           verifyJwt, verifyAdmin, createQuestion);
badgeRouter.patch('/admin/questions/:id',      verifyJwt, verifyAdmin, updateQuestion);
badgeRouter.delete('/admin/questions/:id',     verifyJwt, verifyAdmin, deleteQuestion);

export default badgeRouter;
