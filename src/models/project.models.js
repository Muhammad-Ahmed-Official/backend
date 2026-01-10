import { supabase } from '../config/supabase.js';

export class Project {
  constructor(data) {
    this.id = data.id;
    this.title = data.title;
    this.description = data.description;
    this.clientId = data.client_id;
    this.freelancerId = data.freelancer_id;
    this.budget = parseFloat(data.budget) || 0;
    this.createdAt = data.created_at;
    this.location = data.location;
    this.bidsCount = data.bids_count || 0;
    this.tags = data.tags || [];
    this.category = data.category;
    this.duration = data.duration;
    this.status = data.status || 'ACTIVE';
    this.updatedAt = data.updated_at;
    
    // Joined data
    this.client = data.client || null;
    this.freelancer = data.freelancer || null;
  }

  toJSON() {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      clientId: this.clientId,
      freelancerId: this.freelancerId,
      budget: this.budget,
      createdAt: this.createdAt,
      location: this.location,
      bidsCount: this.bidsCount,
      tags: this.tags,
      category: this.category,
      duration: this.duration,
      status: this.status,
      updatedAt: this.updatedAt,
      client: this.client,
      freelancer: this.freelancer,
    };
  }

  // Static methods
  static async findById(id, includeRelations = false) {
    // Always fetch project first
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();
    
    if (projectError || !projectData) {
      console.error('Project.findById error:', projectError);
      return null;
    }
    
    const project = new Project(projectData);
    
    // If relations are requested, fetch them manually
    if (includeRelations) {
      // Fetch client data
      if (project.clientId) {
        const { data: clientData } = await supabase
          .from('users')
          .select('id, user_name, email, role')
          .eq('id', project.clientId)
          .maybeSingle();
        project.client = clientData || null;
      }
      
      // Fetch freelancer data
      if (project.freelancerId) {
        const { data: freelancerData } = await supabase
          .from('users')
          .select('id, user_name, email, role')
          .eq('id', project.freelancerId)
          .maybeSingle();
        project.freelancer = freelancerData || null;
      }
    }
    
    return project;
  }

  static async findAll(filters = {}) {
    let query = supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.clientId) {
      query = query.eq('client_id', filters.clientId);
    }
    if (filters.freelancerId) {
      query = query.eq('freelancer_id', filters.freelancerId);
    }
    if (filters.category) {
      query = query.eq('category', filters.category);
    }
    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;
    
    if (error) throw error;
    return (data || []).map(item => new Project(item));
  }

  static async create(projectData) {
    const { data, error } = await supabase
      .from('projects')
      .insert({
        title: projectData.title,
        description: projectData.description,
        client_id: projectData.clientId,
        budget: projectData.budget,
        location: projectData.location,
        tags: projectData.tags || [],
        category: projectData.category,
        duration: projectData.duration,
        status: projectData.status || 'ACTIVE',
      })
      .select()
      .single();

    if (error) throw error;
    return new Project(data);
  }

  static async findByIdAndUpdate(id, updateData) {
    const dbUpdateData = {};
    
    if (updateData.title) dbUpdateData.title = updateData.title;
    if (updateData.description) dbUpdateData.description = updateData.description;
    if (updateData.budget !== undefined) dbUpdateData.budget = updateData.budget;
    if (updateData.location !== undefined) dbUpdateData.location = updateData.location;
    if (updateData.tags) dbUpdateData.tags = updateData.tags;
    if (updateData.category) dbUpdateData.category = updateData.category;
    if (updateData.duration) dbUpdateData.duration = updateData.duration;
    if (updateData.status) dbUpdateData.status = updateData.status;
    if (updateData.freelancerId !== undefined) dbUpdateData.freelancer_id = updateData.freelancerId;

    dbUpdateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('projects')
      .update(dbUpdateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return new Project(data);
  }

  static async delete(id) {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  }
}

