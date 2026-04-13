import { Router } from 'express';
import { verifyJwt, verifyAdmin } from '../middleware/auth.middleware.js';
import {
    getAllDisputes,
    getDisputeStats,
    assignMediator,
    updatePriority,
    resolveDispute,
    startReview,
    askQuestion,
    setMediationRecommendation,
} from '../controllers/admin_dispute.controller.js';

const adminDisputeRouter = Router();

adminDisputeRouter.route('/').get(verifyJwt, verifyAdmin, getAllDisputes);
adminDisputeRouter.route('/statistics').get(verifyJwt, verifyAdmin, getDisputeStats);
adminDisputeRouter.route('/:id/assign').put(verifyJwt, verifyAdmin, assignMediator);
adminDisputeRouter.route('/:id/priority').put(verifyJwt, verifyAdmin, updatePriority);
adminDisputeRouter.route('/:id/resolve').put(verifyJwt, verifyAdmin, resolveDispute);
adminDisputeRouter.route('/:id/start-review').put(verifyJwt, verifyAdmin, startReview);
adminDisputeRouter.route('/:id/ask').post(verifyJwt, verifyAdmin, askQuestion);
adminDisputeRouter.route('/:id/mediation-recommendation').post(verifyJwt, verifyAdmin, setMediationRecommendation);

export default adminDisputeRouter;
