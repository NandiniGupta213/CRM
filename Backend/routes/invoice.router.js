import express from 'express';
import {
  createInvoice,
  getAllInvoices,
  getInvoiceById,
  recordPayment,
  sendInvoice,
  updateInvoiceStatus,
  markAsOverdue,
  updateOverdueInvoices,
  deleteInvoice,
  downloadInvoice,
  getInvoiceStats,
  fixInvoiceInconsistencies
} from '../controllers/invoice.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Apply JWT verification to all routes
router.use(verifyJWT);

// Create new invoice
router.route('/').post(createInvoice);

// Get all invoices with filters
router.route('/').get(getAllInvoices);

// Get invoice statistics
router.route('/stats').get(getInvoiceStats);

// Bulk update overdue invoices (admin/cron job)
router.route('/bulk/overdue').put(updateOverdueInvoices);

// Single invoice operations
router.route('/:id')
  .get(getInvoiceById)
  .delete(deleteInvoice);

// Invoice status operations
router.route('/:id/status').put(updateInvoiceStatus);

// Send invoice
router.route('/:id/send').put(sendInvoice);

// Mark as overdue
router.route('/:id/overdue').put(markAsOverdue);

// Record payment
router.route('/:id/payment').post(recordPayment);

// Download invoice as PDF
router.route('/:id/download').get(downloadInvoice);

router.route("/fix-inconsistencies").post(fixInvoiceInconsistencies);

export default router;