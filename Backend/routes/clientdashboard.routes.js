// src/routes/clientDashboard.routes.js
import express from 'express';
import { getClientDashboard } from '../controllers/clientdashboard.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Protect all routes
router.use(verifyJWT);

// Client dashboard routes
router.get('/dashboard', getClientDashboard);

export default router;