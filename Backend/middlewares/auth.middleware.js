import { ApiError } from "../utils/ApiError.js";
import { asynchandler } from "../utils/asynchHandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

// auth.middleware.js - Updated version
export const verifyJWT = asynchandler(async (req, res, next) => {
  console.log('🔐 verifyJWT middleware triggered');
  console.log('📋 Request URL:', req.originalUrl);
  
  let token;

  // Get token from Authorization header
  const authHeader = req.headers.authorization || req.headers.Authorization;
  console.log('📤 Auth header:', authHeader);
  
  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
    console.log('✅ Token extracted:', token?.substring(0, 30) + '...');
  }

  // Check if token exists
  if (!token) {
    console.log('❌ No token provided');
    return res.status(401).json({
      success: false,
      message: "Access token missing. Please login again."
    });
  }

  try {
    // Log environment variable (masked)
    console.log('🔑 ACCESS_TOKEN_SECRET exists?', !!process.env.ACCESS_TOKEN_SECRET);
    console.log('🔑 ACCESS_TOKEN_SECRET length:', process.env.ACCESS_TOKEN_SECRET?.length);
    
    // Decode without verification first to see payload
    const decodedWithoutVerify = jwt.decode(token);
    console.log('📋 Decoded token (unverified):', decodedWithoutVerify);
    
    // Now verify with secret
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    console.log('✅ Token verified successfully:', {
      id: decoded._id,
      email: decoded.email,
      role: decoded.role
    });

    // Find user
    const user = await User.findById(decoded._id).select("-password -refreshToken");
    console.log('👤 User found in DB:', user ? 'Yes' : 'No');

    if (!user) {
      console.log('❌ User not found in database');
      return res.status(401).json({
        success: false,
        message: "User not found. Please login again."
      });
    }

    // Check if user is active
    if (user.isActive === false) {
      console.log('❌ User account is deactivated');
      return res.status(403).json({
        success: false,
        message: "Account is deactivated. Please contact administrator."
      });
    }

    // Attach user to request
    req.user = user;
    console.log('✅ Authentication successful for:', user.email);
    console.log('✅ User role:', user.role);
    
    next();
  } catch (error) {
    console.error('🔴 JWT Verification Error:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    if (error.name === "TokenExpiredError") {
      console.log('⏰ Token expired at:', error.expiredAt);
      return res.status(401).json({
        success: false,
        message: "Access token expired. Please login again."
      });
    } else if (error.name === "JsonWebTokenError") {
      console.log('❌ JWT Error:', error.message);
      return res.status(401).json({
        success: false,
        message: "Invalid access token."
      });
    }
    
    return res.status(500).json({
      success: false,
      message: "Authentication failed."
    });
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