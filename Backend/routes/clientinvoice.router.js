import express from 'express';
import { 
  getMyInvoices, 
  getInvoiceDetails, 
  getInvoiceStats 
} from '../controllers/clientinvoice.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = express.Router();
router.use(verifyJWT);

// Client invoice routes
router.get('/my-invoices', getMyInvoices);
router.get('/my-invoices/stats', getInvoiceStats);
router.get('/my-invoices/:invoiceId', getInvoiceDetails);

export default router;