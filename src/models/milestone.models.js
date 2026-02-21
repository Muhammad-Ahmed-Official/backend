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
      })
      .select()
      .single();

    if (error) throw error;
    return new Milestone(data);
  }

  static async updateStatus(id, status) {
    const { data, error } = await supabase
      .from('milestones')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return new Milestone(data);
  }

  // Returns progress 0-100 based on approved milestones
  static async calculateProjectProgress(projectId) {
    const { data, error } = await supabase
      .from('milestones')
      .select('status')
      .eq('project_id', projectId);

    if (error) throw error;
    if (!data || data.length === 0) return 0;

    const approved = data.filter((m) => m.status === 'approved').length;
    return Math.round((approved / data.length) * 100);
  }

  static async delete(id) {
    const { error } = await supabase.from('milestones').delete().eq('id', id);
    if (error) throw error;
    return true;
  }
}
