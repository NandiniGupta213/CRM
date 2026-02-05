import express from 'express';
import {
  getPMProjects,
  getPMClients,
  getPMTeamMembers,
  getPMDashboardStats
} from '../controllers/projectManager.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(verifyJWT);

// Get projects assigned to the logged-in PM
router.get('/projects', getPMProjects);

// Get clients from PM's projects
router.get('/clients', getPMClients);

// Get team members from PM's projects
router.get('/team-members', getPMTeamMembers);

// Get PM dashboard statistics
router.get('/stats', getPMDashboardStats);

export default router;