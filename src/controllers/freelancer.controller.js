import { supabase } from '../config/supabase.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { StatusCodes } from 'http-status-codes';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getFreelancerById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const { data: user, error } = await supabase
    .from('users')
    .select(`
      id,
      user_name,
      email,
      role,
      created_at,
      profile:user_profiles(*)
    `)
    .eq('id', id)
    .eq('role', 'Freelancer')
    .single();
  
  if (error || !user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Freelancer not found');
  }
  
  const profile = user.profile || {};
  const freelancer = {
    id: user.id,
    name: user.user_name,
    email: user.email,
    title: profile.title || profile.skills?.[0] || 'Freelancer',
    bio: profile.bio || '',
    rating: profile.rating || 0,
    reviews: profile.reviews_count || 0,
    hourlyRate: profile.hourly_rate || '$0/hr',
    location: profile.location || 'Not specified',
    skills: profile.skills || [],
    completedProjects: profile.projects_completed || 0,
    availability: profile.availability || 'Available',
    experience: profile.experience || '',
    education: profile.education || '',
    languages: profile.languages || [],
    memberSince: user.created_at,
  };
  
  return res.status(StatusCodes.OK).send(
    new ApiResponse(StatusCodes.OK, 'Freelancer fetched successfully', { freelancer })
  );
});

export const getFreelancers = asyncHandler(async (req, res) => {
  const { search, skills } = req.query;
  
  // Get all freelancers with their profiles
  let query = supabase
    .from('users')
    .select(`
      id,
      user_name,
      email,
      role,
      profile:user_profiles(*)
    `)
    .eq('role', 'Freelancer');
  
  if (search) {
    query = query.or(`user_name.ilike.%${search}%,email.ilike.%${search}%`);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  
  // Transform data to match frontend format
  let freelancers = (data || []).map(user => {
    const profile = user.profile || {};
    return {
      id: user.id,
      name: user.user_name,
      email: user.email,
      title: profile.skills?.[0] || 'Freelancer',
      rating: profile.rating || 0,
      reviews: profile.reviews_count || 0,
      hourlyRate: profile.hourly_rate || '$0/hr',
      location: profile.location || 'Not specified',
      skills: profile.skills || [],
      completedProjects: profile.projects_completed || 0,
      availability: 'Available', // TODO: Add availability field to user_profiles
    };
  });
  
  // Filter by skills if provided
  if (skills) {
    const skillArray = Array.isArray(skills) ? skills : skills.split(',');
    freelancers = freelancers.filter(f => 
      f.skills.some(skill => skillArray.some(s => 
        skill.toLowerCase().includes(s.toLowerCase().trim())
      ))
    );
  }
  
  return res.status(StatusCodes.OK).send(
    new ApiResponse(StatusCodes.OK, 'Freelancers fetched successfully', { freelancers })
  );
});
