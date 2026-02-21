import { Router } from 'express';
import { verifyJwt } from '../middleware/auth.middleware.js';
import {
  startMilestone,
  submitMilestone,
  approveMilestone,
  requestChanges,
  deleteMilestone,
} from '../controllers/milestone.controller.js';

const milestoneRouter = Router();

// Freelancer actions
milestoneRouter.patch('/:milestoneId/start', verifyJwt, startMilestone);
milestoneRouter.patch('/:milestoneId/submit', verifyJwt, submitMilestone);

// Client actions
milestoneRouter.patch('/:milestoneId/approve', verifyJwt, approveMilestone);
milestoneRouter.patch('/:milestoneId/request-changes', verifyJwt, requestChanges);
milestoneRouter.delete('/:milestoneId', verifyJwt, deleteMilestone);

export default milestoneRouter;
