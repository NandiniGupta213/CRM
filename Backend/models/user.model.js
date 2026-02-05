import mongoose, { Schema } from "mongoose";
import validator from "validator";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import * as crypto from "crypto";

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      validate: {
        validator: validator.isEmail,
        message: (props) => `${props.value} is not a valid email!`,
      },
    },
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    role: {
      type: Number,
      required: true,
      enum: [1, 2, 3, 4],
      default: 3,
    },
    roleName: {
      type: String,
      enum: ["Admin", "Project Manager", "Employee", "Client"],
      default: "Employee",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    employeeRef: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Employee'
},
employeeId: {
  type: String,
  trim: true
},
clientRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client'
    },
    clientId: {
      type: String,
      trim: true
    },
    resetPasswordToken: String,
    resetPasswordExpiry: Date,
  },
  {
    timestamps: true,
  }
);

userSchema.pre("save", async function() {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  
  const roleNames = {
    1: "Admin",
    2: "Project Manager",
    3: "Employee",
    4: "Client",
  };
  this.roleName = roleNames[this.role] || "Employee";
});

userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

// UPDATED: Add fallback secrets
userSchema.methods.generateAuthToken = function () {
  const secret = process.env.ACCESS_TOKEN_SECRET || "dev_access_secret_12345";
  
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      role: this.role,
      roleName: this.roleName,
    },
    secret,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "1d" }
  );
};

userSchema.methods.generateRefreshToken = function () {
  const secret = process.env.REFRESH_TOKEN_SECRET || "dev_refresh_secret_12345";
  return jwt.sign(
    {
      _id: this._id,
    },
    secret,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "7d" }
  );
};

userSchema.methods.generateResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");

  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  this.resetPasswordExpiry = Date.now() + 15 * 60 * 1000;

  const secret = process.env.RESET_TOKEN_SECRET || "dev_reset_secret_12345";
  
  const jwtToken = jwt.sign(
    { _id: this._id, resetToken },
    secret,
    { expiresIn: "15m" }
  );

  return { jwtToken, resetToken };
};

export const User = mongoose.model("User", userSchema);