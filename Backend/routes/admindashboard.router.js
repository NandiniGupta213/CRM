import express from 'express';
import {
  getDashboardSummary,
  getProjectHealth,
  getFinancialSnapshot,
  getRisksAndAlerts,
  getDashboardMetrics,
  getQuickStats,
  getRecentActivities,
  getOverdueSummary,
  getClientData,
  getNotifications
} from '../controllers/admindashboard.controller.js';
import { verifyJWT, authorize } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Option 1: Apply to all routes individually
router.get('/summary', verifyJWT, authorize(1), getDashboardSummary);
router.get('/projects/health', verifyJWT, authorize(1), getProjectHealth);
router.get('/financial', verifyJWT, authorize(1), getFinancialSnapshot);
router.get('/risks', verifyJWT, authorize(1), getRisksAndAlerts);
router.get('/activities', verifyJWT, authorize(1), getRecentActivities);
router.get('/metrics', verifyJWT, authorize(1), getDashboardMetrics);
router.get('/quick-stats', verifyJWT, authorize(1), getQuickStats);
router.get('/overdue-summary', verifyJWT, authorize(1), getOverdueSummary);
router.get('/clients-only', verifyJWT, authorize(1), getClientData);
router.get('/notifications', verifyJWT, authorize(1), getNotifications);

export default router;