import { supabase } from '../config/supabase.js';

export class Milestone {
  constructor(data) {
    this.id = data.id;
    this.projectId = data.project_id;
    this.title = data.title;
    this.description = data.description || null;
    this.dueDate = data.due_date || null;
    this.status = data.status || 'pending';
    this.orderIndex = data.order_index || 0;
    this.amount = data.amount !== null && data.amount !== undefined ? parseFloat(data.amount) : null;
    this.submittedAt = data.submitted_at || null;
    this.reviewDeadline = data.review_deadline || null;
    this.approvedAt = data.approved_at || null;
    this.submissionGithubUrl = data.submission_github_url || null;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  toJSON() {
    return {
      id: this.id,
      projectId: this.projectId,
      title: this.title,
      description: this.description,
      dueDate: this.dueDate,
      status: this.status,
      orderIndex: this.orderIndex,
      amount: this.amount,
      submittedAt: this.submittedAt,
      reviewDeadline: this.reviewDeadline,
      approvedAt: this.approvedAt,
      submissionGithubUrl: this.submissionGithubUrl,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  static async findByProjectId(projectId) {
    const { data, error } = await supabase
      .from('milestones')
      .select('*')
      .eq('project_id', projectId)
      .order('order_index', { ascending: true });

    if (error) throw error;
    return (data || []).map((m) => new Milestone(m));
  }

  static async findById(id) {
    const { data, error } = await supabase
      .from('milestones')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return new Milestone(data);
  }

  static async create(milestoneData) {
    const { data, error } = await supabase
      .from('milestones')
      .insert({
        project_id: milestoneData.projectId,
        title: milestoneData.title,
        description: milestoneData.description || null,
        due_date: milestoneData.dueDate || null,
        status: 'pending',
        order_index: milestoneData.orderIndex || 0,
        amount: milestoneData.amount || null,
      })
      .select()
      .single();

    if (error) throw error;
    return new Milestone(data);
  }

  static async updateStatus(id, status, extra = {}) {
    const { data, error } = await supabase
      .from('milestones')
      .update({ status, updated_at: new Date().toISOString(), ...extra })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return new Milestone(data);
  }

  // Call fund_milestone_atomic RPC — deducts client wallet, adds to escrow, sets status='funded'
  static async fundAtomic(milestoneId) {
    const { error } = await supabase.rpc('fund_milestone_atomic', {
      p_milestone: milestoneId,
    });
    if (error) throw error;
    return Milestone.findById(milestoneId);
  }

  // Call release_escrow_atomic RPC — releases escrow to freelancer, sets status='released'
  static async releaseAtomic(milestoneId) {
    const { error } = await supabase.rpc('release_escrow_atomic', {
      p_milestone: milestoneId,
    });
    if (error) throw error;
    return Milestone.findById(milestoneId);
  }

  // Returns progress 0-100 based on released milestones
  static async calculateProjectProgress(projectId) {
    const { data, error } = await supabase
      .from('milestones')
      .select('status')
      .eq('project_id', projectId);

    if (error) throw error;
    if (!data || data.length === 0) return 0;

    const done = data.filter((m) => m.status === 'released' || m.status === 'approved').length;
    return Math.round((done / data.length) * 100);
  }

  static async delete(id) {
    const { error } = await supabase.from('milestones').delete().eq('id', id);
    if (error) throw error;
    return true;
  }
}
