import express from 'express';
import {
  getMyProjects,
  getMyProjectDetails
} from '../controllers/clientproject.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = express.Router();
router.use(verifyJWT);

// Client portal routes
router.get('/my-projects', getMyProjects);
router.get('/my-projects/:projectId', getMyProjectDetails);

export default router;