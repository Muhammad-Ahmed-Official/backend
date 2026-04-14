import Stripe from 'stripe';
import { Project } from '../models/project.models.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { StatusCodes } from 'http-status-codes';
import { asyncHandler } from '../utils/asyncHandler.js';
import { responseMessages } from '../constant/responseMessages.js';
import { supabase } from '../config/supabase.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const { NO_DATA_FOUND, UPDATE_SUCCESS_MESSAGES, UPDATE_UNSUCCESS_MESSAGES } = responseMessages;

// Get all projects
export const getProjects = asyncHandler(async (req, res) => {
  const { status, category, search, clientId, freelancerId, available } = req.query;

  const filters = {};
  if (status) filters.status = status;
  if (category) filters.category = category;
  if (search) filters.search = search;
  if (clientId) filters.clientId = clientId;
  if (freelancerId) filters.freelancerId = freelancerId;
  if (available === 'true') filters.available = true;

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
// Requires a successful Stripe payment (paymentIntentId) before saving.
export const createProject = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { title, description, budget, currency, location, tags, category, duration, paymentIntentId } = req.body;

  if (!title || !description || !budget) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Title, description, and budget are required');
  }

  // Verify Stripe payment before creating the project
  if (!paymentIntentId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Payment is required to create a project');
  }

  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  if (paymentIntent.status !== 'succeeded') {
    throw new ApiError(StatusCodes.BAD_REQUEST, `Payment not completed. Status: ${paymentIntent.status}`);
  }
  const expectedCents = Math.round(parseFloat(budget) * 100);
  if (paymentIntent.amount !== expectedCents) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Payment amount does not match project budget');
  }

  const project = await Project.create({
    title,
    description,
    budget: parseFloat(budget),
    currency: currency || 'USD',
    location,
    tags: tags || [],
    category,
    duration,
    clientId: userId,
    paymentIntentId,
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

// Get current user's saved project IDs (for bookmark state)
export const getSavedProjectIds = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { data, error } = await supabase
    .from('saved_projects')
    .select('project_id')
    .eq('user_id', userId);
  if (error) {
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, error.message || 'Failed to fetch saved projects');
  }
  const projectIds = (data || []).map((row) => row.project_id);
  return res.status(StatusCodes.OK).send(
    new ApiResponse(StatusCodes.OK, 'Saved project IDs fetched', { projectIds })
  );
});

// Save (bookmark) a project
export const saveProject = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { id: projectId } = req.params;
  const project = await Project.findById(projectId);
  if (!project) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Project not found');
  }
  const { error } = await supabase
    .from('saved_projects')
    .upsert({ user_id: userId, project_id: projectId }, { onConflict: ['user_id', 'project_id'] });
  if (error) {
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, error.message || 'Failed to save project');
  }
  return res.status(StatusCodes.OK).send(
    new ApiResponse(StatusCodes.OK, 'Project saved', { saved: true })
  );
});

// Unsave (remove bookmark) a project
export const unsaveProject = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { id: projectId } = req.params;
  const { error } = await supabase
    .from('saved_projects')
    .delete()
    .eq('user_id', userId)
    .eq('project_id', projectId);
  if (error) {
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, error.message || 'Failed to unsave project');
  }
  return res.status(StatusCodes.OK).send(
    new ApiResponse(StatusCodes.OK, 'Project unsaved', { saved: false })
  );
});

