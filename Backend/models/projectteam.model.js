import mongoose from "mongoose";

const projectTeamSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  projectName: {
    type: String,
    required: true,
    trim: true
  },
    projectManager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee', // CHANGED: Reference User instead of Employee
    required: true
  },
  projectManagerUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  projectManagerName: {
    type: String,
    required: true,
    trim: true
  },
  teamMembers: [{
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true
    },
     userId: { // Add userId for team members too
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ['developer', 'designer', 'qa', 'analyst', 'other'],
      default: 'developer'
    },
    department: {
      type: String,
      required: true
    },
    allocationPercentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 100
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: {
      type: Date
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  totalTeamSize: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'on-hold'],
    default: 'active'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
projectTeamSchema.index({ projectId: 1 });
projectTeamSchema.index({ projectManager: 1 });
projectTeamSchema.index({ 'teamMembers.employeeId': 1 });


projectTeamSchema.pre('save', function() {
  this.totalTeamSize = this.teamMembers.length;
});

export const ProjectTeam = mongoose.model("ProjectTeam", projectTeamSchema);