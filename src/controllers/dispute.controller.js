import { Dispute } from '../models/dispute.models.js';
import { Project } from '../models/project.models.js';
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
  
  return res.status(StatusCodes.CREATED).send(
    new ApiResponse(StatusCodes.CREATED, 'Dispute created successfully', { 
      dispute: dispute.toJSON() 
    })
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
