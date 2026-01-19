import { Proposal } from '../models/proposal.models.js';
import { Project } from '../models/project.models.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { StatusCodes } from 'http-status-codes';
import { asyncHandler } from '../utils/asyncHandler.js';
import { responseMessages } from '../constant/responseMessages.js';

const { UPDATE_SUCCESS_MESSAGES } = responseMessages;

// Get proposals for a project
export const getProjectProposals = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const proposals = await Proposal.findByProject(projectId);
  
  return res.status(StatusCodes.OK).send(
    new ApiResponse(StatusCodes.OK, 'Proposals fetched successfully', { proposals: proposals.map(p => p.toJSON()) })
  );
});

// Get freelancer's proposals
export const getMyProposals = asyncHandler(async (req, res) => {
  const freelancerId = req.user.id;
  const proposals = await Proposal.findByFreelancer(freelancerId);
  
  return res.status(StatusCodes.OK).send(
    new ApiResponse(StatusCodes.OK, 'Proposals fetched successfully', { proposals: proposals.map(p => p.toJSON()) })
  );
});

// Get all proposals for client's projects
export const getClientProposals = asyncHandler(async (req, res) => {
  const clientId = req.user.id;
  
  // Verify user is a client
  if (req.user.role !== 'Client') {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only clients can access this endpoint');
  }
  
  // Get all projects for this client
  const projects = await Project.findAll({ clientId });
  
  if (projects.length === 0) {
    return res.status(StatusCodes.OK).send(
      new ApiResponse(StatusCodes.OK, 'No proposals found', { proposals: [] })
    );
  }
  
  // Get all proposals for these projects
  const projectIds = projects.map(p => p.id);
  console.log('[Backend] Client projects:', projectIds);
  
  const allProposals = await Proposal.findByClientProjects(projectIds);
  console.log('[Backend] Found proposals:', allProposals.length);
  
  return res.status(StatusCodes.OK).send(
    new ApiResponse(StatusCodes.OK, 'Proposals fetched successfully', { 
      proposals: allProposals.map(p => p.toJSON()) 
    })
  );
});

// Create proposal
export const createProposal = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const freelancerId = req.user.id;
  const { coverLetter, bidAmount } = req.body;

  if (!coverLetter || !bidAmount) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Cover letter and bid amount are required');
  }

  // Verify user is a freelancer
  if (req.user.role !== 'Freelancer') {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only freelancers can submit proposals');
  }

  // Check if project exists
  const project = await Project.findById(projectId);
  if (!project) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Project not found');
  }

  // Check if project is active
  if (project.status !== 'ACTIVE') {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Cannot submit proposal to inactive project');
  }

  // Check if freelancer is trying to bid on their own project (shouldn't happen but safety check)
  if (project.clientId === freelancerId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'You cannot submit proposal to your own project');
  }

  const proposal = await Proposal.create({
    projectId,
    freelancerId,
    coverLetter,
    bidAmount: parseFloat(bidAmount),
  });

  return res.status(StatusCodes.CREATED).send(
    new ApiResponse(StatusCodes.CREATED, 'Proposal submitted successfully', { proposal: proposal.toJSON() })
  );
});

// Update proposal status (Accept/Reject)
export const updateProposalStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const userId = req.user.id;

  if (!['ACCEPTED', 'REJECTED'].includes(status)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid status. Must be ACCEPTED or REJECTED');
  }

  const proposal = await Proposal.findById(id, true);
  if (!proposal) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Proposal not found');
  }

  // Only project owner can accept/reject
  const project = await Project.findById(proposal.projectId);
  if (!project) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Project not found');
  }

  if (project.clientId !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only project owner can update proposal status');
  }

  const updatedProposal = await Proposal.findByIdAndUpdate(id, { status });

  // If accepted, assign freelancer to project and reject other proposals
  if (status === 'ACCEPTED') {
    // Update project: assign freelancer and set status to indicate proposal accepted
    // Status will be ACTIVE (since we only have ACTIVE, COMPLETED, CANCELLED)
    // Project with freelancerId set means proposal accepted but work not started
    await Project.findByIdAndUpdate(proposal.projectId, { 
      freelancerId: proposal.freelancerId,
      // Keep status as ACTIVE - project is active but now has assigned freelancer
      // Frontend can differentiate: if freelancerId exists, it means proposal accepted
    });

    // Reject all other proposals for this project
    const allProposals = await Proposal.findByProject(proposal.projectId);
    for (const prop of allProposals) {
      if (prop.id !== id && prop.status === 'PENDING') {
        await Proposal.findByIdAndUpdate(prop.id, { status: 'REJECTED' });
      }
    }
  }

  return res.status(StatusCodes.OK).send(
    new ApiResponse(StatusCodes.OK, UPDATE_SUCCESS_MESSAGES, { proposal: updatedProposal.toJSON() })
  );
});

// Delete proposal
export const deleteProposal = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const proposal = await Proposal.findById(id);
  if (!proposal) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Proposal not found');
  }

  // Only proposal owner can delete
  if (proposal.freelancerId !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You can only delete your own proposals');
  }

  // Cannot delete accepted proposals
  if (proposal.status === 'ACCEPTED') {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Cannot delete accepted proposal');
  }

  await Proposal.delete(id);
  
  return res.status(StatusCodes.OK).send(
    new ApiResponse(StatusCodes.OK, 'Proposal deleted successfully', {})
  );
});

