import { Question } from '../models/question.models.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { StatusCodes } from 'http-status-codes';
import { asyncHandler } from '../utils/asyncHandler.js';

const VALID_LEVELS = ['Bronze', 'Silver', 'Gold'];

// GET /api/v1/badges/admin/questions?skill=Python&level=Gold
export const listQuestions = asyncHandler(async (req, res) => {
  const { skill, level } = req.query;
  const questions = await Question.findAll({ skill, level });
  return res.status(StatusCodes.OK).send(
    new ApiResponse(StatusCodes.OK, 'Questions fetched', {
      questions: questions.map(q => q.toAdminJSON()),
    })
  );
});

// GET /api/v1/badges/admin/questions/:id
export const getQuestion = asyncHandler(async (req, res) => {
  const q = await Question.findById(req.params.id);
  if (!q) throw new ApiError(StatusCodes.NOT_FOUND, 'Question not found');
  return res.status(StatusCodes.OK).send(
    new ApiResponse(StatusCodes.OK, 'Question fetched', { question: q.toAdminJSON() })
  );
});

// POST /api/v1/badges/admin/questions
export const createQuestion = asyncHandler(async (req, res) => {
  const { skill, level, languageId, title, description, inputFormat, outputFormat, example, testCases } = req.body;

  if (!skill || !level || !languageId || !title || !description || !testCases) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'skill, level, languageId, title, description, and testCases are required');
  }
  if (!VALID_LEVELS.includes(level)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'level must be Bronze, Silver, or Gold');
  }
  if (!Array.isArray(testCases) || testCases.length === 0) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'testCases must be a non-empty array');
  }

  const q = await Question.create({ skill, level, languageId, title, description, inputFormat, outputFormat, example, testCases });
  return res.status(StatusCodes.CREATED).send(
    new ApiResponse(StatusCodes.CREATED, 'Question created', { question: q.toAdminJSON() })
  );
});

// PATCH /api/v1/badges/admin/questions/:id
export const updateQuestion = asyncHandler(async (req, res) => {
  const existing = await Question.findById(req.params.id);
  if (!existing) throw new ApiError(StatusCodes.NOT_FOUND, 'Question not found');

  const { title, description, inputFormat, outputFormat, example, testCases, isActive } = req.body;
  const updated = await Question.update(req.params.id, { title, description, inputFormat, outputFormat, example, testCases, isActive });

  return res.status(StatusCodes.OK).send(
    new ApiResponse(StatusCodes.OK, 'Question updated', { question: updated.toAdminJSON() })
  );
});

// DELETE /api/v1/badges/admin/questions/:id
export const deleteQuestion = asyncHandler(async (req, res) => {
  const existing = await Question.findById(req.params.id);
  if (!existing) throw new ApiError(StatusCodes.NOT_FOUND, 'Question not found');
  await Question.remove(req.params.id);
  return res.status(StatusCodes.OK).send(
    new ApiResponse(StatusCodes.OK, 'Question deleted', {})
  );
});
