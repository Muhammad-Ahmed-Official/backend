import { Router } from 'express';
import { createPaymentIntent, verifyPayment } from '../controllers/stripe.controller.js';
import { verifyJwt } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/create-payment-intent', verifyJwt, createPaymentIntent);
router.post('/verify-payment', verifyJwt, verifyPayment);

export default router;
