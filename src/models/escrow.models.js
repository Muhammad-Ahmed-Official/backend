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
}
