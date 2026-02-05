import mongoose from "mongoose";

const taskCommentSchema = new mongoose.Schema({
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Task",
    required: true
  },
  comment: {
    type: String,
    required: true,
    trim: true
  },
  commentedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true
  },
  commentedByName: {
    type: String,
    required: true
  },
  commentedByRole: {
    type: String,
    required: true
  },
  attachments: [{
    fileName: String,
    fileUrl: String,
    fileType: String,
    fileSize: Number
  }],
  mentions: [{
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee"
    },
    name: String
  }],
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date
  }
}, {
  timestamps: true
});

taskCommentSchema.index({ taskId: 1, createdAt: -1 });

export const TaskComment = mongoose.model("TaskComment", taskCommentSchema);