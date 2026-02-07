import { StatusCodes } from 'http-status-codes';
import { supabase } from '../config/supabase.js';
import { User } from '../models/user.models.js';
import { Project } from '../models/project.models.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { Notification } from '../models/notification.models.js';
import { ServiceCategory } from '../models/service.models.js';

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

    // 5. Total Service Categories
    const { count: totalServices, error: sError } = await supabase
        .from('service_categories')
        .select('*', { count: 'exact', head: true });

    // 6. Total Disputes
    const { count: totalDisputes, error: dError } = await supabase
        .from('disputes')
        .select('*', { count: 'exact', head: true });

    if (fError || cError || pError || rError || sError || dError) {
        throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, "Error fetching dashboard stats");
    }

    const totalRevenue = (completedProjects || []).reduce((acc, curr) => acc + (parseFloat(curr.budget) || 0), 0) * 0.1;

    return res.status(StatusCodes.OK).json(
        new ApiResponse(StatusCodes.OK, "Dashboard stats fetched successfully", {
            totalFreelancers: totalFreelancers || 0,
            totalClients: totalClients || 0,
            activeProjects: activeProjects || 0,
            totalRevenue: totalRevenue || 0,
            totalServices: totalServices || 0,
            totalDisputes: totalDisputes || 0
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

// --- SERVICE CATEGORIES ---

export const getServiceCategories = asyncHandler(async (req, res) => {
    const services = await ServiceCategory.findAll();
    return res.status(StatusCodes.OK).json(
        new ApiResponse(StatusCodes.OK, "Service categories fetched successfully", services.map(s => s.toJSON()))
    );
});

export const createServiceCategory = asyncHandler(async (req, res) => {
    const service = await ServiceCategory.create(req.body);
    return res.status(StatusCodes.CREATED).json(
        new ApiResponse(StatusCodes.CREATED, "Service category created successfully", service.toJSON())
    );
});

export const updateServiceCategory = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const service = await ServiceCategory.findByIdAndUpdate(id, req.body);
    if (!service) throw new ApiError(StatusCodes.NOT_FOUND, "Service category not found");
    return res.status(StatusCodes.OK).json(
        new ApiResponse(StatusCodes.OK, "Service category updated successfully", service.toJSON())
    );
});

export const deleteServiceCategory = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await ServiceCategory.delete(id);
    return res.status(StatusCodes.OK).json(
        new ApiResponse(StatusCodes.OK, "Service category deleted successfully", null)
    );
});

// --- SYSTEM NOTIFICATIONS ---

export const getSystemNotifications = asyncHandler(async (req, res) => {
    const notifications = await Notification.findAll();
    return res.status(StatusCodes.OK).json(
        new ApiResponse(StatusCodes.OK, "System notifications fetched successfully", notifications.map(n => n.toJSON()))
    );
});

export const sendSystemNotification = asyncHandler(async (req, res) => {
    const { title, message, type } = req.body;

    // 1. Create the base notification entry (historical)
    // In a real system, you might send this to multiple users or a separate announcement table.
    // For this implementation, we'll create individual notifications for ALL users if it's a broadcast.

    const { data: users, error: uError } = await supabase.from('users').select('id');
    if (uError) throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, "Error fetching users for broadcast");

    const notifications = users.map(user => ({
        user_id: user.id,
        title,
        message,
        type: type || 'system',
        is_read: false
    }));

    const { error: nError } = await supabase.from('notifications').insert(notifications);
    if (nError) throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, "Error broadcasting notifications");

    return res.status(StatusCodes.OK).json(
        new ApiResponse(StatusCodes.OK, "Notification broadcasted successfully to all users", null)
    );
});

export const updateSystemNotification = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const notification = await Notification.findByIdAndUpdate(id, req.body);
    if (!notification) throw new ApiError(StatusCodes.NOT_FOUND, "Notification not found");
    return res.status(StatusCodes.OK).json(
        new ApiResponse(StatusCodes.OK, "Notification updated successfully", notification.toJSON())
    );
});

export const deleteSystemNotification = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await Notification.delete(id);
    return res.status(StatusCodes.OK).json(
        new ApiResponse(StatusCodes.OK, "Notification deleted successfully", null)
    );
});
