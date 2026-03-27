import { supabase } from '../config/supabase.js';

export class Badge {
  constructor(data) {
    this.id = data.id;
    this.userId = data.user_id;
    this.skill = data.skill;
    this.badgeLevel = data.badge_level;
    this.badgePoints = data.badge_points;
    this.provider = data.provider;
    this.verificationType = data.verification_type;
    this.score = data.score || null;
    this.certificateUrl = data.certificate_url || null;
    this.status = data.status;
    this.createdAt = data.created_at;
    this.expiresAt = data.expires_at || null;
    this.updatedAt = data.updated_at;
  }

  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      skill: this.skill,
      badgeLevel: this.badgeLevel,
      badgePoints: this.badgePoints,
      provider: this.provider,
      verificationType: this.verificationType,
      score: this.score,
      certificateUrl: this.certificateUrl,
      status: this.status,
      createdAt: this.createdAt,
      expiresAt: this.expiresAt,
    };
  }

  static async create(data) {
    const { data: badge, error } = await supabase
      .from('badges')
      .insert({
        user_id: data.userId,
        skill: data.skill,
        badge_level: data.badgeLevel,
        badge_points: data.badgePoints,
        provider: data.provider,
        verification_type: data.verificationType,
        score: data.score || null,
        certificate_url: data.certificateUrl || null,
        status: data.status || 'pending',
        expires_at: data.expiresAt || null,
      })
      .select()
      .single();

    if (error) throw error;
    return new Badge(badge);
  }

  static async findByUserId(userId, statusFilter = null) {
    let query = supabase
      .from('badges')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(b => new Badge(b));
  }

  static async findActiveByUserId(userId) {
    return Badge.findByUserId(userId, 'active');
  }

  static async findPendingCertificates() {
    const { data, error } = await supabase
      .from('badges')
      .select(`
        *,
        user:users(id, user_name, email)
      `)
      .eq('status', 'pending')
      .eq('verification_type', 'certificate')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  static async findById(id) {
    const { data, error } = await supabase
      .from('badges')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return new Badge(data);
  }

  // Check if user already has an active badge for this skill
  static async hasActiveBadge(userId, skill) {
    const { data, error } = await supabase
      .from('badges')
      .select('id')
      .eq('user_id', userId)
      .eq('skill', skill)
      .eq('status', 'active')
      .maybeSingle();

    if (error) throw error;
    return !!data;
  }

  // Revoke all active badges for a user+skill before issuing a new one
  static async revokeExisting(userId, skill) {
    const { error } = await supabase
      .from('badges')
      .update({ status: 'revoked', updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('skill', skill)
      .eq('status', 'active');

    if (error) throw error;
  }

  static async updateStatus(id, status) {
    const { data, error } = await supabase
      .from('badges')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return new Badge(data);
  }

  // Get total badge score for a user (sum of badge_points of active badges)
  static async getBadgeScore(userId) {
    const { data, error } = await supabase
      .rpc('get_freelancer_badge_score', { p_user_id: userId });

    if (error) throw error;
    return data || 0;
  }
}
