import { Router } from 'express';
import { getFreelancers } from '../controllers/freelancer.controller.js';

const freelancerRouter = Router();

/**
 * @swagger
 * /api/v1/freelancers:
 *   get:
 *     summary: Get all freelancers
 *     tags: [Freelancers]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: skills
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Freelancers fetched successfully
 */
freelancerRouter.route('/').get(getFreelancers);

export default freelancerRouter;
