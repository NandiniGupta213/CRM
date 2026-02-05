import express from 'express';
import {
  getPMProjects,
  updateProjectStatus,
  getProjectStats,
  getProjectById
} from '../controllers/projectStatusController.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Apply JWT verification to all routes
router.use(verifyJWT);


// Project Manager routes
router.get('/pm', getPMProjects);

// Update project status
router.put('/:id/status', updateProjectStatus);

// Get project statistics
router.get('/stats', getProjectStats);

// Get single project
router.get('/:id', getProjectById);

export default router;