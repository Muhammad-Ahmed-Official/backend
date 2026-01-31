import { supabase } from '../config/supabase.js';

export class DisputeEvidence {
    constructor(data) {
        this.id = data.id;
        this.disputeId = data.dispute_id;
        this.fileName = data.file_name;
        this.fileType = data.file_type;
        this.fileUrl = data.file_url;
        this.description = data.description;
        this.uploadedBy = data.uploaded_by;
        this.createdAt = data.created_at;
    }

    toJSON() {
        return {
            id: this.id,
            disputeId: this.disputeId,
            fileName: this.fileName,
            fileType: this.fileType,
            fileUrl: this.fileUrl,
            description: this.description,
            uploadedBy: this.uploadedBy,
            createdAt: this.createdAt,
        };
    }

    static async findByDisputeId(disputeId) {
        const { data, error } = await supabase
            .from('dispute_evidence')
            .select('*')
            .eq('dispute_id', disputeId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return (data || []).map(item => new DisputeEvidence(item));
    }

    static async create(evidenceData) {
        const { data, error } = await supabase
            .from('dispute_evidence')
            .insert({
                dispute_id: evidenceData.disputeId,
                file_name: evidenceData.fileName,
                file_type: evidenceData.fileType,
                file_url: evidenceData.fileUrl,
                description: evidenceData.description,
                uploaded_by: evidenceData.uploadedBy,
            })
            .select()
            .single();

        if (error) throw error;
        return new DisputeEvidence(data);
    }
}
