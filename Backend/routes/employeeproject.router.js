// src/routes/project.routes.js - FIXED VERSION
import express from 'express';
import {
  getMyProjects,
  getMyProjectStats,
  getProjectDetails
} from '../controllers/employeeproject.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Correct order - specific routes first
router.get('/my-projects', verifyJWT, getMyProjects);
router.get('/my-projects/stats', verifyJWT, getMyProjectStats);

// Parameterized route last
router.get('/:projectId', verifyJWT, getProjectDetails);

export default router;