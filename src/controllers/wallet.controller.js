import { Wallet, Transaction } from '../models/wallet.models.js';
import { Notification } from '../models/notification.models.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { StatusCodes } from 'http-status-codes';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getWallet = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const wallet = await Wallet.createOrGet(userId);
  
  return res.status(StatusCodes.OK).send(
    new ApiResponse(StatusCodes.OK, 'Wallet fetched successfully', { wallet: wallet.toJSON() })
  );
});

export const getTransactions = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { limit } = req.query;
  const transactions = await Transaction.findByUserId(userId, limit ? parseInt(limit) : 50);
  
  return res.status(StatusCodes.OK).send(
    new ApiResponse(StatusCodes.OK, 'Transactions fetched successfully', { 
      transactions: transactions.map(t => t.toJSON()) 
    })
  );
});

export const addFunds = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { amount } = req.body;
  
  if (!amount || amount <= 0) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid amount');
  }
  
  // Update wallet balance
  const wallet = await Wallet.updateBalance(userId, parseFloat(amount), 'balance');
  
  // Create transaction record
  const transaction = await Transaction.create({
    wallet_id: wallet.id,
    user_id: userId,
    type: 'deposit',
    amount: parseFloat(amount),
    description: 'Wallet top-up',
    status: 'completed',
  });
  
  Notification.create({
    userId,
    type: 'wallet_deposit',
    title: 'Funds Added',
    message: `$${parseFloat(amount).toFixed(2)} has been added to your wallet.`,
  }).catch(() => {});

  return res.status(StatusCodes.OK).send(
    new ApiResponse(StatusCodes.OK, 'Funds added successfully', {
      wallet: wallet.toJSON(),
      transaction: transaction.toJSON()
    })
  );
});

export const withdrawFunds = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { amount } = req.body;

  const parsed = parseFloat(amount);
  if (!amount || isNaN(parsed) || parsed <= 0) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid amount');
  }

  const wallet = await Wallet.findByUserId(userId);
  if (!wallet) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Wallet not found');
  }

  if (parsed > wallet.balance) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Insufficient available balance');
  }

  const updated = await Wallet.updateBalance(userId, -parsed, 'balance');

  const transaction = await Transaction.create({
    wallet_id: wallet.id,
    user_id: userId,
    type: 'withdrawal',
    amount: parsed,
    description: 'Wallet withdrawal',
    status: 'completed',
  });

  Notification.create({
    userId,
    type: 'wallet_withdrawal',
    title: 'Withdrawal Successful',
    message: `$${parsed.toFixed(2)} has been withdrawn from your wallet.`,
  }).catch(() => {});

  return res.status(StatusCodes.OK).send(
    new ApiResponse(StatusCodes.OK, 'Withdrawal successful', {
      wallet: updated.toJSON(),
      transaction: transaction.toJSON(),
    })
  );
});
