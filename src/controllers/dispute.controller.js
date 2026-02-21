import { Dispute } from '../models/dispute.models.js';
import { Project } from '../models/project.models.js';
import { DisputeMessage } from '../models/dispute_message.models.js';
import { DisputeEvidence } from '../models/dispute_evidence.models.js';
import { Notification } from '../models/notification.models.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { StatusCodes } from 'http-status-codes';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getMyDisputes = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const role = req.user.role;
  const { status } = req.query;

  let disputes = await Dispute.findByUserId(userId, role);

  // Filter by status if provided
  if (status) {
    disputes = disputes.filter(d => d.status === status);
  }

  return res.status(StatusCodes.OK).send(
    new ApiResponse(StatusCodes.OK, 'Disputes fetched successfully', {
      disputes: disputes.map(d => d.toJSON())
    })
  );
});

export const getDisputeById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const dispute = await Dispute.findById(id);

  if (!dispute) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Dispute not found');
  }

  return res.status(StatusCodes.OK).send(
    new ApiResponse(StatusCodes.OK, 'Dispute fetched successfully', {
      dispute: dispute.toJSON()
    })
  );
});

export const createDispute = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { projectId, reason, description, amount } = req.body;

  if (!projectId || !reason) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Project ID and reason are required');
  }

  // Get project to find client/freelancer
  const project = await Project.findById(projectId);
  if (!project) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Project not found');
  }

  // Verify user is part of this project
  if (project.clientId !== userId && project.freelancerId !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You can only create disputes for your own projects');
  }

  const disputeData = {
    project_id: projectId,
    client_id: project.clientId,
    freelancer_id: project.freelancerId,
    reason,
    description: description || null,
    amount: amount ? parseFloat(amount) : null,
  };

  const dispute = await Dispute.create(disputeData);

  // Notify parties
  const otherPartyId = project.clientId === userId ? project.freelancerId : project.clientId;
  await Notification.create({
    userId: otherPartyId,
    type: 'dispute_created',
    title: 'New Dispute Created',
    message: `A dispute has been opened for project: ${project.title}`,
    relatedId: dispute.id
  });

  return res.status(StatusCodes.CREATED).send(
    new ApiResponse(StatusCodes.CREATED, 'Dispute created successfully', {
      dispute: dispute.toJSON()
    })
  );
});

export const getMessages = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const messages = await DisputeMessage.findByDisputeId(id);

  return res.status(StatusCodes.OK).send(
    new ApiResponse(StatusCodes.OK, 'Messages fetched successfully', { messages: messages.map(m => m.toJSON()) })
  );
});

export const sendMessage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { content, attachments } = req.body;
  const userId = req.user.id;

  const dispute = await Dispute.findById(id);
  if (!dispute) throw new ApiError(StatusCodes.NOT_FOUND, 'Dispute not found');

  const message = await DisputeMessage.create({
    disputeId: id,
    senderId: userId,
    content,
    attachments: attachments || []
  });

  // Notify other party
  const otherPartyId = dispute.clientId === userId ? dispute.freelancerId : dispute.clientId;
  await Notification.create({
    userId: otherPartyId,
    type: 'dispute_message',
    title: 'New Dispute Message',
    message: `${req.user.user_name} sent a message in dispute #${id.slice(0, 8)}`,
    relatedId: id
  });

  return res.status(StatusCodes.CREATED).send(
    new ApiResponse(StatusCodes.CREATED, 'Message sent successfully', { message: message.toJSON() })
  );
});

export const getEvidence = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const evidence = await DisputeEvidence.findByDisputeId(id);

  return res.status(StatusCodes.OK).send(
    new ApiResponse(StatusCodes.OK, 'Evidence fetched successfully', { evidence: evidence.map(e => e.toJSON()) })
  );
});

export const uploadEvidence = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { fileName, fileType, fileUrl, description } = req.body;
  const userId = req.user.id;

  const evidence = await DisputeEvidence.create({
    disputeId: id,
    fileName,
    fileType,
    fileUrl,
    description,
    uploadedBy: userId
  });

  return res.status(StatusCodes.CREATED).send(
    new ApiResponse(StatusCodes.CREATED, 'Evidence uploaded successfully', { evidence: evidence.toJSON() })
  );
});

export const escalateToSupport = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const dispute = await Dispute.findById(id);
  if (!dispute) throw new ApiError(StatusCodes.NOT_FOUND, 'Dispute not found');

  const updatedDispute = await Dispute.updateStatus(id, 'Under Review');

  return res.status(StatusCodes.OK).send(
    new ApiResponse(StatusCodes.OK, 'Dispute escalated successfully', { dispute: updatedDispute.toJSON() })
  );
});

export const updateDisputeStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['Pending', 'Resolved', 'Denied'].includes(status)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid status');
  }

  const dispute = await Dispute.updateStatus(id, status);

  return res.status(StatusCodes.OK).send(
    new ApiResponse(StatusCodes.OK, 'Dispute status updated successfully', {
      dispute: dispute.toJSON()
    })
  );
});
