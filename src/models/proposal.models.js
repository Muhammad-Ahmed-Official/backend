import { supabase, getSupabaseAdmin } from '../config/supabase.js';
import { ApiError } from '../utils/ApiError.js';
import { StatusCodes } from 'http-status-codes';

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

  // Static methods - use admin client so RLS does not block single proposal fetch/update
  static async findById(id, includeRelations = false) {
    const client = getSupabaseAdmin();
    const { data, error } = await client
      .from('proposals')
      .select('*')
      .eq('id', String(id).trim())
      .single();
    if (error || !data) return null;
    const proposalData = { ...data };
    if (includeRelations) {
      if (data.project_id) {
        const { data: projectRow } = await client.from('projects').select('*').eq('id', data.project_id).single();
        proposalData.project = projectRow || null;
      }
      if (data.freelancer_id) {
        const { data: userRow } = await client.from('users').select('id, user_name, email, role').eq('id', data.freelancer_id).single();
        proposalData.freelancer = userRow || null;
      }
    }
    return new Proposal(proposalData);
  }

  static async findByProject(projectId) {
    const client = getSupabaseAdmin();
    const { data, error } = await client
      .from('proposals')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(item => new Proposal(item));
  }

  static async findByClientProjects(projectIds) {
    if (!projectIds || projectIds.length === 0) {
      return [];
    }
    
    // First, get all proposals
    const { data: proposalsData, error: proposalsError } = await supabase
      .from('proposals')
      .select('*')
      .in('project_id', projectIds)
      .order('created_at', { ascending: false });

    if (proposalsError) throw proposalsError;
    if (!proposalsData || proposalsData.length === 0) {
      return [];
    }

    // Get unique freelancer IDs and project IDs
    const freelancerIds = [...new Set(proposalsData.map(p => p.freelancer_id).filter(Boolean))];
    const uniqueProjectIds = [...new Set(proposalsData.map(p => p.project_id).filter(Boolean))];

    // Fetch freelancers
    const { data: freelancersData, error: freelancersError } = await supabase
      .from('users')
      .select('id, user_name, email, role')
      .in('id', freelancerIds);

    if (freelancersError) throw freelancersError;

    // Fetch projects
    const { data: projectsData, error: projectsError } = await supabase
      .from('projects')
      .select('id, title, description, budget, status, client_id')
      .in('id', uniqueProjectIds);

    if (projectsError) throw projectsError;

    // Create lookup maps
    const freelancersMap = new Map((freelancersData || []).map(f => [f.id, f]));
    const projectsMap = new Map((projectsData || []).map(p => [p.id, p]));

    // Combine data
    const proposalsWithRelations = proposalsData.map(proposal => ({
      ...proposal,
      freelancer: freelancersMap.get(proposal.freelancer_id) || null,
      project: projectsMap.get(proposal.project_id) || null,
    }));

    return proposalsWithRelations.map(item => new Proposal(item));
  }

  static async findByFreelancer(freelancerId) {
    const { data, error } = await supabase
      .from('proposals')
      .select('*')
      .eq('freelancer_id', freelancerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!data || data.length === 0) return [];

    // Fetch related projects manually (avoids FK name dependency)
    const projectIds = [...new Set(data.map(p => p.project_id).filter(Boolean))];
    let projectsMap = new Map();

    if (projectIds.length > 0) {
      const { data: projectsData } = await supabase
        .from('projects')
        .select('id, title, description, budget, status, client_id')
        .in('id', projectIds);

      if (projectsData) {
        projectsMap = new Map(projectsData.map(p => [p.id, p]));
      }
    }

    return data.map(item => new Proposal({
      ...item,
      project: projectsMap.get(item.project_id) || null,
    }));
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

    const proposalId = String(id).trim();
    const admin = getSupabaseAdmin();

    const { data: updatedRows, error } = await admin
      .from('proposals')
      .update(dbUpdateData)
      .eq('id', proposalId)
      .select();

    if (error) {
      console.error('[Proposal] findByIdAndUpdate Supabase error:', { code: error.code, message: error.message, id: proposalId });
      throw error;
    }
    if (!updatedRows || updatedRows.length === 0) {
      console.error('[Proposal] findByIdAndUpdate: update matched 0 rows', { id: proposalId });
      throw new ApiError(StatusCodes.NOT_FOUND, 'Proposal not found');
    }
    return new Proposal(updatedRows[0]);
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

