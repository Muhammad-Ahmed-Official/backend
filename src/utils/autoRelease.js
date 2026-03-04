import { supabase } from '../config/supabase.js';

const INTERVAL_MS = 60 * 60 * 1000; // every hour

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
  setInterval(runAutoRelease, INTERVAL_MS);
}
