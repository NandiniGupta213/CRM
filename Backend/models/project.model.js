// src/models/project.model.js
import mongoose from "mongoose";

const milestoneSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed', 'delayed'],
    default: 'pending'
  },
  deadline: {
    type: Date
  },
  completedDate: {
    type: Date
  },
  billable: {
    type: Boolean,
    default: true
  },
  amount: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

const projectSchema = new mongoose.Schema({
  projectId: {
    type: String,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true
  },
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  description: {
    type: String,
  },
  projectType: {
    type: String,
    required: true,
    enum: [
      'Web Development',
      'Mobile Application',
      'UI/UX Design',
      'Software Development',
      'E-commerce Platform',
      'CRM Implementation',
      'System Maintenance',
      'API Development',
      'Database Migration',
      'Cloud Infrastructure',
      'Research & Development',
      'Consulting Services',
      'Other'
    ]
  },
  status: {
    type: String,
    enum: ['planned', 'in-progress', 'completed', 'on-hold', 'cancelled','delayed'],
    default: 'planned'
  },
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  startDate: {
    type: Date,
    required: true
  },
  deadline: {
    type: Date,
    required: true
  },
  actualEndDate: {
    type: Date
  },
  estimatedHours: {
    type: Number,
    min: 0
  },
  actualHours: {
    type: Number,
    min: 0,
    default: 0
  },
  budget: {
    type: Number,
    min: 0
  },
  actualCost: {
    type: Number,
    min: 0,
    default: 0
  },
  isBillable: {
    type: Boolean,
    default: false
  },
  billingType: {
    type: String,
    enum: ['fixed', 'hourly', 'milestone'],
    default: 'fixed'
  },
  billingRate: {
    type: Number,
    min: 0
  },
  milestones: [milestoneSchema],
  documents: [{
    name: String,
    url: String,
    type: String,
    uploadedAt: Date
  }],
  tags: [String],
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  notes: [{
    content: String,
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
    isActive: {
    type: Boolean,
    default: true
  },
  teamMembers: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['developer', 'designer', 'tester', 'analyst', 'manager']
    },
    assignedDate: {
      type: Date,
      default: Date.now
    }
  }]
}, { timestamps: true });

// Pre-save middleware to generate project ID - FIXED VERSION (without next)
projectSchema.pre('save', async function() {
  if (this.isNew) {
    try {
      const count = await this.constructor.countDocuments({});
      this.projectId = `PROJ-${String(count + 1).padStart(3, '0')}`;
    } catch (error) {
      // If counting fails, use timestamp as fallback
      this.projectId = `PROJ-${Date.now().toString().slice(-6)}`;
    }
  }
});

projectSchema.statics.getProjectsByManager = async function(managerId, filters = {}) {
  try {
    const {
      status = '',
      search = '',
      page = 1,
      limit = 10,
      sort = '-createdAt'
    } = filters;

    // Build filter
    const filter = { 
      manager: new mongoose.Types.ObjectId(managerId),
      isActive: true 
    };

    // Add status filter
    if (status && ['planned', 'in-progress', 'delayed', 'completed'].includes(status)) {
      filter.status = status;
    }

    // Add search filter
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { projectId: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get total count
    const total = await this.countDocuments(filter);

    // Get projects with populated data
    const projects = await this.find(filter)
      .populate('client', 'name companyName email phone')
      .populate('teamMembers.user', 'name email role avatar')
      .populate('manager', 'name email phone')
      .select('-__v -notes -documents -createdBy')
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Calculate days left and status for each project
    const enhancedProjects = projects.map(project => {
      const projectObj = { ...project };
      
      // Calculate days left
      const today = new Date();
      const deadline = new Date(project.deadline);
      const diffTime = deadline.getTime() - today.getTime();
      projectObj.daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // Auto-detect delayed status
      if (projectObj.daysLeft < 0 && project.status === 'in-progress') {
        projectObj.actualStatus = 'delayed';
      } else {
        projectObj.actualStatus = project.status;
      }
      
      // Get team members count
      projectObj.teamCount = project.teamMembers?.length || 0;
      
      return projectObj;
    });

    return {
      projects: enhancedProjects,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    };
  } catch (error) {
    console.error('Error getting projects by manager:', error);
    throw error;
  }
};

projectSchema.methods.updateProjectStatus = async function(status, notes = '') {
  const oldStatus = this.status;
  
  // Update project status
  this.status = status;
  
  // Set actual end date if completed
  if (status === 'completed' && oldStatus !== 'completed') {
    this.actualEndDate = new Date();
    this.progress = 100;
  }
  
  // Clear actual end date if moving from completed
  if (oldStatus === 'completed' && status !== 'completed') {
    this.actualEndDate = null;
  }
  
  // Add note about status change
  if (notes) {
    this.notes.push({
      content: `Status changed from ${oldStatus} to ${status}: ${notes}`,
      addedBy: this.manager,
      addedAt: new Date()
    });
  }
  
  await this.save();
  return this;
};

projectSchema.statics.getProjectForPM = async function(projectId, managerId) {
  const project = await this.findOne({
    _id: projectId,
    manager: managerId,
    isActive: true
  })
  .populate('client', 'name companyName email phone address city state postalCode')
  .populate('manager', 'name email phone department')
  .populate('teamMembers.user', 'name email phone role department avatar')
  .populate('createdBy', 'name email')
  .populate('notes.addedBy', 'name email avatar')
  .select('-__v')
  .lean();

  if (!project) {
    return null;
  }

  // Calculate additional metrics
  const today = new Date();
  const deadline = new Date(project.deadline);
  const diffTime = deadline.getTime() - today.getTime();
  project.daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  // Auto-detect delayed status
  if (project.daysLeft < 0 && project.status === 'in-progress') {
    project.actualStatus = 'delayed';
  } else {
    project.actualStatus = project.status;
  }

  // Calculate task completion from milestones
  const totalTasks = project.milestones?.length || 0;
  const completedTasks = project.milestones?.filter(m => m.status === 'completed').length || 0;
  project.taskCompletion = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Calculate timeline
  const start = new Date(project.startDate);
  const end = project.actualEndDate ? new Date(project.actualEndDate) : new Date();
  const projectDuration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  project.projectDuration = projectDuration;

  // Get recent notes
  project.recentNotes = project.notes?.slice(-5).reverse() || [];

  return project;
};

projectSchema.methods.calculateProgress = function() {
  if (!this.milestones || this.milestones.length === 0) {
    return 0;
  }
  
  const completedMilestones = this.milestones.filter(m => m.status === 'completed');
  return Math.round((completedMilestones.length / this.milestones.length) * 100);
};

projectSchema.virtual('daysLeft').get(function() {
  const today = new Date();
  const deadline = new Date(this.deadline);
  const diffTime = deadline.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for project duration
projectSchema.virtual('duration').get(function() {
  const start = new Date(this.startDate);
  const end = this.actualEndDate ? new Date(this.actualEndDate) : new Date();
  const diffTime = end.getTime() - start.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

projectSchema.set('toJSON', { virtuals: true });
projectSchema.set('toObject', { virtuals: true });

export const Project = mongoose.model('Project', projectSchema);