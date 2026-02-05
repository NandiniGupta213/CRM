import mongoose from "mongoose";

const taskSchema = new mongoose.Schema({
  // Dynamic ID generation
  taskId: {
    type: String,
    unique: true,
    trim: true
  },
  
  // Project reference
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Project",
    required: true
  },
  
  // Basic task info
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
  },
  
  // Dynamic assignment system
  assignedTo: [{
    assigneeId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'assignedTo.assigneeType'
    },
    assigneeType: {
      type: String,
      enum: ['Employee', 'User', 'Team'],
      default: 'Employee'
    },
    name: String,
    email: String,
    employeeCode: String,
    department: String,
    role: String,
    avatarColor: String,
    allocationPercentage: {
      type: Number,
      default: 100,
      min: 0,
      max: 100
    },
    startDate: Date,
    endDate: Date,
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  
  // Creator info
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true
  },
  createdByName: {
    type: String,
    required: true
  },
  
  // Dynamic priority system (configurable)
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  
  // Dynamic status with workflow support
  status: {
    type: String,
    enum: ['todo', 'in-progress', 'blocked', 'completed', 'on-hold'],
    default: 'todo'
  },
  
  // Dates
  deadline: {
    type: Date,
    required: true
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  completionDate: {
    type: Date
  },
  
  // Progress tracking
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  
  // Dynamic task type
  taskType: {
    type: String,
    enum: ['development', 'design', 'testing', 'documentation', 'meeting', 'research', 'bug-fix', 'feature', 'other'],
    default: 'development'
  },
  
  // Custom fields (for dynamic requirements)
  customFields: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },

  
  // Dependencies
  dependencies: [{
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task"
    },
    type: {
      type: String,
      enum: ['blocks', 'depends-on', 'related-to'],
      default: 'depends-on'
    },
    required: {
      type: Boolean,
      default: true
    }
  }],
  
  
  // Attachments
  attachments: [{
    fileName: String,
    fileUrl: String,
    fileType: String,
    fileSize: Number,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee"
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Comments
  comments: [{
    content: String,
    commentedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee"
    },
    commentedByName: String,
    createdAt: {
      type: Date,
      default: Date.now
    },
    attachments: [{
      fileName: String,
      fileUrl: String,
      fileType: String
    }]
  }],
  
  // Activity log
  activityLog: [{
    action: String,
    details: mongoose.Schema.Types.Mixed,
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee"
    },
    performedByName: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Workflow transitions
  statusHistory: [{
    fromStatus: String,
    toStatus: String,
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee"
    },
    changedByName: String,
    reason: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Flags
  isArchived: {
    type: Boolean,
    default: false
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurrencePattern: String, // daily, weekly, monthly
  parentTaskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Task"
  }
}, {
  timestamps: true
});

// Pre-save middleware to generate task ID
taskSchema.pre('save', async function() {
  if (!this.isNew) return;
  
  try {
    const Project = mongoose.model('Project');
    const project = await Project.findById(this.projectId);
    
    if (!project) {
      throw new Error('Project not found');
    }
    
    const taskCount = await Task.countDocuments({ projectId: this.projectId });
    this.taskId = `${project.projectId}-TASK-${(taskCount + 1).toString().padStart(3, '0')}`;
    
    // Log creation activity
    this.activityLog.push({
      action: 'task_created',
      details: { title: this.title },
      performedBy: this.createdBy,
      performedByName: this.createdByName,
      timestamp: new Date()
    });
  } catch (error) {
    throw error;
  }
});

// Pre-update middleware to log status changes
taskSchema.pre('findOneAndUpdate', async function() {
  const update = this.getUpdate();
  
  if (update.status && !update.$set?.statusHistory) {
    const currentDoc = await this.model.findOne(this.getQuery());
    
    if (currentDoc && currentDoc.status !== update.status) {
      update.$push = update.$push || {};
      update.$push.statusHistory = {
        fromStatus: currentDoc.status,
        toStatus: update.status,
        changedBy: update.$set?.updatedBy || currentDoc.createdBy,
        changedByName: update.$set?.updatedByName || currentDoc.createdByName,
        reason: update.$set?.statusChangeReason || 'Status updated',
        timestamp: new Date()
      };
    }
  }
});

// Virtual for overdue status
taskSchema.virtual('isOverdue').get(function() {
  if (!this.deadline || this.status === 'completed' || this.status === 'cancelled') {
    return false;
  }
  return new Date() > new Date(this.deadline);
});

// Static method to generate task ID
taskSchema.statics.generateTaskId = async function(projectId) {
  const Project = mongoose.model('Project');
  const project = await Project.findById(projectId);
  
  if (!project) {
    throw new Error('Project not found');
  }
  
  const taskCount = await this.countDocuments({ projectId });
  return `${project.projectId}-TASK-${(taskCount + 1).toString().padStart(3, '0')}`;
};

// Method to calculate completion percentage
taskSchema.methods.calculateProgress = function() {
  if (this.status === 'completed') return 100;
  if (this.status === 'cancelled') return 0;
  return this.progress || 0;
};

export const Task = mongoose.model("Task", taskSchema);