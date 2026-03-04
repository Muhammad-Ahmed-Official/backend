import { Milestone } from '../models/milestone.models.js';
import { Project } from '../models/project.models.js';
import { Chat } from '../models/chat.models.js';
import { EscrowTransaction } from '../models/escrow.models.js';
import { Wallet, Transaction } from '../models/wallet.models.js';
import { Notification } from '../models/notification.models.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { StatusCodes } from 'http-status-codes';
import { asyncHandler } from '../utils/asyncHandler.js';

// Helper: emit socket event
const emitSocket = (req, room, event, payload) => {
  const io = req.app.get('io');
  if (io) io.to(String(room).trim().toLowerCase()).emit(event, payload);
};

// GET /api/v1/projects/:projectId/milestones
export const getMilestones = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const userId = req.user.id;

  const project = await Project.findById(projectId);
  if (!project) throw new ApiError(StatusCodes.NOT_FOUND, 'Project not found');

  if (project.clientId !== userId && project.freelancerId !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Access denied');
  }

  const milestones = await Milestone.findByProjectId(projectId);

  return res.status(StatusCodes.OK).send(
    new ApiResponse(StatusCodes.OK, 'Milestones fetched', {
      milestones: milestones.map((m) => m.toJSON()),
    })
  );
});

// POST /api/v1/projects/:projectId/milestones  (Client only)
export const createMilestone = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const userId = req.user.id;
  const { title, description, dueDate, orderIndex, amount } = req.body;

  if (!title || !title.trim()) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Title is required');
  }

  if (amount !== undefined && (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Amount must be a positive number');
  }

  const project = await Project.findById(projectId);
  if (!project) throw new ApiError(StatusCodes.NOT_FOUND, 'Project not found');
  if (project.clientId !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only the client can create milestones');
  }

  const milestone = await Milestone.create({
    projectId,
    title: title.trim(),
    description: description?.trim() || null,
    dueDate: dueDate || null,
    orderIndex: orderIndex || 0,
    amount: amount ? parseFloat(amount) : null,
  });

  // Notify freelancer
  if (project.freelancerId) {
    emitSocket(req, project.freelancerId, 'milestoneUpdate', {
      projectId,
      action: 'created',
      milestone: milestone.toJSON(),
    });
  }

  return res.status(StatusCodes.CREATED).send(
    new ApiResponse(StatusCodes.CREATED, 'Milestone created', { milestone: milestone.toJSON() })
  );
});

// PATCH /api/v1/milestones/:milestoneId/fund  (Client only)
// Locks client wallet funds into escrow for this milestone.
export const fundMilestone = asyncHandler(async (req, res) => {
  const { milestoneId } = req.params;
  const userId = req.user.id;

  const milestone = await Milestone.findById(milestoneId);
  if (!milestone) throw new ApiError(StatusCodes.NOT_FOUND, 'Milestone not found');

  const project = await Project.findById(milestone.projectId);
  if (!project) throw new ApiError(StatusCodes.NOT_FOUND, 'Project not found');
  if (project.clientId !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only the client can fund milestones');
  }
  if (!milestone.amount || milestone.amount <= 0) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Milestone amount must be set before funding');
  }
  if (milestone.status !== 'pending') {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Only pending milestones can be funded');
  }

  // Atomic: deduct wallet balance → escrow_balance, create escrow record, set status='funded'
  const updated = await Milestone.fundAtomic(milestoneId);

  // Log escrow-debit transaction for client
  try {
    const clientWallet = await Wallet.findByUserId(userId);
    if (clientWallet) {
      await Transaction.create({
        wallet_id: clientWallet.id,
        user_id: userId,
        type: 'escrow',
        amount: milestone.amount,
        description: `Escrow funded: ${milestone.title}`,
        status: 'completed',
        project_id: project.id,
      });
    }
  } catch (txErr) {
    console.error('[fundMilestone] Failed to log transaction:', txErr);
  }

  // Notify freelancer
  if (project.freelancerId) {
    emitSocket(req, project.freelancerId, 'milestoneUpdate', {
      projectId: project.id,
      action: 'funded',
      milestone: updated.toJSON(),
    });
    Notification.create({
      userId: project.freelancerId,
      type: 'milestone_funded',
      title: 'Milestone Funded',
      message: `"${milestone.title}" has been funded. You can now start working on it.`,
      relatedId: project.id,
    }).catch(() => {});
  }

  return res.status(StatusCodes.OK).send(
    new ApiResponse(StatusCodes.OK, 'Milestone funded — escrow is now holding the funds', {
      milestone: updated.toJSON(),
    })
  );
});

// PATCH /api/v1/milestones/:milestoneId/start  (Freelancer)
export const startMilestone = asyncHandler(async (req, res) => {
  const { milestoneId } = req.params;
  const userId = req.user.id;

  const milestone = await Milestone.findById(milestoneId);
  if (!milestone) throw new ApiError(StatusCodes.NOT_FOUND, 'Milestone not found');

  const project = await Project.findById(milestone.projectId);
  if (!project) throw new ApiError(StatusCodes.NOT_FOUND, 'Project not found');
  if (project.freelancerId !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only the freelancer can start milestones');
  }
  // 'funded' = new escrow flow; 'pending' = pre-escrow backward compat
  if (milestone.status !== 'funded' && milestone.status !== 'pending') {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Milestone must be funded before starting');
  }

  const updated = await Milestone.updateStatus(milestoneId, 'in_progress');

  emitSocket(req, project.clientId, 'milestoneUpdate', {
    projectId: project.id,
    action: 'started',
    milestone: updated.toJSON(),
  });
  Notification.create({
    userId: project.clientId,
    type: 'milestone_started',
    title: 'Milestone Started',
    message: `The freelancer has started working on "${milestone.title}".`,
    relatedId: project.id,
  }).catch(() => {});

  return res.status(StatusCodes.OK).send(
    new ApiResponse(StatusCodes.OK, 'Milestone started', { milestone: updated.toJSON() })
  );
});

// PATCH /api/v1/milestones/:milestoneId/submit  (Freelancer)
// Sets status to 'in_review', records submitted_at and review_deadline (14 days).
export const submitMilestone = asyncHandler(async (req, res) => {
  const { milestoneId } = req.params;
  const userId = req.user.id;

  const milestone = await Milestone.findById(milestoneId);
  if (!milestone) throw new ApiError(StatusCodes.NOT_FOUND, 'Milestone not found');

  const project = await Project.findById(milestone.projectId, true);
  if (!project) throw new ApiError(StatusCodes.NOT_FOUND, 'Project not found');
  if (project.freelancerId !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only the freelancer can submit milestones');
  }
  if (milestone.status === 'released' || milestone.status === 'approved') {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Milestone already approved/released');
  }
  if (milestone.status === 'in_review' || milestone.status === 'submitted') {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Milestone already submitted — awaiting client review');
  }
  if (milestone.status !== 'in_progress') {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Milestone must be in progress before submitting');
  }

  const now = new Date();
  const reviewDeadline = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days

  const updated = await Milestone.updateStatus(milestoneId, 'in_review', {
    submitted_at: now.toISOString(),
    review_deadline: reviewDeadline.toISOString(),
  });

  // Send system message to client
  const chatMsg = `✅ Milestone "${milestone.title}" has been submitted for your review. You have 14 days to approve or raise a dispute.`;
  const chat = await Chat.create({
    senderId: userId,
    receiverId: project.clientId,
    message: chatMsg,
    projectId: project.id,
  });

  const payload = {
    id: chat.id,
    sender: String(userId).trim().toLowerCase(),
    receiver: String(project.clientId).trim().toLowerCase(),
    message: chatMsg,
    projectId: project.id,
    createdAt: chat.createdAt,
  };
  emitSocket(req, project.clientId, 'newMessage', payload);
  emitSocket(req, userId, 'newMessage', payload);
  emitSocket(req, project.clientId, 'milestoneUpdate', {
    projectId: project.id,
    action: 'submitted',
    milestone: updated.toJSON(),
  });
  Notification.create({
    userId: project.clientId,
    type: 'milestone_submitted',
    title: 'Milestone Ready for Review',
    message: `"${milestone.title}" has been submitted. You have 14 days to approve or request changes.`,
    relatedId: project.id,
  }).catch(() => {});

  return res.status(StatusCodes.OK).send(
    new ApiResponse(StatusCodes.OK, 'Milestone submitted for review', { milestone: updated.toJSON() })
  );
});

// PATCH /api/v1/milestones/:milestoneId/approve  (Client)
// Releases escrow atomically if escrow exists; otherwise just marks as released (pre-escrow milestones).
export const approveMilestone = asyncHandler(async (req, res) => {
  const { milestoneId } = req.params;
  const userId = req.user.id;

  const milestone = await Milestone.findById(milestoneId);
  if (!milestone) throw new ApiError(StatusCodes.NOT_FOUND, 'Milestone not found');

  const project = await Project.findById(milestone.projectId, true);
  if (!project) throw new ApiError(StatusCodes.NOT_FOUND, 'Project not found');
  if (project.clientId !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only the client can approve milestones');
  }
  if (milestone.status !== 'in_review' && milestone.status !== 'submitted') {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Milestone must be in review before approving');
  }

  // If a HELD escrow record exists → atomic release (moves money to freelancer).
  // If no escrow record (pre-escrow milestone) → just mark as released.
  const escrow = await EscrowTransaction.findHeldByMilestoneId(milestoneId);
  const updated = escrow
    ? await Milestone.releaseAtomic(milestoneId)
    : await Milestone.updateStatus(milestoneId, 'released');

  // Recalculate project progress
  const progress = await Milestone.calculateProjectProgress(milestone.projectId);
  await Project.findByIdAndUpdate(milestone.projectId, { progress });

  // Log payment transactions when escrow is released
  if (escrow) {
    try {
      // Credit for freelancer
      const freelancerWallet = await Wallet.findByUserId(project.freelancerId);
      if (freelancerWallet) {
        await Transaction.create({
          wallet_id: freelancerWallet.id,
          user_id: project.freelancerId,
          type: 'payment',
          amount: milestone.amount,
          description: `Payment received: ${milestone.title}`,
          status: 'completed',
          project_id: project.id,
        });
      }
      // Debit record for client (escrow released)
      const clientWallet = await Wallet.findByUserId(userId);
      if (clientWallet) {
        await Transaction.create({
          wallet_id: clientWallet.id,
          user_id: userId,
          type: 'payment',
          amount: milestone.amount,
          description: `Payment released: ${milestone.title}`,
          status: 'completed',
          project_id: project.id,
        });
      }
    } catch (txErr) {
      console.error('[approveMilestone] Failed to log transactions:', txErr);
    }
  }

  // Send system message to freelancer
  const chatMsg = escrow
    ? `🎉 Milestone "${milestone.title}" approved! Funds have been released to your wallet. Overall progress: ${progress}%`
    : `🎉 Milestone "${milestone.title}" approved! Overall progress: ${progress}%`;
  const chat = await Chat.create({
    senderId: userId,
    receiverId: project.freelancerId,
    message: chatMsg,
    projectId: project.id,
  });

  const msgPayload = {
    id: chat.id,
    sender: String(userId).trim().toLowerCase(),
    receiver: String(project.freelancerId).trim().toLowerCase(),
    message: chatMsg,
    projectId: project.id,
    createdAt: chat.createdAt,
  };
  emitSocket(req, project.freelancerId, 'newMessage', msgPayload);
  emitSocket(req, userId, 'newMessage', msgPayload);
  emitSocket(req, project.freelancerId, 'milestoneUpdate', {
    projectId: project.id,
    action: 'approved',
    milestone: updated.toJSON(),
    progress,
  });
  emitSocket(req, userId, 'milestoneUpdate', {
    projectId: project.id,
    action: 'approved',
    milestone: updated.toJSON(),
    progress,
  });
  Notification.create({
    userId: project.freelancerId,
    type: 'milestone_approved',
    title: 'Milestone Approved',
    message: escrow
      ? `"${milestone.title}" was approved and funds have been released to your wallet.`
      : `"${milestone.title}" was approved. Project progress: ${progress}%.`,
    relatedId: project.id,
  }).catch(() => {});

  return res.status(StatusCodes.OK).send(
    new ApiResponse(StatusCodes.OK, 'Milestone approved — funds released to freelancer', {
      milestone: updated.toJSON(),
      progress,
    })
  );
});

// PATCH /api/v1/milestones/:milestoneId/request-changes  (Client)
// Status goes back to in_progress + message sent
export const requestChanges = asyncHandler(async (req, res) => {
  const { milestoneId } = req.params;
  const userId = req.user.id;
  const { message } = req.body;

  if (!message || !message.trim()) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Please describe what changes are needed');
  }

  const milestone = await Milestone.findById(milestoneId);
  if (!milestone) throw new ApiError(StatusCodes.NOT_FOUND, 'Milestone not found');

  const project = await Project.findById(milestone.projectId, true);
  if (!project) throw new ApiError(StatusCodes.NOT_FOUND, 'Project not found');
  if (project.clientId !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only the client can request changes');
  }
  if (milestone.status !== 'in_review' && milestone.status !== 'submitted') {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Can only request changes on submitted milestones');
  }

  // Clear review timer, return to in_progress
  const updated = await Milestone.updateStatus(milestoneId, 'in_progress', {
    submitted_at: null,
    review_deadline: null,
  });

  const chatMsg = `🔄 Changes requested for milestone "${milestone.title}": ${message.trim()}`;
  const chat = await Chat.create({
    senderId: userId,
    receiverId: project.freelancerId,
    message: chatMsg,
    projectId: project.id,
  });

  const msgPayload = {
    id: chat.id,
    sender: String(userId).trim().toLowerCase(),
    receiver: String(project.freelancerId).trim().toLowerCase(),
    message: chatMsg,
    projectId: project.id,
    createdAt: chat.createdAt,
  };
  emitSocket(req, project.freelancerId, 'newMessage', msgPayload);
  emitSocket(req, userId, 'newMessage', msgPayload);
  emitSocket(req, project.freelancerId, 'milestoneUpdate', {
    projectId: project.id,
    action: 'changes_requested',
    milestone: updated.toJSON(),
  });
  Notification.create({
    userId: project.freelancerId,
    type: 'changes_requested',
    title: 'Changes Requested',
    message: `The client has requested changes for "${milestone.title}": ${message.trim()}`,
    relatedId: project.id,
  }).catch(() => {});

  return res.status(StatusCodes.OK).send(
    new ApiResponse(StatusCodes.OK, 'Changes requested and message sent to freelancer', {
      milestone: updated.toJSON(),
    })
  );
});

// GET /api/v1/milestones/:milestoneId/escrow  (Client or Freelancer)
// Returns the escrow record for a milestone.
export const getEscrow = asyncHandler(async (req, res) => {
  const { milestoneId } = req.params;
  const userId = req.user.id;

  const milestone = await Milestone.findById(milestoneId);
  if (!milestone) throw new ApiError(StatusCodes.NOT_FOUND, 'Milestone not found');

  const project = await Project.findById(milestone.projectId);
  if (!project) throw new ApiError(StatusCodes.NOT_FOUND, 'Project not found');
  if (project.clientId !== userId && project.freelancerId !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Access denied');
  }

  const escrowRecords = await EscrowTransaction.findByMilestoneId(milestoneId);

  return res.status(StatusCodes.OK).send(
    new ApiResponse(StatusCodes.OK, 'Escrow records fetched', {
      escrow: escrowRecords.map((e) => e.toJSON()),
    })
  );
});

// DELETE /api/v1/milestones/:milestoneId  (Client only, not if funded or beyond)
export const deleteMilestone = asyncHandler(async (req, res) => {
  const { milestoneId } = req.params;
  const userId = req.user.id;

  const milestone = await Milestone.findById(milestoneId);
  if (!milestone) throw new ApiError(StatusCodes.NOT_FOUND, 'Milestone not found');

  const project = await Project.findById(milestone.projectId);
  if (!project) throw new ApiError(StatusCodes.NOT_FOUND, 'Project not found');
  if (project.clientId !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only the client can delete milestones');
  }

  const nonDeletableStatuses = ['funded', 'in_progress', 'in_review', 'submitted', 'approved', 'released'];
  if (nonDeletableStatuses.includes(milestone.status)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Cannot delete a milestone that is funded or in progress');
  }

  await Milestone.delete(milestoneId);

  const progress = await Milestone.calculateProjectProgress(milestone.projectId);
  await Project.findByIdAndUpdate(milestone.projectId, { progress });

  return res.status(StatusCodes.OK).send(
    new ApiResponse(StatusCodes.OK, 'Milestone deleted', { progress })
  );
});