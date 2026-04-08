import { supabase } from '../config/supabase.js';

export class EscrowTransaction {
  constructor(data) {
    this.id = data.id;
    this.milestoneId = data.milestone_id;
    this.payerId = data.payer_id;
    this.payeeId = data.payee_id;
    this.amount = parseFloat(data.amount) || 0;
    this.status = data.status; // HELD | RELEASED | REFUNDED
    this.heldAt = data.held_at;
    this.releasedAt = data.released_at || null;
    this.refundedAt = data.refunded_at || null;
  }

  toJSON() {
    return {
      id: this.id,
      milestoneId: this.milestoneId,
      payerId: this.payerId,
      payeeId: this.payeeId,
      amount: this.amount,
      status: this.status,
      heldAt: this.heldAt,
      releasedAt: this.releasedAt,
      refundedAt: this.refundedAt,
    };
  }

  static async findByMilestoneId(milestoneId) {
    const { data, error } = await supabase
      .from('escrow_transactions')
      .select('*')
      .eq('milestone_id', milestoneId)
      .order('held_at', { ascending: false });

    if (error) throw error;
    return (data || []).map((r) => new EscrowTransaction(r));
  }

  static async findHeldByMilestoneId(milestoneId) {
    const { data, error } = await supabase
      .from('escrow_transactions')
      .select('*')
      .eq('milestone_id', milestoneId)
      .eq('status', 'HELD')
      .single();

    if (error || !data) return null;
    return new EscrowTransaction(data);
  }

  /** Create HELD escrow without moving in-app wallet (e.g. client paid platform via PayPal). */
  static async createHeld({ milestoneId, payerId, payeeId, amount }) {
    const { data, error } = await supabase
      .from('escrow_transactions')
      .insert({
        milestone_id: milestoneId,
        payer_id: payerId,
        payee_id: payeeId,
        amount,
        status: 'HELD',
      })
      .select()
      .single();

    if (error) throw error;
    return new EscrowTransaction(data);
  }

  // Mark escrow as RELEASED without moving funds to freelancer wallet.
  // Used when admin handles payment manually outside the platform wallet.
  static async markAsReleased(milestoneId) {
    const { error } = await supabase
      .from('escrow_transactions')
      .update({ status: 'RELEASED', released_at: new Date().toISOString() })
      .eq('milestone_id', milestoneId)
      .eq('status', 'HELD');

    if (error) throw error;
    return true;
  }
}
