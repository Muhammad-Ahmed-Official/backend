import { supabase } from '../config/supabase.js';

export class Chat {
  constructor(data) {
    this.id = data.id;
    this.senderId = data.sender_id;
    this.receiverId = data.receiver_id;
    this.message = data.message;
    this.projectId = data.project_id;
    this.read = data.read || false;
    this.seenAt = data.seen_at || null;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;

    // Joined data
    this.sender = data.sender || null;
    this.receiver = data.receiver || null;
  }

  toJSON() {
    return {
      id: this.id,
      senderId: this.senderId,
      receiverId: this.receiverId,
      message: this.message,
      projectId: this.projectId,
      read: this.read,
      seenAt: this.seenAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      sender: this.sender,
      receiver: this.receiver,
    };
  }

  // Static methods
  static async findById(id, includeRelations = false) {
    let query;

    if (includeRelations) {
      query = supabase
        .from('chats')
        .select(`
          *,
          sender:users!chats_sender_id_fkey(id, user_name, email, role),
          receiver:users!chats_receiver_id_fkey(id, user_name, email, role)
        `)
        .eq('id', id)
        .single();
    } else {
      query = supabase
        .from('chats')
        .select('*')
        .eq('id', id)
        .single();
    }

    const { data, error } = await query;

    if (error || !data) return null;
    return new Chat(data);
  }

  static async findByParticipants(senderId, receiverId, projectId = null, limit = 50, offset = 0) {
    let query = supabase
      .from('chats')
      .select(`
        *,
        sender:users!chats_sender_id_fkey(id, user_name, email, role),
        receiver:users!chats_receiver_id_fkey(id, user_name, email, role)
      `)
      .or(`sender_id.eq.${senderId},receiver_id.eq.${senderId}`)
      .or(`sender_id.eq.${receiverId},receiver_id.eq.${receiverId}`)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []).map(item => new Chat(item)).reverse(); // Reverse to show oldest first
  }

  static async create(chatData) {
    const { data, error } = await supabase
      .from('chats')
      .insert({
        sender_id: chatData.senderId,
        receiver_id: chatData.receiverId,
        message: chatData.message,
        project_id: chatData.projectId ?? null,
        read: false,
      })
      .select(`
        *,
        sender:users!chats_sender_id_fkey(id, user_name, email, role),
        receiver:users!chats_receiver_id_fkey(id, user_name, email, role)
      `)
      .single();

    if (error) throw error;
    return new Chat(data);
  }

  static async deleteById(id) {
    const { error } = await supabase
      .from('chats')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  }

  static async updateMessageById(id, message) {
    const { data, error } = await supabase
      .from('chats')
      .update({ message, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw error;
    return data ? new Chat(data) : null;
  }

  static async markAsRead(chatId) {
    const { error } = await supabase
      .from('chats')
      .update({ read: true })
      .eq('id', chatId);

    if (error) throw error;
    return true;
  }

  static async markAllAsRead(senderId, receiverId, projectId = null) {
    const now = new Date().toISOString();
    let query = supabase
      .from('chats')
      .update({ read: true, seen_at: now })
      .eq('receiver_id', senderId)
      .eq('sender_id', receiverId)
      .eq('read', false);

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    // Return the updated rows so we know which messages were marked
    const { data, error } = await query.select('id, sender_id');

    if (error) throw error;
    return data || [];
  }

  static async getUnreadCount(userId) {
    const { count, error } = await supabase
      .from('chats')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', userId)
      .eq('read', false);

    if (error) throw error;
    return count || 0;
  }
}