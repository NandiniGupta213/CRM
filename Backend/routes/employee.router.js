import express from 'express';
import {
  createEmployee,
  getAllEmployees,
  getEmployeeById,
  getEmployeeStats,
  updateEmployee,
  updateEmployeeStatus,
  deleteEmployee,
} from '../controllers/employee.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(verifyJWT);

// Employee routes
router.route('/')
  .post(createEmployee)
  .get(getAllEmployees);

router.route('/stats')
  .get(getEmployeeStats);



router.route('/:id')
  .get(getEmployeeById)
  .put(updateEmployee)
  .delete(deleteEmployee);

router.route('/:id/status')
  .patch(updateEmployeeStatus);

export default router;