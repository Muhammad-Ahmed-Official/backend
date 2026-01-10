import { supabase } from '../config/supabase.js';

export class Proposal {
  constructor(data) {
    this.id = data.id;
    this.projectId = data.project_id;
    this.freelancerId = data.freelancer_id;
    this.coverLetter = data.cover_letter;
    this.bidAmount = parseFloat(data.bid_amount) || 0;
    this.status = data.status || 'PENDING';
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
    
    // Joined data
    this.project = data.project || null;
    this.freelancer = data.freelancer || null;
  }

  toJSON() {
    return {
      id: this.id,
      projectId: this.projectId,
      freelancerId: this.freelancerId,
      coverLetter: this.coverLetter,
      bidAmount: this.bidAmount,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      project: this.project,
      freelancer: this.freelancer,
    };
  }

  // Static methods
  static async findById(id, includeRelations = false) {
    let query;
    
    if (includeRelations) {
      query = supabase
        .from('proposals')
        .select(`
          *,
          project:projects!proposals_project_id_fkey(*),
          freelancer:users!proposals_freelancer_id_fkey(id, user_name, email, role)
        `)
        .eq('id', id)
        .single();
    } else {
      query = supabase
        .from('proposals')
        .select('*')
        .eq('id', id)
        .single();
    }

    const { data, error } = await query;
    
    if (error || !data) return null;
    return new Proposal(data);
  }

  static async findByProject(projectId) {
    const { data, error } = await supabase
      .from('proposals')
      .select(`
        *,
        freelancer:users!proposals_freelancer_id_fkey(id, user_name, email, role)
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(item => new Proposal(item));
  }

  static async findByFreelancer(freelancerId) {
    const { data, error } = await supabase
      .from('proposals')
      .select(`
        *,
        project:projects!proposals_project_id_fkey(*)
      `)
      .eq('freelancer_id', freelancerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(item => new Proposal(item));
  }

  static async create(proposalData) {
    // Check if proposal already exists
    const { data: existing } = await supabase
      .from('proposals')
      .select('id')
      .eq('project_id', proposalData.projectId)
      .eq('freelancer_id', proposalData.freelancerId)
      .maybeSingle();

    if (existing) {
      throw new Error('Proposal already exists for this project');
    }

    const { data, error } = await supabase
      .from('proposals')
      .insert({
        project_id: proposalData.projectId,
        freelancer_id: proposalData.freelancerId,
        cover_letter: proposalData.coverLetter,
        bid_amount: proposalData.bidAmount,
        status: 'PENDING',
      })
      .select()
      .single();

    if (error) throw error;
    return new Proposal(data);
  }

  static async findByIdAndUpdate(id, updateData) {
    const dbUpdateData = {};
    
    if (updateData.coverLetter) dbUpdateData.cover_letter = updateData.coverLetter;
    if (updateData.bidAmount !== undefined) dbUpdateData.bid_amount = updateData.bidAmount;
    if (updateData.status) dbUpdateData.status = updateData.status;

    dbUpdateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('proposals')
      .update(dbUpdateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return new Proposal(data);
  }

  static async delete(id) {
    const { error } = await supabase
      .from('proposals')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  }
}

