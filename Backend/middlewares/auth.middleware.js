import { ApiError } from "../utils/ApiError.js";
import { asynchandler } from "../utils/asynchHandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";


export const verifyJWT = asynchandler(async (req, res, next) => {
  let token;

  // Check multiple sources for the token
  // 1. Check Authorization header
  if (req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }
  // 2. Check cookies (optional)
  else if (req.cookies?.accessToken) {
    token = req.cookies.accessToken;
  }
  // 3. Check query parameter (optional, for testing)
  else if (req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    console.error("No token found in request");
    console.log("Authorization header:", req.headers.authorization);
    console.log("Cookies:", req.cookies);
    throw new ApiError(401, "Access token missing");
  }

  try {
    console.log("Verifying token:", token.substring(0, 20) + "...");
    
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    console.log("Token decoded successfully for user:", decoded._id);

    const user = await User.findById(decoded._id).select(
      "-password -refreshToken"
    );

    if (!user) {
      console.error("User not found for ID:", decoded._id);
      throw new ApiError(401, "User not found");
    }
    
    if (!user.isActive) {
      console.error("User account deactivated:", user.email);
      throw new ApiError(403, "Account deactivated");
    }

    console.log("User authenticated:", user.email, "Role:", user.role);
    req.user = user;
    next();
  } catch (error) {
    console.error("JWT VERIFY ERROR:", error.message);
    
    // More specific error messages
    if (error.name === 'TokenExpiredError') {
      throw new ApiError(401, "Token expired. Please login again.");
    } else if (error.name === 'JsonWebTokenError') {
      throw new ApiError(401, "Invalid token");
    } else {
      throw new ApiError(401, error.message);
    }
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