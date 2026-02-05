import { Router } from "express";
import {
  getMyWorkSummary,
  getTodaysTasks,
  getMyProjects,
  getNotifications,
  updateTaskStatus,
  addTaskComment,
  getTaskDetails,
  getAllMyTasks,
  submitDailyUpdate
} from "../controllers/employeedashboard.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Apply authentication middleware to all routes
router.use(verifyJWT);

// 🔸 A. My Work Summary
router.route("/summary").get(getMyWorkSummary);

// 🔸 B. Today's Tasks
router.route("/tasks/today").get(getTodaysTasks);

// 🔸 C. My Projects
router.route("/projects").get(getMyProjects);

// 🔸 D. Notifications
router.route("/notifications").get(getNotifications);

// Task Management
router.route("/tasks").get(getAllMyTasks); // Get all tasks with filters
router.route("/tasks/:taskId").get(getTaskDetails); // Get task details

// Task Actions
router.route("/tasks/:taskId/status").put(updateTaskStatus); // Update task status
router.route("/tasks/:taskId/comments").post(addTaskComment); // Add comment

// Daily Updates
router.route("/daily-update").post(submitDailyUpdate); // Submit daily update

export default router;