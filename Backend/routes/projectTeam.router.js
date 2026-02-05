import express from 'express';
import {
  createOrUpdateProjectTeam,
  getAllProjectTeams,
  getProjectTeamById,
  getAvailableProjectManagers,
  getAvailableEmployees,
  updateProjectTeamStatus,
  deleteProjectTeam,
  getProjectTeamStats
} from '../controllers/projectTeam.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(verifyJWT);

// Project team management routes
router.route('/')
  .post(createOrUpdateProjectTeam)
  .get(getAllProjectTeams);

// Get project teams stats
router.get('/stats', getProjectTeamStats);

// Get available project managers
router.get('/managers', getAvailableProjectManagers);

// Get available employees (for team members)
router.get('/employees', getAvailableEmployees);

// Team CRUD operations
router.route('/:id')
  .get(getProjectTeamById)
  .put(createOrUpdateProjectTeam)  // Use PUT for updates
  .delete(deleteProjectTeam);

// Update team status
router.patch('/:id/status', updateProjectTeamStatus);

export default router;