import { asynchandler } from "../utils/asynchHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { sendPasswordResetEmail } from "../utils/nodemailer.js";
import jwt from "jsonwebtoken";
import * as crypto from "crypto";


// Signup with role
const signupUser = asynchandler(async (req, res) => { 
  const { username, email, password, confirmPassword, role = 3 } = req.body;
  console.log("Signup request body:", req.body);

  // Validation
  if ([username, email, password, confirmPassword].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "All fields are required");
  }

  if (password !== confirmPassword) {
    throw new ApiError(400, "Password and confirm password do not match");
  }

  if (![1, 2, 3, 4].includes(Number(role))) {
    throw new ApiError(400, "Invalid role specified");
  }

  // Check if user already exists
  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User with this email or username already exists");
  }

  // Create user
  const user = await User.create({
    username,
    email,
    password,
    role,
  });

  const createdUser = await User.findById(user._id).select("-password -refreshToken");

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while creating the user");
  }

  console.log("Signup successful for user:", createdUser.email);

  return res
    .status(201)
    .json(new ApiResponse(201, createdUser, "Signup successful"));
});

// Login user
const loginUser = asynchandler(async (req, res) => { // Remove "next" parameter
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }

  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError(401, "Invalid email or password");
  }

  // Check if user has isActive field, if not, don't check it
  if (user.isActive === false) {
    throw new ApiError(403, "Account is deactivated. Please contact administrator.");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid email or password");
  }

  // Generate tokens
  const accessToken = user.generateAuthToken();
  const refreshToken = user.generateRefreshToken();

  // Save refresh token to database
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  console.log("User login successfully")
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "Login successful"
      )
    );
});

// Forgot password
const forgotPassword = asynchandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    // For security, don't reveal if user exists or not
    return res.status(200).json({
      success: true,
      message: "If an account exists with this email, a reset link will be sent"
    });
  }

  const { jwtToken, resetToken } = user.generateResetToken();
  await user.save({ validateBeforeSave: false });

  // Use the correct frontend URL with your basename
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const resetLink = `${frontendUrl}/dashdarkX/authentication/reset-password?token=${jwtToken}`;

  console.log("Reset link:", resetLink);

  try {
    // Try to send email
    await sendPasswordResetEmail(email, resetLink, resetToken);
    console.log("Password reset email sent to:", email);
    
    return res.status(200).json({
      success: true,
      message: "Password reset link has been sent to your email"
    });
  } catch (emailError) {
    console.error("Failed to send email:", emailError);
    
    // In development, return the link so you can test manually
    if (process.env.NODE_ENV === 'development') {
      return res.status(200).json({
        success: true,
        message: "Email sending failed. Here's the reset link for testing:",
        data: { resetLink }
      });
    }
    
    return res.status(500).json({
      success: false,
      message: "Failed to send reset email. Please try again later."
    });
  }
});

// Reset password
const resetPassword = asynchandler(async (req, res) => {
  const { token } = req.params;
  const { newPassword, confirmPassword } = req.body;

  if (!token) {
    throw new ApiError(400, "Reset token is required");
  }

  if (newPassword !== confirmPassword) {
    throw new ApiError(400, "Passwords do not match");
  }

  try {
    const decoded = jwt.verify(token, process.env.RESET_TOKEN_SECRET);
    const { _id, resetToken } = decoded;

    const user = await User.findById(_id);
    if (!user) {
      throw new ApiError(401, "Invalid reset token");
    }

    if (
      !user.resetPasswordExpiry ||
      user.resetPasswordExpiry < Date.now()
    ) {
      throw new ApiError(401, "Reset token has expired");
    }

    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    if (hashedToken !== user.resetPasswordToken) {
      throw new ApiError(401, "Invalid reset token");
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiry = undefined;
    await user.save();

    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Password reset successfully"));
  } catch (error) {
    console.error("Reset password error:", error);
    throw new ApiError(401, "Invalid or expired reset token");
  }
});

// Get current user profile
const getCurrentUser = asynchandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched successfully"));
});

// Logout user

const logoutUser = asynchandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: null,
      },
    },
    {
      new: true,
    }
  );

 
  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

// Get all users (Admin only)
const getAllUsers = asynchandler(async (req, res) => {
  if (req.user.role !== 1) {
    throw new ApiError(403, "Unauthorized access");
  }

  const users = await User.find().select("-password -refreshToken");
  return res
    .status(200)
    .json(new ApiResponse(200, users, "Users fetched successfully"));
});

const getUsersByRole = asynchandler(async (req, res) => {
  const { roleId } = req.params;
  
  // Convert roleId to number
  const role = parseInt(roleId);
  
  if (![1, 2, 3, 4].includes(role)) {
    throw new ApiError(400, "Invalid role ID");
  }

  // Find users with the specified role
  const users = await User.find({ role })
    .select('_id name email username department phone')
    .sort('name');

  return res
    .status(200)
    .json(new ApiResponse(200, users, `Users with role ${role} fetched successfully`));
});

const updateProfile = asynchandler(async (req, res) => {
  const { username, email } = req.body;
  const userId = req.user._id;

  // Validation
  if (!username || !email) {
    throw new ApiError(400, "Username and email are required");
  }

  // Check if email is already taken by another user
  if (email !== req.user.email) {
    const existingUser = await User.findOne({ 
      email, 
      _id: { $ne: userId } 
    });
    
    if (existingUser) {
      throw new ApiError(409, "Email is already in use");
    }
  }

  // Check if username is already taken by another user
  if (username !== req.user.username) {
    const existingUser = await User.findOne({ 
      username, 
      _id: { $ne: userId } 
    });
    
    if (existingUser) {
      throw new ApiError(409, "Username is already taken");
    }
  }

  // Update user
  const updatedUser = await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        username,
        email
      }
    },
    { new: true, runValidators: true }
  ).select("-password -refreshToken");

  if (!updatedUser) {
    throw new ApiError(404, "User not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedUser, "Profile updated successfully"));
});

// Change password
const changePassword = asynchandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user._id;

  // Validation
  if (!currentPassword || !newPassword) {
    throw new ApiError(400, "Current password and new password are required");
  }

  if (currentPassword === newPassword) {
    throw new ApiError(400, "New password must be different from current password");
  }

  // Get user with password
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Verify current password
  const isPasswordValid = await user.isPasswordCorrect(currentPassword);
  if (!isPasswordValid) {
    throw new ApiError(401, "Current password is incorrect");
  }

  // Update password
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

// Refresh access token
const refreshAccessToken = asynchandler(async (req, res) => {
  const incomingRefreshToken = req.body.refreshToken;
  console.log(incomingRefreshToken)

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Refresh token is required in request body");
  }
console.log('Using secret:', process.env.REFRESH_TOKEN_SECRET);
  try {
    const decoded = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET || "dev_refresh_secret_12345"
    );

    const user = await User.findById(decoded._id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (user.refreshToken !== incomingRefreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }

    // Generate new tokens
    const newAccessToken = user.generateAuthToken();
    const newRefreshToken = user.generateRefreshToken();


    // Return tokens in response body (NO cookies)
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken, // Send new refresh token back
          },
          "Access token refreshed successfully"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

export {
  signupUser,
  loginUser,
  forgotPassword,
  resetPassword,
  getCurrentUser,
  logoutUser,
  getAllUsers,
  getUsersByRole,
  updateProfile,
  changePassword,
  refreshAccessToken
};