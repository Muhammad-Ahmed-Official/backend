import { Proposal } from '../models/proposal.models.js';
import { Project } from '../models/project.models.js';
import { Badge } from '../models/badge.models.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { StatusCodes } from 'http-status-codes';
import { asyncHandler } from '../utils/asyncHandler.js';
import { responseMessages } from '../constant/responseMessages.js';
import { supabase } from '../config/supabase.js';
import jwt from 'jsonwebtoken';

// ── Proposal quiz attempt rules ────────────────────────────────────────────────
const PASS_THRESHOLD_DEFAULT = 50;   // % required to submit (no badge)
const PASS_THRESHOLD_BADGE   = 40;   // % required when freelancer has a matching badge
const COOLDOWN_ATTEMPT_1_MS  = 30 * 60 * 1000;       // 30 minutes after 1st fail
const COOLDOWN_ATTEMPT_2_MS  = 2 * 60 * 60 * 1000;   // 2 hours after 2nd fail

async function getFailedAttempts(freelancerId, projectId) {
  const { data } = await supabase
    .from('proposal_quiz_attempts')
    .select('*')
    .eq('freelancer_id', freelancerId)
    .eq('project_id', projectId)
    .eq('passed', false)
    .order('attempted_at', { ascending: true });
  return data || [];
}

async function hasBadgeForProject(freelancerId, project) {
  const tags = project.tags || [];
  for (const tag of tags) {
    const found = await Badge.hasActiveBadge(freelancerId, tag);
    if (found) return true;
  }
  return false;
}

const { UPDATE_SUCCESS_MESSAGES } = responseMessages;

// Get single proposal by ID
export const getProposalById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const proposal = await Proposal.findById(id, true);
  if (!proposal) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Proposal not found');
  }
  return res.status(StatusCodes.OK).send(
    new ApiResponse(StatusCodes.OK, 'Proposal fetched successfully', { proposal: proposal.toJSON() })
  );
});

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
  console.log('[Backend] updateProposalStatus: proposal found', { id, projectId: proposal.projectId });

  // Only project owner can accept/reject
  const project = await Project.findById(proposal.projectId);
  if (!project) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Project not found');
  }

  if (project.clientId !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only project owner can update proposal status');
  }

  let updatedProposal;
  try {
    updatedProposal = await Proposal.findByIdAndUpdate(id, { status });
  } catch (err) {
    console.error('[Backend] findByIdAndUpdate failed:', err.message, { id, status });
    throw err;
  }

  // If accepted, assign freelancer to project and reject other proposals
  if (status === 'ACCEPTED') {
    // Update project: assign freelancer and transition status to IN_PROGRESS
    await Project.findByIdAndUpdate(proposal.projectId, {
      freelancerId: proposal.freelancerId,
      status: 'IN_PROGRESS',
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

// ── Helper: Generate JD quiz via Groq ────────────────────────
async function generateJDQuiz(projectTitle, projectDescription) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY not set');

  const prompt = `You are an expert interviewer. Generate exactly 10 multiple-choice questions to screen a freelancer applying for this job.

Job Title: ${projectTitle}
Job Description: ${projectDescription.slice(0, 1500)}

Generate questions that test the actual skills, tools, and knowledge needed for this specific job. Make them practical and non-trivial.

Respond with ONLY this JSON (no extra text):
{
  "questions": [
    {
      "id": 1,
      "q": "Question text?",
      "A": "Option A",
      "B": "Option B",
      "C": "Option C",
      "D": "Option D",
      "correct": "A"
    }
  ]
}

Rules:
- Exactly 10 questions, ids 1-10
- Each has exactly 4 options (A B C D) and a "correct" field with the letter
- Questions must be directly relevant to the job — not generic filler
- Distractors should look plausible to someone with shallow knowledge
- No trivial questions like "what is a variable"`;

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      response_format: { type: 'json_object' },
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Groq API error: ${response.status} — ${err}`);
  }

  const groqData = await response.json();
  const content = groqData.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty Groq response');

  const parsed = JSON.parse(content);
  if (!Array.isArray(parsed.questions) || parsed.questions.length < 5) {
    throw new Error('AI returned invalid quiz format');
  }

  return parsed.questions.slice(0, 10);
}

// Start proposal quiz (generates 10 MCQ from JD)
export const startProposalQuiz = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const freelancerId = req.user.id;

  if (req.user.role !== 'Freelancer') {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only freelancers can take this quiz');
  }

  const project = await Project.findById(projectId);
  if (!project) throw new ApiError(StatusCodes.NOT_FOUND, 'Project not found');
  if (project.status !== 'ACTIVE') throw new ApiError(StatusCodes.BAD_REQUEST, 'Project is not active');
  if (project.clientId === freelancerId) throw new ApiError(StatusCodes.BAD_REQUEST, 'Cannot apply to your own project');

  const existing = await Proposal.findByProjectAndFreelancer(projectId, freelancerId);
  if (existing) throw new ApiError(StatusCodes.CONFLICT, 'You have already applied to this project');

  // ── Attempt gate ───────────────────────────────────────────────────────────
  const failedAttempts = await getFailedAttempts(freelancerId, projectId);
  const failCount = failedAttempts.length;

  if (failCount >= 3) {
    const unblockUsed = failedAttempts.some(a => a.badge_unblock_used);
    if (unblockUsed) {
      const err = new ApiError(StatusCodes.FORBIDDEN, 'You are permanently blocked from applying to this project. Badge unblock already used.');
      err.data = { blocked: true, permanentlyBlocked: true, badgeUnblockAvailable: false };
      throw err;
    }
    // Check if freelancer earned a badge after being blocked
    const hasBadge = await hasBadgeForProject(freelancerId, project);
    if (!hasBadge) {
      const err = new ApiError(StatusCodes.FORBIDDEN, 'You are permanently blocked from applying to this project. Earn a verified skill badge to unlock one final attempt.');
      err.data = { blocked: true, permanentlyBlocked: true, badgeUnblockAvailable: false };
      throw err;
    }
    // Badge unblock: mark it and allow through
    await supabase.from('proposal_quiz_attempts')
      .update({ badge_unblock_used: true })
      .eq('id', failedAttempts[0].id);
  } else if (failCount === 2) {
    const lastFail = failedAttempts[failCount - 1];
    const retryAt = new Date(lastFail.attempted_at).getTime() + COOLDOWN_ATTEMPT_2_MS;
    if (Date.now() < retryAt) {
      const err = new ApiError(StatusCodes.TOO_MANY_REQUESTS, 'Quiz on cooldown — please wait before your 3rd attempt');
      err.data = { blocked: true, permanentlyBlocked: false, attemptNumber: failCount, retryAfter: new Date(retryAt).toISOString() };
      throw err;
    }
  } else if (failCount === 1) {
    const lastFail = failedAttempts[0];
    const retryAt = new Date(lastFail.attempted_at).getTime() + COOLDOWN_ATTEMPT_1_MS;
    if (Date.now() < retryAt) {
      const err = new ApiError(StatusCodes.TOO_MANY_REQUESTS, 'Quiz on cooldown — please wait before your 2nd attempt');
      err.data = { blocked: true, permanentlyBlocked: false, attemptNumber: failCount, retryAfter: new Date(retryAt).toISOString() };
      throw err;
    }
  }
  // ──────────────────────────────────────────────────────────────────────────

  const rawQuestions = await generateJDQuiz(project.title, project.description);

  // Strip correct answers before sending to client
  const correctAnswers = rawQuestions.map(q => (q.correct || '').toUpperCase().trim());
  const clientQuestions = rawQuestions.map(({ correct, ...rest }) => rest);

  // Session token carries correct answers (expires in 1 hour)
  const sessionToken = jwt.sign(
    {
      projectId,
      freelancerId,
      correctAnswers,
      total: clientQuestions.length,
      startedAt: Date.now(),
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: '1h' }
  );

  return res.status(StatusCodes.OK).send(
    new ApiResponse(StatusCodes.OK, 'Quiz started', {
      sessionToken,
      questions: clientQuestions,
      total: clientQuestions.length,
      projectTitle: project.title,
    })
  );
});

// Submit quiz answers + create proposal in one step
export const createProposalWithQuiz = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const freelancerId = req.user.id;
  const { coverLetter, bidAmount, sessionToken, answers } = req.body;

  if (!coverLetter || !bidAmount || !sessionToken || !Array.isArray(answers)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'coverLetter, bidAmount, sessionToken, and answers[] are required');
  }

  if (req.user.role !== 'Freelancer') {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only freelancers can submit proposals');
  }

  // Verify JWT session
  let session;
  try {
    session = jwt.verify(sessionToken, process.env.ACCESS_TOKEN_SECRET);
  } catch {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Quiz session expired or invalid — please start the quiz again');
  }

  if (session.projectId !== projectId) throw new ApiError(StatusCodes.BAD_REQUEST, 'Quiz session does not match this project');
  if (session.freelancerId !== freelancerId) throw new ApiError(StatusCodes.FORBIDDEN, 'Quiz session does not belong to you');

  // Anti-cheat: minimum 15 seconds
  const elapsed = (Date.now() - session.startedAt) / 1000;
  if (elapsed < 15) throw new ApiError(StatusCodes.BAD_REQUEST, 'Quiz completed too quickly');

  // Score
  const correctAnswers = session.correctAnswers;
  let correct = 0;
  for (let i = 0; i < correctAnswers.length; i++) {
    if ((answers[i] || '').toUpperCase().trim() === correctAnswers[i]) correct++;
  }
  const quizScore = Math.round((correct / correctAnswers.length) * 100);

  // Project checks
  const project = await Project.findById(projectId);
  if (!project) throw new ApiError(StatusCodes.NOT_FOUND, 'Project not found');
  if (project.status !== 'ACTIVE') throw new ApiError(StatusCodes.BAD_REQUEST, 'Project is not active');
  if (project.clientId === freelancerId) throw new ApiError(StatusCodes.BAD_REQUEST, 'Cannot apply to your own project');

  // ── Pass threshold ─────────────────────────────────────────────────────────
  const badgeBonus = await hasBadgeForProject(freelancerId, project);
  const threshold = badgeBonus ? PASS_THRESHOLD_BADGE : PASS_THRESHOLD_DEFAULT;

  if (quizScore < threshold) {
    // Record failed attempt
    await supabase.from('proposal_quiz_attempts').insert({
      freelancer_id: freelancerId,
      project_id: projectId,
      score: quizScore,
      passed: false,
    });

    const failedAttempts = await getFailedAttempts(freelancerId, projectId);
    const failCount = failedAttempts.length;
    const permanentlyBlocked = failCount >= 3;

    let retryAfter = null;
    if (!permanentlyBlocked) {
      const cooldownMs = failCount === 1 ? COOLDOWN_ATTEMPT_1_MS : COOLDOWN_ATTEMPT_2_MS;
      retryAfter = new Date(Date.now() + cooldownMs).toISOString();
    }

    const err = new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, `Quiz score too low — you scored ${quizScore}%, need ${threshold}%`);
    err.data = {
      passed: false, score: quizScore, correct, total: correctAnswers.length,
      threshold, attemptNumber: failCount, retryAfter, permanentlyBlocked,
    };
    throw err;
  }
  // ──────────────────────────────────────────────────────────────────────────

  // Record passing attempt
  await supabase.from('proposal_quiz_attempts').insert({
    freelancer_id: freelancerId,
    project_id: projectId,
    score: quizScore,
    passed: true,
  });

  const proposal = await Proposal.create({
    projectId,
    freelancerId,
    coverLetter,
    bidAmount: parseFloat(bidAmount),
    quizScore,
  });

  return res.status(StatusCodes.CREATED).send(
    new ApiResponse(StatusCodes.CREATED, 'Proposal submitted successfully', {
      proposal: proposal.toJSON(),
      quizResult: { passed: true, score: quizScore, correct, total: correctAnswers.length },
    })
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

