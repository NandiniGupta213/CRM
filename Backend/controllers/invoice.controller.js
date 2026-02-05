import { asynchandler } from "../utils/asynchHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { Invoice } from "../models/invoice.model.js";
import { Project } from "../models/project.model.js";
import { Client } from "../models/client.model.js";
import { generatePDF } from "../utils/pdfGenerator.js";
import mongoose from "mongoose";

// Generate invoice number
const generateInvoiceNumber = async () => {
  const year = new Date().getFullYear();
  const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
  
  // Get last invoice number
  const lastInvoice = await Invoice.findOne().sort({ createdAt: -1 });
  
  let sequence = 1;
  if (lastInvoice && lastInvoice.invoiceNumber) {
    const lastNum = lastInvoice.invoiceNumber.match(/\d+/);
    if (lastNum) {
      sequence = parseInt(lastNum[0]) + 1;
    }
  }
  
  return `INV-${year}${month}-${sequence.toString().padStart(4, '0')}`;
};

// Create new invoice - FIXED VERSION
const createInvoice = asynchandler(async (req, res) => {
  const {
    projectId,
    clientId,
    clientName,
    companyName,
    billingAddress,
    contactEmail,
    lineItems,
    discount = 0,
    discountType = 'amount',
    taxRate = 18,
    paymentMethod = 'Bank Transfer',
    bankDetails,
    paymentTerms = 'Payment due within 30 days',
    notes,
    dueDate,
    status = 'draft',
    invoiceNumber: invoiceNumberFromRequest,
  } = req.body;

  // Validate required fields
  if (!projectId || !clientId || !lineItems || !Array.isArray(lineItems)) {
    throw new ApiError(400, "Project, client, and line items are required");
  }

  // Validate line items
  lineItems.forEach((item, index) => {
    if (!item.description?.trim()) {
      throw new ApiError(400, `Line item ${index + 1}: Description is required`);
    }
    if (!item.quantity || item.quantity <= 0) {
      throw new ApiError(400, `Line item ${index + 1}: Valid quantity is required`);
    }
    if (!item.rate || item.rate < 0) {
      throw new ApiError(400, `Line item ${index + 1}: Valid rate is required`);
    }
  });

  // Generate invoice number (use provided one or generate new)
  const invoiceNumber = invoiceNumberFromRequest || await generateInvoiceNumber();

  // Validate status
  const allowedStatuses = ['draft', 'sent', 'paid', 'overdue'];
  const finalStatus = allowedStatuses.includes(status) ? status : 'draft';

  // Get project
  const project = await Project.findById(projectId);
  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  // Get client
  const client = await Client.findById(clientId);
  if (!client) {
    throw new ApiError(404, "Client not found");
  }

  // Prepare line items with calculated amounts
  const preparedLineItems = lineItems.map(item => ({
    description: item.description.trim(),
    quantity: item.quantity,
    rate: item.rate,
    amount: item.quantity * item.rate
  }));

  // Calculate subtotal
  const subtotal = preparedLineItems.reduce((sum, item) => sum + item.amount, 0);

  // Calculate discount amount
  let discountAmount = 0;
  if (discount > 0) {
    if (discountType === 'percentage') {
      discountAmount = (subtotal * discount) / 100;
    } else {
      discountAmount = discount;
    }
  }

  // Calculate tax and total
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxAmount = (taxableAmount * taxRate) / 100;
  const total = taxableAmount + taxAmount;

  // ✅ FIXED: Correctly set paidAmount and balanceDue based on status
  let paidAmount = 0;
  let balanceDue = total;

  if (finalStatus === 'paid') {
    paidAmount = total;
    balanceDue = 0;
  }

  // Create invoice data
  const invoiceData = {
    invoiceNumber,
    invoiceDate: new Date(),
    dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    status: finalStatus,
    
    client: clientId,
    clientName: clientName || client.name,
    companyName: companyName || client.companyName,
    billingAddress: billingAddress || client.address,
    contactEmail: contactEmail || client.email,
    
    project: projectId,
    projectName: project.title,
    projectId: project.projectId,
    billingType: project.billingType || 'Fixed',
    
    lineItems: preparedLineItems,
    subtotal,
    discount: discountAmount,
    discountType,
    taxRate,
    taxAmount,
    total,
    paidAmount, // ✅ CORRECTLY SET
    balanceDue, // ✅ CORRECTLY SET
    
    paymentMethod,
    bankDetails: bankDetails || 'Account details will be provided separately',
    paymentTerms,
    notes,
    
    createdBy: req.user._id
  };

  // If status is paid, add a payment record
  if (finalStatus === 'paid' && total > 0) {
    invoiceData.paymentHistory = [{
      date: new Date(),
      amount: total,
      method: paymentMethod,
      reference: `INITIAL-PAY-${Date.now()}`,
      notes: 'Initial payment recorded',
      status: 'completed'
    }];
  }

  const invoice = await Invoice.create(invoiceData);

  // ✅ CRITICAL: Update client stats after creating invoice
  try {
    await Client.updateClientStats(clientId);
    console.log(`✅ Updated client stats after creating invoice ${invoiceNumber}`);
  } catch (error) {
    console.error('Error updating client stats:', error);
  }

  // Populate the created invoice
  const populatedInvoice = await Invoice.findById(invoice._id)
    .populate('client', 'name companyName email phone')
    .populate('project', 'title projectId')
    .populate('createdBy', 'name email');

  return res
    .status(201)
    .json(new ApiResponse(201, populatedInvoice, "Invoice created successfully"));
});

// Get all invoices with filters
const getAllInvoices = asynchandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search = '',
    status,
    startDate,
    endDate,
    clientId,
    projectId,
    sortBy = '-createdAt'
  } = req.query;

  // Build filter query
  const filter = { isActive: true };
  
  if (status && status !== 'all') {
    filter.status = status;
  }
  
  if (clientId && mongoose.Types.ObjectId.isValid(clientId)) {
    filter.client = clientId;
  }
  
  if (projectId && mongoose.Types.ObjectId.isValid(projectId)) {
    filter.project = projectId;
  }
  
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }
  
  // Search filter
  if (search) {
    filter.$or = [
      { invoiceNumber: { $regex: search, $options: 'i' } },
      { projectName: { $regex: search, $options: 'i' } },
      { clientName: { $regex: search, $options: 'i' } },
      { companyName: { $regex: search, $options: 'i' } }
    ];
  }

  // Parse pagination
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;

  // Get total count
  const total = await Invoice.countDocuments(filter);

  // Get invoices with pagination
  const invoices = await Invoice.find(filter)
    .populate('client', 'name companyName email phone')
    .populate('project', 'title projectId')
    .populate('createdBy', 'name email')
    .sort(sortBy)
    .skip(skip)
    .limit(limitNum);

  return res.status(200).json(
    new ApiResponse(200, {
      invoices,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    }, "Invoices fetched successfully")
  );
});

// Get single invoice
const getInvoiceById = asynchandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid invoice ID");
  }

  const invoice = await Invoice.findById(id)
    .populate('client', 'name companyName email phone address city state postalCode')
    .populate('project', 'title projectId description startDate deadline')
    .populate('createdBy', 'name email')
    .populate({
      path: 'paymentHistory',
      options: { sort: { date: -1 } }
    });

  if (!invoice) {
    throw new ApiError(404, "Invoice not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, invoice, "Invoice fetched successfully"));
});

// Record payment - FIXED VERSION
const recordPayment = asynchandler(async (req, res) => {
  const { id } = req.params;
  const { amount, method, reference, notes, date } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid invoice ID");
  }

  if (!amount || amount <= 0) {
    throw new ApiError(400, "Valid payment amount is required");
  }

  // Find invoice
  const invoice = await Invoice.findById(id);
  if (!invoice) {
    throw new ApiError(404, "Invoice not found");
  }

  // Check if invoice is already fully paid
  if (invoice.paidAmount >= invoice.total) {
    throw new ApiError(400, "Invoice is already fully paid");
  }

  // Check if payment exceeds balance due
  const balanceDue = invoice.total - invoice.paidAmount;
  if (amount > balanceDue) {
    throw new ApiError(400, `Payment cannot exceed balance due of ₹${balanceDue}`);
  }

  // Create payment record
  const paymentRecord = {
    date: date ? new Date(date) : new Date(),
    amount,
    method: method || 'Bank Transfer',
    reference: reference || `PAY-${Date.now()}`,
    notes,
    status: 'completed'
  };

  // Update invoice with payment
  invoice.paymentHistory.push(paymentRecord);
  invoice.paidAmount += amount;
  
  // ✅ IMPORTANT: Recalculate balance due
  invoice.balanceDue = Math.max(0, invoice.total - invoice.paidAmount);
  
  // ✅ IMPORTANT: Update status if fully paid
  if (invoice.balanceDue === 0) {
    invoice.status = 'paid';
  }
  
  await invoice.save();

  // ✅ CRITICAL: Update client stats after payment
  try {
    if (invoice.client) {
      await Client.updateClientStats(invoice.client);
      console.log(`✅ Updated client stats after payment for invoice ${invoice.invoiceNumber}`);
    }
  } catch (error) {
    console.error('Error updating client stats:', error);
  }

  const updatedInvoice = await Invoice.findById(id)
    .populate('client', 'name companyName email')
    .populate('project', 'title projectId');

  return res
    .status(200)
    .json(new ApiResponse(200, updatedInvoice, "Payment recorded successfully"));
});

// Send invoice (update status to sent)
const sendInvoice = asynchandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid invoice ID");
  }

  const invoice = await Invoice.findByIdAndUpdate(
    id,
    { 
      status: 'sent',
      invoiceDate: new Date() // Update invoice date when sending
    },
    { new: true }
  );

  if (!invoice) {
    throw new ApiError(404, "Invoice not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, invoice, "Invoice sent successfully"));
});

// Update invoice status (e.g., mark as paid from frontend) - FIXED
const updateInvoiceStatus = asynchandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid invoice ID");
  }

  const allowedStatuses = ['draft', 'sent', 'paid', 'overdue'];
  if (!allowedStatuses.includes(status)) {
    throw new ApiError(400, "Invalid status value");
  }

  const invoice = await Invoice.findById(id);
  if (!invoice) {
    throw new ApiError(404, "Invoice not found");
  }

  // If marking as paid, record full payment
  if (status === 'paid' && invoice.status !== 'paid') {
    const paymentNeeded = invoice.total - invoice.paidAmount;
    
    if (paymentNeeded > 0) {
      // Add payment record
      invoice.paymentHistory.push({
        date: new Date(),
        amount: paymentNeeded,
        method: 'Manual Payment',
        reference: `MANUAL-PAY-${Date.now()}`,
        notes: 'Payment recorded via status change',
        status: 'completed'
      });
      
      invoice.paidAmount = invoice.total;
      invoice.balanceDue = 0;
    }
  }

  // Update status
  invoice.status = status;
  await invoice.save();

  // ✅ CRITICAL: Update client stats after status change
  try {
    if (invoice.client) {
      await Client.updateClientStats(invoice.client);
      console.log(`✅ Updated client stats after status change for invoice ${invoice.invoiceNumber}`);
    }
  } catch (error) {
    console.error('Error updating client stats:', error);
  }

  const updatedInvoice = await Invoice.findById(id)
    .populate('client', 'name companyName email')
    .populate('project', 'title projectId');

  return res
    .status(200)
    .json(new ApiResponse(200, updatedInvoice, "Invoice status updated successfully"));
});

// Mark invoice as overdue
const markAsOverdue = asynchandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid invoice ID");
  }

  const invoice = await Invoice.findByIdAndUpdate(
    id,
    { 
      status: 'overdue'
    },
    { new: true }
  );

  if (!invoice) {
    throw new ApiError(404, "Invoice not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, invoice, "Invoice marked as overdue"));
});

// Bulk update overdue invoices
const updateOverdueInvoices = asynchandler(async (req, res) => {
  try {
    const today = new Date();
    const overdueInvoices = await Invoice.find({
      dueDate: { $lt: today },
      status: { $in: ['sent'] },
      balanceDue: { $gt: 0 },
      isActive: true
    });

    let updatedCount = 0;
    
    for (const invoice of overdueInvoices) {
      invoice.status = 'overdue';
      await invoice.save();
      updatedCount++;
      
      // Update client stats for each overdue invoice
      try {
        await Client.updateClientStats(invoice.client);
      } catch (error) {
        console.error(`Error updating client stats for invoice ${invoice._id}:`, error);
      }
    }

    return res
      .status(200)
      .json(
        new ApiResponse(
          200, 
          { updatedCount, totalOverdue: overdueInvoices.length }, 
          "Overdue invoices updated successfully"
        )
      );
      
  } catch (error) {
    console.error('Error updating overdue invoices:', error);
    throw new ApiError(500, "Failed to update overdue invoices");
  }
});

// Delete invoice (soft delete)
const deleteInvoice = asynchandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid invoice ID");
  }

  const invoice = await Invoice.findById(id);
  if (!invoice) {
    throw new ApiError(404, "Invoice not found");
  }

  // Store client ID before soft delete
  const clientId = invoice.client;

  // Soft delete
  invoice.isActive = false;
  await invoice.save();

  // ✅ CRITICAL: Update client stats after deletion
  try {
    if (clientId) {
      await Client.updateClientStats(clientId);
      console.log(`✅ Updated client stats after deleting invoice ${invoice.invoiceNumber}`);
    }
  } catch (error) {
    console.error('Error updating client stats:', error);
  }

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Invoice deleted successfully"));
});

// Download invoice as PDF
const downloadInvoice = asynchandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid invoice ID");
  }

  const invoice = await Invoice.findById(id)
    .populate('client', 'name companyName email phone address')
    .populate('project', 'title projectId')
    .populate('createdBy', 'name email');

  if (!invoice) {
    throw new ApiError(404, "Invoice not found");
  }

  try {
    // Generate PDF
    const pdfBuffer = await generatePDF(invoice);
    
    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`);
    
    // Send the PDF
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new ApiError(500, 'Failed to generate PDF invoice');
  }
});

// Get invoice statistics
const getInvoiceStats = asynchandler(async (req, res) => {
  try {
    const stats = await Invoice.aggregate([
      {
        $match: { isActive: true }
      },
      {
        $facet: {
          totalInvoices: [{ $count: "count" }],
          byStatus: [
            { $group: { _id: "$status", count: { $sum: 1 } } }
          ],
          totalRevenue: [
            { $group: { _id: null, total: { $sum: "$total" } } }
          ],
          totalPaid: [
            { $group: { _id: null, total: { $sum: "$paidAmount" } } }
          ],
          totalOutstanding: [
            { $group: { _id: null, total: { $sum: "$balanceDue" } } }
          ],
          recentInvoices: [
            { $sort: { createdAt: -1 } },
            { $limit: 5 },
            {
              $project: {
                invoiceNumber: 1,
                clientName: 1,
                total: 1,
                status: 1,
                dueDate: 1
              }
            }
          ]
        }
      }
    ]);

    const result = {
      totalInvoices: stats[0]?.totalInvoices[0]?.count || 0,
      byStatus: stats[0]?.byStatus || [],
      totalRevenue: stats[0]?.totalRevenue[0]?.total || 0,
      totalPaid: stats[0]?.totalPaid[0]?.total || 0,
      totalOutstanding: stats[0]?.totalOutstanding[0]?.total || 0,
      recentInvoices: stats[0]?.recentInvoices || []
    };

    return res
      .status(200)
      .json(new ApiResponse(200, result, "Invoice statistics fetched successfully"));
      
  } catch (error) {
    console.error('Error fetching invoice stats:', error);
    throw new ApiError(500, "Failed to fetch invoice statistics");
  }
});

// NEW: Fix invoice inconsistencies
const fixInvoiceInconsistencies = asynchandler(async (req, res) => {
  try {
    const invoices = await Invoice.find({ isActive: true });
    let fixedCount = 0;
    
    for (const invoice of invoices) {
      let needsFix = false;
      
      // Fix 1: If status is 'paid' but paidAmount doesn't match total
      if (invoice.status === 'paid' && invoice.paidAmount !== invoice.total) {
        console.log(`❌ Invoice ${invoice.invoiceNumber}: status=paid but paidAmount=${invoice.paidAmount}, total=${invoice.total}`);
        invoice.paidAmount = invoice.total;
        invoice.balanceDue = 0;
        needsFix = true;
      }
      
      // Fix 2: Recalculate balanceDue if wrong
      const correctBalanceDue = Math.max(0, invoice.total - invoice.paidAmount);
      if (invoice.balanceDue !== correctBalanceDue) {
        console.log(`❌ Invoice ${invoice.invoiceNumber}: balanceDue=${invoice.balanceDue}, should be=${correctBalanceDue}`);
        invoice.balanceDue = correctBalanceDue;
        needsFix = true;
      }
      
      // Fix 3: Update status if fully paid
      if (invoice.balanceDue === 0 && invoice.total > 0 && invoice.status !== 'paid') {
        console.log(`⚠️  Invoice ${invoice.invoiceNumber}: status=${invoice.status}, changing to 'paid'`);
        invoice.status = 'paid';
        needsFix = true;
      }
      
      if (needsFix) {
        await invoice.save();
        fixedCount++;
        
        // Update client stats
        if (invoice.client) {
          await Client.updateClientStats(invoice.client);
        }
      }
    }
    
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { 
            totalInvoices: invoices.length,
            fixedInvoices: fixedCount,
            message: `Fixed ${fixedCount} out of ${invoices.length} invoices`
          },
          "Invoice inconsistencies fixed"
        )
      );
      
  } catch (error) {
    console.error('Error fixing invoice inconsistencies:', error);
    throw new ApiError(500, "Failed to fix invoice inconsistencies");
  }
});

export {
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
};