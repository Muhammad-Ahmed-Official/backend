import { Server } from "socket.io";
import { verifyToken } from "../utils/verifyToken.js";
import { User } from "../models/user.models.js";
import { Chat } from "../models/chat.models.js";

const allowedOrigins = [
  process.env.ALLOWED_ORIGIN_1,
  process.env.ALLOWED_ORIGIN_2,
  process.env.ALLOWED_ORIGIN_3,
  process.env.ALLOWED_ORIGIN_4,
  "https://freelanceing-frontend.vercel.app",
  "http://localhost:8081",
  "http://localhost:19006",
  "http://localhost:8080",
  "http://192.168.100.146:8081",
  "http://192.168.100.146:19006",
  "http://10.0.11.195:8081",
  "http://10.0.11.195:3000",
].filter(Boolean);

function getChatRoomId(userId1, userId2, projectId = null) {
  const sorted = [userId1, userId2].sort();
  return `chat:${sorted[0]}:${sorted[1]}:${projectId || ""}`;
}

/**
 * Attach Socket.io to the HTTP server and register chat handlers.
 * @param {import("http").Server} server - HTTP server (from http.createServer(app))
 */
export function attachSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: allowedOrigins.length > 0 ? allowedOrigins : true,
      credentials: true,
      methods: ["GET", "POST"],
    },
  });

  io.use(async (socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      (socket.handshake.headers?.authorization?.replace?.("Bearer ", "") ?? null);
    const user = await verifyToken(token);
    if (!user) {
      return next(new Error("Unauthorized"));
    }
    socket.userId = user.id;
    next();
  });

  io.on("connection", (socket) => {
    socket.broadcast.emit("user_online", { userId: socket.userId });

    socket.on("disconnect", () => {
      io.emit("user_offline", { userId: socket.userId });
    });

    socket.on("join_room", (payload) => {
      const { receiverId, projectId } = payload || {};
      if (!receiverId) return;
      const roomId = getChatRoomId(socket.userId, receiverId, projectId);
      socket.join(roomId);
      socket.to(roomId).emit("messages_read", { readBy: socket.userId });
    });

    socket.on("leave_room", (payload) => {
      const { receiverId, projectId } = payload || {};
      if (!receiverId) return;
      const roomId = getChatRoomId(socket.userId, receiverId, projectId);
      socket.leave(roomId);
    });

    socket.on("send_message", async (payload) => {
      const { receiverId, message, projectId } = payload || {};
      if (!receiverId || !message || typeof message !== "string" || !message.trim()) {
        socket.emit("error", { message: "receiverId and message are required" });
        return;
      }
      try {
        const receiver = await User.findById(receiverId);
        if (!receiver) {
          socket.emit("error", { message: "Receiver not found" });
          return;
        }
        const chat = await Chat.create({
          senderId: socket.userId,
          receiverId,
          message: message.trim(),
          projectId: projectId || null,
        });
        const roomId = getChatRoomId(socket.userId, receiverId, projectId);
        const messagePayload = chat.toJSON ? chat.toJSON() : chat;
        io.to(roomId).emit("new_message", messagePayload);
      } catch (err) {
        console.error("[Socket] send_message error:", err);
        socket.emit("error", { message: err.message || "Failed to send message" });
      }
    });

    socket.on("typing_start", (payload) => {
      const { receiverId, projectId } = payload || {};
      if (!receiverId) return;
      const roomId = getChatRoomId(socket.userId, receiverId, projectId);
      socket.to(roomId).emit("user_typing", { userId: socket.userId });
    });

    socket.on("typing_stop", (payload) => {
      const { receiverId, projectId } = payload || {};
      if (!receiverId) return;
      const roomId = getChatRoomId(socket.userId, receiverId, projectId);
      socket.to(roomId).emit("user_typing_stop", { userId: socket.userId });
    });
  });

  return io;
}
