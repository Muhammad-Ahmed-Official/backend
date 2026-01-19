import { Notification } from '../models/notification.models.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { StatusCodes } from 'http-status-codes';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getNotifications = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { limit } = req.query;
  const notifications = await Notification.findByUserId(userId, limit ? parseInt(limit) : 50);
  
  return res.status(StatusCodes.OK).send(
    new ApiResponse(StatusCodes.OK, 'Notifications fetched successfully', { 
      notifications: notifications.map(n => n.toJSON()) 
    })
  );
});

export const getUnreadCount = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const count = await Notification.findUnreadCount(userId);
  
  return res.status(StatusCodes.OK).send(
    new ApiResponse(StatusCodes.OK, 'Unread count fetched successfully', { count })
  );
});

export const markAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await Notification.markAsRead(id);
  
  return res.status(StatusCodes.OK).send(
    new ApiResponse(StatusCodes.OK, 'Notification marked as read')
  );
});

export const markAllAsRead = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  await Notification.markAllAsRead(userId);
  
  return res.status(StatusCodes.OK).send(
    new ApiResponse(StatusCodes.OK, 'All notifications marked as read')
  );
});
