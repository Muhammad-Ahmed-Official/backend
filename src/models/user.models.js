import { supabase } from '../config/supabase.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export class User {
  constructor(data) {
    this.id = data.id;
    this.userName = data.user_name;
    this.email = data.email;
    this.password = data.password;
    this.role = data.role || 'Freelancer'; // Default role
    this.otp = data.otp;
    this.expiresIn = data.expires_in;
    this.isVerified = data.is_verified;
    this.refreshToken = data.refresh_token;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
    
    // Profile data from joined user_profiles table
    this.profile = data.profile || null;
  }

  // Convert to plain object with profile merged
  toJSON() {
    const baseUser = {
      id: this.id,
      userName: this.userName,
      email: this.email,
      role: this.role,
      isVerified: this.isVerified,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };

    // Merge profile fields if profile exists
    if (this.profile) {
      return {
        ...baseUser,
        bio: this.profile.bio,
        rating: this.profile.rating || 0,
        reviewsCount: this.profile.reviews_count || 0,
        projectsCompleted: this.profile.projects_completed || 0,
        about: this.profile.about,
        skills: this.profile.skills || [],
        profileImage: this.profile.profile_image,
        phone: this.profile.phone,
        certifications: this.profile.certifications,
        education: this.profile.education,
        languages: this.profile.languages || [],
        hourlyRate: this.profile.hourly_rate,
        portfolio: this.profile.portfolio,
      };
    }

    return baseUser;
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
    // Get user from users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select(selectFields || '*')
      .eq('id', id)
      .single();
    
    if (userError || !userData) return null;
    
    // Get profile from user_profiles table
    const { data: profileData } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', id)
      .maybeSingle();
    
    return new User({
      ...userData,
      profile: profileData
    });
  }

  static async findOne(query, selectFields = null) {
    let queryBuilder = supabase.from('users');
    
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
    
    const { data: userData, error } = await queryBuilder.maybeSingle();
    if (error || !userData) return null;
    
    // Get profile if user exists
    const { data: profileData } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userData.id)
      .maybeSingle();
    
    return new User({
      ...userData,
      profile: profileData
    });
  }

  static async create(userData) {
    // Hash password before saving
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    // Validate and set default role
    const validRoles = ['Admin', 'Client', 'Freelancer'];
    const userRole = userData.role && validRoles.includes(userData.role) ? userData.role : 'Freelancer';
    
    const { data, error } = await supabase
      .from('users')
      .insert({
        user_name: userData.userName.toLowerCase(),
        email: userData.email,
        password: hashedPassword,
        role: userRole,
        otp: userData.otp,
        expires_in: userData.expiresIn,
        is_verified: false
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // Create empty profile for new user
    if (data) {
      await supabase
        .from('user_profiles')
        .insert({
          user_id: data.id,
          rating: 0,
          reviews_count: 0,
          projects_completed: 0
        });
    }
    
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
      .from('users')
      .update(updateData)
      .eq('id', this.id)
      .select()
      .single();
    
    if (error) throw error;
    
    // Get profile to return complete user object
    const { data: profileData } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', this.id)
      .maybeSingle();
    
    return new User({
      ...data,
      profile: profileData
    });
  }

  static async findByIdAndUpdate(id, updateData, options = {}) {
    // Separate user fields from profile fields
    const profileFields = [
      'title', 'bio', 'skills', 'hourlyRate', 'location', 'phone',
      'languages', 'education', 'experience', 'certifications',
      'portfolio', 'profileImage', 'availability', 'about'
    ];
    
    const userUpdateData = {};
    const profileUpdateData = {};
    
    // Process update data
    for (const key of Object.keys(updateData)) {
      if (key === 'userName') {
        userUpdateData.user_name = updateData[key];
      } else if (key === 'refreshToken') {
        userUpdateData.refresh_token = updateData[key];
      } else if (key === 'password') {
        // Hash password if not already hashed
        if (!updateData[key].startsWith('$2')) {
          userUpdateData.password = await bcrypt.hash(updateData[key], 10);
        } else {
          userUpdateData.password = updateData[key];
        }
      } else if (profileFields.includes(key)) {
        // Map camelCase to snake_case for profile fields
        if (key === 'hourlyRate') {
          profileUpdateData.hourly_rate = updateData[key];
        } else if (key === 'profileImage') {
          profileUpdateData.profile_image = updateData[key];
        } else {
          profileUpdateData[key] = updateData[key];
        }
      }
    }
    
    // Update users table
    if (Object.keys(userUpdateData).length > 0) {
      userUpdateData.updated_at = new Date().toISOString();
      
      const { error: userError } = await supabase
        .from('users')
        .update(userUpdateData)
        .eq('id', id);
      
      if (userError) throw userError;
    }
    
    // Update or create user_profiles
    if (Object.keys(profileUpdateData).length > 0) {
      profileUpdateData.updated_at = new Date().toISOString();
      
      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('user_id', id)
        .maybeSingle();
      
      if (existingProfile) {
        // Update existing profile
        const { error: profileError } = await supabase
          .from('user_profiles')
          .update(profileUpdateData)
          .eq('user_id', id);
        
        if (profileError) throw profileError;
      } else {
        // Create new profile
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: id,
            rating: 0,
            reviews_count: 0,
            projects_completed: 0,
            ...profileUpdateData
          });
        
        if (profileError) throw profileError;
      }
    }
    
    // Return updated user with profile
    return await User.findById(id);
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