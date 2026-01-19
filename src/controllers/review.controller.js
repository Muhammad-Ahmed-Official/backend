import { Review } from '../models/review.models.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { StatusCodes } from 'http-status-codes';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getMyReviews = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const reviews = await Review.findByRevieweeId(userId);
  
  return res.status(StatusCodes.OK).send(
    new ApiResponse(StatusCodes.OK, 'Reviews fetched successfully', { 
      reviews: reviews.map(r => r.toJSON()) 
    })
  );
});

export const getAverageRating = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const avgRating = await Review.getAverageRating(userId);
  
  return res.status(StatusCodes.OK).send(
    new ApiResponse(StatusCodes.OK, 'Average rating fetched successfully', { 
      averageRating: parseFloat(avgRating),
      totalReviews: 0 // TODO: Add count
    })
  );
});

export const createReview = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { projectId, revieweeId, rating, comment } = req.body;
  
  if (!projectId || !revieweeId || !rating) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Project ID, reviewee ID, and rating are required');
  }
  
  if (rating < 1 || rating > 5) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Rating must be between 1 and 5');
  }
  
  const review = await Review.create({
    project_id: projectId,
    reviewer_id: userId,
    reviewee_id: revieweeId,
    rating: parseInt(rating),
    comment: comment || null,
  });
  
  return res.status(StatusCodes.CREATED).send(
    new ApiResponse(StatusCodes.CREATED, 'Review created successfully', { 
      review: review.toJSON() 
    })
  );
});
