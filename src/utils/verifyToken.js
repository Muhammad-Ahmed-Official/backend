import jwt from "jsonwebtoken";
import { User } from "../models/user.models.js";

/**
 * Verify JWT and return the user if valid. Used by REST auth middleware and Socket.io connection.
 * @param {string} token - JWT access token
 * @returns {Promise<import("../models/user.models.js").User | null>} User instance or null
 */
export async function verifyToken(token) {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const userId = decoded?._id ?? decoded?.id;
    if (!userId) return null;
    const user = await User.findById(userId, "id, user_name, email, role, is_verified, created_at, updated_at");
    return user ?? null;
  } catch {
    return null;
  }
}
