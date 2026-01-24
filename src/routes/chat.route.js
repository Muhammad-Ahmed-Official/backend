import { Router } from 'express';
import { verifyJwt } from '../middleware/auth.middleware.js';
import {
  sendMessage,
  getChatMessages,
  getUserChats,
  markMessageAsRead,
  getUnreadCount,
} from '../controllers/chat.controller.js';

const chatRouter = Router();

/**
 * @swagger
 * /api/v1/chats/send:
 *   post:
 *     summary: Send a message
 *     tags: [Chats]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [receiverId, message]
 *             properties:
 *               receiverId:
 *                 type: string
 *               message:
 *                 type: string
 *               projectId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Message sent successfully
 */
chatRouter.route('/send').post(verifyJwt, sendMessage);

/**
 * @swagger
 * /api/v1/chats/messages:
 *   get:
 *     summary: Get chat messages between two users
 *     tags: [Chats]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: receiverId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Messages fetched successfully
 */
chatRouter.route('/messages').get(verifyJwt, getChatMessages);

/**
 * @swagger
 * /api/v1/chats/history:
 *   get:
 *     summary: Get user's chat history
 *     tags: [Chats]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Chat history fetched successfully
 */
chatRouter.route('/history').get(verifyJwt, getUserChats);

/**
 * @swagger
 * /api/v1/chats/{messageId}/read:
 *   patch:
 *     summary: Mark message as read
 *     tags: [Chats]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Message marked as read successfully
 */
chatRouter.route('/:messageId/read').patch(verifyJwt, markMessageAsRead);

/**
 * @swagger
 * /api/v1/chats/unread-count:
 *   get:
 *     summary: Get unread messages count
 *     tags: [Chats]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unread count fetched successfully
 */
chatRouter.route('/unread-count').get(verifyJwt, getUnreadCount);

export default chatRouter;