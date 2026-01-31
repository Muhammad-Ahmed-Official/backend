import { supabase } from '../config/supabase.js';

export class DisputeMessage {
    constructor(data) {
        this.id = data.id;
        this.disputeId = data.dispute_id;
        this.senderId = data.sender_id;
        this.content = data.content;
        this.attachments = data.attachments || [];
        this.isInternal = data.is_internal || false;
        this.createdAt = data.created_at;
        // Joined data
        this.sender = data.sender || null;
    }

    toJSON() {
        return {
            id: this.id,
            disputeId: this.disputeId,
            senderId: this.senderId,
            content: this.content,
            attachments: this.attachments,
            isInternal: this.isInternal,
            createdAt: this.createdAt,
            sender: this.sender,
        };
    }

    static async findByDisputeId(disputeId, includeInternal = false) {
        let query = supabase
            .from('dispute_messages')
            .select(`
        *,
        sender:users(id, user_name, email, role)
      `)
            .eq('dispute_id', disputeId);

        if (!includeInternal) {
            query = query.eq('is_internal', false);
        }

        const { data, error } = await query.order('created_at', { ascending: true });
        if (error) throw error;
        return (data || []).map(item => new DisputeMessage(item));
    }

    static async create(messageData) {
        const { data, error } = await supabase
            .from('dispute_messages')
            .insert({
                dispute_id: messageData.disputeId,
                sender_id: messageData.senderId,
                content: messageData.content,
                attachments: messageData.attachments || [],
                is_internal: messageData.isInternal || false,
            })
            .select(`
        *,
        sender:users(id, user_name, email, role)
      `)
            .single();

        if (error) throw error;
        return new DisputeMessage(data);
    }
}
