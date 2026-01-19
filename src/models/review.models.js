import { supabase } from '../config/supabase.js';

export class Review {
  constructor(data) {
    this.id = data.id;
    this.projectId = data.project_id;
    this.reviewerId = data.reviewer_id;
    this.revieweeId = data.reviewee_id;
    this.rating = data.rating;
    this.comment = data.comment;
    this.createdAt = data.created_at;
    // Joined data
    this.project = data.project || null;
    this.reviewer = data.reviewer || null;
  }

  toJSON() {
    return {
      id: this.id,
      projectId: this.projectId,
      reviewerId: this.reviewerId,
      revieweeId: this.revieweeId,
      rating: this.rating,
      comment: this.comment,
      createdAt: this.createdAt,
      project: this.project,
      reviewer: this.reviewer,
    };
  }

  static async findByRevieweeId(revieweeId) {
    const { data, error } = await supabase
      .from('reviews')
      .select(`
        *,
        project:projects(id, title),
        reviewer:users!reviews_reviewer_id_fkey(id, user_name, email)
      `)
      .eq('reviewee_id', revieweeId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return (data || []).map(item => new Review(item));
  }

  static async create(reviewData) {
    const { data, error } = await supabase
      .from('reviews')
      .insert(reviewData)
      .select(`
        *,
        project:projects(id, title),
        reviewer:users!reviews_reviewer_id_fkey(id, user_name, email)
      `)
      .single();
    
    if (error) throw error;
    return new Review(data);
  }

  static async getAverageRating(revieweeId) {
    const { data, error } = await supabase
      .from('reviews')
      .select('rating')
      .eq('reviewee_id', revieweeId);
    
    if (error) throw error;
    if (!data || data.length === 0) return 0;
    
    const sum = data.reduce((acc, review) => acc + review.rating, 0);
    return (sum / data.length).toFixed(1);
  }
}
