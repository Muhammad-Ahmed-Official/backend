import { StatusCodes } from 'http-status-codes';
import { supabase } from '../config/supabase.js';
import { User } from '../models/user.models.js';
import { Project } from '../models/project.models.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getDashboardStats = asyncHandler(async (req, res) => {
    // 1. Total Freelancers
    const { count: totalFreelancers, error: fError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'Freelancer');

    // 2. Total Clients
    const { count: totalClients, error: cError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'Client');

    // 3. Active Projects
    const { count: activeProjects, error: pError } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .in('status', ['ACTIVE', 'IN_PROGRESS', 'open', 'in_progress']);

    // 4. Total Revenue (simulated as 10% of total budget of completed projects)
    const { data: completedProjects, error: rError } = await supabase
        .from('projects')
        .select('budget')
        .in('status', ['COMPLETED', 'completed']);

    if (fError || cError || pError || rError) {
        throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, "Error fetching dashboard stats");
    }

    const totalRevenue = (completedProjects || []).reduce((acc, curr) => acc + (parseFloat(curr.budget) || 0), 0) * 0.1;

    return res.status(StatusCodes.OK).json(
        new ApiResponse(StatusCodes.OK, "Dashboard stats fetched successfully", {
            totalFreelancers: totalFreelancers || 0,
            totalClients: totalClients || 0,
            activeProjects: activeProjects || 0,
            totalRevenue: totalRevenue || 0
        })
    );
});

export const getUsersByRole = asyncHandler(async (req, res) => {
    const { role } = req.params;

    // Normalize role string for DB query
    const dbRole = role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();

    const { data: users, error } = await supabase
        .from('users')
        .select(`
            *,
            profile:user_profiles (*)
        `)
        .eq('role', dbRole);

    if (error) {
        throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, "Error fetching users");
    }

    const formattedUsers = users.map(u => new User(u).toJSON());

    return res.status(StatusCodes.OK).json(
        new ApiResponse(StatusCodes.OK, `Users with role ${role} fetched successfully`, formattedUsers)
    );
});

export const updateUser = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;

    const updatedUser = await User.findByIdAndUpdate(id, updateData);

    if (!updatedUser) {
        throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
    }

    return res.status(StatusCodes.OK).json(
        new ApiResponse(StatusCodes.OK, "User updated successfully", updatedUser.toJSON())
    );
});

export const deleteUser = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Delete profile first due to FK if not cascade
    await supabase.from('user_profiles').delete().eq('user_id', id);

    const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id);

    if (error) {
        throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, "Error deleting user");
    }

    return res.status(StatusCodes.OK).json(
        new ApiResponse(StatusCodes.OK, "User deleted successfully", null)
    );
});

export const getAllProjects = asyncHandler(async (req, res) => {
    const { data: projects, error } = await supabase
        .from('projects')
        .select(`
            *,
            client:users!client_id (id, user_name, email, role)
        `);

    if (error) {
        console.error("Error fetching projects:", error);
        throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, "Error fetching projects");
    }

    const formattedProjects = projects.map(p => new Project(p).toJSON());

    return res.status(StatusCodes.OK).json(
        new ApiResponse(StatusCodes.OK, "Projects fetched successfully", formattedProjects)
    );
});

export const updateProject = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;

    const updatedProject = await Project.findByIdAndUpdate(id, updateData);

    if (!updatedProject) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Project not found");
    }

    return res.status(StatusCodes.OK).json(
        new ApiResponse(StatusCodes.OK, "Project updated successfully", updatedProject.toJSON())
    );
});

export const deleteProject = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const result = await Project.delete(id);

    if (!result) {
        throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, "Error deleting project");
    }

    return res.status(StatusCodes.OK).json(
        new ApiResponse(StatusCodes.OK, "Project deleted successfully", null)
    );
});
