import { Router } from 'express';
import { verifyJwt } from '../middleware/auth.middleware.js';
import { 
  getMyDisputes, 
  getDisputeById, 
  createDispute,
  updateDisputeStatus 
} from '../controllers/dispute.controller.js';

const disputeRouter = Router();

/**
 * @swagger
 * /api/v1/disputes:
 *   get:
 *     summary: Get user's disputes
 *     tags: [Disputes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Disputes fetched successfully
 */
disputeRouter.route('/').get(verifyJwt, getMyDisputes);

/**
 * @swagger
 * /api/v1/disputes:
 *   post:
 *     summary: Create a new dispute
 *     tags: [Disputes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Dispute created successfully
 */
disputeRouter.route('/').post(verifyJwt, createDispute);

/**
 * @swagger
 * /api/v1/disputes/{id}:
 *   get:
 *     summary: Get dispute by ID
 *     tags: [Disputes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dispute fetched successfully
 */
disputeRouter.route('/:id').get(verifyJwt, getDisputeById);

/**
 * @swagger
 * /api/v1/disputes/{id}/status:
 *   put:
 *     summary: Update dispute status
 *     tags: [Disputes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dispute status updated successfully
 */
disputeRouter.route('/:id/status').put(verifyJwt, updateDisputeStatus);

export default disputeRouter;
