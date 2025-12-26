import { Router } from "express";
import { changeCurrentPassword, forgotPassword, googleSignin, logout, resendOtp, signin, signup, verifyEmail } from "../controllers/auth.controller.js";
import { verifyJwt } from "../middlwares/auth.middleware.js";

const authRouter = Router();
authRouter.route("/signup").post(signup);
authRouter.route("/signin").post(signin);
authRouter.route("/google-signin").post(googleSignin);
authRouter.route("/logout").post(verifyJwt, logout);
authRouter.route("/verify-email").post(verifyJwt, verifyEmail)
authRouter.route("/resend-otp").post(resendOtp);
authRouter.route("/forgot-password").post(forgotPassword);
authRouter.route("/change-password/:token").post(changeCurrentPassword)