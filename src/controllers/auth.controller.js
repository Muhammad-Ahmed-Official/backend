import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js"; 
import jwt from "jsonwebtoken";
import { StatusCodes } from "http-status-codes";
import { v4 as uuidv4 } from 'uuid'
import { sendEmailLink, sendEmailOTP } from '../utils/sendEmail.js';
import { asyncHandler } from "../utils/asyncHandler.js";
import { responseMessages } from "../constant/responseMessages.js";
const { MISSING_FIELDS, USER_EXISTS, UN_AUTHORIZED, SUCCESS_REGISTRATION, NO_USER, SUCCESS_LOGIN, INVALID_OTP, OTP_EXPIRED, EMAIL_VERIFY, SUCCESS_LOGOUT, MISSING_FIELD_EMAIL_PASSWORD, UNAUTHORIZED_REQUEST, GET_SUCCESS_MESSAGES, RESET_LINK_SUCCESS, PASSWORD_CHANGE, NOT_VERIFY, PASSWORD_AND_CONFIRM_NO_MATCH, UPDATE_UNSUCCESS_MESSAGES, MISSING_FIELD_EMAIL, RESET_OTP_SECCESS, INVALID_TOKEN, TOKEN_EXPIRED, SUCCESS_TOKEN, INVALID_DATA, NO_DATA_FOUND, IMAGE_SUCCESS, IMAGE_ERROR , UPDATE_SUCCESS_MESSAGES, UNAUTHORIZED, ERROR_MESSAGES} = responseMessages

const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById( userId );
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave: false});        
        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, error.message);
    }
}


// @desc    SIGNUP
// @route   POST /api/v1/auth/signup
// @access  Public
export const signup = asyncHandler(async (req, res) => {
    const { userName, email, password } = req.body;
    if (!userName || !email || !password || typeof userName !== "string" || typeof email !== "string" || typeof password !== "string") {
        throw new ApiError(StatusCodes.BAD_REQUEST, MISSING_FIELDS);
    }

    const otp = uuidv4().slice(0, 6); // Generate OTP
    const isUserExist = await User.findOne({ 
        $or: [{ userName }, { email }] 
    });
    if (isUserExist) {
        throw new ApiError(StatusCodes.CONFLICT, USER_EXISTS);
    }

    const otpExpiry = Date.now() + 600000; // 10 minutes expiry
    const newUser = await User.create({
        userName: userName.toLowerCase(),
        email,
        password,
        otp,
        expiresIn: otpExpiry,
    });

    const emailSent = await sendEmailOTP(email, otp);
    if (!emailSent) {
        throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, ERROR_MESSAGES);
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(newUser.id);
    const options = {
        httpOnly: true, // Cookie can't be accessed via JavaScript
        secure: true, // Only set to true in production (use HTTPS)
        sameSite: 'none', // Ensure it works with cross-site cookies
    };

    const userResponse = newUser.toJSON();
    
    return res
        .status(StatusCodes.CREATED)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .send(new ApiResponse(StatusCodes.OK, SUCCESS_REGISTRATION,
        {user: userResponse, accessToken, refreshToken},
    ))
});




// @desc    RESEND-OTP
// @route   POST api/v1/user/resendOtp
// @access  Private

export const resendOtp = asyncHandler( async (req, res) => {
        const { email, _id } = req.body;

        // Validate input
        if (!email || !_id) {
            return res
                .status(StatusCodes.BAD_REQUEST)
                .send(new ApiError(StatusCodes.BAD_REQUEST, UN_AUTHORIZED));
        }

        // Check if the user exists
        const isUser = await User.findOne({ email, _id });
        if (!isUser) {
            return res
                .status(StatusCodes.NOT_FOUND)
                .send(new ApiError(StatusCodes.NOT_FOUND, NO_USER));
        }

        // Generate new OTP
        const newOtp = uuidv4().slice(0, 6);

        // Update OTP and expiration time
        isUser.otp = newOtp;
        isUser.expiresIn = Date.now() + 600000; // 10 minutes
        await isUser.save({ validateBeforeSave: false });

        // Send OTP email
        await sendEmailOTP(email, newOtp);

        // Return success response
        return res
            .status(StatusCodes.OK)
            .send(new ApiResponse(StatusCodes.OK, RESET_OTP_SECCESS));
    } 
);



// @desc    VERIFY EMAIL
// @route   POST /api/user/verifyEmail
// @access  Private

export const verifyEmail = asyncHandler(async (req, res) => {
        console.log(req.body);
        
        const { otp } = req.body;
        
        // Validate the input
        if (!otp) {
            return res
                .status(StatusCodes.BAD_REQUEST)
                .send(new ApiError(StatusCodes.BAD_REQUEST, MISSING_FIELDS));
        }

        // Fetch the user
        // console.log(req);

        const user = await User.findOne({ email: req.user.email });
        if (!user) {
            return res
                .status(StatusCodes.NOT_FOUND)
                .send(new ApiError(StatusCodes.NOT_FOUND, NO_USER));
        }

        // Verify OTP
        if (user.otp !== otp) {
            return res
                .status(StatusCodes.FORBIDDEN)
                .send(new ApiError(StatusCodes.FORBIDDEN, INVALID_OTP));
        }

        // Check OTP expiration using expires_in field
        if (user.expiresIn && user.expiresIn < Date.now()) {
            return res
                .status(StatusCodes.FORBIDDEN)
                .send(new ApiError(StatusCodes.FORBIDDEN, OTP_EXPIRED));
        }

        // Mark the user as verified and clear OTP
        user.isVerified = true;
        user.otp = undefined;
        user.expiresIn = undefined;
       // Save without validation checks
        await user.save({ validateBeforeSave: false });

        // Send success response
        return res
            .status(StatusCodes.OK)
            .send(new ApiResponse(StatusCodes.OK, EMAIL_VERIFY, { email: user.email, isVerified: user.isVerified }));
    } 
);




// @desc    SIGNIN
// @route   POST /api/v1/auth/signin
// @access  Public

export const signin = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    
    if(!email || !password){
        throw new ApiError(StatusCodes.BAD_REQUEST, MISSING_FIELD_EMAIL_PASSWORD);
    }
    
    const user = await User.findOne({email});
    
    if(!user){
        throw new ApiError(StatusCodes.NOT_FOUND, NO_USER);
    }
    
    const isPaswordValid = await user.isPasswordCorrect(password);
    
    if (!isPaswordValid) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, UN_AUTHORIZED);
      }
      
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user.id);
    
    const userData = await User.findById(user.id, 'id, user_name, email, is_verified, created_at, updated_at');
    const loggedInusers = userData ? userData.toJSON() : null;
    
    const options = {
        httpOnly: true, // Cookie can't be accessed via JavaScript
        secure: true, // Only set to true in production (use HTTPS)
        sameSite: 'none', // Ensure it works with cross-site cookies
    }
    return res
    .status(StatusCodes.OK)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .send(new ApiResponse(StatusCodes.OK, 
        SUCCESS_LOGIN,
        {user: loggedInusers, accessToken, SUCCESS_LOGIN },
    ))
})


export const googleSignin = asyncHandler(async (req, res) => {
    const { email, userName, isVerified} = req.body;
    if(!email || !userName || !isVerified){
        throw new ApiError(StatusCodes.BAD_REQUEST, MISSING_FIELD_EMAIL_PASSWORD);
    }
    if (isVerified != true) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, NOT_VERIFY);
    };
    
    const user = await User.findOne({ 
        $and: [
            { userName: { $regex: new RegExp(`^${userName}$`, "i") } }, 
            { email: { $regex: new RegExp(`^${email}$`, "i") } }
        ] 
    });
    if(!user){
        throw new ApiError(StatusCodes.NOT_FOUND, NO_USER);
    }
    
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user.id);
    
    const userData = await User.findById(user.id, 'id, user_name, email, is_verified, created_at, updated_at');
    const loggedInusers = userData ? userData.toJSON() : null;
    
    const options = {
        httpOnly: true,
        secure: true,
    }
    return res
    .status(StatusCodes.OK)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .send(new ApiResponse(StatusCodes.OK, 
        SUCCESS_LOGIN,
        {user: loggedInusers, accessToken, SUCCESS_LOGIN },
    ))
})




// @desc    GET-USER-INFO
// @route   POST /api/v1/auth/isUser
// @access  Private

export const getUserInfo = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    if (!userId) {
        throw new ApiError(StatusCodes.BAD_REQUEST, UPDATE_UNSUCCESS_MESSAGES);
    };

    const user = await User.findById(userId);
    if (!user) {
        throw new ApiError(StatusCodes.BAD_REQUEST, NO_USER);
    };
    return res.status(StatusCodes.OK).send(new ApiResponse(StatusCodes.OK, "", user));
 
})



export const updateUser = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    if (!userId) {
        throw new ApiError(StatusCodes.BAD_REQUEST, UPDATE_UNSUCCESS_MESSAGES);
    };

    const { userName } = req.body;
    if (!userName) {
        throw new ApiError(StatusCodes.BAD_REQUEST, NO_DATA_FOUND);
    }
    
    const user = await User.findByIdAndUpdate(userId, 
        { userName: userName.toLowerCase() },
        {new: true}
    );
    return res.status(StatusCodes.OK).send(new ApiResponse(StatusCodes.OK, UPDATE_SUCCESS_MESSAGES, { user: user.toJSON() }));
})




// @desc    LOGOUT
// @route   POST api/v1/auth/logout
// @access  Public

export const logout = asyncHandler(async (req, res) => {
    
    await User.findByIdAndUpdate(req.user.id, {
        refreshToken: null // remove field from document 
    }, { new: true });

    const options = {
        httpOnly: true,
        secure: true,
    }

    res
    .status(StatusCodes.OK)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .send(new ApiResponse(StatusCodes.OK,  SUCCESS_LOGOUT, {}));
})


// @desc    FORGOT-PASSWORD-EMAIL
// @route   POST api/v1/auth/forgotPasswordEmail
// @access  Public

export const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(StatusCodes.BAD_REQUEST).json(new ApiError(StatusCodes.BAD_REQUEST, MISSING_FIELD_EMAIL));
    }

    const user = await User.findOne({ email });
    if (!user) {
        return res.status(StatusCodes.NOT_FOUND).json(new ApiError(StatusCodes.NOT_FOUND, NO_USER_FOUND));
    }
    if (!user.isVerified) {
        return res.status(StatusCodes.FORBIDDEN).json(new ApiError(StatusCodes.FORBIDDEN, NOT_VERIFY));
    }

    const resetLink = `${process.env.ALLOWED_ORIGIN_1}/change-password/${user.refreshToken}`;
    sendEmailLink(email, resetLink)
        .then(() => console.log("Reset email sent successfully"))
        .catch((err) => console.error("Error sending reset email:", err));

    return res.status(StatusCodes.OK).json(new ApiResponse(StatusCodes.OK, RESET_LINK_SUCCESS));
});





// @desc    CHANGE-CURRENT-PASSWORD
// @route   PUT api/v1/user/resetPasswordEmail
// @access  Private

export const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const { token } = req.params
    const refreshToken = token;

     const user = await User.findOne({ refreshToken: refreshToken });
    console.log(user);
    
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
    if (!isPasswordCorrect) {
        throw new ApiError(StatusCodes.BAD_REQUEST, INVALID_DATA);
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res.status(StatusCodes.OK).send(new ApiResponse(StatusCodes.OK, PASSWORD_CHANGE, {}));
});




export const refreshAccessToken =  asyncHandler(async (req, res) => {
    const getRefreshToken = req.cookies?.refreshToken || req.body.refreshToken;
    if (!getRefreshToken) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, UNAUTHORIZED_REQUEST);
    }

    try {
        const decodedToken = jwt.verify(getRefreshToken, process.env.REFRESH_TOKEN_SECRET);
        console.log(decodedToken);
        
        const user = await User.findById(decodedToken?._id || decodedToken?.id);
        if(!user){
            throw new ApiError(StatusCodes.UNAUTHORIZED, INVALID_TOKEN);
        }
    
        if (getRefreshToken !== user?.refreshToken) {
            throw new ApiError(StatusCodes.UNAUTHORIZED, TOKEN_EXPIRED);
        }
    
        const options = {
            httpOnly: true,
            secure: true,
        }
    
        const { accessToken, newRefreshToken }  = await generateAccessAndRefreshToken(user.id);
        
        return res
        .status(StatusCodes.OK)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .send(new ApiResponse(StatusCodes.OK, 
            { accessToken, newRefreshToken, SUCCESS_TOKEN },
        ))
    } catch (error) {
        throw new ApiError(StatusCodes.UNAUTHORIZED,  error.message)
    }

})


export const getCurrentUser = asyncHandler(async (req, res) => {
    return res.status(StatusCodes.OK).send(new ApiResponse(StatusCodes.OK, GET_SUCCESS_MESSAGES, req.user));
})