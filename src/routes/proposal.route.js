import { Router } from 'express';
import { verifyJwt } from '../middleware/auth.middleware.js';
import {
  getProjectProposals,
  getMyProposals,
  createProposal,
  updateProposalStatus,
  deleteProposal,
} from '../controllers/proposal.controller.js';

const proposalRouter = Router();

/**
 * @swagger
 * /api/v1/proposals/project/{projectId}:
 *   get:
 *     summary: Get all proposals for a project
 *     tags: [Proposals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Proposals fetched successfully
 */
proposalRouter.route('/project/:projectId').get(verifyJwt, getProjectProposals);

/**
 * @swagger
 * /api/v1/proposals/my-proposals:
 *   get:
 *     summary: Get current user's proposals
 *     tags: [Proposals]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Proposals fetched successfully
 */
proposalRouter.route('/my-proposals').get(verifyJwt, getMyProposals);

/**
 * @swagger
 * /api/v1/proposals/project/{projectId}:
 *   post:
 *     summary: Submit a proposal (Freelancer only)
 *     tags: [Proposals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [coverLetter, bidAmount]
 *             properties:
 *               coverLetter:
 *                 type: string
 *               bidAmount:
 *                 type: number
 *     responses:
 *       201:
 *         description: Proposal submitted successfully
 *       403:
 *         description: Only freelancers can submit proposals
 */
proposalRouter.route('/project/:projectId').post(verifyJwt, createProposal);

/**
 * @swagger
 * /api/v1/proposals/{id}/status:
 *   put:
 *     summary: Update proposal status (Accept/Reject) - Project owner only
 *     tags: [Proposals]
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
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [ACCEPTED, REJECTED]
 *     responses:
 *       200:
 *         description: Proposal status updated successfully
 *       403:
 *         description: Only project owner can update proposal status
 */
proposalRouter.route('/:id/status').put(verifyJwt, updateProposalStatus);

/**
 * @swagger
 * /api/v1/proposals/{id}:
 *   delete:
 *     summary: Delete proposal
 *     tags: [Proposals]
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
 *         description: Proposal deleted successfully
 */
proposalRouter.route('/:id').delete(verifyJwt, deleteProposal);

export default proposalRouter;

