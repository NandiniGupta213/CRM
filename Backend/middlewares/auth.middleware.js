import { ApiError } from "../utils/ApiError.js";
import { asynchandler } from "../utils/asynchHandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

export const verifyJWT = asynchandler(async (req, res, next) => {
  let token;

  console.log("=== AUTH MIDDLEWARE DEBUG ===");
  console.log("Authorization header:", req.headers.authorization);
  console.log("Full headers:", req.headers);

  // ✅ JWT ONLY — from Authorization header
  if (req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
    console.log("Extracted token:", token);
    console.log("Token length:", token?.length);
    console.log("Token first 50 chars:", token?.substring(0, 50));
    console.log("Token last 50 chars:", token?.substring(token.length - 50));
  }

  if (!token) {
    console.error("ERROR: No token found");
    throw new ApiError(401, "Access token missing");
  }

  try {
    console.log("Verifying token with secret:", process.env.ACCESS_TOKEN_SECRET);
    
    // Decode first to check structure
    const decodedWithoutVerify = jwt.decode(token);
    console.log("Decoded without verify:", decodedWithoutVerify);
    
    // Now verify
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    console.log("Token verified successfully:", decoded);

    const user = await User.findById(decoded._id).select(
      "-password -refreshToken"
    );

    if (!user) throw new ApiError(401, "User not found");
    if (!user.isActive) throw new ApiError(403, "Account deactivated");

    req.user = user;
    console.log("User authenticated:", user.email);
    next();
  } catch (error) {
    console.error("JWT VERIFY ERROR DETAILS:");
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Token that failed:", token);
    console.error("Token length:", token?.length);
    
    // Check if token has common issues
    if (token.includes('\n') || token.includes('\r')) {
      console.error("Token contains line breaks!");
    }
    if (token.includes(' ')) {
      console.error("Token contains spaces (not from Bearer prefix)!");
    }
    
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