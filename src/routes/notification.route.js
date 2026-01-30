import { Router } from 'express';
import { verifyJwt } from '../middleware/auth.middleware.js';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead
} from '../controllers/notification.controller.js';
import {
  sendSystemNotification,
  updateSystemNotification,
  deleteSystemNotification
} from '../controllers/admin.controller.js';

const notificationRouter = Router();

/**
 * @swagger
 * /api/v1/notifications:
 *   get:
 *     summary: Get user's notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notifications fetched successfully
 */
notificationRouter.route('/')
  .get(verifyJwt, getNotifications)
  .post(verifyJwt, sendSystemNotification); // Admin Broadcast

/**
 * @swagger
 * /api/v1/notifications/unread-count:
 *   get:
 *     summary: Get unread notifications count
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unread count fetched successfully
 */
notificationRouter.route('/unread-count').get(verifyJwt, getUnreadCount);

/**
 * @swagger
 * /api/v1/notifications/{id}/read:
 *   put:
 *     summary: Mark notification as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notification marked as read
 */
notificationRouter.route('/:id/read').put(verifyJwt, markAsRead);

/**
 * @swagger
 * /api/v1/notifications/read-all:
 *   put:
 *     summary: Mark all notifications as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read
 */
notificationRouter.route('/read-all').put(verifyJwt, markAllAsRead);

// Admin Operations (Patch/Delete)
notificationRouter.route('/:id')
  .patch(verifyJwt, updateSystemNotification)
  .delete(verifyJwt, deleteSystemNotification);

export default notificationRouter;
