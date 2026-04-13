import { Dispute } from '../models/dispute.models.js';
import { Project } from '../models/project.models.js';
import { Milestone } from '../models/milestone.models.js';
import { DisputeMessage } from '../models/dispute_message.models.js';
import { DisputeEvidence } from '../models/dispute_evidence.models.js';
import { DisputeTimeline } from '../models/dispute_timeline.models.js';
import { Notification } from '../models/notification.models.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { StatusCodes } from 'http-status-codes';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  sendDisputeCreatedEmail,
  sendDisputeStatusEmail,
  sendDisputeResolvedEmail,
} from '../utils/sendEmail.js';
import { supabase } from '../config/supabase.js';

// Helper: fetch user email by ID
async function getUserEmail(userId) {
  if (!userId) return null;
  const { data } = await supabase.from('users').select('email').eq('id', userId).single();
  return data?.email || null;
}

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
  const { projectId, reason, subcategory, description, amount, milestoneId } = req.body;

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

  // If milestoneId provided, verify it belongs to this project
  if (milestoneId) {
    const milestone = await Milestone.findById(milestoneId);
    if (!milestone || milestone.projectId !== projectId) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Milestone does not belong to this project');
    }
  }

  // Only include the columns that are guaranteed to exist in the current schema
  const disputeData = {
    project_id: projectId,
    client_id: project.clientId,
    freelancer_id: project.freelancerId,
    reason,
    description: description || null,
    amount: amount ? parseFloat(amount) : null,
    status: 'open',
    milestone_id: milestoneId || null,
  };

  const dispute = await Dispute.create(disputeData);

  // Attempt to set new columns (response_deadline, stage_deadline, subcategory).
  // These only exist after running dispute_enhanced_schema.sql — if the migration
  // hasn't been applied yet the update is silently skipped so creation still works.
  const responseDeadline = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
  const stageDeadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  try {
    await Dispute.updateFields(dispute.id, {
      response_deadline: responseDeadline,
      stage_deadline: stageDeadline,
      ...(subcategory ? { subcategory } : {}),
    });
  } catch (_) {
    // Migration not yet applied — new fields unavailable, dispute was still created
  }

  // Freeze the milestone — stops auto-release and signals funds are locked
  if (milestoneId) {
    await Milestone.updateStatus(milestoneId, 'disputed');
  }

  // Record timeline event for creation
  await DisputeTimeline.create({
    disputeId: dispute.id,
    type: 'created',
    description: `Dispute opened: ${reason}`,
    performedBy: userId,
  });

  // Notify and email other party
  const otherPartyId = project.clientId === userId ? project.freelancerId : project.clientId;
  await Notification.create({
    userId: otherPartyId,
    type: 'dispute_created',
    title: 'New Dispute Created',
    message: `A dispute has been opened for project: ${project.title}. You have 72 hours to respond.`,
    relatedId: dispute.id
  });

  // Send email to both parties (fire and forget)
  const deadlineStr = new Date(responseDeadline).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
  const [otherEmail, filerEmail] = await Promise.all([
    getUserEmail(otherPartyId),
    getUserEmail(userId),
  ]);
  if (otherEmail) {
    sendDisputeCreatedEmail(otherEmail, {
      projectTitle: project.title,
      disputeId: dispute.id.slice(0, 8),
      reason,
      deadline: deadlineStr,
    });
  }
  if (filerEmail) {
    sendDisputeCreatedEmail(filerEmail, {
      projectTitle: project.title,
      disputeId: dispute.id.slice(0, 8),
      reason,
      deadline: null,
    });
  }

  return res.status(StatusCodes.CREATED).send(
    new ApiResponse(StatusCodes.CREATED, 'Dispute created successfully', {
      dispute: dispute.toJSON()
    })
  );
});

export const getMessages = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const messages = await DisputeMessage.findByDisputeId(id);

  return res.status(StatusCodes.OK).send(
    new ApiResponse(StatusCodes.OK, 'Messages fetched successfully', { messages: messages.map(m => m.toJSON()) })
  );
});

export const sendMessage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { content, attachments } = req.body;
  const userId = req.user.id;

  const dispute = await Dispute.findById(id);
  if (!dispute) throw new ApiError(StatusCodes.NOT_FOUND, 'Dispute not found');

  if (dispute.clientId !== userId && dispute.freelancerId !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You are not a party to this dispute');
  }

  const message = await DisputeMessage.create({
    disputeId: id,
    senderId: userId,
    content,
    attachments: attachments || []
  });

  // Notify other party
  const otherPartyId = dispute.clientId === userId ? dispute.freelancerId : dispute.clientId;
  await Notification.create({
    userId: otherPartyId,
    type: 'dispute_message',
    title: 'New Dispute Message',
    message: `${req.user.user_name} sent a message in dispute #${id.slice(0, 8)}`,
    relatedId: id
  });

  return res.status(StatusCodes.CREATED).send(
    new ApiResponse(StatusCodes.CREATED, 'Message sent successfully', { message: message.toJSON() })
  );
});

export const getEvidence = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const evidence = await DisputeEvidence.findByDisputeId(id);

  return res.status(StatusCodes.OK).send(
    new ApiResponse(StatusCodes.OK, 'Evidence fetched successfully', { evidence: evidence.map(e => e.toJSON()) })
  );
});

export const uploadEvidence = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const dispute = await Dispute.findById(id);
  if (!dispute) throw new ApiError(StatusCodes.NOT_FOUND, 'Dispute not found');

  if (dispute.clientId !== userId && dispute.freelancerId !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You are not a party to this dispute');
  }

  let fileName = req.body.fileName;
  let fileType = req.body.fileType;
  let fileUrl  = req.body.fileUrl;
  const description = req.body.description || '';

  console.log('[Evidence] Upload request — req.file:', req.file ? `${req.file.originalname} (${req.file.size} bytes)` : 'MISSING');
  console.log('[Evidence] req.body:', { fileName, fileType, fileUrl: fileUrl?.slice(0, 60) });

  // If a real file was uploaded (via multer), push it to Supabase Storage
  if (req.file) {
    fileName = fileName || req.file.originalname;
    fileType = fileType || req.file.mimetype;

    const storagePath = `disputes/${id}/${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    console.log('[Evidence] Uploading to Supabase Storage path:', storagePath);

    const { error: uploadError } = await supabase.storage
      .from('dispute-evidence')
      .upload(storagePath, req.file.buffer, {
        contentType: fileType,
        upsert: false,
      });

    if (uploadError) {
      console.error('[Evidence] Supabase Storage upload FAILED:', uploadError.message);
      // Throw so the client sees a real error instead of silently storing a local URI
      throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, `Storage upload failed: ${uploadError.message}. Create the 'dispute-evidence' bucket in Supabase Dashboard → Storage.`);
    } else {
      const { data: urlData } = supabase.storage
        .from('dispute-evidence')
        .getPublicUrl(storagePath);
      fileUrl = urlData.publicUrl;
      console.log('[Evidence] Stored public URL:', fileUrl);
    }
  } else {
    console.warn('[Evidence] No req.file — multer did not receive a file. Falling back to body fileUrl.');
  }

  if (!fileName) throw new ApiError(StatusCodes.BAD_REQUEST, 'fileName is required');
  if (!fileUrl)  throw new ApiError(StatusCodes.BAD_REQUEST, 'No file received and no fallback URL provided');

  const evidence = await DisputeEvidence.create({
    disputeId: id,
    fileName,
    fileType,
    fileUrl,
    description,
    uploadedBy: userId,
  });

  return res.status(StatusCodes.CREATED).send(
    new ApiResponse(StatusCodes.CREATED, 'Evidence uploaded successfully', { evidence: evidence.toJSON() })
  );
});

export const escalateToSupport = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const userId = req.user.id;

  const dispute = await Dispute.findById(id);
  if (!dispute) throw new ApiError(StatusCodes.NOT_FOUND, 'Dispute not found');

  if (dispute.clientId !== userId && dispute.freelancerId !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You are not a party to this dispute');
  }

  // Already escalated — prevent duplicates
  if (dispute.isEscalated) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'This dispute has already been escalated');
  }

  // Cannot escalate a resolved/closed dispute
  if (['resolved', 'closed', 'denied', 'Resolved', 'Denied', 'Closed'].includes(dispute.status)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Resolved disputes cannot be escalated');
  }

  if (!reason?.trim()) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'A reason for escalation is required');
  }

  // Set escalation flag — status stays unchanged (Open / Under Review / Mediation)
  const updatedDispute = await Dispute.escalate(id, reason.trim());

  await DisputeTimeline.create({
    disputeId: id,
    type: 'escalated',
    description: `Escalated by party: "${reason.trim()}"`,
    performedBy: userId,
  });

  // Notify the admin queue (notify other party too)
  const otherPartyId = dispute.clientId === userId ? dispute.freelancerId : dispute.clientId;
  if (otherPartyId) {
    await Notification.create({
      userId: otherPartyId,
      type: 'dispute_status_update',
      title: 'Dispute Escalated',
      message: `Dispute #${id.slice(0, 8)} has been flagged as urgent by the other party.`,
      relatedId: id,
    });
  }

  return res.status(StatusCodes.OK).send(
    new ApiResponse(StatusCodes.OK, 'Dispute escalated successfully', { dispute: updatedDispute.toJSON() })
  );
});

export const updateDisputeStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const userId = req.user.id;

  const dispute = await Dispute.findById(id);
  if (!dispute) throw new ApiError(StatusCodes.NOT_FOUND, 'Dispute not found');

  if (dispute.clientId !== userId && dispute.freelancerId !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You are not a party to this dispute');
  }

  // Users can only withdraw (close) their own dispute
  if (status !== 'closed') {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Users may only withdraw (close) their own disputes');
  }

  const updatedDispute = await Dispute.updateStatus(id, status);

  await DisputeTimeline.create({
    disputeId: id,
    type: 'closed',
    description: 'Dispute withdrawn by party',
    performedBy: userId,
  });

  return res.status(StatusCodes.OK).send(
    new ApiResponse(StatusCodes.OK, 'Dispute withdrawn successfully', {
      dispute: updatedDispute.toJSON()
    })
  );
});

// PUT /api/v1/disputes/:id/respond
// The respondent (non-filer party) submits their initial response: accepted | rejected | counter
export const respondToDispute = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { response } = req.body; // 'accepted' | 'rejected' | 'counter'
  const userId = req.user.id;

  if (!['accepted', 'rejected', 'counter'].includes(response)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Response must be accepted, rejected, or counter');
  }

  const dispute = await Dispute.findById(id);
  if (!dispute) throw new ApiError(StatusCodes.NOT_FOUND, 'Dispute not found');

  if (dispute.clientId !== userId && dispute.freelancerId !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You are not a party to this dispute');
  }

  if (['resolved', 'closed', 'denied'].includes(dispute.status)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Cannot respond to a resolved dispute');
  }

  // Advance status to awaiting_response if still open
  const newStatus = dispute.status === 'open' ? 'awaiting_response' : dispute.status;
  // Update status (always-existing column) separately from respondent_response (new column)
  await Dispute.updateStatus(id, newStatus);
  // respondent_response only exists after migration — silently skip if column missing
  try {
    await Dispute.updateFields(id, { respondent_response: response });
  } catch (_) {}


  await DisputeTimeline.create({
    disputeId: id,
    type: 'respondent_response',
    description: `Respondent ${response === 'accepted' ? 'accepted the dispute claim' : response === 'rejected' ? 'rejected the dispute claim' : 'offered a counter-proposal'}`,
    performedBy: userId,
  });

  // Notify filer
  const filerId = dispute.clientId === userId ? dispute.freelancerId : dispute.clientId;
  await Notification.create({
    userId: filerId,
    type: 'dispute_status_update',
    title: 'Dispute Response Received',
    message: `The other party has ${response === 'accepted' ? 'accepted your dispute claim' : response === 'rejected' ? 'rejected your dispute claim' : 'proposed a counter-offer'}.`,
    relatedId: id,
  });

  const updatedDispute = await Dispute.findById(id);
  return res.status(StatusCodes.OK).send(
    new ApiResponse(StatusCodes.OK, 'Response submitted successfully', { dispute: updatedDispute.toJSON() })
  );
});

// PUT /api/v1/disputes/:id/mediation-accept
// Both parties independently accept or reject the mediation recommendation
export const acceptMediationProposal = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const role = req.user.role; // 'Client' | 'Freelancer'

  const dispute = await Dispute.findById(id);
  if (!dispute) throw new ApiError(StatusCodes.NOT_FOUND, 'Dispute not found');

  if (dispute.clientId !== userId && dispute.freelancerId !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You are not a party to this dispute');
  }

  if (!dispute.mediationRecommendation) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'No mediation recommendation has been issued yet');
  }

  let updated;
  try {
    updated = await Dispute.acceptMediation(id, role);
  } catch (_) {
    // Column not yet migrated — treat as accepted without storing the flag
    updated = dispute;
  }

  await DisputeTimeline.create({
    disputeId: id,
    type: 'mediation_accepted',
    description: `${role} accepted the mediation recommendation`,
    performedBy: userId,
  });

  // Check if both parties have now accepted → auto-resolve
  if (updated.clientAccepted && updated.freelancerAccepted) {
    await Dispute.updateStatus(id, 'resolved');
    await DisputeTimeline.create({
      disputeId: id,
      type: 'resolved',
      description: 'Dispute resolved by mutual acceptance of mediation recommendation',
      performedBy: userId,
    });

    // Notify both
    const partyIds = [dispute.clientId, dispute.freelancerId].filter(Boolean);
    for (const partyId of partyIds) {
      await Notification.create({
        userId: partyId,
        type: 'dispute_resolved',
        title: 'Dispute Resolved',
        message: `Both parties accepted the mediation recommendation for dispute #${id.slice(0, 8)}.`,
        relatedId: id,
      });
      const email = await getUserEmail(partyId);
      if (email) {
        sendDisputeResolvedEmail(email, {
          projectTitle: dispute.project?.title || 'your project',
          disputeId: id.slice(0, 8),
          decision: 'resolved',
          adminNotes: dispute.mediationRecommendation,
        });
      }
    }
  } else {
    // Notify other party that this party accepted
    const otherPartyId = dispute.clientId === userId ? dispute.freelancerId : dispute.clientId;
    await Notification.create({
      userId: otherPartyId,
      type: 'dispute_status_update',
      title: 'Mediation Acceptance',
      message: `The other party has accepted the mediation recommendation. Waiting for your response.`,
      relatedId: id,
    });
  }

  const finalDispute = await Dispute.findById(id);
  return res.status(StatusCodes.OK).send(
    new ApiResponse(StatusCodes.OK, 'Mediation acceptance recorded', { dispute: finalDispute.toJSON() })
  );
});

// PUT /api/v1/disputes/:id/mediation-reject
// A party rejects the mediation recommendation → escalate to arbitration
export const rejectMediationProposal = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const role = req.user.role;

  const dispute = await Dispute.findById(id);
  if (!dispute) throw new ApiError(StatusCodes.NOT_FOUND, 'Dispute not found');

  if (dispute.clientId !== userId && dispute.freelancerId !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You are not a party to this dispute');
  }

  if (!dispute.mediationRecommendation) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'No mediation recommendation has been issued yet');
  }

  // Record rejection — silently skip if new columns not yet migrated
  try {
    await Dispute.rejectMediation(id, role);
  } catch (_) {}

  // Escalate via existing is_escalated column (always exists)
  await Dispute.escalate(id, `${role} rejected the mediation recommendation`);

  await DisputeTimeline.create({
    disputeId: id,
    type: 'mediation_rejected',
    description: `${role} rejected the mediation recommendation — escalated to admin arbitration`,
    performedBy: userId,
  });

  // Notify both parties
  const partyIds = [dispute.clientId, dispute.freelancerId].filter(Boolean);
  for (const partyId of partyIds) {
    await Notification.create({
      userId: partyId,
      type: 'dispute_status_update',
      title: 'Dispute Escalated to Arbitration',
      message: `Mediation was rejected. Dispute #${id.slice(0, 8)} has been escalated for admin arbitration.`,
      relatedId: id,
    });
  }

  const finalDispute = await Dispute.findById(id);
  return res.status(StatusCodes.OK).send(
    new ApiResponse(StatusCodes.OK, 'Mediation rejected — dispute escalated', { dispute: finalDispute.toJSON() })
  );
});

export const getTimeline = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const timeline = await DisputeTimeline.findByDisputeId(id);

  return res.status(StatusCodes.OK).send(
    new ApiResponse(StatusCodes.OK, 'Timeline fetched successfully', {
      timeline: timeline.map(t => t.toJSON())
    })
  );
});
