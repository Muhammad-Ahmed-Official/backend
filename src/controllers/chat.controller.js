import { Chat } from '../models/chat.models.js';
import { User } from '../models/user.models.js';
import { Project } from '../models/project.models.js';
import { supabase } from '../config/supabase.js';

// Send a new message
export const sendMessage = async (req, res) => {
  try {
    const { receiverId, message, projectId } = req.body;
    const senderId = req.user.id || req.user._id;

    // Verify that the sender and receiver exist
    const sender = await User.findById(senderId);
    const receiver = await User.findById(receiverId);

    if (!sender || !receiver) {
      return res.status(404).json({
        success: false,
        message: 'Sender or receiver not found',
      });
    }

    // If project ID is provided, verify the user has access to it
    if (projectId) {
      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found',
        });
      }

      // Verify that both users have access to the project
      const hasAccess =
        project.clientId === senderId ||
        project.clientId === receiverId ||
        project.freelancerId === senderId ||
        project.freelancerId === receiverId;

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this project',
        });
      }
    }

    const chat = await Chat.create({
      senderId,
      receiverId,
      message,
      projectId,
    });

    const io = req.app.get('io');
    const receiverRoom = String(chat.receiverId ?? receiverId).trim().toLowerCase();
    const senderRoom = String(chat.senderId ?? senderId).trim().toLowerCase();
    const payload = {
      id: chat.id,
      sender: senderRoom,
      receiver: receiverRoom,
      message: chat.message,
      projectId: chat.projectId || null,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
    };
    if (io) {
      io.to(receiverRoom).emit('newMessage', payload);
      io.to(senderRoom).emit('newMessage', payload);
    } else {
      console.warn('[Chat] Socket.IO not available - real-time emit skipped. Receiver will get message via polling or refresh.');
    }

    return res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: chat,
    });
  } catch (error) {
    console.error('SendMessage error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Something went wrong while sending message',
    });
  }
};

// Get chat messages between two users
export const getChatMessages = async (req, res) => {
  try {
    const { receiverId, projectId } = req.query;
    const senderId = req.user.id || req.user._id;
    const { limit = 50, offset = 0 } = req.query;

    if (!receiverId) {
      return res.status(400).json({
        success: false,
        message: 'Receiver ID is required',
      });
    }

    // Verify that the receiver exists
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: 'Receiver not found',
      });
    }

    // If project ID is provided, verify the user has access to it
    if (projectId) {
      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found',
        });
      }

      // Verify that both users have access to the project
      const hasAccess =
        project.clientId === senderId ||
        project.clientId === receiverId ||
        project.freelancerId === senderId ||
        project.freelancerId === receiverId;

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this project',
        });
      }
    }

    const messages = await Chat.findByParticipants(
      senderId,
      receiverId,
      projectId,
      parseInt(limit),
      parseInt(offset)
    );

    // Mark messages as read for the current user and notify sender in real-time
    const markedMessages = await Chat.markAllAsRead(senderId, receiverId, projectId);
    if (markedMessages.length > 0) {
      const io = req.app.get('io');
      if (io) {
        const senderRoom = String(receiverId).trim().toLowerCase();
        io.to(senderRoom).emit('messagesSeen', {
          by: String(senderId).trim().toLowerCase(),
          messageIds: markedMessages.map(m => m.id),
          seenAt: new Date().toISOString(),
        });
      }
    }

    const userIds = new Set();
    messages.forEach(m => {
      userIds.add(m.senderId);
      userIds.add(m.receiverId);
    });
    const { data: profilesData } = await supabase
      .from('user_profiles')
      .select('user_id, profile_image')
      .in('user_id', Array.from(userIds));
    const profileMap = new Map((profilesData || []).map(p => [p.user_id, p.profile_image]));

    const data = messages.map(m => {
      const json = m.toJSON ? m.toJSON() : m;
      if (json.sender) json.sender.profile_image = profileMap.get(m.senderId) || null;
      if (json.receiver) json.receiver.profile_image = profileMap.get(m.receiverId) || null;
      return json;
    });

    return res.status(200).json({
      success: true,
      message: 'Messages fetched successfully',
      data,
    });
  } catch (error) {
    console.error('GetChatMessages error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Something went wrong while fetching messages',
    });
  }
};

// Get one user's profile for chat header (id, user_name, profile_image)
export const getChatUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id || req.user._id;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }
    if (userId === currentUserId) {
      return res.status(400).json({ success: false, message: 'Cannot fetch own profile via this endpoint' });
    }

    const { data: userRow, error: userError } = await supabase
      .from('users')
      .select('id, user_name, email, role')
      .eq('id', userId)
      .single();

    if (userError || !userRow) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const { data: profileRow } = await supabase
      .from('user_profiles')
      .select('profile_image')
      .eq('user_id', userId)
      .maybeSingle();

    const profile_image = profileRow?.profile_image ?? null;

    return res.status(200).json({
      success: true,
      data: {
        id: userRow.id,
        user_name: userRow.user_name,
        email: userRow.email,
        role: userRow.role || 'Freelancer',
        profile_image,
      },
    });
  } catch (error) {
    console.error('GetChatUserProfile error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Something went wrong',
    });
  }
};

// Get users for chat search (all except current user, with optional search)
export const getChatUsers = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const search = (req.query.search || '').trim();

    let query = supabase
      .from('users')
      .select('id, user_name, email, role')
      .neq('id', userId);

    if (search) {
      query = query.ilike('user_name', `%${search}%`);
    }

    const { data: usersData, error } = await query.order('user_name').limit(50);

    if (error) throw error;

    const userIds = (usersData || []).map(u => u.id);
    if (userIds.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Users fetched successfully',
        data: [],
      });
    }

    const { data: profilesData } = await supabase
      .from('user_profiles')
      .select('user_id, profile_image')
      .in('user_id', userIds);

    const profileMap = new Map((profilesData || []).map(p => [p.user_id, p.profile_image]));

    const users = (usersData || []).map(u => ({
      id: u.id,
      user_name: u.user_name,
      email: u.email,
      role: u.role || 'Freelancer',
      profile_image: profileMap.get(u.id) || null,
    }));

    return res.status(200).json({
      success: true,
      message: 'Users fetched successfully',
      data: users,
    });
  } catch (error) {
    console.error('GetChatUsers error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Something went wrong while fetching users',
    });
  }
};

// Get chat history for a user
export const getUserChats = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;

    // Get all chats where the user is either sender or receiver
    const { data: chatData, error } = await supabase
      .from('chats')
      .select(`
        *,
        sender:users!chats_sender_id_fkey(id, user_name, email, role),
        receiver:users!chats_receiver_id_fkey(id, user_name, email, role),
        project:projects!chats_project_id_fkey(title)
      `)
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(100); // Limit to last 100 conversations

    if (error) throw error;

    // Group chats by participant and get latest message for each
    const participants = {};
    const participantIds = new Set();

    chatData.forEach(chat => {
      const otherUserId = chat.sender_id === userId ? chat.receiver_id : chat.sender_id;
      participantIds.add(otherUserId);

      if (!participants[otherUserId] || new Date(chat.created_at) > new Date(participants[otherUserId].created_at)) {
        participants[otherUserId] = {
          ...chat,
          otherUser: chat.sender_id === userId ? chat.receiver : chat.sender,
          latestMessage: chat.message,
          timestamp: chat.created_at,
          unread: chat.receiver_id === userId && !chat.read,
        };
      }
    });

    // Get participant details and profile images
    const { data: usersData } = await supabase
      .from('users')
      .select('id, user_name, email, role')
      .in('id', Array.from(participantIds));

    const { data: profilesData } = await supabase
      .from('user_profiles')
      .select('user_id, profile_image')
      .in('user_id', Array.from(participantIds));
    const profileMap = new Map((profilesData || []).map(p => [p.user_id, p.profile_image]));

    const usersList = usersData || [];
    const participantsWithDetails = Object.values(participants).map(chat => {
      const otherId = chat.sender_id === userId ? chat.receiver_id : chat.sender_id;
      const otherUser = usersList.find(u => u.id === otherId);
      const otherWithProfile = otherUser ? { ...otherUser, profile_image: profileMap.get(otherId) || null } : null;
      return { ...chat, otherUser: otherWithProfile };
    });

    return res.status(200).json({
      success: true,
      message: 'Chat history fetched successfully',
      data: participantsWithDetails,
    });
  } catch (error) {
    console.error('GetUserChats error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Something went wrong while fetching chat history',
    });
  }
};

// Mark message as read
export const markMessageAsRead = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id || req.user._id;

    const chat = await Chat.findById(messageId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Message not found',
      });
    }

    // Verify that the user is the receiver of the message
    if (chat.receiverId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only mark your received messages as read',
      });
    }

    await Chat.markAsRead(messageId);

    return res.status(200).json({
      success: true,
      message: 'Message marked as read successfully',
    });
  } catch (error) {
    console.error('MarkMessageAsRead error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Something went wrong while marking message as read',
    });
  }
};

// Get unread messages count
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;

    const count = await Chat.getUnreadCount(userId);

    return res.status(200).json({
      success: true,
      message: 'Unread count fetched successfully',
      data: { count },
    });
  } catch (error) {
    console.error('GetUnreadCount error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Something went wrong while fetching unread count',
    });
  }
};

// Delete a message (sender or receiver). Emit to both for real-time.
export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = String(req.user.id || req.user._id).trim();

    const chat = await Chat.findById(messageId);
    if (!chat) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    const senderRoom = String(chat.senderId).trim();
    const receiverRoom = String(chat.receiverId).trim();
    if (userId !== senderRoom && userId !== receiverRoom) {
      return res.status(403).json({ success: false, message: 'You can only delete messages in your conversations' });
    }

    await Chat.deleteById(messageId);

    const io = req.app.get('io');
    if (io) {
      io.to(receiverRoom).emit('deleteMsg', messageId);
      io.to(senderRoom).emit('deleteMsg', messageId);
    }

    return res.status(200).json({
      success: true,
      message: 'Message deleted successfully',
    });
  } catch (error) {
    console.error('DeleteMessage error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Something went wrong',
    });
  }
};

// Update a message (sender only). Emit to both for real-time.
export const updateMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { message } = req.body;
    const userId = String(req.user.id || req.user._id).trim();

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message text is required' });
    }

    const chat = await Chat.findById(messageId);
    if (!chat) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    if (userId !== String(chat.senderId).trim()) {
      return res.status(403).json({ success: false, message: 'Only the sender can edit this message' });
    }

    const updated = await Chat.updateMessageById(messageId, message.trim());
    if (!updated) {
      return res.status(500).json({ success: false, message: 'Update failed' });
    }

    const senderRoom = String(chat.senderId).trim();
    const receiverRoom = String(chat.receiverId).trim();
    const payload = { messageId, message: updated.message, receiver: receiverRoom, sender: senderRoom };

    const io = req.app.get('io');
    if (io) {
      io.to(receiverRoom).emit('editMsg', payload);
      io.to(senderRoom).emit('editMsg', payload);
    }

    return res.status(200).json({
      success: true,
      message: 'Message updated successfully',
      data: updated,
    });
  } catch (error) {
    console.error('UpdateMessage error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Something went wrong',
    });
  }
};