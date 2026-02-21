import { supabase } from '../config/supabase.js';

// Map filter chip names (Search UI) to DB category values (Create Project)
const CATEGORY_FILTER_MAP = {
  Design: ['Design', 'Graphic Design', 'UI/UX Design'],
  Development: ['Development', 'Web Development', 'Mobile Development', 'DevOps', 'Quality Assurance'],
  Writing: ['Writing', 'Content Writing'],
  Marketing: ['Marketing', 'Digital Marketing'],
  Data: ['Data', 'Data Science'],
};

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
    this.progress = data.progress || 0;
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
      progress: this.progress,
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

    // Apply filters (case-insensitive status match)
    if (filters.status) {
      query = query.ilike('status', filters.status);
    }
    if (filters.clientId) {
      query = query.eq('client_id', filters.clientId);
    }
    if (filters.freelancerId) {
      query = query.eq('freelancer_id', filters.freelancerId);
    }
    if (filters.category) {
      const cat = String(filters.category).trim();
      if (cat) {
        const allowed = CATEGORY_FILTER_MAP[cat];
        if (Array.isArray(allowed) && allowed.length > 0) {
          query = query.in('category', allowed);
        } else {
          query = query.ilike('category', `%${cat}%`);
        }
      }
    }
    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    
    // Collect unique user IDs to fetch
    const clientIds = [...new Set((data || []).map(p => p.client_id).filter(Boolean))];
    const freelancerIds = [...new Set((data || []).map(p => p.freelancer_id).filter(Boolean))];
    const allUserIds = [...new Set([...clientIds, ...freelancerIds])];
    
    // Fetch users in one query
    let usersMap = {};
    if (allUserIds.length > 0) {
      const { data: usersData } = await supabase
        .from('users')
        .select('id, user_name, email')
        .in('id', allUserIds);
      
      (usersData || []).forEach(user => {
        usersMap[user.id] = { id: user.id, userName: user.user_name, email: user.email };
      });
    }
    
    let list = (data || []).map((item) => {
      const project = new Project(item);
      if (item.client_id && usersMap[item.client_id]) {
        project.client = usersMap[item.client_id];
      }
      if (item.freelancer_id && usersMap[item.freelancer_id]) {
        project.freelancer = usersMap[item.freelancer_id];
      }
      return project;
    });

    // If filtering by chip and we got no results, include null-category projects whose title/desc matches (e.g. "2D Graphic Designer")
    if (filters.category && list.length === 0) {
      const cat = String(filters.category).trim().toLowerCase();
      let fallbackQuery = supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })
        .is('category', null);
      if (filters.status) fallbackQuery = fallbackQuery.eq('status', filters.status);
      if (filters.clientId) fallbackQuery = fallbackQuery.eq('client_id', filters.clientId);
      if (filters.freelancerId) fallbackQuery = fallbackQuery.eq('freelancer_id', filters.freelancerId);
      const { data: nullCatData } = await fallbackQuery;
      const keyword = cat;
      const fromNull = (nullCatData || []).filter((row) => {
        const title = (row.title || '').toLowerCase();
        const desc = (row.description || '').toLowerCase();
        return title.includes(keyword) || desc.includes(keyword);
      });
      
      // Fetch users for fallback results
      const fbClientIds = [...new Set(fromNull.map(p => p.client_id).filter(Boolean))];
      const fbFreelancerIds = [...new Set(fromNull.map(p => p.freelancer_id).filter(Boolean))];
      const fbAllUserIds = [...new Set([...fbClientIds, ...fbFreelancerIds])];
      
      let fbUsersMap = {};
      if (fbAllUserIds.length > 0) {
        const { data: fbUsersData } = await supabase
          .from('users')
          .select('id, user_name, email')
          .in('id', fbAllUserIds);
        
        (fbUsersData || []).forEach(user => {
          fbUsersMap[user.id] = { id: user.id, userName: user.user_name, email: user.email };
        });
      }
      
      list = fromNull.map((item) => {
        const project = new Project(item);
        if (item.client_id && fbUsersMap[item.client_id]) {
          project.client = fbUsersMap[item.client_id];
        }
        if (item.freelancer_id && fbUsersMap[item.freelancer_id]) {
          project.freelancer = fbUsersMap[item.freelancer_id];
        }
        return project;
      });
    }
    return list;
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
    if (updateData.progress !== undefined) dbUpdateData.progress = updateData.progress;
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

