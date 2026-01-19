import { Router } from 'express';
import { verifyJwt } from '../middleware/auth.middleware.js';
import { getWallet, getTransactions, addFunds } from '../controllers/wallet.controller.js';

const walletRouter = Router();

/**
 * @swagger
 * /api/v1/wallet:
 *   get:
 *     summary: Get user's wallet
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Wallet fetched successfully
 */
walletRouter.route('/').get(verifyJwt, getWallet);

/**
 * @swagger
 * /api/v1/wallet/transactions:
 *   get:
 *     summary: Get user's transactions
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Transactions fetched successfully
 */
walletRouter.route('/transactions').get(verifyJwt, getTransactions);

/**
 * @swagger
 * /api/v1/wallet/add-funds:
 *   post:
 *     summary: Add funds to wallet
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Funds added successfully
 */
walletRouter.route('/add-funds').post(verifyJwt, addFunds);

export default walletRouter;
