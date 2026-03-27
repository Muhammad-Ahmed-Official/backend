import { Badge } from '../models/badge.models.js';
import { Question } from '../models/question.models.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { StatusCodes } from 'http-status-codes';
import { asyncHandler } from '../utils/asyncHandler.js';
import jwt from 'jsonwebtoken';

// ── Helpers ───────────────────────────────────────────────────

const LEVEL_POINTS = { Gold: 30, Silver: 20, Bronze: 10 };
const VALID_LEVELS = ['Bronze', 'Silver', 'Gold'];

// ── AI-based code evaluator using Groq ───────────────────────
// Evaluates ALL test cases in ONE request — fast, free, no Judge0 needed
async function evaluateWithGroq(skill, sourceCode, question, testCases) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY not set');

  const tcLines = testCases
    .map((tc, i) => `TC${i + 1}:\nINPUT:\n${tc.stdin}\nEXPECTED OUTPUT:\n${tc.expectedOutput}`)
    .join('\n\n---\n\n');

  const prompt = `You are a code execution engine. Mentally execute the ${skill} code below against each test case and determine if its output matches the expected output exactly (ignore trailing whitespace/newlines only).

## Problem
Title: ${question.title}
Description: ${question.description}
Input format: ${question.inputFormat}
Output format: ${question.outputFormat}

## ${skill} Code
\`\`\`
${sourceCode}
\`\`\`

## Test Cases
${tcLines}

## Instructions
- Trace the code execution step by step for each test case
- Compare actual output with expected output (trim trailing whitespace/newlines before comparing)
- If the code has a syntax error, all cases fail
- Be strict and precise

Respond with ONLY this JSON (no explanation, no markdown):
{
  "syntaxError": false,
  "results": [
    {"case": 1, "passed": true, "actualOutput": "..."},
    {"case": 2, "passed": false, "actualOutput": "..."}
  ]
}`;

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
      response_format: { type: 'json_object' },
      max_tokens: 1024,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('[Groq] API error:', err);
    throw new Error(`Groq API error: ${res.status}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty Groq response');

  const parsed = JSON.parse(content);

  if (parsed.syntaxError) {
    return { compilationError: 'Syntax error in your code — check for missing brackets, colons, etc.', results: [] };
  }

  const results = (parsed.results || []).map((r, i) => ({
    case:       r.case ?? i + 1,
    passed:     Boolean(r.passed),
    statusDesc: r.passed ? 'Accepted' : 'Wrong Answer',
    time:       0.05, // simulated
  }));

  return { compilationError: null, results };
}

// ── Keep runTestCase for the JDoodle-based free run ───────────
async function runTestCase(sourceCode, languageId, stdin, expectedOutput) {
  const res = await fetch(
    'https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=false&wait=true',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-RapidAPI-Key': process.env.JUDGE0_API_KEY,
        'X-RapidAPI-Host': process.env.JUDGE0_API_HOST || 'judge0-ce.p.rapidapi.com',
      },
      body: JSON.stringify({
        source_code: sourceCode,
        language_id: languageId,
        stdin,
        expected_output: expectedOutput,
      }),
    }
  );
  return res.json();
}

// ── 1. Request a coding test ──────────────────────────────────
// POST /api/v1/badges/coding-test/request
// Body: { skill, level }   level: 'Bronze' | 'Silver' | 'Gold'

export const requestCodingTest = asyncHandler(async (req, res) => {
  const { skill, level } = req.body;

  if (!skill) throw new ApiError(StatusCodes.BAD_REQUEST, 'skill is required');
  if (!level || !VALID_LEVELS.includes(level)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'level must be Bronze, Silver, or Gold');
  }

  const question = await Question.findBySkillAndLevel(skill, level);
  if (!question) {
    // Fallback info: list available levels for this skill
    const all = await Question.getAvailableSkillsWithLevels();
    const skillEntry = all.find(s => s.skill === skill);
    const hint = skillEntry
      ? `Available levels for ${skill}: ${skillEntry.levels.join(', ')}`
      : `No questions found for skill: "${skill}"`;
    throw new ApiError(StatusCodes.BAD_REQUEST, hint);
  }

  // Send question metadata — test cases are NEVER sent to client
  return res.status(StatusCodes.OK).send(
    new ApiResponse(StatusCodes.OK, 'Test loaded successfully', {
      ...question.toPublicJSON(),
      skill,
    })
  );
});

// ── 0b. Run code freely — powered by JDoodle API ────────────
// POST /api/v1/badges/coding-test/run
// Body: { source_code, skill, stdin? }
// JDoodle: free 200 executions/day, no Judge0 subscription needed
// Get free keys at: https://www.jdoodle.com/compiler-api/

const JDOODLE_LANG = {
  'Python':     { language: 'python3',    versionIndex: '4' },
  'JavaScript': { language: 'nodejs',     versionIndex: '4' },
  'Java':       { language: 'java',       versionIndex: '4' },
  'C++':        { language: 'cpp17',      versionIndex: '1' },
  'C':          { language: 'c',          versionIndex: '5' },
  'Go':         { language: 'go',         versionIndex: '4' },
  'Ruby':       { language: 'ruby',       versionIndex: '4' },
  'Rust':       { language: 'rust',       versionIndex: '4' },
  'PHP':        { language: 'php',        versionIndex: '4' },
  'TypeScript': { language: 'typescript', versionIndex: '1' },
  'C#':         { language: 'csharp',     versionIndex: '4' },
  'Swift':      { language: 'swift',      versionIndex: '4' },
  'Kotlin':     { language: 'kotlin',     versionIndex: '4' },
};

export const runCode = asyncHandler(async (req, res) => {
  const { source_code, skill, stdin = '' } = req.body;

  if (!source_code || !skill) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'source_code and skill are required');
  }

  const lang = JDOODLE_LANG[skill];
  if (!lang) {
    throw new ApiError(StatusCodes.BAD_REQUEST, `Unsupported skill: ${skill}`);
  }

  const clientId     = process.env.JDOODLE_CLIENT_ID;
  const clientSecret = process.env.JDOODLE_CLIENT_SECRET;

  if (!clientId || !clientSecret || clientId === 'your_client_id_here') {
    throw new ApiError(
      StatusCodes.SERVICE_UNAVAILABLE,
      'Code runner not configured. Add JDOODLE_CLIENT_ID and JDOODLE_CLIENT_SECRET to .env (free at jdoodle.com/compiler-api)'
    );
  }

  const jdoodleRes = await fetch('https://api.jdoodle.com/v1/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId,
      clientSecret,
      script: source_code,
      stdin,
      language:     lang.language,
      versionIndex: lang.versionIndex,
    }),
  });

  const data = await jdoodleRes.json();

  // JDoodle response: { output, statusCode, memory, cpuTime }
  // output = combined stdout + stderr + compile errors (all in one field)
  // statusCode 200 = success, 429 = daily limit reached, 401 = bad credentials

  if (data.statusCode === 429) {
    throw new ApiError(StatusCodes.TOO_MANY_REQUESTS, 'Daily execution limit reached (200/day). Try again tomorrow.');
  }
  if (data.statusCode === 401 || data.statusCode === 403) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid JDoodle credentials. Check JDOODLE_CLIENT_ID and JDOODLE_CLIENT_SECRET in .env');
  }

  const output = data.output || '';

  // JDoodle combines stdout+stderr — detect if it looks like an error
  const isError = /error|exception|traceback|undefined|fatal/i.test(output) && data.statusCode !== 200;

  return res.status(StatusCodes.OK).send(
    new ApiResponse(StatusCodes.OK, 'Code executed', {
      stdout:        output,
      stderr:        '',
      compileOutput: '',
      statusId:      3,           // always show as Accepted — output speaks for itself
      statusDesc:    'Executed',
      time:          data.cpuTime  || null,
      memory:        data.memory   || null,
    })
  );
});

// ── 0c. Get available skills + levels ────────────────────────
// GET /api/v1/badges/skills
export const getAvailableSkills = asyncHandler(async (req, res) => {
  const skills = await Question.getAvailableSkillsWithLevels();
  return res.status(StatusCodes.OK).send(
    new ApiResponse(StatusCodes.OK, 'Available skills fetched', { skills })
  );
});

// ── 2. Submit coding result ───────────────────────────────────
// POST /api/v1/badges/coding-test/submit
// Body: { skill, level, source_code }
// Runs code against ALL test cases; if score ≥ 60% awards badge at chosen level

export const submitCodingResult = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { skill, level, source_code } = req.body;

  if (!skill || !source_code) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'skill and source_code are required');
  }
  if (!level || !VALID_LEVELS.includes(level)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'level must be Bronze, Silver, or Gold');
  }

  const question = await Question.findBySkillAndLevel(skill, level);
  if (!question) {
    throw new ApiError(StatusCodes.BAD_REQUEST, `No ${level} question available for: "${skill}"`);
  }

  const { testCases } = question;

  // ── Evaluate all test cases with Groq AI ──────────────────────
  let testResults = [];
  let compilationError = null;

  try {
    const evaluation = await evaluateWithGroq(skill, source_code, question, testCases);
    compilationError = evaluation.compilationError;
    testResults = evaluation.results;
  } catch (err) {
    console.error('[submitCodingResult] Groq error:', err.message);
    throw new ApiError(
      StatusCodes.SERVICE_UNAVAILABLE,
      'Code evaluation service unavailable. Please try again in a moment.'
    );
  }

  // ── Handle compilation error ──────────────────────────────────
  if (compilationError) {
    return res.status(StatusCodes.OK).send(
      new ApiResponse(StatusCodes.OK, 'Compilation error — check your code syntax.', {
        score: 0,
        passed: false,
        compilationError,
        testResults: [],
        passedCount: 0,
        totalCount: testCases.length,
        badge: null,
      })
    );
  }

  // ── Calculate score: each test case = equal weight ────────────
  const passedCount = testResults.filter(r => r.passed).length;
  const totalCount = testCases.length;
  const score = Math.round((passedCount / totalCount) * 100);

  // Need ≥ 60% to earn the badge at the chosen level
  const passed = score >= 60;

  if (!passed) {
    return res.status(StatusCodes.OK).send(
      new ApiResponse(
        StatusCodes.OK,
        `You passed ${passedCount}/${totalCount} test cases (score: ${score}%). Need 60%+ to earn a ${level} badge.`,
        { score, passed: false, testResults, passedCount, totalCount, badge: null }
      )
    );
  }

  // ── Assign badge at the level the user chose ──────────────────
  await Badge.revokeExisting(userId, skill);

  const badge = await Badge.create({
    userId,
    skill,
    badgeLevel: level,
    badgePoints: LEVEL_POINTS[level],
    provider: 'Judge0',
    verificationType: 'coding_test',
    score,
    status: 'active',
  });

  return res.status(StatusCodes.CREATED).send(
    new ApiResponse(
      StatusCodes.CREATED,
      `Congratulations! You passed ${passedCount}/${totalCount} test cases and earned a ${level} badge for ${skill}!`,
      { score, passed: true, testResults, passedCount, totalCount, badge: badge.toJSON() }
    )
  );
});

// ── 3. Submit certificate (Designer / Marketer flow) ──────────
// POST /api/v1/badges/certificate/submit
// Body: { skill, certificateUrl, provider }

export const submitCertificate = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { skill, certificateUrl, provider } = req.body;

  if (!skill || !certificateUrl || !provider) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'skill, certificateUrl, and provider are required');
  }

  // Basic URL validation
  try {
    new URL(certificateUrl);
  } catch {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'certificateUrl must be a valid URL');
  }

  // Check if they already have a pending submission for this skill
  const { data: existing } = await import('../config/supabase.js').then(m =>
    m.supabase
      .from('badges')
      .select('id, status')
      .eq('user_id', userId)
      .eq('skill', skill)
      .in('status', ['pending', 'active'])
      .maybeSingle()
  );

  if (existing?.status === 'active') {
    throw new ApiError(StatusCodes.CONFLICT, `You already have an active badge for ${skill}`);
  }
  if (existing?.status === 'pending') {
    throw new ApiError(StatusCodes.CONFLICT, `You already have a pending certificate submission for ${skill}. Please wait for admin review.`);
  }

  const badge = await Badge.create({
    userId,
    skill,
    badgeLevel: 'Silver', // default level — admin can change on approval
    badgePoints: 20,
    provider,
    verificationType: 'certificate',
    certificateUrl,
    status: 'pending', // requires admin approval
  });

  return res.status(StatusCodes.CREATED).send(
    new ApiResponse(StatusCodes.CREATED, 'Certificate submitted successfully. An admin will review it shortly.', {
      badge: badge.toJSON(),
    })
  );
});

// ── 4. Get my badges (Freelancer) ─────────────────────────────
// GET /api/v1/badges/my-badges

export const getMyBadges = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const badges = await Badge.findByUserId(userId);

  const badgeScore = await Badge.getBadgeScore(userId);

  return res.status(StatusCodes.OK).send(
    new ApiResponse(StatusCodes.OK, 'Badges fetched successfully', {
      badges: badges.map(b => b.toJSON()),
      totalBadgeScore: badgeScore,
    })
  );
});

// ── 5. Get badges by freelancer ID (Public) ───────────────────
// GET /api/v1/badges/user/:userId

export const getFreelancerBadges = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const badges = await Badge.findActiveByUserId(userId);
  const badgeScore = await Badge.getBadgeScore(userId);

  return res.status(StatusCodes.OK).send(
    new ApiResponse(StatusCodes.OK, 'Freelancer badges fetched successfully', {
      badges: badges.map(b => b.toJSON()),
      totalBadgeScore: badgeScore,
    })
  );
});

// ── 6. Admin: get all pending certificate submissions ─────────
// GET /api/v1/badges/admin/pending

export const getPendingCertificates = asyncHandler(async (req, res) => {
  const pending = await Badge.findPendingCertificates();

  return res.status(StatusCodes.OK).send(
    new ApiResponse(StatusCodes.OK, 'Pending certificates fetched', { pending })
  );
});

// ── 7. Admin: approve or reject a certificate submission ──────
// PATCH /api/v1/badges/:id/review
// Body: { action: 'approve' | 'reject', badgeLevel?: 'Gold' | 'Silver' | 'Bronze' }

export const adminReviewBadge = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { action, badgeLevel } = req.body;

  if (!['approve', 'reject'].includes(action)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'action must be "approve" or "reject"');
  }

  const badge = await Badge.findById(id);
  if (!badge) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Badge not found');
  }
  if (badge.status !== 'pending') {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Only pending badges can be reviewed');
  }

  if (action === 'reject') {
    const updated = await Badge.updateStatus(id, 'rejected');
    return res.status(StatusCodes.OK).send(
      new ApiResponse(StatusCodes.OK, 'Badge rejected', { badge: updated.toJSON() })
    );
  }

  // Approve — optionally override badge level
  const levelMap = { Gold: 30, Silver: 20, Bronze: 10 };
  const finalLevel = badgeLevel && levelMap[badgeLevel] ? badgeLevel : badge.badgeLevel;
  const finalPoints = levelMap[finalLevel];

  // Revoke any existing active badge before activating this one
  await Badge.revokeExisting(badge.userId, badge.skill);

  // Update the badge to active with the chosen level
  const { supabase } = await import('../config/supabase.js');
  const { data, error } = await supabase
    .from('badges')
    .update({
      status: 'active',
      badge_level: finalLevel,
      badge_points: finalPoints,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  return res.status(StatusCodes.OK).send(
    new ApiResponse(StatusCodes.OK, `Badge approved as ${finalLevel}`, {
      badge: new Badge(data).toJSON(),
    })
  );
});

// ── 10a. Generate YouTube OAuth URL ───────────────────────────
// GET /api/v1/badges/youtube/auth-url  (requires login)
export const getYoutubeAuthUrl = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const clientId    = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.YOUTUBE_REDIRECT_URI;

  if (!clientId || clientId === 'your_google_client_id') {
    throw new ApiError(StatusCodes.SERVICE_UNAVAILABLE, 'YouTube OAuth not configured. Add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and YOUTUBE_REDIRECT_URI to .env');
  }

  const state = jwt.sign({ userId }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '15m' });

  const params = new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  redirectUri,
    response_type: 'code',
    scope:         'https://www.googleapis.com/auth/youtube.readonly',
    access_type:   'online',
    state,
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  return res.status(StatusCodes.OK).send(new ApiResponse(StatusCodes.OK, 'Auth URL generated', { authUrl }));
});

// ── 10b. YouTube OAuth callback ────────────────────────────────
// GET /api/v1/badges/youtube/callback  (PUBLIC — called by Google)
export const youtubeCallback = asyncHandler(async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    return res.send(cfHtmlPage('❌', 'Cancelled', 'You cancelled Google login. Go back to the app and try again.', '#DC2626'));
  }
  if (!code || !state) {
    return res.send(cfHtmlPage('❌', 'Invalid Request', 'Missing parameters. Please try again from the app.', '#DC2626'));
  }

  // Verify state JWT
  let statePayload;
  try {
    statePayload = jwt.verify(state, process.env.ACCESS_TOKEN_SECRET);
  } catch {
    return res.send(cfHtmlPage('⏰', 'Session Expired', 'Verification session expired (15 min limit). Go back to the app and try again.', '#F59E0B'));
  }

  const { userId } = statePayload;

  // Exchange code for access token
  let accessToken;
  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id:     process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri:  process.env.YOUTUBE_REDIRECT_URI,
        grant_type:    'authorization_code',
      }),
    });
    const tokenData = await tokenRes.json();
    accessToken = tokenData.access_token;
  } catch {
    return res.send(cfHtmlPage('❌', 'Connection Error', 'Could not reach Google servers. Please try again.', '#DC2626'));
  }

  if (!accessToken) {
    return res.send(cfHtmlPage('❌', 'Auth Failed', 'Google did not return an access token. Please try again.', '#DC2626'));
  }

  // Fetch YouTube channel for the authenticated user
  let channelData;
  try {
    const ytRes = await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&mine=true',
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );
    channelData = await ytRes.json();
  } catch {
    return res.send(cfHtmlPage('❌', 'YouTube Error', 'Could not fetch your YouTube channel. Please try again.', '#DC2626'));
  }

  if (!channelData.items || channelData.items.length === 0) {
    return res.send(cfHtmlPage(
      '📺', 'No YouTube Channel Found',
      'We could not find a YouTube channel linked to your Google account. Create a channel first and try again.'
    ));
  }

  const channel    = channelData.items[0];
  const stats      = channel.statistics;
  const snippet    = channel.snippet;
  const channelName = snippet.title;

  const subscribers = parseInt(stats.subscriberCount || '0', 10);
  const videoCount  = parseInt(stats.videoCount       || '0', 10);
  const totalViews  = parseInt(stats.viewCount        || '0', 10);

  // ── Score ──────────────────────────────────────────────────────
  // Subscribers: strongest signal (max 80 pts)
  let subPts = 0;
  if      (subscribers >= 100_000) subPts = 80;
  else if (subscribers >=  10_000) subPts = 60;
  else if (subscribers >=   1_000) subPts = 40;
  else if (subscribers >=     100) subPts = 20;
  else if (subscribers >=      10) subPts = 8;

  const videoPts = Math.min(videoCount * 0.5, 20);                  // max 20
  const viewPts  = Math.min(Math.floor(totalViews / 10_000), 20);   // max 20 (per 10k views)

  const score = Math.round(subPts + videoPts + viewPts);

  // Badge thresholds
  let badgeResult;
  if      (score >= 70) badgeResult = { level: 'Gold',   points: 30 };
  else if (score >= 35) badgeResult = { level: 'Silver', points: 20 };
  else if (score >= 12) badgeResult = { level: 'Bronze', points: 10 };
  else {
    return res.send(cfHtmlPage(
      '📊', `Score Too Low (${score}/120)`,
      `"${channelName}" — ${subscribers.toLocaleString()} subscribers, ${videoCount} videos.<br><br>You need at least 10 subscribers and some videos for a Bronze badge. Keep creating!`
    ));
  }

  // Award badge
  await Badge.revokeExisting(userId, 'YouTube');
  await Badge.create({
    userId,
    skill:            'YouTube',
    badgeLevel:       badgeResult.level,
    badgePoints:      badgeResult.points,
    provider:         'YouTube',
    verificationType: 'coding_test',
    score,
    status:           'active',
  });

  const icons  = { Gold: '🥇', Silver: '🥈', Bronze: '🥉' };
  const colors = { Gold: '#F59E0B', Silver: '#94A3B8', Bronze: '#C2773A' };

  return res.send(cfHtmlPage(
    icons[badgeResult.level],
    `${badgeResult.level} Badge Earned!`,
    `"${channelName}" &nbsp;·&nbsp; ${subscribers.toLocaleString()} subscribers &nbsp;·&nbsp; ${videoCount} videos<br><br>Your <strong>YouTube ${badgeResult.level}</strong> badge is now on your profile!`,
    colors[badgeResult.level]
  ));
});

// ── Shared HTML page helper ───────────────────────────────────
function cfHtmlPage(icon, title, subtitle, color = '#282A32') {
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#F4F4F8;
         min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
    .card{background:#fff;border-radius:24px;padding:40px 32px;max-width:380px;width:100%;
          text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.08)}
    .icon{font-size:64px;margin-bottom:20px}
    h2{font-size:22px;font-weight:800;color:${color};margin-bottom:10px}
    p{font-size:14px;color:#94A3B8;line-height:1.6}
    .note{margin-top:20px;font-size:12px;color:#C2C2C8}
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${icon}</div>
    <h2>${title}</h2>
    <p>${subtitle}</p>
    <p class="note">You can close this page and return to the app.</p>
  </div>
</body>
</html>`;
}

// ── 8a. Generate Codeforces OIDC auth URL ─────────────────────
// GET /api/v1/badges/codeforces/auth-url  (requires login)
export const getCodeforcesAuthUrl = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const cfClientId   = process.env.CF_CLIENT_ID;
  const cfRedirectUri = process.env.CF_REDIRECT_URI;

  if (!cfClientId || !cfRedirectUri || cfClientId === 'your_cf_client_id') {
    throw new ApiError(
      StatusCodes.SERVICE_UNAVAILABLE,
      'Codeforces OAuth not configured yet. Add CF_CLIENT_ID, CF_CLIENT_SECRET, and CF_REDIRECT_URI to .env (register app at codeforces.com/settings/api)'
    );
  }

  // Embed userId in state JWT (15 min) — callback uses it to know who to award badge to
  const state = jwt.sign({ userId }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '15m' });

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: cfClientId,
    scope: 'openid',
    redirect_uri: cfRedirectUri,
    state,
  });

  const authUrl = `https://codeforces.com/oauth/authorize?${params}`;

  return res.status(StatusCodes.OK).send(
    new ApiResponse(StatusCodes.OK, 'Auth URL generated', { authUrl })
  );
});

// ── 8b. Codeforces OIDC callback ──────────────────────────────
// GET /api/v1/badges/codeforces/callback  (PUBLIC — called by Codeforces)
export const codeforcesCallback = asyncHandler(async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    return res.send(cfHtmlPage('❌', 'Cancelled', 'You cancelled Codeforces login. Go back to the app and try again.', '#DC2626'));
  }

  if (!code || !state) {
    return res.send(cfHtmlPage('❌', 'Invalid Request', 'Missing parameters. Please try again from the app.', '#DC2626'));
  }

  // Decode state to get userId
  let statePayload;
  try {
    statePayload = jwt.verify(state, process.env.ACCESS_TOKEN_SECRET);
  } catch {
    return res.send(cfHtmlPage('⏰', 'Session Expired', 'Verification session expired (15 min limit). Please go back to the app and try again.', '#F59E0B'));
  }

  const { userId } = statePayload;

  // Exchange authorization code for ID token
  let tokenData;
  try {
    const tokenRes = await fetch('https://codeforces.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'authorization_code',
        code,
        redirect_uri:  process.env.CF_REDIRECT_URI,
        client_id:     process.env.CF_CLIENT_ID,
        client_secret: process.env.CF_CLIENT_SECRET,
      }),
    });
    tokenData = await tokenRes.json();
  } catch (err) {
    console.error('[CF callback] Token exchange error:', err.message);
    return res.send(cfHtmlPage('❌', 'Connection Error', 'Could not reach Codeforces. Please try again.', '#DC2626'));
  }

  if (!tokenData.id_token) {
    console.error('[CF callback] No id_token:', JSON.stringify(tokenData));
    return res.send(cfHtmlPage('❌', 'Auth Failed', 'Codeforces did not return a valid token. Please try again.', '#DC2626'));
  }

  // Verify the ID token — HS256 signed with client_secret
  let cfPayload;
  try {
    cfPayload = jwt.verify(tokenData.id_token, process.env.CF_CLIENT_SECRET, {
      algorithms: ['HS256'],
      audience:   process.env.CF_CLIENT_ID,
      issuer:     'https://codeforces.com',
    });
  } catch (err) {
    console.error('[CF callback] ID token verify failed:', err.message);
    return res.send(cfHtmlPage('❌', 'Invalid Token', 'Could not verify Codeforces identity. Please try again.', '#DC2626'));
  }

  const { handle, rating } = cfPayload;
  const effectiveRating = rating ?? 0;

  // Determine badge level
  let badgeResult;
  if (effectiveRating >= 1600)      badgeResult = { level: 'Gold',   points: 30 };
  else if (effectiveRating >= 1200) badgeResult = { level: 'Silver', points: 20 };
  else if (effectiveRating >= 1)    badgeResult = { level: 'Bronze', points: 10 };
  else {
    return res.send(cfHtmlPage(
      '📊', `@${handle} is Unrated`,
      'You need to participate in at least one rated Codeforces contest to qualify for a badge.'
    ));
  }

  // Award badge
  await Badge.revokeExisting(userId, 'Competitive Programming');
  await Badge.create({
    userId,
    skill:            'Competitive Programming',
    badgeLevel:       badgeResult.level,
    badgePoints:      badgeResult.points,
    provider:         'Codeforces',
    verificationType: 'coding_test',
    score:            effectiveRating,
    status:           'active',
  });

  const icons  = { Gold: '🥇', Silver: '🥈', Bronze: '🥉' };
  const colors = { Gold: '#F59E0B', Silver: '#94A3B8', Bronze: '#C2773A' };

  return res.send(cfHtmlPage(
    icons[badgeResult.level],
    `${badgeResult.level} Badge Earned!`,
    `@${handle} &nbsp;·&nbsp; Rating: ${effectiveRating}<br><br>Your <strong>Competitive Programming ${badgeResult.level}</strong> badge is now on your profile!`,
    colors[badgeResult.level]
  ));
});

// ── Shared GitHub scoring helper ──────────────────────────────
async function scoreGithubUser(ghUser, accessToken) {
  const ghHeaders = {
    'User-Agent':  'PakFreelance-App',
    'Authorization': `Bearer ${accessToken}`,
  };

  // Fetch repos (authenticated — gets private count too but only scores public)
  let repos = [];
  try {
    const r = await fetch(
      'https://api.github.com/user/repos?per_page=100&sort=pushed&visibility=public',
      { headers: ghHeaders }
    );
    repos = r.ok ? await r.json() : [];
    if (!Array.isArray(repos)) repos = [];
  } catch { repos = []; }

  // Fetch recent events for activity check
  let events = [];
  try {
    const r = await fetch(
      `https://api.github.com/users/${encodeURIComponent(ghUser.login)}/events?per_page=100`,
      { headers: ghHeaders }
    );
    events = r.ok ? await r.json() : [];
    if (!Array.isArray(events)) events = [];
  } catch { events = []; }

  const totalStars = repos.reduce((s, r) => s + (r.stargazers_count || 0), 0);
  const totalForks = repos.reduce((s, r) => s + (r.forks_count || 0), 0);
  const languages  = [...new Set(repos.map(r => r.language).filter(Boolean))];

  const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
  const hasRecentActivity = events.some(e => new Date(e.created_at).getTime() > cutoff);

  const score = Math.round(
    Math.min(totalStars * 3,          75) +
    Math.min(totalForks * 2,          20) +
    Math.min(repos.length * 0.5,      15) +
    Math.min(ghUser.followers * 0.2,  10) +
    Math.min(languages.length * 1.5,  12) +
    (hasRecentActivity ? 8 : 0)
  );

  return { repos, totalStars, totalForks, languages, score };
}

// ── 9a. Generate GitHub OAuth URL ─────────────────────────────
// GET /api/v1/badges/github/auth-url  (requires login)
export const getGithubAuthUrl = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const clientId     = process.env.GITHUB_CLIENT_ID;
  const redirectUri  = process.env.GITHUB_REDIRECT_URI;

  if (!clientId || clientId === 'your_github_client_id') {
    throw new ApiError(StatusCodes.SERVICE_UNAVAILABLE, 'GitHub OAuth not configured. Add GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, and GITHUB_REDIRECT_URI to .env');
  }

  // Embed userId in state JWT (15 min)
  const state = jwt.sign({ userId }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '15m' });

  const params = new URLSearchParams({
    client_id:    clientId,
    redirect_uri: redirectUri,
    scope:        'read:user',
    state,
  });

  const authUrl = `https://github.com/login/oauth/authorize?${params}`;
  return res.status(StatusCodes.OK).send(new ApiResponse(StatusCodes.OK, 'Auth URL generated', { authUrl }));
});

// ── 9b. GitHub OAuth callback ──────────────────────────────────
// GET /api/v1/badges/github/callback  (PUBLIC — called by GitHub)
export const githubCallback = asyncHandler(async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    return res.send(cfHtmlPage('❌', 'Cancelled', 'You cancelled GitHub login. Go back to the app and try again.', '#DC2626'));
  }

  if (!code || !state) {
    return res.send(cfHtmlPage('❌', 'Invalid Request', 'Missing parameters. Please try again from the app.', '#DC2626'));
  }

  // Verify state JWT
  let statePayload;
  try {
    statePayload = jwt.verify(state, process.env.ACCESS_TOKEN_SECRET);
  } catch {
    return res.send(cfHtmlPage('⏰', 'Session Expired', 'Verification session expired (15 min limit). Go back to the app and try again.', '#F59E0B'));
  }

  const { userId } = statePayload;

  // Exchange code for access token
  let accessToken;
  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id:     process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri:  process.env.GITHUB_REDIRECT_URI,
      }),
    });
    const tokenData = await tokenRes.json();
    accessToken = tokenData.access_token;
  } catch {
    return res.send(cfHtmlPage('❌', 'Connection Error', 'Could not reach GitHub. Please try again.', '#DC2626'));
  }

  if (!accessToken) {
    return res.send(cfHtmlPage('❌', 'Auth Failed', 'GitHub did not return an access token. Please try again.', '#DC2626'));
  }

  // Fetch authenticated user profile
  let ghUser;
  try {
    const r = await fetch('https://api.github.com/user', {
      headers: { 'Authorization': `Bearer ${accessToken}`, 'User-Agent': 'PakFreelance-App' },
    });
    ghUser = await r.json();
  } catch {
    return res.send(cfHtmlPage('❌', 'Profile Error', 'Could not fetch your GitHub profile. Please try again.', '#DC2626'));
  }

  // Compute score
  const { repos, totalStars, score } = await scoreGithubUser(ghUser, accessToken);

  if (repos.length < 2) {
    return res.send(cfHtmlPage(
      '📦', 'Not Enough Repos',
      `@${ghUser.login} has fewer than 2 public repositories. Add more projects to qualify for a badge.`
    ));
  }

  let badgeResult;
  if (score >= 110)     badgeResult = { level: 'Gold',   points: 30 };
  else if (score >= 45) badgeResult = { level: 'Silver', points: 20 };
  else if (score >= 15) badgeResult = { level: 'Bronze', points: 10 };
  else {
    return res.send(cfHtmlPage(
      '📊', `Score Too Low (${score}/140)`,
      `@${ghUser.login} — your GitHub score is ${score}. You need at least 15 for a Bronze badge. Earn more stars and contribute regularly!`
    ));
  }

  // Award badge
  await Badge.revokeExisting(userId, 'GitHub');
  await Badge.create({
    userId,
    skill:            'GitHub',
    badgeLevel:       badgeResult.level,
    badgePoints:      badgeResult.points,
    provider:         'GitHub',
    verificationType: 'coding_test',
    score,
    status:           'active',
  });

  const icons  = { Gold: '🥇', Silver: '🥈', Bronze: '🥉' };
  const colors = { Gold: '#F59E0B', Silver: '#94A3B8', Bronze: '#C2773A' };

  return res.send(cfHtmlPage(
    icons[badgeResult.level],
    `${badgeResult.level} Badge Earned!`,
    `@${ghUser.login} &nbsp;·&nbsp; Score: ${score}/140 &nbsp;·&nbsp; ⭐ ${totalStars} stars<br><br>Your <strong>GitHub ${badgeResult.level}</strong> badge is now on your profile!`,
    colors[badgeResult.level]
  ));
});

// ── 8. Codeforces handle verification ────────────────────────
// POST /api/v1/badges/codeforces/verify
// Body: { handle }
// Fetches user rating from Codeforces API and assigns a badge.
// Gold: rating >= 1600 (Expert+)
// Silver: rating >= 1200 (Pupil/Specialist)
// Bronze: any rated user

export const verifyCodeforcesHandle = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { handle } = req.body;

  if (!handle || !handle.trim()) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Codeforces handle is required');
  }

  const cleanHandle = handle.trim();

  // ── Fetch from Codeforces public API ─────────────────────────
  let cfData;
  try {
    const cfRes = await fetch(
      `https://codeforces.com/api/user.info?handles=${encodeURIComponent(cleanHandle)}`
    );
    cfData = await cfRes.json();
  } catch {
    throw new ApiError(StatusCodes.SERVICE_UNAVAILABLE, 'Could not reach Codeforces API. Please try again.');
  }

  if (cfData.status !== 'OK' || !cfData.result?.length) {
    throw new ApiError(StatusCodes.NOT_FOUND, `Codeforces user "${cleanHandle}" not found. Check the handle and try again.`);
  }

  const user = cfData.result[0];
  const rating = user.rating ?? 0;        // unrated users have no rating field
  const maxRating = user.maxRating ?? 0;
  const rank = user.rank ?? 'unrated';

  // Use max rating so a formerly-active competitor who went inactive still gets credit
  const effectiveRating = Math.max(rating, maxRating);

  let badgeResult;
  if (effectiveRating >= 1600) {
    badgeResult = { level: 'Gold', points: 30 };
  } else if (effectiveRating >= 1200) {
    badgeResult = { level: 'Silver', points: 20 };
  } else if (effectiveRating >= 1) {
    badgeResult = { level: 'Bronze', points: 10 };
  } else {
    // Completely unrated — no badge, but return their info
    return res.status(StatusCodes.OK).send(
      new ApiResponse(StatusCodes.OK, `@${cleanHandle} is unrated on Codeforces. Solve at least one rated contest to qualify for a badge.`, {
        handle: cleanHandle,
        rating: 0,
        maxRating: 0,
        rank: 'unrated',
        badge: null,
      })
    );
  }

  // Revoke any existing Codeforces badge before assigning the new one
  await Badge.revokeExisting(userId, 'Competitive Programming');

  const badge = await Badge.create({
    userId,
    skill: 'Competitive Programming',
    badgeLevel: badgeResult.level,
    badgePoints: badgeResult.points,
    provider: 'Codeforces',
    verificationType: 'coding_test',
    score: effectiveRating,   // store CF rating as the score
    status: 'active',
  });

  return res.status(StatusCodes.CREATED).send(
    new ApiResponse(
      StatusCodes.CREATED,
      `Congratulations! Your Codeforces rating of ${effectiveRating} (${rank}) earns you a ${badgeResult.level} badge!`,
      {
        handle: cleanHandle,
        rating,
        maxRating,
        rank,
        effectiveRating,
        badge: badge.toJSON(),
      }
    )
  );
});

// ── 9. Admin: revoke an active badge ─────────────────────────
// PATCH /api/v1/badges/:id/revoke

export const adminRevokeBadge = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const badge = await Badge.findById(id);
  if (!badge) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Badge not found');
  }

  const updated = await Badge.updateStatus(id, 'revoked');

  return res.status(StatusCodes.OK).send(
    new ApiResponse(StatusCodes.OK, 'Badge revoked successfully', { badge: updated.toJSON() })
  );
});

// ── Quiz config ───────────────────────────────────────────────
const QUIZ_CONFIG = {
  Bronze: { count: 20, mcqCount: 12, outputCount: 8,  passPercent: 70 },
  Silver: { count: 40, mcqCount: 20, outputCount: 20, passPercent: 70 },
  Gold:   { count: 50, mcqCount: 20, outputCount: 30, passPercent: 70 },
};

function getQuizDifficulty(skill) {
  return {
    Bronze: {
      desc: `Junior ${skill} developer job-interview level — NOT trivial, genuinely tests real competence`,
      mcqGuide: `These must be REAL interview questions that separate those who truly know ${skill} from those who just "used it once".
Topics: mutable default arguments, scoping/closures, reference vs value semantics, short-circuit evaluation returning values, operator precedence traps, common runtime error causes, built-in function edge cases, truthiness of different types, string immutability, type coercion in comparisons, iterator exhaustion, list aliasing vs copying.
AVOID trivial questions like "what does print() do". Every question must have 3 plausible wrong answers that someone who half-knows ${skill} would pick. Make the correct answer require actual understanding, not guessing.`,
      outputGuide: `Code snippets 4-8 lines that TRICK people who skim code without fully tracing it.
Test: mutable default args reused across calls, list aliasing side effects, for-else clause execution, += vs = + on lists/strings, chained comparisons, print() sep/end params, short-circuit returning non-boolean values, integer caching (-5 to 256), division operator differences, conditional expressions with side effects.
Every snippet must have a non-obvious output — the wrong answer must seem equally reasonable to someone who doesn't think carefully.`,
    },
    Silver: {
      desc: `Mid-level ${skill} developer interview — tests depth of real-world understanding`,
      mcqGuide: `Questions a 2-4 year experienced ${skill} developer must get right in a job interview.
Topics: MRO and super() in multiple inheritance, property decorators with setters/deleters, classmethod vs staticmethod edge cases, generator send() and throw(), contextlib tools, functools (lru_cache invalidation, partial, reduce), collections (defaultdict factory reuse, Counter arithmetic, deque rotation), threading GIL implications, __new__ vs __init__ order, descriptor protocol get/set/delete, ABC enforcement at instantiation, dataclass field ordering, late binding in closures inside loops, nonlocal vs global.
Every option must look credible to an experienced developer — absolutely no obviously wrong choices.`,
      outputGuide: `6-12 line snippets requiring careful execution tracing through non-trivial control flow.
Test: super() MRO call order in diamond inheritance, decorator with arguments (triple nesting), yield from delegation, context manager return value in with-as, exception chaining and __cause__, class variable mutated via instance, __getattr__ triggered only on missing attrs, late binding closure loop trap, itertools.chain exhaustion, functools.wraps preserving metadata, generator state after StopIteration.`,
    },
    Gold: {
      desc: `Senior ${skill} engineer interview — tests mastery of language internals and advanced patterns`,
      mcqGuide: `Questions that only a genuine ${skill} expert answers correctly. Filters senior from staff engineers.
Topics: metaclass __prepare__ and namespace ordering, descriptor __set_name__ timing, slot wrapper behavior, GIL release points in C extensions, CPython object memory layout, cyclic GC and __del__ finalization order, code object co_* attributes, __class_getitem__ and generic aliases, async generator asend()/athrow(), contextvars across tasks, Protocol structural matching edge cases, TypeVar covariance/contravariance, __init_subclass__ with keyword args, __class__ cell in closures, weakref callback timing, sys.intern behavior.`,
      outputGuide: `8-16 line snippets requiring deep understanding of Python execution model and internals.
Test: metaclass __call__ intercepting __new__/__init__ separately, descriptor priority over instance __dict__, custom __aiter__ with async for, decorator stack preserving __wrapped__, recursive __getattr__ causing RecursionError, cooperative super() with *args/**kwargs forwarding, generator coroutine send return values, __set_name__ called during class body execution, object.__new__ bypassing __init__, class decorator timing vs metaclass timing.`,
    },
  };
}

// ── Generate MCQ + output questions via Groq ─────────────────
async function generateQuizQuestions(skill, level) {
  const { mcqCount, outputCount } = QUIZ_CONFIG[level];
  const diff = getQuizDifficulty(skill)[level];
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY not set');

  const prompt = `You are a technical interviewer creating a ${skill} skills assessment at ${diff.desc}.

Generate a JSON object with a "questions" array containing exactly ${mcqCount + outputCount} questions in RANDOM ORDER (mix MCQ and output types throughout, do NOT group them).

## Question Types

### Type 1 — MCQ (generate exactly ${mcqCount}):
${diff.mcqGuide}
Format:
{
  "type": "mcq",
  "q": "question text",
  "A": "option A",
  "B": "option B",
  "C": "option C",
  "D": "option D",
  "correct": "B"
}

### Type 2 — Code Output (generate exactly ${outputCount}):
${diff.outputGuide}
- The code snippet must be valid ${skill} code
- "correct" must be the EXACT terminal output (trim trailing newline, keep internal newlines as \\n if multi-line)
- If output is multi-line, represent newlines with actual \\n in the correct field
Format:
{
  "type": "output",
  "q": "What is the output of the following ${skill} code?",
  "code": "the code snippet here",
  "correct": "exact output here"
}

## Strict Rules
- NEVER generate trivial questions (e.g., "what is a variable", "what does print() do", "what is a loop")
- Every MCQ must have 3 distractors that look correct to someone with surface-level knowledge
- Code output snippets must have non-obvious outputs — avoid snippets where the answer is immediately obvious
- All ${mcqCount} MCQ and ${outputCount} output questions must be at the difficulty described above — if any feel too easy, replace with harder ones
- Every question must be distinct — no two questions testing the same concept
- Code snippets must be self-contained (standard library imports only, no external packages)
- Do NOT add any explanation — respond with ONLY the JSON

Respond with ONLY this JSON:
{
  "questions": [ ...array of ${mcqCount + outputCount} questions... ]
}`;

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      response_format: { type: 'json_object' },
      max_tokens: 16000,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('[Groq Quiz] API error:', err);
    throw new Error(`Groq API error: ${res.status}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty Groq response');

  const parsed = JSON.parse(content);
  const questions = parsed.questions;

  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error('Groq returned no questions');
  }

  return questions;
}

// ── Shuffle MCQ options (Fisher-Yates) ───────────────────────
// Randomizes A/B/C/D so same question looks different each attempt
function shuffleMCQOptions(question) {
  if (question.type !== 'mcq') return question;

  const letters = ['A', 'B', 'C', 'D'];
  const correctText = question[question.correct]; // store correct option's text

  // Build array of option texts and shuffle
  const values = letters.map(l => question[l]);
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }

  // Re-map letters to shuffled values, find new correct letter
  const shuffled = {};
  let newCorrect = '';
  letters.forEach((letter, i) => {
    shuffled[letter] = values[i];
    if (values[i] === correctText) newCorrect = letter;
  });

  return { ...question, ...shuffled, correct: newCorrect };
}

// ── Cooldown config ───────────────────────────────────────────
const COOLDOWN_HOURS = [0, 1, 6, 24]; // after 0,1,2,3+ fails

async function getCooldownStatus(userId, skill, level) {
  const { supabase } = await import('../config/supabase.js');
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: attempts } = await supabase
    .from('quiz_attempts')
    .select('attempted_at, passed')
    .eq('user_id', userId)
    .eq('skill', skill)
    .eq('level', level)
    .eq('passed', false)
    .gte('attempted_at', since)
    .order('attempted_at', { ascending: false });

  if (!attempts || attempts.length === 0) return { blocked: false };

  const failCount = attempts.length;
  const cooldownHours = COOLDOWN_HOURS[Math.min(failCount, COOLDOWN_HOURS.length - 1)];
  if (cooldownHours === 0) return { blocked: false };

  const lastFail = new Date(attempts[0].attempted_at);
  const unblockAt = new Date(lastFail.getTime() + cooldownHours * 60 * 60 * 1000);

  if (Date.now() < unblockAt.getTime()) {
    const minsLeft = Math.ceil((unblockAt.getTime() - Date.now()) / 60000);
    const timeStr = minsLeft >= 60
      ? `${Math.ceil(minsLeft / 60)} hour${Math.ceil(minsLeft / 60) > 1 ? 's' : ''}`
      : `${minsLeft} minute${minsLeft > 1 ? 's' : ''}`;
    return { blocked: true, timeStr, failCount };
  }

  return { blocked: false };
}

async function recordQuizAttempt(userId, skill, level, passed, score) {
  try {
    const { supabase } = await import('../config/supabase.js');
    await supabase.from('quiz_attempts').insert({ user_id: userId, skill, level, passed, score });
  } catch (err) {
    console.error('[recordQuizAttempt] Failed to record:', err.message);
  }
}

// ── 10. Start a quiz session ──────────────────────────────────
// POST /api/v1/badges/quiz/start
// Body: { skill, level }
// Returns: { sessionToken, questions: [{id, q, A, B, C, D}] }  — no "correct" field sent to client

export const startQuiz = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { skill, level } = req.body;

  if (!skill) throw new ApiError(StatusCodes.BAD_REQUEST, 'skill is required');
  if (!level || !VALID_LEVELS.includes(level)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'level must be Bronze, Silver, or Gold');
  }

  // ── Cooldown check ────────────────────────────────────────────
  const cooldown = await getCooldownStatus(userId, skill, level);
  if (cooldown.blocked) {
    throw new ApiError(
      StatusCodes.TOO_MANY_REQUESTS,
      `Too many failed attempts. Please wait ${cooldown.timeStr} before trying again. (${cooldown.failCount} failed attempt${cooldown.failCount > 1 ? 's' : ''} in the last 24 hours)`
    );
  }

  // Progressive locking: check if user has the prerequisite badge
  if (level === 'Silver' || level === 'Gold') {
    const prerequisite = level === 'Silver' ? 'Bronze' : 'Silver';
    const userBadges = await Badge.findByUserId(userId);
    const hasPrerequisite = userBadges.some(
      b => b.skill === skill && b.status === 'active' && b.badgeLevel === prerequisite
    );
    // Also allow if user has Gold (which implies Silver was earned)
    const hasHigher = level === 'Silver' && userBadges.some(
      b => b.skill === skill && b.status === 'active' && b.badgeLevel === 'Gold'
    );
    if (!hasPrerequisite && !hasHigher) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        `You must earn a ${prerequisite} badge for ${skill} before attempting ${level}`
      );
    }
  }

  // Generate questions from Groq
  let rawQuestions;
  try {
    rawQuestions = await generateQuizQuestions(skill, level);
  } catch (err) {
    console.error('[startQuiz] Groq error:', err.message);
    throw new ApiError(StatusCodes.SERVICE_UNAVAILABLE, 'Quiz generation failed. Please try again.');
  }

  const { count } = QUIZ_CONFIG[level];
  // Trim to exact count in case Groq returned extra, then shuffle MCQ options
  const trimmed = rawQuestions.slice(0, count).map(shuffleMCQOptions);

  // Store question metadata + correct answers in JWT (never sent to client)
  const questionsMeta = trimmed.map(q => ({
    type: q.type || 'mcq',
    correct: String(q.correct ?? '').trim(),
  }));

  const sessionToken = jwt.sign(
    { userId, skill, level, questionsMeta, startedAt: Date.now() },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: '2h' }
  );

  // Send questions without correct answers
  const clientQuestions = trimmed.map((q, i) => {
    const base = { id: i, type: q.type || 'mcq', q: q.q };
    if (q.type === 'output') {
      return { ...base, code: q.code || '' };
    }
    return { ...base, A: q.A, B: q.B, C: q.C, D: q.D };
  });

  return res.status(StatusCodes.OK).send(
    new ApiResponse(StatusCodes.OK, 'Quiz started successfully', {
      sessionToken,
      questions: clientQuestions,
      total: clientQuestions.length,
      level,
      skill,
      passPercent: QUIZ_CONFIG[level].passPercent,
    })
  );
});

// ── 11. Submit quiz answers ───────────────────────────────────
// POST /api/v1/badges/quiz/submit
// Body: { sessionToken, answers: ['A', 'C', 'B', ...] }  — array indexed by question id

export const submitQuiz = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { sessionToken, answers, timeSpent } = req.body;

  if (!sessionToken) throw new ApiError(StatusCodes.BAD_REQUEST, 'sessionToken is required');
  if (!Array.isArray(answers)) throw new ApiError(StatusCodes.BAD_REQUEST, 'answers must be an array');

  // Verify and decode the session token
  let session;
  try {
    session = jwt.verify(sessionToken, process.env.ACCESS_TOKEN_SECRET);
  } catch (err) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Quiz session expired or invalid. Please start a new quiz.');
  }

  if (session.userId !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Quiz session does not belong to you');
  }

  const { skill, level, questionsMeta, startedAt } = session;
  const { passPercent } = QUIZ_CONFIG[level];

  // ── Total time validation (stored in JWT — tamper-proof) ──────
  // Only catches bots/scripts — humans answering fast are fine
  // Bronze: 20 questions × 3s min avg = 60s
  // Silver: 40 questions × 3s min avg = 120s
  // Gold:   50 questions × 3s min avg = 150s
  const MIN_TOTAL_SECONDS = { Bronze: 20, Silver: 40, Gold: 60 };
  if (startedAt) {
    const totalSeconds = Math.round((Date.now() - startedAt) / 1000);
    const minRequired = MIN_TOTAL_SECONDS[level] ?? 60;
    if (totalSeconds < minRequired) {
      await recordQuizAttempt(userId, skill, level, false, 0);
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        `Quiz completed in ${totalSeconds}s — that's less than 3 seconds per question. Please take your time and read each question carefully.`
      );
    }
  }

  // Score the quiz — MCQ: exact letter match; output: trimmed string match
  let correct = 0;
  const breakdown = questionsMeta.map((meta, i) => {
    const userAns = answers[i] ?? null;
    const isCorrect = meta.type === 'output'
      ? (userAns ?? '').trim() === (meta.correct ?? '').trim()
      : userAns === meta.correct;
    if (isCorrect) correct++;
    return { id: i, type: meta.type, userAnswer: userAns, correctAnswer: meta.correct, passed: isCorrect };
  });

  const total = questionsMeta.length;
  const score = Math.round((correct / total) * 100);
  const passed = score >= passPercent;

  if (!passed) {
    await recordQuizAttempt(userId, skill, level, false, score);
    return res.status(StatusCodes.OK).send(
      new ApiResponse(
        StatusCodes.OK,
        `You scored ${score}% (${correct}/${total}). Need ${passPercent}%+ to earn a ${level} badge.`,
        { score, passed: false, correct, total, breakdown, badge: null }
      )
    );
  }

  // Award the badge
  await recordQuizAttempt(userId, skill, level, true, score);
  await Badge.revokeExisting(userId, skill);

  const badge = await Badge.create({
    userId,
    skill,
    badgeLevel: level,
    badgePoints: LEVEL_POINTS[level],
    provider: 'Quiz',
    verificationType: 'coding_test',
    score,
    status: 'active',
  });

  return res.status(StatusCodes.CREATED).send(
    new ApiResponse(
      StatusCodes.CREATED,
      `Congratulations! You scored ${score}% (${correct}/${total}) and earned a ${level} ${skill} badge!`,
      { score, passed: true, correct, total, breakdown, badge: badge.toJSON() }
    )
  );
});
