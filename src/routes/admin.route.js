import { Router } from 'express';
import {
    getDashboardStats,
    getUsersByRole,
    updateUser,
    deleteUser,
    getAllProjects,
    updateProject,
    deleteProject
} from '../controllers/admin.controller.js';
import { verifyJwt } from '../middleware/auth.middleware.js';

const router = Router();
// BASE: /api/v1/admin


// Protect all other admin routes
router.use(verifyJwt);

/**
 * @swagger
 * /api/v1/admin/stats:
 *   get:
 *     summary: Get dashboard statistics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Dashboard stats fetched successfully
 */
router.get('/stats', getDashboardStats);

/**
 * @swagger
 * /api/v1/admin/users/{role}:
 *   get:
 *     summary: Get users by role
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: role
 *         required: true
 *         schema:
 *           type: string
 *           enum: [freelancer, client]
 *     responses:
 *       200:
 *         description: Users fetched successfully
 */
router.get('/users/:role', getUsersByRole);

/**
 * @swagger
 * /api/v1/admin/users/{id}:
 *   patch:
 *     summary: Update user details
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
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
 *             properties:
 *               userName:
 *                 type: string
 *               email:
 *                 type: string
 *               role:
 *                 type: string
 *               isVerified:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: User updated successfully
 *   delete:
 *     summary: Delete a user
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted successfully
 */
router.patch('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

/**
 * @swagger
 * /api/v1/admin/projects:
 *   get:
 *     summary: Get all projects
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Projects fetched successfully
 */
router.get('/projects', getAllProjects);

/**
 * @swagger
 * /api/v1/admin/projects/{id}:
 *   patch:
 *     summary: Update project details
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
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
 *             properties:
 *               title:
 *                 type: string
 *               status:
 *                 type: string
 *               budget:
 *                 type: number
 *     responses:
 *       200:
 *         description: Project updated successfully
 *   delete:
 *     summary: Delete a project
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
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
router.patch('/projects/:id', updateProject);
router.delete('/projects/:id', deleteProject);

export default router;
