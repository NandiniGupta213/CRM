import { ApiError } from "../utils/ApiError.js";
import { asynchandler } from "../utils/asynchHandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

export const verifyJWT = asynchandler(async (req, res, next) => {
  let token;

  // ✅ JWT ONLY — from Authorization header
  if (req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    throw new ApiError(401, "Access token missing");
  }

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const user = await User.findById(decoded._id).select(
      "-password -refreshToken"
    );

    if (!user) throw new ApiError(401, "User not found");
    if (!user.isActive) throw new ApiError(403, "Account deactivated");

    req.user = user;
    next();
  } catch (error) {
    console.error("JWT VERIFY ERROR:", error.message);
    throw new ApiError(401, "Invalid or expired token");
  }
});



// Role-based middleware
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new ApiError(401, "Authentication required");
    }

    if (!roles.includes(req.user.role)) {
      throw new ApiError(403, "You do not have permission to access this resource");
    }

    next();
  };
};

// Specific role middleware
export const isAdmin = authorize(1);
export const isProjectManager = authorize(2);
export const isEmployee = authorize(3);
export const isClient = authorize(4);