import { Server } from 'socket.io';
import { Chat } from '../models/chat.models.js';
import { supabase } from '../config/supabase.js';

/**
 * SocketService - Real-time chat over Socket.io.
 * Tracks online users by userId; each socket joins a room named by userId for 1:1 messaging.
 */
export class SocketService {
  constructor(httpServer) {
    this._io = new Server(httpServer, {
      cors: {
        allowedHeaders: ['*'],
        origin: '*',
      },
    });
    this.userSocketMap = new Map(); // userId -> Set(socketId)
  }

  initListener() {
    const io = this._io;

    io.on('connection', (socket) => {
      const rawUserId = socket.handshake?.query?.userId;
      const userId = rawUserId != null ? String(rawUserId).trim().toLowerCase() : '';
      if (!userId) {
        console.log(`Socket connected without userId: ${socket.id}`);
        return;
      }
      if (!this.userSocketMap.has(userId)) {
        this.userSocketMap.set(userId, new Set());
      }
      this.userSocketMap.get(userId).add(socket.id);
      socket.join(userId);
      console.log(`Socket connected: ${socket.id} for user ${userId} (room: ${userId})`);
      const onlineUserIds = Array.from(this.userSocketMap.keys());
      io.emit('getOnlineUser', onlineUserIds);

      socket.on('joinRoom', (chatId) => {
        if (chatId && !socket.rooms.has(chatId)) {
          socket.join(chatId);
        }
        console.log(`Socket ${socket.id} joined room ${chatId}`);
      });

      socket.on('leaveRoom', (chatId) => {
        if (chatId) socket.leave(chatId);
        console.log(`Socket ${socket.id} left room ${chatId}`);
      });

      socket.on('message', async (data) => {
        const { sender, receiver, message, userName, profilePic } = data || {};
        if (!receiver || !sender) return;
        let isReceiverInRoom = false;
        try {
          const receiverSockets = await io.in(receiver).fetchSockets();
          isReceiverInRoom = receiverSockets.length > 0;
        } catch (_) {}
        try {
          const chat = await Chat.create({
            senderId: sender,
            receiverId: receiver,
            message,
            projectId: null,
          });
          const payload = {
            id: chat.id,
            sender,
            receiver,
            message,
            userName: userName || null,
            profilePic: profilePic || null,
            isReceiverInRoom,
            createdAt: chat.createdAt,
            updatedAt: chat.updatedAt,
          };
          io.to(receiver).emit('newMessage', payload);
          io.to(sender).emit('newMessage', payload);
        } catch (err) {
          console.error('Message DB save failed:', err.message);
        }
      });

      socket.on('userMsg', ({ sender, receiver }) => {
        if (!sender || !receiver) return;
        io.to(receiver).emit('userMsg', sender);
      });

      socket.on('delete', async (data) => {
        const { messageId, receiver } = data || {};
        if (!messageId || !receiver) return;
        try {
          const existing = await Chat.findById(messageId);
          if (existing) {
            await Chat.deleteById(messageId);
            const senderRoom = String(existing.senderId).trim();
            const receiverRoom = String(existing.receiverId).trim();
            io.to(receiverRoom).emit('deleteMsg', messageId);
            io.to(senderRoom).emit('deleteMsg', messageId);
          }
        } catch (err) {
          console.error('Delete message failed:', err.message);
        }
      });

      socket.on('edit', async (data) => {
        const { messageId, receiver, message } = data || {};
        if (!receiver || !messageId || message == null) return;
        try {
          const existing = await Chat.findById(messageId);
          if (!existing) return;
          const updated = await Chat.updateMessageById(messageId, message);
          if (!updated) return;
          const senderRoom = String(existing.senderId).trim();
          const receiverRoom = String(existing.receiverId).trim();
          const payload = { messageId, message: updated.message, receiver: receiverRoom, sender: senderRoom };
          io.to(receiverRoom).emit('editMsg', payload);
          io.to(senderRoom).emit('editMsg', payload);
        } catch (err) {
          console.error('Edit message failed:', err.message);
        }
      });

      // Real-time seen receipts: receiver tells sender their messages have been seen
      socket.on('messagesSeen', async (data) => {
        const { sender, receiver, messageIds } = data || {};
        if (!sender || !receiver) return;
        // sender = the person who SENT the original messages (will receive the seen notification)
        // receiver = the person who SAW the messages (current user)
        try {
          if (messageIds && messageIds.length > 0) {
            const now = new Date().toISOString();
            await supabase
              .from('chats')
              .update({ read: true, seen_at: now })
              .in('id', messageIds)
              .eq('sender_id', sender)
              .eq('receiver_id', receiver);
          }
        } catch (err) {
          console.error('messagesSeen DB update failed:', err.message);
        }
        // Notify the original sender that their messages were seen
        io.to(sender).emit('messagesSeen', {
          by: receiver,
          messageIds: messageIds || [],
          seenAt: new Date().toISOString(),
        });
      });

      socket.on('startTyping', ({ sender, receiver }) => {
        if (!sender || !receiver) return;
        io.to(receiver).emit('startTyping', sender);
      });

      socket.on('stopTyping', ({ sender, receiver }) => {
        if (!receiver) return;
        io.to(receiver).emit('stopTyping', sender);
      });

      socket.on('connect_error', (err) => {
        console.log('Socket connection error', err?.message);
      });

      socket.on('disconnect', () => {
        if (userId && this.userSocketMap.has(userId)) {
          const set = this.userSocketMap.get(userId);
          set.delete(socket.id);
          if (set.size === 0) this.userSocketMap.delete(userId);
        }
        const onlineUserIds = Array.from(this.userSocketMap.keys());
        io.emit('getOnlineUser', onlineUserIds);
        console.log(`Socket disconnected: ${socket.id}`);
      });
    });
  }

  get io() {
    return this._io;
  }
}
