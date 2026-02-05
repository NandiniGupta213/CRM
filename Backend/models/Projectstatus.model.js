import mongoose, { Schema } from "mongoose";

const projectStatusSchema = new Schema(
  {
    projectName: {
      type: String,
      required: [true, "Project name is required"],
      trim: true
    },
    projectCode: {
      type: String,
      required: [true, "Project code is required"],
      unique: true,
      trim: true,
      uppercase: true
    },
    projectManager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    projectManagerName: {
      type: String,
      required: true
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: true
    },
    clientName: {
      type: String,
      required: true
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    estimatedHours: {
      type: Number,
      required: true,
      min: 0
    },
    budget: {
      type: Number,
      required: true,
      min: 0
    },
    currentStatus: {
      type: String,
      enum: ['In Progress', 'Delayed', 'Completed', 'On Hold'],
      default: 'In Progress'
    },
    progressPercentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    delayReason: {
      type: String,
      trim: true
    },
    delayDate: {
      type: Date
    },
    description: {
      type: String,
      trim: true
    },
    remarks: {
      type: String,
      trim: true
    },
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    lastUpdatedByName: {
      type: String
    },
    statusHistory: [{
      status: String,
      progress: Number,
      delayReason: String,
      updatedBy: mongoose.Schema.Types.ObjectId,
      updatedByName: String,
      timestamp: {
        type: Date,
        default: Date.now
      }
    }],
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Generate project code automatically
projectStatusSchema.pre('save', async function(next) {
  if (!this.projectCode) {
    const year = new Date().getFullYear().toString().slice(-2);
    const count = await mongoose.model('ProjectStatus').countDocuments({
      createdAt: {
        $gte: new Date(new Date().getFullYear(), 0, 1),
        $lt: new Date(new Date().getFullYear() + 1, 0, 1)
      }
    });
    this.projectCode = `PRJ${year}${(count + 1).toString().padStart(4, '0')}`;
  }
  next();
});

export const ProjectStatus = mongoose.model("ProjectStatus", projectStatusSchema);