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
router.use(verifyJWT);

// Dashboard routes
router.get('/summary', getDashboardSummary);
router.get('/projects/health', getProjectHealth);
router.get('/financial', getFinancialSnapshot);
router.get('/risks', getRisksAndAlerts);
router.get('/activities', getRecentActivities);
router.get('/metrics', getDashboardMetrics);
router.get('/quick-stats', getQuickStats);
router.get('/overdue-summary', getOverdueSummary);
router.get('/clients-only', getClientData);
router.get('/notifications', getNotifications);


export default router;