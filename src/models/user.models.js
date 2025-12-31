import { supabase } from '../config/supabase.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export class User {
  constructor(data) {
    this.id = data.id;
    this.userName = data.user_name;
    this.email = data.email;
    this.password = data.password;
    this.otp = data.otp;
    this.expiresIn = data.expires_in;
    this.isVerified = data.is_verified;
    this.refreshToken = data.refresh_token;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  // Convert to plain object
  toJSON() {
    return {
      id: this.id,
      userName: this.userName,
      email: this.email,
      isVerified: this.isVerified,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  // Check password
  async isPasswordCorrect(password) {
    return await bcrypt.compare(password, this.password);
  }

  // Generate access token
  generateAccessToken() {
    return jwt.sign(
      { _id: this.id, email: this.email },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || '1d' }
    );
  }

  // Generate refresh token
  generateRefreshToken() {
    return jwt.sign(
      { _id: this.id },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: process.env.REFRESH_TOKEN_EXPIRY || '10d' }
    );
  }

  // Static methods for database operations
  static async findById(id, selectFields = null) {
    let queryBuilder = supabase
      .from('f_users')
      .select(selectFields || '*')
      .eq('id', id);
    
    const { data, error } = await queryBuilder.single();
    
    if (error || !data) return null;
    return new User(data);
  }

  static async findOne(query, selectFields = null) {
    let queryBuilder = supabase.from('f_users');
    
    // Handle select fields (for excluding fields like password)
    if (selectFields) {
      queryBuilder = queryBuilder.select(selectFields);
    } else {
      queryBuilder = queryBuilder.select('*');
    }
    
    // Handle $or operator
    if (query.$or) {
      const conditions = query.$or.map(condition => {
        const key = Object.keys(condition)[0];
        const value = condition[key];
        // Map MongoDB field names to Supabase column names
        const dbKey = key === 'userName' ? 'user_name' : key;
        return { key: dbKey, value };
      });
      
      // Supabase .or() method syntax
      const orConditions = conditions.map(c => `${c.key}.eq.${c.value}`).join(',');
      queryBuilder = queryBuilder.or(orConditions);
    } 
    // Handle $and operator with $regex
    else if (query.$and) {
      query.$and.forEach(condition => {
        const key = Object.keys(condition)[0];
        const regexObj = condition[key];
        if (regexObj && regexObj.$regex) {
          // Case-insensitive search using ilike
          const pattern = regexObj.$regex.source.replace(/^\^|\$$/g, '');
          const dbKey = key === 'userName' ? 'user_name' : key;
          queryBuilder = queryBuilder.ilike(dbKey, `%${pattern}%`);
        } else {
          // Regular equality check in $and
          const dbKey = key === 'userName' ? 'user_name' : 
                       key === '_id' ? 'id' : 
                       key === 'refreshToken' ? 'refresh_token' : key;
          queryBuilder = queryBuilder.eq(dbKey, condition[key]);
        }
      });
    } 
    else {
      // Handle regular queries
      Object.keys(query).forEach(key => {
        const dbKey = key === 'userName' ? 'user_name' : 
                     key === '_id' ? 'id' : 
                     key === 'refreshToken' ? 'refresh_token' : key;
        queryBuilder = queryBuilder.eq(dbKey, query[key]);
      });
    }
    
    const { data, error } = await queryBuilder.maybeSingle();
    if (error || !data) return null;
    return new User(data);
  }

  static async create(userData) {
    // Hash password before saving
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    const { data, error } = await supabase
      .from('f_users')
      .insert({
        user_name: userData.userName.toLowerCase(),
        email: userData.email,
        password: hashedPassword,
        otp: userData.otp,
        expires_in: userData.expiresIn,
        is_verified: false
      })
      .select()
      .single();
    
    if (error) throw error;
    return new User(data);
  }

  async save(options = {}) {
    const updateData = {
      user_name: this.userName,
      email: this.email,
      is_verified: this.isVerified !== undefined ? this.isVerified : false,
      updated_at: new Date().toISOString()
    };

    // Handle optional fields - only include if they exist
    if (this.otp !== undefined) {
      updateData.otp = this.otp || null;
    }
    if (this.expiresIn !== undefined) {
      updateData.expires_in = this.expiresIn || null;
    }
    if (this.refreshToken !== undefined) {
      updateData.refresh_token = this.refreshToken || null;
    }

    // Only update password if it's changed (not already hashed)
    if (this.password && !this.password.startsWith('$2')) {
      updateData.password = await bcrypt.hash(this.password, 10);
    }

    const { data, error } = await supabase
      .from('f_users')
      .update(updateData)
      .eq('id', this.id)
      .select()
      .single();
    
    if (error) throw error;
    return new User(data);
  }

  static async findByIdAndUpdate(id, updateData, options = {}) {
    // Convert updateData keys to database column names
    const dbUpdateData = {};
    Object.keys(updateData).forEach(key => {
      if (key === 'userName') {
        dbUpdateData.user_name = updateData[key];
      } else if (key === 'refreshToken') {
        dbUpdateData.refresh_token = updateData[key];
      } else {
        dbUpdateData[key] = updateData[key];
      }
    });
    
    dbUpdateData.updated_at = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('f_users')
      .update(dbUpdateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return new User(data);
  }
  
  // Helper method to select specific fields (exclude password, refreshToken)
  select(fields) {
    // This is a helper to filter fields from the user object
    const fieldArray = fields.split(',').map(f => f.trim().replace(/^-/, ''));
    const result = {};
    
    fieldArray.forEach(field => {
      const dbField = field === 'password' ? 'password' : 
                     field === 'refreshToken' ? 'refresh_token' : 
                     field === 'userName' ? 'user_name' : field;
      
      if (this[dbField] !== undefined) {
        result[field === 'userName' ? 'userName' : field] = this[dbField];
      }
    });
    
    return result;
  }
}