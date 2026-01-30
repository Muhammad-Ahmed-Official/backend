import { supabase } from '../config/supabase.js';

export class DisputeTimeline {
    constructor(data) {
        this.id = data.id;
        this.disputeId = data.dispute_id;
        this.type = data.type;
        this.description = data.description;
        this.performedBy = data.performed_by;
        this.performedAt = data.performed_at;
        // Joined data
        this.performer = data.performer || null;
    }

    toJSON() {
        return {
            id: this.id,
            disputeId: this.disputeId,
            type: this.type,
            description: this.description,
            performedBy: this.performedBy,
            performedAt: this.performedAt,
            performer: this.performer,
        };
    }

    static async findByDisputeId(disputeId) {
        const { data, error } = await supabase
            .from('dispute_timeline')
            .select(`
        *,
        performer:users(id, user_name, role)
      `)
            .eq('dispute_id', disputeId)
            .order('performed_at', { ascending: true });

        if (error) throw error;
        return (data || []).map(item => new DisputeTimeline(item));
    }

    static async create(eventData) {
        const { data, error } = await supabase
            .from('dispute_timeline')
            .insert({
                dispute_id: eventData.disputeId,
                type: eventData.type,
                description: eventData.description,
                performed_by: eventData.performedBy,
            })
            .select(`
        *,
        performer:users(id, user_name, role)
      `)
            .single();

        if (error) throw error;
        return new DisputeTimeline(data);
    }
}
