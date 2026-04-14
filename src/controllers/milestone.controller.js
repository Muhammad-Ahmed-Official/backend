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
import { sendMilestoneSubmittedAdminEmail } from '../utils/sendEmail.js';

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

  if (req.user.role !== 'Freelancer' && project.clientId !== userId) {
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

// PATCH /api/v1/milestones/:milestoneId/fund-external  (Client only)
// Records escrow as HELD without deducting in-app wallet (payment made off-platform, e.g. PayPal to owner).
export const fundMilestoneExternal = asyncHandler(async (req, res) => {
  const { milestoneId } = req.params;
  const userId = req.user.id;

  const milestone = await Milestone.findById(milestoneId);
  if (!milestone) throw new ApiError(StatusCodes.NOT_FOUND, 'Milestone not found');

  const project = await Project.findById(milestone.projectId);
  if (!project) throw new ApiError(StatusCodes.NOT_FOUND, 'Project not found');
  if (project.clientId !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only the client can fund milestones');
  }
  if (!project.freelancerId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Assign a freelancer before funding milestones');
  }
  if (!milestone.amount || milestone.amount <= 0) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Milestone amount must be set before funding');
  }
  if (milestone.status !== 'pending') {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Only pending milestones can be funded');
  }

  const existing = await EscrowTransaction.findHeldByMilestoneId(milestoneId);
  if (existing) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'This milestone already has active escrow');
  }

  await EscrowTransaction.createHeld({
    milestoneId,
    payerId: userId,
    payeeId: project.freelancerId,
    amount: milestone.amount,
  });
  const updated = await Milestone.updateStatus(milestoneId, 'funded');

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
    new ApiResponse(StatusCodes.OK, 'Milestone funded (off-platform payment recorded)', {
      milestone: updated.toJSON(),
    })
  );
});

// POST /api/v1/projects/:projectId/milestones/fund-all-external  (Client only)
// Unlocks every pending milestone with an amount (off-platform / PayPal) in one action.
export const fundAllMilestonesExternal = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const userId = req.user.id;

  const project = await Project.findById(projectId);
  if (!project) throw new ApiError(StatusCodes.NOT_FOUND, 'Project not found');
  if (project.clientId !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only the client can unlock milestones');
  }
  if (!project.freelancerId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Assign a freelancer before unlocking milestones');
  }

  const milestones = await Milestone.findByProjectId(projectId);
  const unlocked = [];

  for (const milestone of milestones) {
    if (milestone.status !== 'pending' || !milestone.amount || milestone.amount <= 0) continue;
    const existing = await EscrowTransaction.findHeldByMilestoneId(milestone.id);
    if (existing) continue;

    await EscrowTransaction.createHeld({
      milestoneId: milestone.id,
      payerId: userId,
      payeeId: project.freelancerId,
      amount: milestone.amount,
    });
    const updated = await Milestone.updateStatus(milestone.id, 'funded');
    unlocked.push(updated.toJSON());

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
    new ApiResponse(StatusCodes.OK, `Unlocked ${unlocked.length} milestone(s) for the freelancer`, {
      milestones: unlocked,
      count: unlocked.length,
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
  const { githubUrl } = req.body;

  // Validate GitHub URL if provided
  if (githubUrl) {
    const isValidGithubUrl = /^https?:\/\/(www\.)?github\.com\/.+/.test(githubUrl.trim());
    if (!isValidGithubUrl) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid GitHub URL — must start with https://github.com/');
    }
  }

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
  const submittable = ['pending', 'funded', 'in_progress'];
  if (!submittable.includes(milestone.status)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Milestone cannot be submitted in its current state');
  }

  const now = new Date();
  const reviewDeadline = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days

  const updated = await Milestone.updateStatus(milestoneId, 'in_review', {
    submitted_at: now.toISOString(),
    review_deadline: reviewDeadline.toISOString(),
    ...(githubUrl ? { submission_github_url: githubUrl.trim() } : {}),
  });

  // Send system message to client
  const githubLine = githubUrl ? `\n🔗 GitHub: ${githubUrl.trim()}` : '';
  const chatMsg = `✅ Milestone "${milestone.title}" has been submitted. Please accept or reject in the app.${githubLine}`;
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
    message: `"${milestone.title}" has been submitted. Accept or reject in the app.`,
    relatedId: project.id,
  }).catch(() => {});

  try {
    const clientData = project.client || { id: project.clientId };
    const freelancerData = project.freelancer || { id: project.freelancerId };
    await sendMilestoneSubmittedAdminEmail({
      project: {
        id: project.id,
        title: project.title,
        description: project.description,
        budget: project.budget,
        status: project.status,
      },
      client: {
        id: clientData.id || project.clientId,
        email: clientData.email || '',
        userName: clientData.userName || clientData.user_name || '',
      },
      freelancer: {
        id: freelancerData.id || project.freelancerId,
        email: freelancerData.email || '',
        userName: freelancerData.userName || freelancerData.user_name || '',
      },
      milestone: {
        id: milestone.id,
        title: milestone.title,
        description: milestone.description,
        amount: milestone.amount,
        submittedAt: updated.submittedAt,
      },
    });
  } catch (emailErr) {
    console.error('[submitMilestone] Admin notification email failed:', emailErr);
  }

  return res.status(StatusCodes.OK).send(
    new ApiResponse(StatusCodes.OK, 'Milestone submitted for review', { milestone: updated.toJSON() })
  );
});

// PATCH /api/v1/milestones/:milestoneId/approve  (Client)
// Marks milestone as released and notifies admin via email to release payment to freelancer.
// Funds are NOT automatically transferred to the freelancer wallet — admin handles payment manually.
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
  if (milestone.status === 'disputed') {
    throw new ApiError(StatusCodes.CONFLICT, 'Cannot approve a milestone with an active dispute. Resolve the dispute first.');
  }

  if (milestone.status !== 'in_review' && milestone.status !== 'submitted') {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Milestone must be in review before approving');
  }

  // Mark escrow as RELEASED (without moving funds to freelancer wallet — admin handles this manually)
  const escrow = await EscrowTransaction.findHeldByMilestoneId(milestoneId);
  if (escrow) {
    await EscrowTransaction.markAsReleased(milestoneId);
  }

  // Update milestone status to 'released'
  const updated = await Milestone.updateStatus(milestoneId, 'released', {
    approved_at: new Date().toISOString(),
  });

  // Recalculate project progress
  const progress = await Milestone.calculateProjectProgress(milestone.projectId);
  await Project.findByIdAndUpdate(milestone.projectId, { progress });

  // Admin is notified when the freelancer submits work; no duplicate email on client accept.

  // Notify freelancer via chat: payment is pending admin release
  const chatMsg = `🎉 Milestone "${milestone.title}" has been approved! Payment of $${Number(milestone.amount || 0).toFixed(2)} is pending release by the admin. You will be contacted once the payment is processed. Overall progress: ${progress}%`;
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
    title: 'Milestone Approved — Payment Pending',
    message: `"${milestone.title}" was approved. Payment of $${Number(milestone.amount || 0).toFixed(2)} is pending release by the admin.`,
    relatedId: project.id,
  }).catch(() => {});

  return res.status(StatusCodes.OK).send(
    new ApiResponse(StatusCodes.OK, 'Milestone accepted — admin was notified at submission to release payment', {
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