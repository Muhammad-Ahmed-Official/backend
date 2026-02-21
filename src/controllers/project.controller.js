import { Project } from '../models/project.models.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { StatusCodes } from 'http-status-codes';
import { asyncHandler } from '../utils/asyncHandler.js';
import { responseMessages } from '../constant/responseMessages.js';

const { NO_DATA_FOUND, UPDATE_SUCCESS_MESSAGES, UPDATE_UNSUCCESS_MESSAGES } = responseMessages;

// Get all projects
export const getProjects = asyncHandler(async (req, res) => {
  const { status, category, search, clientId, freelancerId } = req.query;
  
  const filters = {};
  if (status) filters.status = status;
  if (category) filters.category = category;
  if (search) filters.search = search;
  if (clientId) filters.clientId = clientId;
  if (freelancerId) filters.freelancerId = freelancerId;

  console.log('[Projects] Fetching with filters:', filters);
  const projects = await Project.findAll(filters);
  console.log('[Projects] Found:', projects.length, 'projects');
  if (projects.length > 0) {
    console.log('[Projects] Sample status values:', projects.slice(0, 3).map(p => p.status));
  }
  
  return res.status(StatusCodes.OK).send(
    new ApiResponse(StatusCodes.OK, 'Projects fetched successfully', { projects: projects.map(p => p.toJSON()) })
  );
});

// Get project by ID
export const getProjectById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const project = await Project.findById(id, true);
  
  if (!project) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Project not found');
  }
  
  return res.status(StatusCodes.OK).send(
    new ApiResponse(StatusCodes.OK, 'Project fetched successfully', { project: project.toJSON() })
  );
});

// Create project (Client only)
export const createProject = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { title, description, budget, location, tags, category, duration } = req.body;

  if (!title || !description || !budget) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Title, description, and budget are required');
  }

  // Verify user is a client
  if (req.user.role !== 'Client') {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only clients can create projects');
  }

  const project = await Project.create({
    title,
    description,
    budget: parseFloat(budget),
    location,
    tags: tags || [],
    category,
    duration,
    clientId: userId,
  });

  return res.status(StatusCodes.CREATED).send(
    new ApiResponse(StatusCodes.CREATED, 'Project created successfully', { project: project.toJSON() })
  );
});

// Update project
export const updateProject = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const updateData = req.body;

  const project = await Project.findById(id);
  if (!project) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Project not found');
  }

  // Only client who created can update
  if (project.clientId !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You can only update your own projects');
  }

  const updatedProject = await Project.findByIdAndUpdate(id, updateData);
  
  return res.status(StatusCodes.OK).send(
    new ApiResponse(StatusCodes.OK, UPDATE_SUCCESS_MESSAGES, { project: updatedProject.toJSON() })
  );
});

// Delete project
export const deleteProject = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const project = await Project.findById(id);
  if (!project) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Project not found');
  }

  if (project.clientId !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You can only delete your own projects');
  }

  await Project.delete(id);
  
  return res.status(StatusCodes.OK).send(
    new ApiResponse(StatusCodes.OK, 'Project deleted successfully', {})
  );
});

