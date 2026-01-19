import { Router } from 'express';
import { verifyJwt } from '../middleware/auth.middleware.js';
import { 
  getMyReviews, 
  getAverageRating,
  createReview 
} from '../controllers/review.controller.js';

const reviewRouter = Router();

/**
 * @swagger
 * /api/v1/reviews:
 *   get:
 *     summary: Get reviews for current user
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Reviews fetched successfully
 */
reviewRouter.route('/').get(verifyJwt, getMyReviews);

/**
 * @swagger
 * /api/v1/reviews:
 *   post:
 *     summary: Create a new review
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Review created successfully
 */
reviewRouter.route('/').post(verifyJwt, createReview);

/**
 * @swagger
 * /api/v1/reviews/average:
 *   get:
 *     summary: Get average rating for current user
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Average rating fetched successfully
 */
reviewRouter.route('/average').get(verifyJwt, getAverageRating);

export default reviewRouter;
