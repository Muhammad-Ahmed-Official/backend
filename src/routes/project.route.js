import { Router } from 'express';
import { verifyJwt } from '../middleware/auth.middleware.js';
import {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
} from '../controllers/project.controller.js';
import { getMilestones, createMilestone } from '../controllers/milestone.controller.js';

const projectRouter = Router();

/**
 * @swagger
 * /api/v1/projects:
 *   get:
 *     summary: Get all projects
 *     tags: [Projects]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, COMPLETED, CANCELLED]
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Projects fetched successfully
 */
projectRouter.route('/').get(getProjects);

/**
 * @swagger
 * /api/v1/projects/{id}:
 *   get:
 *     summary: Get project by ID
 *     tags: [Projects]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Project fetched successfully
 *       404:
 *         description: Project not found
 */
projectRouter.route('/:id').get(getProjectById);

/**
 * @swagger
 * /api/v1/projects:
 *   post:
 *     summary: Create a new project (Client only)
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, description, budget]
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               budget:
 *                 type: number
 *               location:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               category:
 *                 type: string
 *               duration:
 *                 type: string
 *     responses:
 *       201:
 *         description: Project created successfully
 *       403:
 *         description: Only clients can create projects
 */
projectRouter.route('/').post(verifyJwt, createProject);

/**
 * @swagger
 * /api/v1/projects/{id}:
 *   put:
 *     summary: Update project
 *     tags: [Projects]
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
 *         description: Project updated successfully
 *       403:
 *         description: You can only update your own projects
 */
projectRouter.route('/:id').put(verifyJwt, updateProject);

/**
 * @swagger
 * /api/v1/projects/{id}:
 *   delete:
 *     summary: Delete project
 *     tags: [Projects]
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
 *         description: Project deleted successfully
 */
projectRouter.route('/:id').delete(verifyJwt, deleteProject);

// Milestone sub-routes under projects
projectRouter.route('/:projectId/milestones').get(verifyJwt, getMilestones);
projectRouter.route('/:projectId/milestones').post(verifyJwt, createMilestone);

export default projectRouter;

