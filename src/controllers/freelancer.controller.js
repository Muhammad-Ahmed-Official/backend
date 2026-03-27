import { supabase } from '../config/supabase.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { StatusCodes } from 'http-status-codes';
import { asyncHandler } from '../utils/asyncHandler.js';
import { Badge } from '../models/badge.models.js';

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

  const [activeBadges, badgeScore] = await Promise.all([
    Badge.findActiveByUserId(user.id),
    Badge.getBadgeScore(user.id),
  ]);

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
    badges: activeBadges.map(b => b.toJSON()),
    totalBadgeScore: badgeScore,
  };

  return res.status(StatusCodes.OK).send(
    new ApiResponse(StatusCodes.OK, 'Freelancer fetched successfully', { freelancer })
  );
});

export const getFreelancers = asyncHandler(async (req, res) => {
  const { search, skills, badge, badge_level } = req.query;

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

  // Fetch badges for all freelancers in one query
  const userIds = (data || []).map(u => u.id);
  let badgesByUser = {};

  if (userIds.length > 0) {
    const { data: allBadges } = await supabase
      .from('badges')
      .select('*')
      .in('user_id', userIds)
      .eq('status', 'active');

    (allBadges || []).forEach(b => {
      if (!badgesByUser[b.user_id]) badgesByUser[b.user_id] = [];
      badgesByUser[b.user_id].push(b);
    });
  }

  // Transform data to match frontend format
  let freelancers = (data || []).map(user => {
    const profile = user.profile || {};
    const userBadges = badgesByUser[user.id] || [];
    const totalBadgeScore = userBadges.reduce((sum, b) => sum + (b.badge_points || 0), 0);

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
      availability: 'Available',
      badges: userBadges.map(b => ({
        id: b.id,
        skill: b.skill,
        badgeLevel: b.badge_level,
        badgePoints: b.badge_points,
        provider: b.provider,
      })),
      totalBadgeScore,
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

  // Filter by badge skill if provided (e.g. ?badge=Python)
  if (badge) {
    freelancers = freelancers.filter(f =>
      f.badges.some(b => b.skill.toLowerCase() === badge.toLowerCase())
    );
  }

  // Filter by badge level if provided (e.g. ?badge_level=Gold)
  if (badge_level) {
    freelancers = freelancers.filter(f =>
      f.badges.some(b => b.badgeLevel.toLowerCase() === badge_level.toLowerCase())
    );
  }

  // Sort by totalBadgeScore descending when badge filter is active
  if (badge || badge_level) {
    freelancers.sort((a, b) => b.totalBadgeScore - a.totalBadgeScore);
  }

  return res.status(StatusCodes.OK).send(
    new ApiResponse(StatusCodes.OK, 'Freelancers fetched successfully', { freelancers })
  );
});
