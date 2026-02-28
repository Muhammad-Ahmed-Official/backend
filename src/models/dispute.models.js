import { supabase } from '../config/supabase.js';
import { Project } from './project.models.js';

export class Dispute {
  constructor(data) {
    this.id = data.id;
    this.projectId = data.project_id;
    this.clientId = data.client_id;
    this.freelancerId = data.freelancer_id;
    this.reason = data.reason;
    this.description = data.description;
    this.amount = parseFloat(data.amount) || 0;
    this.status = data.status;
    this.priority = data.priority || 'medium';
    this.assignedMediatorId = data.assigned_mediator_id;
    this.resolutionType = data.resolution_type;
    this.resolutionDescription = data.resolution_description;
    this.resolvedBy = data.resolved_by;
    this.resolvedAt = data.resolved_at;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
    // Joined data
    this.project = data.project || null;
    this.client = data.client || null;
    this.freelancer = data.freelancer || null;
    this.mediator = data.mediator || null;
  }

  toJSON() {
    return {
      id: this.id,
      projectId: this.projectId,
      clientId: this.clientId,
      freelancerId: this.freelancerId,
      reason: this.reason,
      description: this.description,
      amount: this.amount,
      status: this.status,
      priority: this.priority,
      assignedMediatorId: this.assignedMediatorId,
      resolutionType: this.resolutionType,
      resolutionDescription: this.resolutionDescription,
      resolvedBy: this.resolvedBy,
      resolvedAt: this.resolvedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      project: this.project,
      client: this.client,
      freelancer: this.freelancer,
      mediator: this.mediator,
    };
  }

  static async findByUserId(userId, role) {
    let query = supabase.from('disputes').select(`
      *,
      project:projects(id, title),
      client:users!disputes_client_id_fkey(id, user_name, email),
      freelancer:users!disputes_freelancer_id_fkey(id, user_name, email)
    `);

    if (role === 'Client') {
      query = query.eq('client_id', userId);
    } else if (role === 'Freelancer') {
      query = query.eq('freelancer_id', userId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(item => new Dispute(item));
  }

  static async findById(id) {
    const { data, error } = await supabase
      .from('disputes')
      .select(`
        *,
        project:projects(id, title, description),
        client:users!disputes_client_id_fkey(id, user_name, email),
        freelancer:users!disputes_freelancer_id_fkey(id, user_name, email)
      `)
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return new Dispute(data);
  }

  static async create(disputeData) {
    const { data, error } = await supabase
      .from('disputes')
      .insert(disputeData)
      .select(`
        *,
        project:projects(id, title),
        client:users!disputes_client_id_fkey(id, user_name, email),
        freelancer:users!disputes_freelancer_id_fkey(id, user_name, email)
      `)
      .single();

    if (error) throw error;
    return new Dispute(data);
  }

  static async updateStatus(id, status) {
    const { data, error } = await supabase
      .from('disputes')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return new Dispute(data);
  }

  static async findAll(filters = {}) {
    let query = supabase.from('disputes').select(`
      *,
      project:projects(id, title),
      client:users!disputes_client_id_fkey(id, user_name, email),
      freelancer:users!disputes_freelancer_id_fkey(id, user_name, email)
    `);

    if (filters.status) query = query.eq('status', filters.status);
    if (filters.priority) query = query.eq('priority', filters.priority);

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(item => new Dispute(item));
  }

  static async assignMediator(id, mediatorId) {
    const { data, error } = await supabase
      .from('disputes')
      .update({
        assigned_mediator_id: mediatorId,
        status: 'under_review',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return new Dispute(data);
  }

  static async updatePriority(id, priority) {
    const { data, error } = await supabase
      .from('disputes')
      .update({
        priority,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return new Dispute(data);
  }

  static async resolve(id, resolutionData) {
    const { data, error } = await supabase
      .from('disputes')
      .update({
        status: resolutionData.decision === 'resolve' ? 'resolved' : 'closed',
        resolution_type: resolutionData.type,
        resolution_description: resolutionData.description,
        resolved_by: resolutionData.resolvedBy,
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return new Dispute(data);
  }
}
