import express from 'express';
import { validateEmailEndpoint } from '../controllers/validation.controller.js';

const router = express.Router();

/**
 * @swagger
 * /api/v1/validation/check-email:
 *   post:
 *     summary: Validate email format and domain
 *     description: Check if email format is valid and domain exists (DNS check) before signup
 *     tags: [Validation]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "user@example.com"
 *     responses:
 *       200:
 *         description: Email validation result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: "Email is valid"
 *                 data:
 *                   type: object
 *                   properties:
 *                     isValid:
 *                       type: boolean
 *                       example: true
 *                     email:
 *                       type: string
 *                       example: "user@example.com"
 *                     formatValid:
 *                       type: boolean
 *                       example: true
 *                     domainValid:
 *                       type: boolean
 *                       example: true
 *                     message:
 *                       type: string
 *                       example: "Email is valid and can receive messages"
 *       400:
 *         description: Invalid email
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 400
 *                 message:
 *                   type: string
 *                   example: "Email domain does not exist"
 *                 data:
 *                   type: object
 *                   properties:
 *                     isValid:
 *                       type: boolean
 *                       example: false
 *                     email:
 *                       type: string
 *                       example: "user@gmail.co"
 *                     formatValid:
 *                       type: boolean
 *                       example: true
 *                     domainValid:
 *                       type: boolean
 *                       example: false
 *                     message:
 *                       type: string
 *                       example: "Email domain 'gmail.co' does not exist"
 */
router.post('/check-email', validateEmailEndpoint);

export default router;

