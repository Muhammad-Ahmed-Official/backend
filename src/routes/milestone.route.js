import { Router } from 'express';
import { verifyJwt } from '../middleware/auth.middleware.js';
import {
  startMilestone,
  submitMilestone,
  fundMilestone,
  fundMilestoneExternal,
  approveMilestone,
  requestChanges,
  getEscrow,
  deleteMilestone,
} from '../controllers/milestone.controller.js';

const milestoneRouter = Router();

// Client actions
milestoneRouter.patch('/:milestoneId/fund-external', verifyJwt, fundMilestoneExternal);
milestoneRouter.patch('/:milestoneId/fund', verifyJwt, fundMilestone);
milestoneRouter.patch('/:milestoneId/approve', verifyJwt, approveMilestone);
milestoneRouter.patch('/:milestoneId/request-changes', verifyJwt, requestChanges);
milestoneRouter.delete('/:milestoneId', verifyJwt, deleteMilestone);

// Freelancer actions
milestoneRouter.patch('/:milestoneId/start', verifyJwt, startMilestone);
milestoneRouter.patch('/:milestoneId/submit', verifyJwt, submitMilestone);

// Shared
milestoneRouter.get('/:milestoneId/escrow', verifyJwt, getEscrow);

export default milestoneRouter;