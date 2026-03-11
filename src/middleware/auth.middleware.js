import { StatusCodes } from "http-status-codes";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { responseMessages } from "../constant/responseMessages.js";
import { User } from "../models/user.models.js";
const { UNAUTHORIZED_REQUEST, INVALID_TOKEN, ADMIN_ACCESS} = responseMessages

export const verifyJwt = asyncHandler(async (req, _, next) => {
    const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, UNAUTHORIZED_REQUEST);
    }

    let decodedToken;
    try {
        decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    } catch (err) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, INVALID_TOKEN);
    }

    const user = await User.findById(decodedToken?._id || decodedToken?.id, 'id, user_name, email, role, is_verified, created_at, updated_at');
    if (!user) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, INVALID_TOKEN);
    }

    // If JWT carries an explicit role (Client/Freelancer/Admin), treat it as the active role
    if (decodedToken.role && typeof decodedToken.role === "string") {
        const tokenRole = decodedToken.role;
        if (["client", "freelancer", "admin"].includes(tokenRole.toLowerCase())) {
            user.role = tokenRole;
        }
    }

    req.user = user;
    next();
});


export const verifyAdmin = asyncHandler(async (req, res, next) => {
    if (req.user?.role?.toLowerCase() !== 'admin') {
        throw new ApiError(StatusCodes.FORBIDDEN, ADMIN_ACCESS);
    }
    next();
});