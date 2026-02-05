import { ApiError } from "../utils/ApiError.js";
import { asynchandler } from "../utils/asynchHandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

export const verifyJWT = asynchandler(async (req, res, next) => {
  try {
    let token;

    // Get token from Authorization header
    const authHeader = req.headers.authorization || req.headers.Authorization;
    
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }

    // Check if token exists
    if (!token) {
      console.log("❌ No token provided in request");
      throw new ApiError(401, "Access token missing. Please login again.");
    }

    console.log("🔑 Token received:", token.substring(0, 20) + "...");

    // Verify token with detailed error handling
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      console.log("✅ Token decoded successfully:", {
        id: decoded._id || decoded.id,
        email: decoded.email,
        role: decoded.role
      });
    } catch (jwtError) {
      console.error("❌ JWT Verification Failed:", {
        name: jwtError.name,
        message: jwtError.message,
        expiredAt: jwtError.expiredAt
      });

      if (jwtError.name === "TokenExpiredError") {
        throw new ApiError(401, "Access token expired. Please refresh your token.");
      } else if (jwtError.name === "JsonWebTokenError") {
        throw new ApiError(401, "Invalid access token.");
      } else {
        throw new ApiError(401, "Failed to authenticate token.");
      }
    }

    // Find user - try multiple ID fields
    const userId = decoded._id || decoded.id || decoded.userId;
    if (!userId) {
      console.error("❌ No user ID found in token payload:", decoded);
      throw new ApiError(401, "Invalid token payload.");
    }

    const user = await User.findById(userId).select(
      "-password -refreshToken"
    );

    if (!user) {
      console.error("❌ User not found for ID:", userId);
      throw new ApiError(401, "User not found. Please login again.");
    }

    // Check if user is active
    if (user.isActive === false) {
      throw new ApiError(403, "Account is deactivated. Please contact administrator.");
    }

    // Attach user to request
    req.user = user;
    console.log("✅ User authenticated:", {
      id: user._id,
      email: user.email,
      role: user.role
    });

    next();
  } catch (error) {
    console.error("🔴 Auth Middleware Error:", {
      message: error.message,
      stack: error.stack
    });

    // Pass the error to error handling middleware
    next(error);
  }
});

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new ApiError(401, "Authentication required");
    }

    if (!roles.includes(req.user.role)) {
      console.log(`❌ Role check failed. User role: ${req.user.role}, Required: ${roles}`);
      throw new ApiError(403, `You do not have permission. Required roles: ${roles.join(', ')}`);
    }

    console.log(`✅ Role check passed. User role: ${req.user.role}`);
    next();
  };
};

export const isAdmin = authorize(1);
export const isProjectManager = authorize(2);
export const isEmployee = authorize(3);
export const isClient = authorize(4);