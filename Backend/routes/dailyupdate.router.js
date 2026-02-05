// routes/dailyUpdate.routes.js
import express from 'express';
import {
  getEmployeeTasks,
  getPMTasks,
  updateTaskStatus,
  addComment
} from '../controllers/dailyupdate.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Secure all routes
router.use(verifyJWT);

// Get tasks based on role
router.get('/employee', getEmployeeTasks);
router.get('/project-manager', getPMTasks);

// Update task status (employee only)
router.patch('/:updateId/status', updateTaskStatus);

// Add comment (both employee and PM)
router.post('/:updateId/comment', addComment);

export default router;