// src/controllers/clientDashboard.controller.js
import { asynchandler } from "../utils/asynchHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { Client } from "../models/client.model.js";
import { Project } from "../models/project.model.js";
import { Invoice } from "../models/invoice.model.js";

/**
 * @desc    Get client dashboard data
 * @route   GET /api/client/dashboard
 * @access  Private (Client only)
 */
const getClientDashboard = asynchandler(async (req, res) => {
  const user = req.user;
  
  // Check if user is a client
  if (user.role !== 4) {
    throw new ApiError(403, "Only clients can access the dashboard");
  }

  // Find client
  const client = await Client.findOne({ 
    $or: [
      { userId: user._id },
      { email: user.email }
    ]
  }).lean();

  if (!client) {
    throw new ApiError(404, "Client profile not found");
  }

  // Get all data in parallel for better performance
  const [
    projectSummary,
    projectsOverview,
    projectHealth,
    recentUpdates,
    invoiceSummary
  ] = await Promise.all([
    getProjectSummary(client._id),
    getProjectsOverview(client._id, req.query),
    getProjectHealthSnapshot(client._id),
    getRecentUpdates(client._id),
    getInvoiceSummary(client._id)
  ]);

  return res.status(200).json(
    new ApiResponse(200, {
      clientInfo: {
        name: client.name,
        companyName: client.companyName,
        email: client.email
      },
      projectSummary,
      projects: projectsOverview,
      projectHealth,
      recentUpdates,
      invoiceSummary,
      lastUpdated: new Date()
    }, "Dashboard data fetched successfully")
  );
});

// 🔸 A. Project Summary Cards Helper
async function getProjectSummary(clientId) {
  const totalProjects = await Project.countDocuments({ 
    client: clientId,
    isActive: true 
  });

  const activeProjects = await Project.countDocuments({ 
    client: clientId,
    status: { $in: ['planned', 'in-progress'] },
    isActive: true
  });

  const completedProjects = await Project.countDocuments({ 
    client: clientId,
    status: 'completed',
    isActive: true
  });

  const pendingInvoices = await Invoice.countDocuments({ 
    client: clientId,
    status: { $in: ['sent', 'overdue'] },
    isActive: true
  });

  return {
    totalProjects,
    activeProjects,
    completedProjects,
    pendingInvoices,
    activePercentage: totalProjects > 0 ? Math.round((activeProjects / totalProjects) * 100) : 0,
    completionRate: totalProjects > 0 ? Math.round((completedProjects / totalProjects) * 100) : 0
  };
}

// 🔸 B. My Projects Overview Helper
async function getProjectsOverview(clientId, queryParams = {}) {
  const {
    page = 1,
    limit = 10,
    status = '',
    search = '',
    sort = '-updatedAt'
  } = queryParams;

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  // Build filter
  const filter = { 
    client: clientId,
    isActive: true 
  };

  // Add status filter
  if (status && status !== 'all') {
    if (['planned', 'in-progress', 'completed', 'on-hold', 'delayed'].includes(status)) {
      filter.status = status === 'delayed' ? 'in-progress' : status;
    }
  }

  // Add search filter
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { projectId: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  // Get total count
  const total = await Project.countDocuments(filter);

  // Get projects with manager info
  const projects = await Project.find(filter)
    .populate('manager', 'username email avatar')
    .select('title projectId status progress deadline manager startDate updatedAt notes milestones')
    .sort(sort)
    .skip(skip)
    .limit(limitNum)
    .lean();

  // Enhance projects with calculated fields
  const enhancedProjects = projects.map(project => {
    const today = new Date();
    const deadline = new Date(project.deadline);
    const diffTime = deadline.getTime() - today.getTime();
    const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Auto-detect delayed status for UI
    let displayStatus = project.status;
    let isDelayed = false;
    
    if (daysLeft < 0 && project.status === 'in-progress') {
      displayStatus = 'delayed';
      isDelayed = true;
    }

    // Calculate timeline
    const start = new Date(project.startDate);
    const duration = Math.ceil((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    // Get manager info
    const managerName = project.manager?.username || 'Unassigned';
    const managerAvatar = project.manager?.avatar;

    // Calculate progress from milestones if available
    let progress = project.progress || 0;
    if (project.milestones && project.milestones.length > 0) {
      const completedMilestones = project.milestones.filter(m => m.status === 'completed').length;
      progress = Math.round((completedMilestones / project.milestones.length) * 100);
    }

    return {
      ...project,
      displayStatus,
      daysLeft: Math.abs(daysLeft),
      isDelayed,
      isOverdue: daysLeft < 0,
      duration,
      progress,
      managerName,
      managerAvatar,
      lastUpdated: project.updatedAt
    };
  });

  return {
    projects: enhancedProjects,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum)
    }
  };
}

// 🔸 C. Project Health Snapshot Helper
async function getProjectHealthSnapshot(clientId) {
  const allProjects = await Project.find({ 
    client: clientId,
    isActive: true 
  })
  .select('title status progress deadline manager milestones notes updatedAt startDate')
  .populate('manager', 'username')
  .lean();

  const today = new Date();
  
  // Calculate on-track projects
  const onTrackProjects = allProjects.filter(project => {
    if (project.status === 'completed') return true;
    if (project.status !== 'in-progress') return false;
    
    const deadline = new Date(project.deadline);
    const daysLeft = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const expectedProgress = calculateExpectedProgress(project.startDate, project.deadline, today);
    
    return project.progress >= expectedProgress - 10 && daysLeft >= 0;
  });

  // Calculate delayed projects
  const delayedProjects = allProjects.filter(project => {
    if (project.status === 'completed') return false;
    
    const deadline = new Date(project.deadline);
    const daysLeft = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysLeft < 0 && project.status === 'in-progress') {
      return true;
    }
    
    const expectedProgress = calculateExpectedProgress(project.startDate, project.deadline, today);
    return project.progress < expectedProgress - 10;
  });

  // Recently updated projects (within last 7 days)
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const recentlyUpdatedProjects = allProjects.filter(project => 
    new Date(project.updatedAt) > weekAgo
  ).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  // Prepare details for UI
  const onTrackDetails = onTrackProjects.slice(0, 3).map(p => ({
    name: p.title,
    progress: p.progress || 0,
    manager: p.manager?.username || 'Unassigned',
    deadline: p.deadline
  }));

  const delayedDetails = delayedProjects.slice(0, 3).map(p => {
    const delayReason = extractDelayReason(p.notes);
    const deadline = new Date(p.deadline);
    const daysOverdue = Math.ceil((today.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      name: p.title,
      progress: p.progress || 0,
      reason: delayReason,
      manager: p.manager?.username || 'Unassigned',
      daysOverdue: daysOverdue > 0 ? daysOverdue : 0,
      deadline: p.deadline
    };
  });

  const recentlyUpdatedDetails = recentlyUpdatedProjects.slice(0, 3).map(p => ({
    name: p.title,
    lastUpdate: p.updatedAt,
    updateType: getLastUpdateType(p.notes),
    status: p.status
  }));

  return {
    onTrackProjects: onTrackProjects.length,
    delayedProjects: delayedProjects.length,
    recentlyUpdatedProjects: recentlyUpdatedProjects.length,
    details: {
      onTrack: onTrackDetails,
      delayed: delayedDetails,
      recentlyUpdated: recentlyUpdatedDetails
    },
    percentages: {
      onTrack: allProjects.length > 0 ? Math.round((onTrackProjects.length / allProjects.length) * 100) : 0,
      delayed: allProjects.length > 0 ? Math.round((delayedProjects.length / allProjects.length) * 100) : 0
    }
  };
}

// Helper function to calculate expected progress
function calculateExpectedProgress(startDate, deadline, today) {
  const start = new Date(startDate);
  const end = new Date(deadline);
  const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  const daysPassed = Math.max(0, Math.ceil((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  
  if (daysPassed >= totalDays) return 100;
  return Math.min(100, Math.round((daysPassed / totalDays) * 100));
}

// Helper to extract delay reason from notes
function extractDelayReason(notes) {
  if (!notes || !Array.isArray(notes) || notes.length === 0) {
    return 'No reason provided';
  }
  
  // Look for delay-related notes (most recent first)
  const sortedNotes = [...notes].sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));
  
  for (const note of sortedNotes) {
    const content = note.content?.toLowerCase() || '';
    if (content.includes('delay') || content.includes('late') || content.includes('behind schedule')) {
      return note.content.length > 100 ? note.content.substring(0, 100) + '...' : note.content;
    }
  }
  
  return 'No reason provided';
}

// Helper to get last update type
function getLastUpdateType(notes) {
  if (!notes || !Array.isArray(notes) || notes.length === 0) {
    return 'Status update';
  }
  
  const lastNote = notes[notes.length - 1];
  const content = lastNote.content?.toLowerCase() || '';
  
  if (content.includes('milestone')) return 'Milestone update';
  if (content.includes('completed')) return 'Completion';
  if (content.includes('delay')) return 'Delay notice';
  if (content.includes('progress')) return 'Progress update';
  if (content.includes('meeting')) return 'Meeting update';
  if (content.includes('deliverable')) return 'Deliverable update';
  
  return 'General update';
}

// 🔸 D. Recent Updates Helper
async function getRecentUpdates(clientId) {
  const allUpdates = [];

  // Get project updates (last 30 days)
  const monthAgo = new Date();
  monthAgo.setDate(monthAgo.getDate() - 30);

  const projects = await Project.find({
    client: clientId,
    isActive: true,
    updatedAt: { $gte: monthAgo }
  })
  .select('title status notes updatedAt')
  .populate('notes.addedBy', 'name role avatar')
  .sort('-updatedAt')
  .limit(10)
  .lean();

  // Process project notes
  projects.forEach(project => {
    if (project.notes && Array.isArray(project.notes)) {
      // Sort notes by date (newest first)
      const sortedNotes = [...project.notes].sort((a, b) => 
        new Date(b.addedAt) - new Date(a.addedAt)
      );
      
      // Take only recent notes
      sortedNotes.slice(0, 3).forEach(note => {
        allUpdates.push({
          id: note._id || Date.now().toString(),
          type: 'project_update',
          projectId: project._id,
          projectName: project.title,
          content: note.content,
          addedBy: note.addedBy,
          addedAt: note.addedAt,
          icon: getUpdateIcon('project_update'),
          color: getUpdateColor('project_update')
        });
      });
    }

    // Add project status changes
    allUpdates.push({
      id: project._id + '_status',
      type: 'project_status',
      projectId: project._id,
      projectName: project.title,
      content: `Project status updated to: ${project.status}`,
      addedAt: project.updatedAt,
      icon: getUpdateIcon('project_status'),
      color: getUpdateColor('project_status')
    });
  });

  // Get invoice updates
  const invoices = await Invoice.find({
    client: clientId,
    isActive: true,
    updatedAt: { $gte: monthAgo }
  })
  .select('invoiceNumber status total paymentHistory notes updatedAt clientName')
  .sort('-updatedAt')
  .limit(5)
  .lean();

  invoices.forEach(invoice => {
    // Payment history updates
    if (invoice.paymentHistory && Array.isArray(invoice.paymentHistory)) {
      invoice.paymentHistory.slice(0, 2).forEach(payment => {
        allUpdates.push({
          id: payment._id || `payment_${Date.now()}`,
          type: 'payment_received',
          invoiceNumber: invoice.invoiceNumber,
          content: `Payment received: ${formatCurrency(payment.amount)} via ${payment.method}`,
          addedAt: payment.date,
          icon: getUpdateIcon('payment_received'),
          color: getUpdateColor('payment_received')
        });
      });
    }

    // Invoice status updates
    allUpdates.push({
      id: invoice._id + '_status',
      type: 'invoice_status',
      invoiceNumber: invoice.invoiceNumber,
      content: `Invoice ${invoice.invoiceNumber} status: ${invoice.status}`,
      addedAt: invoice.updatedAt,
      icon: getUpdateIcon('invoice_status'),
      color: getUpdateColor('invoice_status')
    });

    // Overdue invoices
    if (invoice.status === 'overdue') {
      allUpdates.push({
        id: invoice._id + '_overdue',
        type: 'invoice_overdue',
        invoiceNumber: invoice.invoiceNumber,
        content: `Invoice ${invoice.invoiceNumber} is overdue. Amount due: ${formatCurrency(invoice.balanceDue)}`,
        addedAt: invoice.updatedAt,
        icon: getUpdateIcon('invoice_overdue'),
        color: getUpdateColor('invoice_overdue')
      });
    }
  });

  // Sort all updates by date (newest first) and limit to 15
  allUpdates.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));
  
  const recentUpdates = allUpdates.slice(0, 15).map(update => ({
    ...update,
    timeAgo: getTimeAgo(update.addedAt),
    formattedDate: formatDate(update.addedAt)
  }));

  return recentUpdates;
}

// Helper to format currency
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

// Helper to format date
function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

// Helper to get time ago string
function getTimeAgo(date) {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now - past;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  
  return formatDate(date);
}

// Helper to get update icon
function getUpdateIcon(type) {
  const icons = {
    'project_update': 'mingcute:projector-line',
    'project_status': 'mingcute:flag-line',
    'payment_received': 'mingcute:dollar-circle-line',
    'invoice_status': 'mingcute:receipt-line',
    'invoice_overdue': 'mingcute:alarm-line',
    'milestone_completed': 'mingcute:check-circle-line',
    'delay_notice': 'mingcute:time-line'
  };
  return icons[type] || 'mingcute:activity-line';
}

// Helper to get update color
function getUpdateColor(type) {
  const colors = {
    'project_update': 'info',
    'project_status': 'primary',
    'payment_received': 'success',
    'invoice_status': 'warning',
    'invoice_overdue': 'error',
    'milestone_completed': 'success',
    'delay_notice': 'warning'
  };
  return colors[type] || 'default';
}

// 🔸 E. Invoice Summary Helper
async function getInvoiceSummary(clientId) {
  // Get all invoices for client
  const invoices = await Invoice.find({
    client: clientId,
    isActive: true
  })
  .select('invoiceNumber invoiceDate dueDate total status paidAmount balanceDue clientName projectName')
  .sort('-invoiceDate')
  .lean();

  // Calculate statistics
  const totalInvoices = invoices.length;
  const paidInvoices = invoices.filter(inv => inv.status === 'paid').length;
  const pendingInvoices = invoices.filter(inv => inv.status === 'sent').length;
  const overdueInvoices = invoices.filter(inv => inv.status === 'overdue').length;

  // Calculate amounts
  const totalAmount = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
  const paidAmount = invoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
  const pendingAmount = invoices.reduce((sum, inv) => 
    inv.status === 'sent' || inv.status === 'overdue' ? sum + (inv.balanceDue || 0) : sum, 0);
  const overdueAmount = invoices.reduce((sum, inv) => 
    inv.status === 'overdue' ? sum + (inv.balanceDue || 0) : sum, 0);

  // Get recent invoices (last 5)
  const recentInvoices = invoices.slice(0, 5).map(invoice => {
    const today = new Date();
    const dueDate = new Date(invoice.dueDate);
    const diffTime = dueDate.getTime() - today.getTime();
    const daysUntilDue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return {
      ...invoice,
      daysUntilDue,
      isOverdue: daysUntilDue < 0 && invoice.status !== 'paid',
      formattedDate: new Date(invoice.invoiceDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }),
      dueDateFormatted: new Date(invoice.dueDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    };
  });

  return {
    totalInvoices,
    paidInvoices,
    pendingInvoices,
    overdueInvoices,
    amounts: {
      total: totalAmount,
      paid: paidAmount,
      pending: pendingAmount,
      overdue: overdueAmount
    },
    percentages: {
      paid: totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0,
      pending: totalAmount > 0 ? Math.round((pendingAmount / totalAmount) * 100) : 0,
      overdue: totalAmount > 0 ? Math.round((overdueAmount / totalAmount) * 100) : 0
    },
    recentInvoices
  };
}

export { getClientDashboard };