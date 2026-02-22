import { Dispute } from '../models/dispute.models.js';
import { DisputeTimeline } from '../models/dispute_timeline.models.js';
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

    const openStatuses = ['open', 'under_review', 'awaiting_response', 'mediation', 'escalated', 'Pending', 'Under Review'];
    const resolvedStatuses = ['resolved', 'Resolved'];
    const closedStatuses = ['closed', 'denied', 'Denied', 'Closed'];

    const resolvedDisputes = disputes.filter(d => resolvedStatuses.includes(d.status) && d.resolvedAt && d.createdAt);
    const avgMs = resolvedDisputes.length > 0
        ? resolvedDisputes.reduce((sum, d) => {
            return sum + (new Date(d.resolvedAt).getTime() - new Date(d.createdAt).getTime());
        }, 0) / resolvedDisputes.length
        : 0;

    const stats = {
        total: disputes.length,
        open: disputes.filter(d => openStatuses.includes(d.status)).length,
        resolved: disputes.filter(d => resolvedStatuses.includes(d.status)).length,
        closed: disputes.filter(d => closedStatuses.includes(d.status)).length,
        avgResolutionDays: parseFloat((avgMs / (1000 * 60 * 60 * 24)).toFixed(1)),
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
    const { type, amount, description, decision } = req.body;
    const adminId = req.user.id;

    const dispute = await Dispute.resolve(id, {
        type,
        amount,
        description,
        decision,
        resolvedBy: adminId
    });

    // Record timeline event
    await DisputeTimeline.create({
        disputeId: id,
        type: decision === 'resolve' ? 'resolved' : 'closed',
        description: decision === 'resolve'
            ? `Dispute resolved by admin: ${description}`
            : `Dispute denied by admin: ${description}`,
        performedBy: adminId,
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
