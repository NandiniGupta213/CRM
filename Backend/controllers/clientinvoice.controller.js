import { asynchandler } from "../utils/asynchHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { Invoice } from "../models/invoice.model.js";
import { Client } from "../models/client.model.js";

/**
 * @desc    Get invoices for logged-in client
 * @route   GET /api/client/my-invoices
 * @access  Private (Client only)
 */
const getMyInvoices = asynchandler(async (req, res) => {
  const user = req.user;
  
  // Check if user is a client
  if (user.role !== 4) {
    throw new ApiError(403, "Only clients can view invoices");
  }

  // Find client by userId or email
  const client = await Client.findOne({ 
    $or: [
      { userId: user._id },
      { email: user.email }
    ]
  });

  if (!client) {
    return res.status(200).json(
      new ApiResponse(200, { invoices: [] }, "No client profile found")
    );
  }

  // Get query params
  const { 
    page = 1, 
    limit = 10, 
    search = '', 
    status = '',
    sort = '-createdAt' 
  } = req.query;

  // Build filter
  const filter = { 
    client: client._id,
    isActive: true 
  };

  if (status && status !== 'all') {
    if (['draft', 'sent', 'paid', 'overdue'].includes(status)) {
      filter.status = status;
    }
  }

  if (search) {
    filter.$or = [
      { invoiceNumber: { $regex: search, $options: 'i' } },
      { projectName: { $regex: search, $options: 'i' } },
      { clientName: { $regex: search, $options: 'i' } }
    ];
  }

  // Get total count
  const total = await Invoice.countDocuments(filter);

  // Get invoices
  const invoices = await Invoice.find(filter)
    .populate('project', 'projectId title')
    .select('invoiceNumber invoiceDate dueDate status projectName total paidAmount balanceDue')
    .sort(sort)
    .skip((parseInt(page) - 1) * parseInt(limit))
    .limit(parseInt(limit))
    .lean();

  // Format invoices for frontend
  const formattedInvoices = invoices.map(invoice => ({
    _id: invoice._id,
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate: invoice.invoiceDate,
    dueDate: invoice.dueDate,
    status: invoice.status,
    projectName: invoice.projectName,
    projectId: invoice.project?.projectId,
    amount: invoice.total,
    paid: invoice.paidAmount,
    due: invoice.balanceDue,
    daysUntilDue: invoice.daysUntilDue || 0
  }));

  return res.status(200).json(
    new ApiResponse(200, {
      invoices: formattedInvoices,
      client: {
        name: client.name,
        companyName: client.companyName
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    }, "Invoices fetched successfully")
  );
});

/**
 * @desc    Get single invoice for logged-in client
 * @route   GET /api/client/my-invoices/:invoiceId
 * @access  Private (Client only)
 */
const getInvoiceDetails = asynchandler(async (req, res) => {
  const user = req.user;
  const { invoiceId } = req.params;

  // Check if user is client
  if (user.role !== 4) {
    throw new ApiError(403, "Only clients can view invoice details");
  }

  // Find client
  const client = await Client.findOne({ 
    $or: [
      { userId: user._id },
      { email: user.email }
    ]
  });

  if (!client) {
    throw new ApiError(404, "Client profile not found");
  }

  // Get invoice - check if it belongs to this client
  const invoice = await Invoice.findOne({
    _id: invoiceId,
    client: client._id,
    isActive: true
  })
  .populate('project', 'projectId title description')
  .populate('client', 'name companyName email phone address city state postalCode')
  .lean();

  if (!invoice) {
    throw new ApiError(404, "Invoice not found or not accessible");
  }

  // Calculate days left/overdue
  const today = new Date();
  const dueDate = new Date(invoice.dueDate);
  const diffTime = dueDate.getTime() - today.getTime();
  const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const isOverdue = daysLeft < 0 && invoice.status !== 'paid';

  // Format dates
  const formatDate = (date) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  // Calculate payment percentages
  const paidPercentage = invoice.total > 0 
    ? Math.round((invoice.paidAmount / invoice.total) * 100)
    : 0;

  const invoiceDetails = {
    ...invoice,
    daysLeft: Math.abs(daysLeft),
    isOverdue,
    isFullyPaid: invoice.status === 'paid',
    paidPercentage,
    formattedDates: {
      invoiceDate: formatDate(invoice.invoiceDate),
      dueDate: formatDate(invoice.dueDate)
    },
    // Add payment summary
    paymentSummary: {
      subtotal: invoice.subtotal || 0,
      discount: invoice.discount || 0,
      tax: invoice.taxAmount || 0,
      total: invoice.total || 0,
      paid: invoice.paidAmount || 0,
      balance: invoice.balanceDue || 0
    }
  };

  return res.status(200).json(
    new ApiResponse(200, { invoice: invoiceDetails }, "Invoice details fetched successfully")
  );
});

/**
 * @desc    Get client invoice statistics
 * @route   GET /api/client/my-invoices/stats
 * @access  Private (Client only)
 */
const getInvoiceStats = asynchandler(async (req, res) => {
  const user = req.user;

  // Check if user is client
  if (user.role !== 4) {
    throw new ApiError(403, "Only clients can view invoice statistics");
  }

  // Find client
  const client = await Client.findOne({ 
    $or: [
      { userId: user._id },
      { email: user.email }
    ]
  });

  if (!client) {
    return res.status(200).json(
      new ApiResponse(200, {
        totalInvoices: 0,
        paidInvoices: 0,
        pendingInvoices: 0,
        overdueInvoices: 0,
        totalAmount: 0,
        paidAmount: 0,
        pendingAmount: 0
      }, "No client profile found")
    );
  }

  // Get all invoices for this client
  const invoices = await Invoice.find({
    client: client._id,
    isActive: true
  });

  // Calculate statistics
  const totalInvoices = invoices.length;
  const paidInvoices = invoices.filter(inv => inv.status === 'paid').length;
  const pendingInvoices = invoices.filter(inv => inv.status === 'sent').length;
  const overdueInvoices = invoices.filter(inv => inv.status === 'overdue').length;

  // Calculate amounts
  const totalAmount = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
  const paidAmount = invoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
  const pendingAmount = totalAmount - paidAmount;

  // Calculate overdue amount
  const overdueAmount = invoices
    .filter(inv => inv.status === 'overdue')
    .reduce((sum, inv) => sum + (inv.balanceDue || 0), 0);

  return res.status(200).json(
    new ApiResponse(200, {
      totalInvoices,
      paidInvoices,
      pendingInvoices,
      overdueInvoices,
      totalAmount,
      paidAmount,
      pendingAmount,
      overdueAmount,
      paidPercentage: totalAmount > 0 
        ? Math.round((paidAmount / totalAmount) * 100)
        : 0
    }, "Invoice statistics fetched successfully")
  );
});

export { getMyInvoices, getInvoiceDetails, getInvoiceStats };