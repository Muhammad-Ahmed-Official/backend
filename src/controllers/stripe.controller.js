import Stripe from 'stripe';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { StatusCodes } from 'http-status-codes';
import { asyncHandler } from '../utils/asyncHandler.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// POST /api/v1/stripe/create-payment-intent
// Creates a Stripe PaymentIntent for the given amount (in dollars).
export const createPaymentIntent = asyncHandler(async (req, res) => {
  const { amount, currency = 'usd', receiptEmail } = req.body;

  if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Valid amount is required');
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(parseFloat(amount)), // already in cents from frontend
    currency: currency.toLowerCase(),
    automatic_payment_methods: { enabled: true },
    ...(receiptEmail ? { receipt_email: receiptEmail } : {}),
  });

  return res.status(StatusCodes.OK).send(
    new ApiResponse(StatusCodes.OK, 'Payment intent created', {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    })
  );
});

// POST /api/v1/stripe/verify-payment
// Verifies that a PaymentIntent has status 'succeeded'.
export const verifyPayment = asyncHandler(async (req, res) => {
  const { paymentIntentId, expectedAmount } = req.body;

  if (!paymentIntentId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'paymentIntentId is required');
  }

  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

  if (paymentIntent.status !== 'succeeded') {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Payment not completed. Status: ${paymentIntent.status}`
    );
  }

  // Optional: verify the amount matches
  if (expectedAmount) {
    const expectedCents = Math.round(parseFloat(expectedAmount) * 100);
    if (paymentIntent.amount !== expectedCents) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Payment amount mismatch');
    }
  }

  return res.status(StatusCodes.OK).send(
    new ApiResponse(StatusCodes.OK, 'Payment verified successfully', {
      status: paymentIntent.status,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
    })
  );
});
