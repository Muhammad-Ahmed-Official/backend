import { supabase } from '../config/supabase.js';
import { Project } from './project.models.js';

export class Dispute {
  constructor(data) {
    this.id = data.id;
    this.projectId = data.project_id;
    this.clientId = data.client_id;
    this.freelancerId = data.freelancer_id;
    this.reason = data.reason;
    this.subcategory = data.subcategory || null;
    this.description = data.description;
    this.amount = parseFloat(data.amount) || 0;
    this.status = data.status;
    this.priority = data.priority || 'medium';
    this.assignedMediatorId = data.assigned_mediator_id;
    this.resolutionType = data.resolution_type;
    this.resolutionDescription = data.resolution_description;
    this.resolvedBy = data.resolved_by;
    this.resolvedAt = data.resolved_at;
    // Legacy fallback: old records had status='escalated' instead of the flag
    this.isEscalated = data.is_escalated || data.status === 'escalated' || false;
    this.escalationReason = data.escalation_reason || null;
    this.escalatedAt = data.escalated_at || null;
    // Stage deadline: when the current stage must be acted on before auto-escalation
    this.stageDeadline = data.stage_deadline || null;
    // Response deadline: how long the respondent has to reply
    this.responseDeadline = data.response_deadline || null;
    // Mediation recommendation from admin/mediator
    this.mediationRecommendation = data.mediation_recommendation || null;
    // Both-party acceptance of mediation proposal
    this.clientAccepted = data.client_accepted ?? null;
    this.freelancerAccepted = data.freelancer_accepted ?? null;
    // Respondent's initial response: 'accepted' | 'rejected' | 'counter'
    this.respondentResponse = data.respondent_response || null;
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
      subcategory: this.subcategory,
      description: this.description,
      amount: this.amount,
      status: this.status,
      priority: this.priority,
      assignedMediatorId: this.assignedMediatorId,
      resolutionType: this.resolutionType,
      resolutionDescription: this.resolutionDescription,
      resolvedBy: this.resolvedBy,
      resolvedAt: this.resolvedAt,
      isEscalated: this.isEscalated,
      escalationReason: this.escalationReason,
      escalatedAt: this.escalatedAt,
      stageDeadline: this.stageDeadline,
      responseDeadline: this.responseDeadline,
      mediationRecommendation: this.mediationRecommendation,
      clientAccepted: this.clientAccepted,
      freelancerAccepted: this.freelancerAccepted,
      respondentResponse: this.respondentResponse,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      project: this.project,
      client: this.client,
      freelancer: this.freelancer,
      mediator: this.mediator,
    };
  }

  // Batch-fetch project and user data for dispute rows without relying on FK constraints.
  // Supabase's `!constraint_name` join syntax requires explicit FK definitions — if those
  // don't exist (e.g. columns added via ALTER TABLE without REFERENCES), the query fails.
  // This helper does two extra queries and attaches the results manually.
  static async _populateRelations(rows) {
    if (!rows || rows.length === 0) return rows;

    const projectIds = [...new Set(rows.map(r => r.project_id).filter(Boolean))];
    const userIds = [...new Set([
      ...rows.map(r => r.client_id),
      ...rows.map(r => r.freelancer_id),
    ].filter(Boolean))];

    const [projectsRes, usersRes] = await Promise.all([
      projectIds.length > 0
        ? supabase.from('projects').select('id, title, description').in('id', projectIds)
        : { data: [] },
      userIds.length > 0
        ? supabase.from('users').select('id, user_name, email').in('id', userIds)
        : { data: [] },
    ]);

    const projectsMap = Object.fromEntries((projectsRes.data || []).map(p => [p.id, p]));
    const usersMap    = Object.fromEntries((usersRes.data || []).map(u => [u.id, u]));

    return rows.map(r => ({
      ...r,
      project:    r.project_id    ? (projectsMap[r.project_id]    || null) : null,
      client:     r.client_id     ? (usersMap[r.client_id]         || null) : null,
      freelancer: r.freelancer_id ? (usersMap[r.freelancer_id]     || null) : null,
    }));
  }

  static async findByUserId(userId, role) {
    let query = supabase.from('disputes').select('*');

    if (role === 'Client') {
      query = query.eq('client_id', userId);
    } else if (role === 'Freelancer') {
      query = query.eq('freelancer_id', userId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;

    const populated = await Dispute._populateRelations(data || []);
    return populated.map(item => new Dispute(item));
  }

  static async findById(id) {
    const { data, error } = await supabase
      .from('disputes')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;

    const [populated] = await Dispute._populateRelations([data]);
    return new Dispute(populated);
  }

  static async updateFields(id, fields) {
    const payload = { ...fields, updated_at: new Date().toISOString() };
    const { data, error } = await supabase
      .from('disputes')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return new Dispute(data);
  }

  static async create(disputeData) {
    const { data, error } = await supabase
      .from('disputes')
      .insert(disputeData)
      .select('*')
      .single();

    if (error) throw error;

    const [populated] = await Dispute._populateRelations([data]);
    return new Dispute(populated);
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
    let query = supabase.from('disputes').select('*');

    if (filters.status) query = query.eq('status', filters.status);
    if (filters.priority) query = query.eq('priority', filters.priority);
    if (filters.escalated === true) query = query.eq('is_escalated', true);

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;

    const populated = await Dispute._populateRelations(data || []);
    return populated.map(item => new Dispute(item));
  }

  static async escalate(id, reason) {
    const { data, error } = await supabase
      .from('disputes')
      .update({
        is_escalated: true,
        escalation_reason: reason || null,
        escalated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return new Dispute(data);
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

  static async respondToDispute(id, respondentResponse) {
    // Response by the other party: 'accepted' | 'rejected' | 'counter'
    const { data, error } = await supabase
      .from('disputes')
      .update({
        respondent_response: respondentResponse,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return new Dispute(data);
  }

  static async setMediationRecommendation(id, recommendation) {
    const { data, error } = await supabase
      .from('disputes')
      .update({
        mediation_recommendation: recommendation,
        status: 'mediation',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return new Dispute(data);
  }

  static async acceptMediation(id, role) {
    const field = role === 'Client' ? 'client_accepted' : 'freelancer_accepted';
    const { data, error } = await supabase
      .from('disputes')
      .update({
        [field]: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return new Dispute(data);
  }

  static async rejectMediation(id, role) {
    const field = role === 'Client' ? 'client_accepted' : 'freelancer_accepted';
    const { data, error } = await supabase
      .from('disputes')
      .update({
        [field]: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return new Dispute(data);
  }

  static async setStageDeadline(id, deadlineIso) {
    const { data, error } = await supabase
      .from('disputes')
      .update({
        stage_deadline: deadlineIso,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return new Dispute(data);
  }

  // Find all open disputes whose stage_deadline has passed — used by auto-escalator
  static async findOverdueOpen() {
    const { data, error } = await supabase
      .from('disputes')
      .select('id, status, client_id, freelancer_id')
      .not('stage_deadline', 'is', null)
      .lt('stage_deadline', new Date().toISOString())
      .not('status', 'in', '("resolved","closed","denied","Resolved","Denied","Closed")');

    if (error) throw error;
    return data || [];
  }

  // Find all open disputes not reviewed within 48h — for admin SLA tracking
  static async findUnreviewedOver48h() {
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('disputes')
      .select('id, created_at')
      .eq('status', 'open')
      .lt('created_at', cutoff);

    if (error) throw error;
    return data || [];
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
