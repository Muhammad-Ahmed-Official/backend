import { supabase } from '../config/supabase.js';

export class Notification {
  constructor(data) {
    this.id = data.id;
    this.userId = data.user_id;
    this.type = data.type;
    this.title = data.title;
    this.message = data.message;
    this.isRead = data.is_read;
    this.relatedId = data.related_id;
    this.createdAt = data.created_at;
  }

  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      type: this.type,
      title: this.title,
      message: this.message,
      isRead: this.isRead,
      relatedId: this.relatedId,
      createdAt: this.createdAt,
    };
  }

  static async findByUserId(userId, limit = 50) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return (data || []).map(item => new Notification(item));
  }

  static async findUnreadCount(userId) {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    
    if (error) throw error;
    return count || 0;
  }

  static async markAsRead(id) {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);
    
    if (error) throw error;
    return true;
  }

  static async markAllAsRead(userId) {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    
    if (error) throw error;
    return true;
  }

  static async create(notificationData) {
    const { data, error } = await supabase
      .from('notifications')
      .insert(notificationData)
      .select()
      .single();
    
    if (error) throw error;
    return new Notification(data);
  }
}
