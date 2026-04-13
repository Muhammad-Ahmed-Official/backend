import { Dispute } from '../models/dispute.models.js';
import { DisputeMessage } from '../models/dispute_message.models.js';
import { DisputeTimeline } from '../models/dispute_timeline.models.js';
import { Notification } from '../models/notification.models.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { StatusCodes } from 'http-status-codes';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  sendDisputeStatusEmail,
  sendDisputeResolvedEmail,
  sendDisputeQuestionEmail,
} from '../utils/sendEmail.js';
import { supabase } from '../config/supabase.js';

async function getUserEmail(userId) {
  if (!userId) return null;
  const { data } = await supabase.from('users').select('email').eq('id', userId).single();
  return data?.email || null;
}

export const getAllDisputes = asyncHandler(async (req, res) => {
    const { status, priority, escalated } = req.query;
    const filters = { status, priority };
    if (escalated === 'true') filters.escalated = true;

    const disputes = await Dispute.findAll(filters);

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

    const totalCount = disputes.length;
    const escalatedCount = disputes.filter(d => d.isEscalated).length;
    const escalationRate = totalCount > 0 ? parseFloat(((escalatedCount / totalCount) * 100).toFixed(1)) : 0;

    // SLA: open disputes not reviewed within 48 hours
    const cutoff48h = Date.now() - 48 * 60 * 60 * 1000;
    const slaBreachCount = disputes.filter(d =>
        d.status === 'open' && new Date(d.createdAt).getTime() < cutoff48h
    ).length;

    const stats = {
        total: totalCount,
        open: disputes.filter(d => openStatuses.includes(d.status)).length,
        resolved: disputes.filter(d => resolvedStatuses.includes(d.status)).length,
        closed: disputes.filter(d => closedStatuses.includes(d.status)).length,
        escalated: escalatedCount,
        escalationRate,
        slaBreachCount,
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

export const startReview = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const adminId = req.user.id;

    const dispute = await Dispute.findById(id);
    if (!dispute) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Dispute not found');
    }

    if (dispute.status !== 'open') {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Only open disputes can be moved to Under Review');
    }

    await Dispute.updateStatus(id, 'under_review');

    await DisputeTimeline.create({
        disputeId: id,
        type: 'status_change',
        description: 'Admin started reviewing the dispute',
        performedBy: adminId,
    });

    // Notify and email both parties
    const partyIds = [dispute.clientId, dispute.freelancerId].filter(Boolean);
    for (const partyId of partyIds) {
        await Notification.create({
            userId: partyId,
            type: 'dispute_status_update',
            title: 'Your dispute is under review',
            message: `Dispute #${id.slice(0, 8)} is now being reviewed by our team.`,
            relatedId: id,
        });
        const email = await getUserEmail(partyId);
        if (email) {
            sendDisputeStatusEmail(email, {
                projectTitle: dispute.project?.title || 'your project',
                disputeId: id.slice(0, 8),
                status: 'Under Review',
                message: 'Our team has started reviewing your dispute. We will update you within 24-48 hours.',
            });
        }
    }

    return res.status(StatusCodes.OK).send(
        new ApiResponse(StatusCodes.OK, 'Dispute moved to Under Review', {})
    );
});

export const askQuestion = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { question } = req.body;
    const adminId = req.user.id;

    if (!question || !question.trim()) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Question text is required');
    }

    const dispute = await Dispute.findById(id);
    if (!dispute) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Dispute not found');
    }

    // Save question as a message with type 'admin_question'
    const message = await DisputeMessage.create({
        disputeId: id,
        senderId: adminId,
        content: question.trim(),
        messageType: 'admin_question',
        isInternal: false,
    });

    // Auto-advance status: open/under_review → mediation when admin engages with a question
    if (['open', 'under_review'].includes(dispute.status)) {
        await Dispute.updateStatus(id, 'mediation');
    }

    // Record timeline event
    await DisputeTimeline.create({
        disputeId: id,
        type: 'admin_question',
        description: `Admin asked: ${question.trim().slice(0, 100)}${question.trim().length > 100 ? '…' : ''}`,
        performedBy: adminId,
    });

    // Notify and email both client and freelancer
    const partyIds = [dispute.clientId, dispute.freelancerId].filter(Boolean);
    for (const partyId of partyIds) {
        await Notification.create({
            userId: partyId,
            type: 'dispute_question',
            title: 'Admin has a question about your dispute',
            message: `Dispute #${id.slice(0, 8)}: ${question.trim().slice(0, 120)}${question.trim().length > 120 ? '…' : ''}`,
            relatedId: id,
        });
        const email = await getUserEmail(partyId);
        if (email) {
            sendDisputeQuestionEmail(email, { disputeId: id.slice(0, 8), question: question.trim() });
        }
    }

    return res.status(StatusCodes.CREATED).send(
        new ApiResponse(StatusCodes.CREATED, 'Question sent successfully', {
            message: message.toJSON(),
        })
    );
});

// POST /api/v1/admin/disputes/:id/mediation-recommendation
export const setMediationRecommendation = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { recommendation } = req.body;
    const adminId = req.user.id;

    if (!recommendation || !recommendation.trim()) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Recommendation text is required');
    }

    const dispute = await Dispute.findById(id);
    if (!dispute) throw new ApiError(StatusCodes.NOT_FOUND, 'Dispute not found');

    let updated;
    try {
      updated = await Dispute.setMediationRecommendation(id, recommendation.trim());
      // Reset acceptance flags so parties need to re-vote on the new recommendation
      await Dispute.updateFields(id, { client_accepted: null, freelancer_accepted: null });
    } catch (_) {
      // New columns not yet migrated — fall back to status-only update
      await Dispute.updateStatus(id, 'mediation');
      updated = await Dispute.findById(id);
    }

    await DisputeTimeline.create({
        disputeId: id,
        type: 'mediation_recommendation',
        description: `Admin issued mediation recommendation: ${recommendation.trim().slice(0, 100)}`,
        performedBy: adminId,
    });

    const partyIds = [dispute.clientId, dispute.freelancerId].filter(Boolean);
    for (const partyId of partyIds) {
        await Notification.create({
            userId: partyId,
            type: 'dispute_status_update',
            title: 'Mediation Recommendation Issued',
            message: `An admin has issued a mediation recommendation for dispute #${id.slice(0, 8)}. Please review and respond.`,
            relatedId: id,
        });
        const email = await getUserEmail(partyId);
        if (email) {
            sendDisputeStatusEmail(email, {
                projectTitle: dispute.project?.title || 'your project',
                disputeId: id.slice(0, 8),
                status: 'Mediation',
                message: `A mediation recommendation has been issued: <em>${recommendation.trim()}</em>. Please log in to accept or reject.`,
            });
        }
    }

    const finalDispute = await Dispute.findById(id);
    return res.status(StatusCodes.OK).send(
        new ApiResponse(StatusCodes.OK, 'Mediation recommendation issued', { dispute: finalDispute.toJSON() })
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

    // Notify and email parties
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
            const email = await getUserEmail(partyId);
            if (email) {
                sendDisputeResolvedEmail(email, {
                    projectTitle: dispute.project?.title || 'your project',
                    disputeId: id.slice(0, 8),
                    decision,
                    adminNotes: description,
                });
            }
        }
    }

    return res.status(StatusCodes.OK).send(
        new ApiResponse(StatusCodes.OK, `Dispute ${decision === 'resolve' ? 'resolved' : 'denied'} successfully`, {
            dispute: dispute.toJSON()
        })
    );
});
