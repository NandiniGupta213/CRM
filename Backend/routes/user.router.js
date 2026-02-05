import { Router } from "express";
import {
  signupUser,
  loginUser,
  forgotPassword,
  resetPassword,
  getCurrentUser,
  logoutUser,
  getAllUsers,
  getUsersByRole,
  updateProfile,
  changePassword

} from "../controllers/user.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Public routes
router.route("/signup").post(signupUser);
router.route("/login").post(loginUser);
router.route("/forgot-password").post(forgotPassword);
router.route("/reset-password/:token").post(resetPassword);

// Protected routes
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/profile").get(verifyJWT, getCurrentUser);
router.route("/users").get(verifyJWT, getAllUsers); // Admin only
router.route("/role/:roleId").get(verifyJWT, getUsersByRole);
router.route("/update-profile").put(verifyJWT, updateProfile);
router.route("/change-password").put(verifyJWT, changePassword);

export default router;