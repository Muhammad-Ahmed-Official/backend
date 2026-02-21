import { Milestone } from '../models/milestone.models.js';
import { Project } from '../models/project.models.js';
import { Chat } from '../models/chat.models.js';
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
  const { title, description, dueDate, orderIndex } = req.body;

  if (!title || !title.trim()) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Title is required');
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
  if (milestone.status !== 'pending') {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Only pending milestones can be started');
  }

  const updated = await Milestone.updateStatus(milestoneId, 'in_progress');

  emitSocket(req, project.clientId, 'milestoneUpdate', {
    projectId: project.id,
    action: 'started',
    milestone: updated.toJSON(),
  });

  return res.status(StatusCodes.OK).send(
    new ApiResponse(StatusCodes.OK, 'Milestone started', { milestone: updated.toJSON() })
  );
});

// PATCH /api/v1/milestones/:milestoneId/submit  (Freelancer)
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
  if (milestone.status === 'approved') {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Milestone already approved');
  }
  if (milestone.status === 'submitted') {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Milestone already submitted, awaiting review');
  }

  const updated = await Milestone.updateStatus(milestoneId, 'submitted');

  // Send system message to client about submission
  const freelancerName = project.freelancer?.user_name || 'Freelancer';
  const chatMsg = `✅ Milestone "${milestone.title}" has been submitted for your review.`;
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

  return res.status(StatusCodes.OK).send(
    new ApiResponse(StatusCodes.OK, 'Milestone submitted for approval', { milestone: updated.toJSON() })
  );
});

// PATCH /api/v1/milestones/:milestoneId/approve  (Client)
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
  if (milestone.status !== 'submitted') {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Only submitted milestones can be approved');
  }

  const updated = await Milestone.updateStatus(milestoneId, 'approved');

  // Recalculate project progress
  const progress = await Milestone.calculateProjectProgress(milestone.projectId);
  await Project.findByIdAndUpdate(milestone.projectId, { progress });

  // Send system message to freelancer
  const chatMsg = `🎉 Milestone "${milestone.title}" has been approved! Overall progress: ${progress}%`;
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

  return res.status(StatusCodes.OK).send(
    new ApiResponse(StatusCodes.OK, 'Milestone approved', {
      milestone: updated.toJSON(),
      progress,
    })
  );
});

// PATCH /api/v1/milestones/:milestoneId/request-changes  (Client)
// Status does NOT change to approved — goes back to in_progress + message sent
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
  if (milestone.status !== 'submitted') {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Can only request changes on submitted milestones');
  }

  // Status goes back to in_progress (NOT approved)
  const updated = await Milestone.updateStatus(milestoneId, 'in_progress');

  // Send change request message to freelancer via existing chat
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

  return res.status(StatusCodes.OK).send(
    new ApiResponse(StatusCodes.OK, 'Changes requested and message sent to freelancer', {
      milestone: updated.toJSON(),
    })
  );
});

// DELETE /api/v1/milestones/:milestoneId  (Client only, not if approved)
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
  if (milestone.status === 'approved') {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Cannot delete an approved milestone');
  }

  await Milestone.delete(milestoneId);

  // Recalculate progress after deletion
  const progress = await Milestone.calculateProjectProgress(milestone.projectId);
  await Project.findByIdAndUpdate(milestone.projectId, { progress });

  return res.status(StatusCodes.OK).send(
    new ApiResponse(StatusCodes.OK, 'Milestone deleted', { progress })
  );
});
