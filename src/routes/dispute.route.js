import { Router } from 'express';
import multer from 'multer';
import { verifyJwt } from '../middleware/auth.middleware.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});
import {
  getMyDisputes,
  getDisputeById,
  createDispute,
  updateDisputeStatus,
  getMessages,
  sendMessage,
  getEvidence,
  uploadEvidence,
  escalateToSupport,
  getTimeline,
  respondToDispute,
  acceptMediationProposal,
  rejectMediationProposal,
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

disputeRouter.route('/:id/messages').get(verifyJwt, getMessages);
disputeRouter.route('/:id/messages').post(verifyJwt, sendMessage);

disputeRouter.route('/:id/evidence').get(verifyJwt, getEvidence);
disputeRouter.route('/:id/evidence').post(verifyJwt, upload.single('file'), uploadEvidence);

disputeRouter.route('/:id/escalate').put(verifyJwt, escalateToSupport);
disputeRouter.route('/:id/timeline').get(verifyJwt, getTimeline);

// Respondent submits their initial response
disputeRouter.route('/:id/respond').put(verifyJwt, respondToDispute);

// Both-party mediation acceptance flow
disputeRouter.route('/:id/mediation-accept').put(verifyJwt, acceptMediationProposal);
disputeRouter.route('/:id/mediation-reject').put(verifyJwt, rejectMediationProposal);

export default disputeRouter;
