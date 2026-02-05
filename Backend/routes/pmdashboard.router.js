import express from 'express';
import { 
  getPMSummary,
  getMyProjects,
  getTaskExecutionSnapshot,
  getTeamLoad,
  getDailyUpdates,
  getPMDashboardData,
  getPMNotifications
} from '../controllers/pmdashboard.controller.js';
import { verifyJWT } from "../middlewares/auth.middleware.js";


const router = express.Router();


router.use(verifyJWT);


router.get('/', getPMDashboardData);


router.get('/summary', getPMSummary);
router.get('/projects', getMyProjects);
router.get('/task-snapshot', getTaskExecutionSnapshot);
router.get('/team-load', getTeamLoad);
router.get('/daily-updates', getDailyUpdates);
router.get('/notifications', getPMNotifications);

export default router;