import { Dispute } from '../models/dispute.models.js';
import { Notification } from '../models/notification.models.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { StatusCodes } from 'http-status-codes';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getAllDisputes = asyncHandler(async (req, res) => {
    const { status, priority } = req.query;
    const disputes = await Dispute.findAll({ status, priority });

    return res.status(StatusCodes.OK).send(
        new ApiResponse(StatusCodes.OK, 'All disputes fetched successfully', {
            disputes: disputes.map(d => d.toJSON())
        })
    );
});

export const getDisputeStats = asyncHandler(async (req, res) => {
    const disputes = await Dispute.findAll();

    const stats = {
        total: disputes.length,
        open: disputes.filter(d => ['Pending', 'Under Review'].includes(d.status)).length,
        resolved: disputes.filter(d => d.status === 'Resolved').length,
        closed: disputes.filter(d => d.status === 'Denied' || d.status === 'Closed').length,
    };

    return res.status(StatusCodes.OK).send(
        new ApiResponse(StatusCodes.OK, 'Dispute statistics fetched successfully', { stats })
    );
});

export const assignMediator = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { mediatorId } = req.body;

    if (!mediatorId) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Mediator ID is required');
    }

    const dispute = await Dispute.assignMediator(id, mediatorId);

    return res.status(StatusCodes.OK).send(
        new ApiResponse(StatusCodes.OK, 'Mediator assigned successfully', {
            dispute: dispute.toJSON()
        })
    );
});

export const updatePriority = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { priority } = req.body;

    if (!['low', 'medium', 'high', 'urgent'].includes(priority)) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid priority level');
    }

    const dispute = await Dispute.updatePriority(id, priority);

    return res.status(StatusCodes.OK).send(
        new ApiResponse(StatusCodes.OK, 'Dispute priority updated successfully', {
            dispute: dispute.toJSON()
        })
    );
});

export const resolveDispute = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { type, amount, description, terms, decision } = req.body;
    const adminId = req.user.id;

    const dispute = await Dispute.resolve(id, {
        type,
        amount,
        description,
        terms,
        decision,
        resolvedBy: adminId
    });

    // Notify parties
    const partyIds = [dispute.clientId, dispute.freelancerId];
    for (const partyId of partyIds) {
        if (partyId) {
            await Notification.create({
                userId: partyId,
                type: 'dispute_resolved',
                title: `Dispute ${decision === 'resolve' ? 'Resolved' : 'Denied'}`,
                message: `Your dispute #${id.slice(0, 8)} has been ${decision === 'resolve' ? 'resolved' : 'denied'} by admin.`,
                relatedId: id
            });
        }
    }

    return res.status(StatusCodes.OK).send(
        new ApiResponse(StatusCodes.OK, `Dispute ${decision === 'resolve' ? 'resolved' : 'denied'} successfully`, {
            dispute: dispute.toJSON()
        })
    );
});
