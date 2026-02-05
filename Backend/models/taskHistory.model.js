import mongoose from "mongoose";

const taskHistorySchema = new mongoose.Schema({
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Task",
    required: true
  },
  changedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true
  },
  changedByName: {
    type: String,
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: ['created', 'status_changed', 'assigned', 'priority_changed', 'progress_updated', 'deadline_updated', 'comment_added', 'attachment_added', 'description_updated', 'title_updated']
  },
  field: {
    type: String,
    required: true
  },
  oldValue: {
    type: mongoose.Schema.Types.Mixed
  },
  newValue: {
    type: mongoose.Schema.Types.Mixed
  },
  details: {
    type: String
  }
}, {
  timestamps: true
});

taskHistorySchema.index({ taskId: 1, createdAt: -1 });

export const TaskHistory = mongoose.model("TaskHistory", taskHistorySchema);