import mongoose from "mongoose";

const dailyUpdateSchema = new mongoose.Schema({
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: true
  },
  taskName: {
    type: String,
    required: true
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  projectName: {
    type: String,
    default: 'Unassigned'
  },
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  employeeName: {
    type: String,
    required: true
  },
  projectManagerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  projectManagerName: {
    type: String,
    default: 'Unassigned'
  },
  currentStatus: {
    type: String,
    enum: ['todo', 'in-progress', 'completed', 'blocked'],
    default: 'todo'
  },
  deadline: Date,
  lastUpdate: {
    type: String,
    default: ''
  },
  lastUpdateTime: {
    type: Date,
    default: Date.now
  },
  taskDescription: {
    type: String,
    default: ''
  },
  taskPriority: {
    type: String,
    default: 'medium'
  },
  taskType: {
    type: String,
    default: 'general'
  },
  comments: [{
    content: String,
    authorName: String,
    authorRole: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Indexes
dailyUpdateSchema.index({ employeeId: 1 });
dailyUpdateSchema.index({ projectManagerId: 1 });

export const DailyUpdate = mongoose.model('DailyUpdate', dailyUpdateSchema);