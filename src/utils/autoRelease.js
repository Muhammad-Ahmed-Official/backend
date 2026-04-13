import { supabase } from '../config/supabase.js';

const INTERVAL_MS = 60 * 60 * 1000; // every hour

// Auto-escalate disputes whose stage_deadline has passed and are still open/under_review
async function runDisputeAutoEscalate() {
  try {
    const now = new Date().toISOString();
    const terminalStatuses = ['resolved', 'closed', 'denied', 'Resolved', 'Denied', 'Closed'];

    const { data: overdueDisputes, error } = await supabase
      .from('disputes')
      .select('id, client_id, freelancer_id, status')
      .not('stage_deadline', 'is', null)
      .lt('stage_deadline', now)
      .eq('is_escalated', false)
      .not('status', 'in', `(${terminalStatuses.map(s => `"${s}"`).join(',')})`);

    if (error) {
      // Silently skip if the dispute schema migration hasn't been run yet
      if (error.message?.includes('column') && error.message?.includes('does not exist')) {
        return; // Migration pending — columns added by dispute_resolution_schema.sql
      }
      console.error('[DisputeAutoEscalate] Failed to fetch overdue disputes:', error.message);
      return;
    }

    if (!overdueDisputes || overdueDisputes.length === 0) return;

    console.log(`[DisputeAutoEscalate] Auto-escalating ${overdueDisputes.length} overdue dispute(s)...`);

    for (const d of overdueDisputes) {
      const { error: updateErr } = await supabase
        .from('disputes')
        .update({
          is_escalated: true,
          escalated_at: now,
          escalation_reason: 'Auto-escalated: stage deadline exceeded with no admin action',
          updated_at: now,
        })
        .eq('id', d.id);

      if (updateErr) {
        console.error(`[DisputeAutoEscalate] Failed to escalate dispute ${d.id}:`, updateErr.message);
      } else {
        // Log timeline event
        await supabase.from('dispute_timeline').insert({
          dispute_id: d.id,
          type: 'escalated',
          description: 'Auto-escalated by system: stage deadline exceeded',
          performed_by: null,
          performed_at: now,
        });
        console.log(`[DisputeAutoEscalate] Escalated dispute ${d.id}`);
      }
    }
  } catch (err) {
    console.error('[DisputeAutoEscalate] Unexpected error:', err.message);
  }
}

async function runAutoRelease() {
  try {
    // Find milestones that are in_review, past their review_deadline,
    // and have no unresolved dispute linked to them.
    const { data: expired, error: fetchErr } = await supabase
      .from('milestones')
      .select('id')
      .eq('status', 'in_review')
      .lt('review_deadline', new Date().toISOString());

    if (fetchErr) {
      console.error('[AutoRelease] Failed to fetch expired milestones:', fetchErr.message);
      return;
    }

    if (!expired || expired.length === 0) return;

    // Filter out any that have an open dispute
    const { data: openDisputes } = await supabase
      .from('disputes')
      .select('milestone_id')
      .is('resolved_at', null)
      .not('milestone_id', 'is', null);

    const disputedIds = new Set((openDisputes || []).map((d) => d.milestone_id));
    const toRelease = expired.filter((m) => !disputedIds.has(m.id));

    if (toRelease.length === 0) return;

    console.log(`[AutoRelease] Auto-releasing ${toRelease.length} milestone(s)...`);

    for (const { id } of toRelease) {
      const { error: rpcErr } = await supabase.rpc('release_escrow_atomic', {
        p_milestone: id,
      });

      if (rpcErr) {
        console.error(`[AutoRelease] Failed to release milestone ${id}:`, rpcErr.message);
      } else {
        console.log(`[AutoRelease] Released milestone ${id}`);
      }
    }
  } catch (err) {
    console.error('[AutoRelease] Unexpected error:', err.message);
  }
}

export function startAutoRelease() {
  console.log('[AutoRelease] Auto-release job started — runs every hour');
  // Run once at startup (catches any missed releases from downtime)
  runAutoRelease();
  runDisputeAutoEscalate();
  setInterval(runAutoRelease, INTERVAL_MS);
  setInterval(runDisputeAutoEscalate, INTERVAL_MS);
}
