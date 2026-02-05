import express from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  getTasks,
  getTaskStatistics,
  createTask,
  updateTask,
  deleteTask,
  getTaskDetails,
  addTaskComment,
  getMyTasks,
  getProjectTasks,
  getAvailableAssignees,
  getTaskConfiguration
} from "../controllers/task.controller.js";

const router = express.Router();

// Apply JWT verification to all routes
router.use(verifyJWT);

// Task management routes
router.route("/tasks").get(getTasks); // Get all tasks with dynamic filtering
router.route("/create").post(createTask);
router.route("/:taskId")
  .put(updateTask)
  .delete(deleteTask);
router.route("/details/:taskId").get(getTaskDetails);
router.route("/comment/:taskId").post(addTaskComment);
router.route("/stats").get(getTaskStatistics); // Get all stats
router.route("/stats/:projectId").get(getTaskStatistics); // Get stats for specific project
router.route("/my-tasks").get(getMyTasks);
router.route("/project/:projectId").get(getProjectTasks); // For backward compatibility

// New dynamic endpoints
router.route("/assignees").get(getAvailableAssignees);
router.route("/config").get(getTaskConfiguration);

export default router;