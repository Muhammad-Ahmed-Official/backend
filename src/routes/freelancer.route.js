import { Router } from 'express';
import { getFreelancers, getFreelancerById } from '../controllers/freelancer.controller.js';

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

/**
 * @swagger
 * /api/v1/freelancers/{id}:
 *   get:
 *     summary: Get freelancer by ID
 *     tags: [Freelancers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Freelancer fetched successfully
 *       404:
 *         description: Freelancer not found
 */
freelancerRouter.route('/:id').get(getFreelancerById);

export default freelancerRouter;
