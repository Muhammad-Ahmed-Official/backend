import { StatusCodes } from 'http-status-codes';
import { supabase } from '../config/supabase.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ServiceCategory } from '../models/service.models.js';

const TABLE = 'service_categories';
const SELECT_COLS = 'id, created_at, name, icon, image';

// Public GET: fetch from service_categories via ServiceCategory model (single source of truth)
export const getServiceCategories = asyncHandler(async (req, res) => {
    const categories = await ServiceCategory.findAll();
    const data = categories.map(c => c.toJSON());
    return res.status(StatusCodes.OK).json(
        new ApiResponse(StatusCodes.OK, 'Service categories fetched successfully', data)
    );
});

export const createServiceCategory = asyncHandler(async (req, res) => {
    const { name, icon, image } = req.body;

    if (!name || !icon || !image) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'name, icon and image are required');
    }

    const { data, error } = await supabase
        .from(TABLE)
        .insert({ name, icon, image })
        .select(SELECT_COLS)
        .single();

    if (error) {
        throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, error.message || 'Error creating service category');
    }

    return res.status(StatusCodes.CREATED).json(
        new ApiResponse(StatusCodes.CREATED, 'Service category created successfully', data)
    );
});

export const updateServiceCategory = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, icon, image } = req.body;

    const payload = {};
    if (name !== undefined) payload.name = name;
    if (icon !== undefined) payload.icon = icon;
    if (image !== undefined) payload.image = image;

    if (Object.keys(payload).length === 0) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'No fields to update');
    }

    const { data, error } = await supabase
        .from(TABLE)
        .update(payload)
        .eq('id', id)
        .select(SELECT_COLS)
        .single();

    if (error) {
        if (error.code === 'PGRST116') {
            throw new ApiError(StatusCodes.NOT_FOUND, 'Service category not found');
        }
        throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, error.message || 'Error updating service category');
    }

    return res.status(StatusCodes.OK).json(
        new ApiResponse(StatusCodes.OK, 'Service category updated successfully', data)
    );
});

export const deleteServiceCategory = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const { error } = await supabase
        .from(TABLE)
        .delete()
        .eq('id', id);

    if (error) {
        throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, error.message || 'Error deleting service category');
    }

    return res.status(StatusCodes.OK).json(
        new ApiResponse(StatusCodes.OK, 'Service category deleted successfully', null)
    );
});
