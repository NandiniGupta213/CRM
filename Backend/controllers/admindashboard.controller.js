// backend/controllers/dashboardController.js
import { asynchandler } from "../utils/asynchHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { Project } from "../models/project.model.js";
import { Client } from "../models/client.model.js";
import { Invoice } from "../models/invoice.model.js";
import { Employee } from "../models/employee.model.js";
import { ProjectTeam } from "../models/projectteam.model.js";
import mongoose from "mongoose";



const getNotifications = asynchandler(async (req, res) => {
  try {
    console.log('=== Fetching Notifications ===');
    const notifications = [];
    const today = new Date();

    // 1. SIMPLE: Get ALL overdue invoices (status = 'overdue')
    const overdueInvoices = await Invoice.find({
      status: 'overdue',
      isActive: true,
      balanceDue: { $gt: 0 }
    })
    .populate('client', 'name')
    .populate('project', 'title')
    .select('invoiceNumber dueDate balanceDue client project')
    .lean();

    console.log(`Found ${overdueInvoices.length} overdue invoices`);
    
    overdueInvoices.forEach(invoice => {
      notifications.push({
        id: invoice._id,
        type: 'invoice_overdue',
        title: 'Overdue Invoice',
        message: `Invoice ${invoice.invoiceNumber} is overdue`,
        priority: 'high',
        timestamp: new Date(),
        data: {
          invoiceId: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          clientName: invoice.client?.name || 'Unknown Client',
          projectName: invoice.project?.title || 'No Project',
          amountDue: invoice.balanceDue,
          dueDate: invoice.dueDate
        }
      });
    });

    // 2. SIMPLE: Get delayed projects (past deadline and still in-progress)
    const delayedProjects = await Project.find({
      status: 'in-progress',
      deadline: { $lt: today },
      isActive: true
    })
    .populate('manager', 'name')
    .select('title deadline manager progress')
    .lean();

    console.log(`Found ${delayedProjects.length} delayed projects`);

    delayedProjects.forEach(project => {
      const deadline = new Date(project.deadline);
      const diffTime = today - deadline;
      const daysDelayed = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      notifications.push({
        id: project._id,
        type: 'project_delayed',
        title: 'Project Delayed',
        message: `Project "${project.title}" is ${daysDelayed} day(s) behind schedule`,
        priority: 'high',
        timestamp: new Date(),
        data: {
          projectId: project._id,
          projectTitle: project.title,
          managerName: project.manager?.name || 'Unassigned',
          deadline: project.deadline,
          daysDelayed: daysDelayed,
          progress: project.progress || 0
        }
      });
    });

    // 3. SIMPLE: Get projects with deadlines in next 3-5 days
    // Calculate date 5 days from now
    const fiveDaysFromNow = new Date(today);
    fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);
    
    const soonDeadlineProjects = await Project.find({
      status: { $in: ['in-progress', 'planned'] },
      isActive: true,
      deadline: { 
        $gte: today,
        $lte: fiveDaysFromNow
      }
    })
    .populate('manager', 'name')
    .select('title deadline manager progress')
    .lean();

    console.log(`Found ${soonDeadlineProjects.length} projects with deadlines soon`);

    soonDeadlineProjects.forEach(project => {
      const deadline = new Date(project.deadline);
      const diffTime = deadline - today;
      const daysUntilDeadline = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      notifications.push({
        id: project._id,
        type: 'project_deadline_soon',
        title: 'Project Deadline Approaching',
        message: `Project "${project.title}" deadline in ${daysUntilDeadline} day(s)`,
        priority: daysUntilDeadline <= 2 ? 'medium' : 'low',
        timestamp: new Date(),
        data: {
          projectId: project._id,
          projectTitle: project.title,
          managerName: project.manager?.name || 'Unassigned',
          deadline: project.deadline,
          daysUntilDeadline: daysUntilDeadline,
          progress: project.progress || 0
        }
      });
    });

    // Sort notifications: High priority first, then by timestamp
    notifications.sort((a, b) => {
      const priorityOrder = { high: 1, medium: 2, low: 3 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return new Date(b.timestamp) - new Date(a.timestamp);
    });

    const totalNotifications = notifications.length;
    const highPriorityCount = notifications.filter(n => n.priority === 'high').length;
    const mediumPriorityCount = notifications.filter(n => n.priority === 'medium').length;

    console.log(`Total notifications: ${totalNotifications} (High: ${highPriorityCount}, Medium: ${mediumPriorityCount})`);

    return res.status(200).json(new ApiResponse(200, {
      total: totalNotifications,
      highPriority: highPriorityCount,
      mediumPriority: mediumPriorityCount,
      notifications: notifications
    }, "Notifications fetched successfully"));

  } catch (error) {
    console.error('Error fetching notifications:', error);
    throw new ApiError(500, "Failed to fetch notifications");
  }
});


const calculateDaysSinceUpdate = (date) => {
  if (!date) return 999;
  const now = new Date();
  const lastUpdate = new Date(date);
  const diffTime = Math.abs(now - lastUpdate);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const getDashboardSummary = asynchandler(async (req, res) => {
  try {
    console.log('=== Starting Dashboard Summary ===');
    
    // 1. Get total clients
    const totalClients = await Client.countDocuments();
    console.log('Total Clients:', totalClients);
    
    // 2. Get project stats - Check actual status values in DB
    // First, check what status values exist
    const statusValues = await Project.distinct('status');
    console.log('Available status values:', statusValues);
    
    // Count active projects (in-progress and planned)
    const activeProjects = await Project.countDocuments({ 
      status: { $in: ['in-progress', 'planned'] }
    });
    console.log('Active Projects (in-progress + planned):', activeProjects);
    
    // Count only in-progress
    const inProgressCount = await Project.countDocuments({ status: 'in-progress' });
    console.log('In-progress only:', inProgressCount);
    
    // Count only planned
    const plannedCount = await Project.countDocuments({ status: 'planned' });
    console.log('Planned only:', plannedCount);
    
    // 3. Get delayed projects (in-progress with past deadline)
    const delayedProjects = await Project.aggregate([
      {
        $match: {
          status: 'in-progress',
          deadline: { $lt: new Date() }
        }
      },
      {
        $count: "count"
      }
    ]);
    
    const delayedCount = delayedProjects[0]?.count || 0;
    console.log('Delayed Projects:', delayedCount);
    
    // 4. Get all projects for debugging
    const allProjects = await Project.find({}, 'title status progress deadline').lean();
    console.log('All projects in database:');
    allProjects.forEach(p => {
      console.log(`- ${p.title}: status="${p.status}", progress=${p.progress}, deadline=${p.deadline}`);
    });

   // 5. Get pending invoices - Fixed logic
    const pendingInvoices = await Invoice.countDocuments({
      status: { $in: ['draft', 'sent', 'overdue'] },
      balanceDue: { $gt: 0 }
    });

    // 6. Get financial stats
    const financialStats = await Invoice.aggregate([
      {
        $match: { isActive: true }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$total" },
          pendingRevenue: { 
            $sum: {
              $cond: [
                {
                  $and: [
                    { $in: ["$status", ["draft", "sent", "overdue"]] },
                    { $gt: ["$balanceDue", 0] }
                  ]
                },
                "$balanceDue",
                0
              ]
            }
          },
          paidRevenue: { 
            $sum: {
              $cond: [
                { $eq: ["$status", "paid"] },
                "$total",
                0
              ]
            }
          }
        }
      }
    ]);

    
    // 7. Get active projects for chart
    const chartProjects = await Project.find({ 
      status: { $in: ['in-progress', 'planned'] },
      isActive: true
    })
    .select('title progress deadline status client')
    .populate('client', 'name')
    .lean();
    
    console.log('Projects found for chart:', chartProjects.length);
    chartProjects.forEach(p => {
      console.log(`Chart project: ${p.title}, status: ${p.status}, progress: ${p.progress}`);
    });
    
    // Process for chart
    const processedProjects = chartProjects.map(project => {
      const today = new Date();
      const deadline = new Date(project.deadline);
      const isDelayed = project.status === 'in-progress' && deadline < today;
      
      return {
        _id: project._id,
        projectName: project.title || 'Unnamed Project',
        progress: project.progress || 0,
        deadline: project.deadline,
        status: project.status,
        delayFlag: isDelayed ? 'Delayed' : 'On Schedule',
        clientName: project.client ? project.client.name : 'No Client'
      };
    });
    
    // Sort by progress
    processedProjects.sort((a, b) => a.progress - b.progress);
    
    // 8. Prepare final response
    const stats = {
      totalClients,
      activeProjects,
      delayedProjects: delayedCount,
      pendingInvoices,
      totalRevenue: financialStats[0]?.totalRevenue || 0,
      pendingRevenue: financialStats[0]?.pendingRevenue || 0,
      paidRevenue: financialStats[0]?.paidRevenue || 0,
      totalTasks: 0, // Placeholder since no milestones
      overdueTasks: 0, // Placeholder since no milestones
      projectsWithHealth: processedProjects
    };
    
    console.log('Final stats to return:', stats);
    console.log('=== End Dashboard Summary ===');
    
    return res
      .status(200)
      .json(new ApiResponse(200, stats, "Dashboard summary fetched successfully"));
      
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    console.error('Error details:', error.message);
    throw new ApiError(500, "Failed to fetch dashboard summary");
  }
});

const getProjectHealth = asynchandler(async (req, res) => {
  try {
    const projects = await Project.find({ isActive: true })
      .populate('client', 'username companyName')
      .populate('manager', 'username email')
      .select('title manager status progress deadline updatedAt')
      .sort('-updatedAt')
      .limit(10)
      .lean();
    
    const enhancedProjects = projects.map(project => {
      const daysSinceUpdate = calculateDaysSinceUpdate(project.updatedAt);
      const today = new Date();
      const deadline = new Date(project.deadline);
      const isDelayed = project.status === 'in-progress' && deadline < today;
      
      return {
        ...project,
        projectName: project.title,
        projectManager: project.manager?.username || 'Unassigned',
        delayFlag: isDelayed ? 'Delayed' : daysSinceUpdate > 7 ? 'No Recent Updates' : 'On Track',
        daysSinceUpdate
      };
    });
    
    // Calculate summary statistics
    const activeProjects = projects.length;
    const delayedProjects = enhancedProjects.filter(p => p.delayFlag === 'Delayed').length;
    
    return res
      .status(200)
      .json(new ApiResponse(200, {
        summary: {
          activeProjects,
          delayedProjects
        },
        projects: enhancedProjects
      }, "Project health data fetched successfully"));
      
  } catch (error) {
    console.error('Error fetching project health:', error);
    throw new ApiError(500, "Failed to fetch project health data");
  }
});

const getFinancialSnapshot = asynchandler(async (req, res) => {
  try {
    console.log('=== Starting Financial Snapshot ===');
    
    // Get total invoices
    const totalInvoices = await Invoice.countDocuments({ isActive: true });
    console.log('Total Invoices:', totalInvoices);
    
    // Get ALL invoices for debugging
    const allInvoices = await Invoice.find({ isActive: true })
      .select('invoiceNumber status total paidAmount balanceDue dueDate')
      .lean();
    
    console.log('All invoices:');
    allInvoices.forEach(inv => {
      console.log(`- ${inv.invoiceNumber}: status="${inv.status}", total=${inv.total}, paidAmount=${inv.paidAmount}, balanceDue=${inv.balanceDue}, dueDate=${inv.dueDate}`);
    });

    // Get financial breakdown - ADDED OVERDUE AMOUNT
    const financialData = await Invoice.aggregate([
      {
        $match: { isActive: true }
      },
      {
        $group: {
          _id: null,
          // Total invoice amounts
          totalAmount: { $sum: "$total" },
          
          // SUM of paidAmount field (direct from database)
          paidAmountSum: { $sum: "$paidAmount" },
          
          // SUM of balanceDue field (direct from database)
          balanceDueSum: { $sum: "$balanceDue" },
          
          // Calculate collected amount: total - balanceDue
          calculatedCollected: { 
            $sum: {
              $subtract: ["$total", "$balanceDue"]
            }
          },
          
          // ADD THIS: Overdue amount (only from overdue status invoices)
          overdueAmount: {
            $sum: {
              $cond: [
                { $eq: ["$status", "overdue"] },
                "$balanceDue",
                0
              ]
            }
          },
          
          // Count invoices by status for analysis
          draftCount: {
            $sum: { $cond: [{ $eq: ["$status", "draft"] }, 1, 0] }
          },
          sentCount: {
            $sum: { $cond: [{ $eq: ["$status", "sent"] }, 1, 0] }
          },
          overdueCount: {
            $sum: { $cond: [{ $eq: ["$status", "overdue"] }, 1, 0] }
          },
          paidCount: {
            $sum: { $cond: [{ $eq: ["$status", "paid"] }, 1, 0] }
          },
          
          // Track data inconsistencies
          paidWithBalanceCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$status", "paid"] },
                    { $gt: ["$balanceDue", 0] }
                  ]
                },
                1,
                0
              ]
            }
          },
          paidWithoutPaymentCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$status", "paid"] },
                    { $eq: ["$paidAmount", 0] },
                    { $gt: ["$balanceDue", 0] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]);
    
    const data = financialData[0] || {
      totalAmount: 0,
      paidAmountSum: 0,
      balanceDueSum: 0,
      calculatedCollected: 0,
      overdueAmount: 0, // ADD THIS DEFAULT
      draftCount: 0,
      sentCount: 0,
      overdueCount: 0,
      paidCount: 0,
      paidWithBalanceCount: 0,
      paidWithoutPaymentCount: 0
    };
    
    console.log('Financial Data Analysis:', data);
    console.log('Overdue Count:', data.overdueCount);
    console.log('Overdue Amount:', data.overdueAmount);
    
    // Determine the MOST RELIABLE collected amount
    // Use calculatedCollected as it's mathematically correct
    const collectedAmount = data.calculatedCollected;
    
    // Get recent invoices
    const recentInvoices = await Invoice.find({ isActive: true })
      .populate('client', 'name companyName')
      .populate('project', 'title')
      .select('invoiceNumber client project total status dueDate paidAmount balanceDue invoiceDate')
      .sort('-invoiceDate')
      .limit(5)
      .lean();
    
    // Enhance with payment status
    const enhancedRecentInvoices = recentInvoices.map(invoice => {
      const isFullyPaid = invoice.balanceDue === 0;
      const isPartiallyPaid = invoice.paidAmount > 0 && invoice.balanceDue > 0;
      const isOverdue = invoice.status === 'overdue' || 
                       (invoice.dueDate && new Date(invoice.dueDate) < new Date());
      const isDataInconsistent = invoice.status === 'paid' && invoice.balanceDue > 0;
      
      // Calculate actual payment percentage
      const paymentPercentage = invoice.total > 0 ? 
        ((invoice.total - invoice.balanceDue) / invoice.total) * 100 : 0;
      
      return {
        ...invoice,
        paymentStatus: isFullyPaid ? 'paid' : 
                      isPartiallyPaid ? 'partial' : 
                      isOverdue ? 'overdue' : 'pending',
        isDataInconsistent,
        paymentPercentage: Math.round(paymentPercentage),
        actualCollected: invoice.total - invoice.balanceDue
      };
    });
    
    // Prepare final result - ADD overdueAmount field
    const result = {
      totalAmount: data.totalAmount,
      
      // For frontend display - use these fields:
      paidAmount: collectedAmount, // Use calculated collected amount
      pendingAmount: data.balanceDueSum, // All outstanding balance
      overdueAmount: data.overdueAmount, // ADD THIS: Only overdue invoices
      
      // Original fields for debugging
      collectedAmount: collectedAmount,
      outstandingAmount: data.balanceDueSum,
      paidAmountSum: data.paidAmountSum, // From database (may be incorrect)
      
      // Analysis data
      invoiceCounts: {
        total: totalInvoices,
        draft: data.draftCount,
        sent: data.sentCount,
        overdue: data.overdueCount,
        paid: data.paidCount,
        inconsistent: data.paidWithBalanceCount,
        paidWithoutPayment: data.paidWithoutPaymentCount
      },
      
      // Recent invoices
      recentInvoices: enhancedRecentInvoices
    };
    
    // Add summary for frontend
    result.summary = {
      total: result.totalAmount,
      paid: result.paidAmount, // This is what your frontend should use
      pending: result.pendingAmount,
      overdue: result.overdueAmount, // ADD THIS
      collected: result.collectedAmount,
      hasInconsistentData: data.paidWithBalanceCount > 0,
      dataHealth: data.paidWithBalanceCount > 0 ? 'warning' : 'good'
    };
    
    console.log('Final Financial Snapshot Result:', JSON.stringify(result, null, 2));
    console.log('=== End Financial Snapshot ===');
    
    return res
      .status(200)
      .json(new ApiResponse(200, result, "Financial snapshot fetched successfully"));
      
  } catch (error) {
    console.error('Error fetching financial snapshot:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    throw new ApiError(500, "Failed to fetch financial snapshot");
  }
});

const getRisksAndAlerts = asynchandler(async (req, res) => {
  try {
    // Get delayed projects
    const delayedProjects = await Project.aggregate([
      {
        $match: {
          status: 'in-progress',
          isActive: true
        }
      },
      {
        $addFields: {
          daysPastDeadline: {
            $ceil: {
              $divide: [
                { $subtract: [new Date(), "$deadline"] },
                1000 * 60 * 60 * 24
              ]
            }
          }
        }
      },
      {
        $match: {
          daysPastDeadline: { $gt: 0 }
        }
      },
      {
        $project: {
          title: 1,
          deadline: 1,
          daysPastDeadline: 1,
          manager: 1
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'manager',
          foreignField: '_id',
          as: 'manager'
        }
      },
      {
        $unwind: {
          path: '$manager',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          projectName: '$title',
          managerName: '$manager.name',
          deadline: 1,
          daysPastDeadline: 1
        }
      }
    ]);
    
    // Get overdue tasks from project milestones
    const overdueTasks = await Project.aggregate([
      {
        $match: { isActive: true }
      },
      {
        $unwind: "$milestones"
      },
      {
        $match: {
          "milestones.status": { $ne: "completed" },
          "milestones.deadline": { $lt: new Date() }
        }
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          tasks: {
            $push: {
              projectName: "$title",
              taskName: "$milestones.name",
              deadline: "$milestones.deadline",
              projectId: "$_id"
            }
          }
        }
      }
    ]);
    
    // Get projects without recent updates (more than 7 days)
    const staleProjects = await Project.aggregate([
      {
        $match: {
          isActive: true,
          status: { $in: ['planned', 'in-progress'] }
        }
      },
      {
        $addFields: {
          daysSinceUpdate: calculateDaysSinceUpdate("$updatedAt")
        }
      },
      {
        $match: {
          daysSinceUpdate: { $gt: 7 }
        }
      },
      {
        $project: {
          projectName: "$title",
          lastUpdate: "$updatedAt",
          daysSinceUpdate: 1,
          manager: 1
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'manager',
          foreignField: '_id',
          as: 'manager'
        }
      },
      {
        $unwind: {
          path: '$manager',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          projectName: 1,
          managerName: '$manager.name',
          lastUpdate: 1,
          daysSinceUpdate: 1
        }
      }
    ]);
    
    const risks = {
      delayedProjectsCount: delayedProjects.length,
      delayedProjects: delayedProjects.slice(0, 5), // Return only top 5
      overdueTasksCount: overdueTasks[0]?.count || 0,
      overdueTasks: overdueTasks[0]?.tasks?.slice(0, 5) || [],
      staleProjectsCount: staleProjects.length,
      staleProjects: staleProjects.slice(0, 5) // Return only top 5
    };
    
    return res
      .status(200)
      .json(new ApiResponse(200, risks, "Risks and alerts fetched successfully"));
      
  } catch (error) {
    console.error('Error fetching risks and alerts:', error);
    throw new ApiError(500, "Failed to fetch risks and alerts");
  }
});

const getRecentActivities = asynchandler(async (req, res) => {
  try {
    // If you have an ActivityLog model, use it. Otherwise, create synthetic activities from other models.
    
    // Option 1: Use ActivityLog model if exists
    let activities = [];
    
    try {
      // Check if ActivityLog model exists
      const ActivityLog = mongoose.model('ActivityLog');
      activities = await ActivityLog.find({})
        .populate('user', 'name email')
        .sort('-createdAt')
        .limit(10)
        .lean();
    } catch (error) {
      // Option 2: Create synthetic activities from other models
      console.log('ActivityLog model not found, creating synthetic activities...');
      
      // Get recent project updates
      const projectActivities = await Project.find({ isActive: true })
        .populate('manager', 'name email')
        .select('title status updatedAt')
        .sort('-updatedAt')
        .limit(5)
        .lean();
      
      // Get recent invoices
      const invoiceActivities = await Invoice.find({ isActive: true })
        .populate('createdBy', 'name email')
        .select('invoiceNumber status createdAt')
        .sort('-createdAt')
        .limit(5)
        .lean();
      
      // Transform project updates into activities
      const projectActivityList = projectActivities.map(project => ({
        _id: project._id,
        type: 'project_updated',
        title: `Project ${project.status === 'completed' ? 'completed' : 'updated'}`,
        description: `Project "${project.title}" has been ${project.status === 'completed' ? 'completed' : 'updated'}`,
        user: project.manager,
        timestamp: project.updatedAt,
        metadata: {
          projectId: project._id,
          projectTitle: project.title,
          status: project.status
        }
      }));
      
      // Transform invoice updates into activities
      const invoiceActivityList = invoiceActivities.map(invoice => ({
        _id: invoice._id,
        type: invoice.status === 'paid' ? 'invoice_paid' : 'invoice_generated',
        title: invoice.status === 'paid' ? 'Invoice paid' : 'Invoice generated',
        description: `Invoice ${invoice.invoiceNumber} has been ${invoice.status === 'paid' ? 'paid' : 'generated'}`,
        user: invoice.createdBy,
        timestamp: invoice.createdAt,
        metadata: {
          invoiceNumber: invoice.invoiceNumber,
          status: invoice.status
        }
      }));
      
      // Combine and sort all activities
      activities = [...projectActivityList, ...invoiceActivityList]
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 10);
    }
    
    return res
      .status(200)
      .json(new ApiResponse(200, activities, "Recent activities fetched successfully"));
      
  } catch (error) {
    console.error('Error fetching recent activities:', error);
    throw new ApiError(500, "Failed to fetch recent activities");
  }
});

const getDashboardMetrics = asynchandler(async (req, res) => {
  try {
    // Get projects by status for pie chart
    const projectsByStatus = await Project.aggregate([
      {
        $match: { isActive: true }
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Get monthly revenue for line chart (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const monthlyRevenue = await Invoice.aggregate([
      {
        $match: {
          isActive: true,
          invoiceDate: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: "$invoiceDate" },
            month: { $month: "$invoiceDate" }
          },
          revenue: { $sum: "$total" },
          paid: { $sum: "$paidAmount" },
          invoices: { $sum: 1 }
        }
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1 }
      },
      {
        $project: {
          month: {
            $concat: [
              { $toString: "$_id.year" },
              "-",
              { $toString: { $cond: [{ $lt: ["$_id.month", 10] }, "0", ""] } },
              { $toString: "$_id.month" }
            ]
          },
          revenue: 1,
          paid: 1,
          invoices: 1
        }
      }
    ]);
    
    // Get client distribution by revenue
    const clientRevenue = await Invoice.aggregate([
      {
        $match: { isActive: true }
      },
      {
        $group: {
          _id: "$client",
          totalRevenue: { $sum: "$total" },
          paidRevenue: { $sum: "$paidAmount" },
          outstanding: { $sum: "$balanceDue" },
          invoiceCount: { $sum: 1 }
        }
      },
      {
        $sort: { totalRevenue: -1 }
      },
      {
        $limit: 10
      },
      {
        $lookup: {
          from: 'clients',
          localField: '_id',
          foreignField: '_id',
          as: 'client'
        }
      },
      {
        $unwind: "$client"
      },
      {
        $project: {
          clientName: "$client.companyName",
          clientId: "$client._id",
          totalRevenue: 1,
          paidRevenue: 1,
          outstanding: 1,
          invoiceCount: 1
        }
      }
    ]);
    
    // Get team performance metrics
    const teamPerformance = await Project.aggregate([
      {
        $match: {
          isActive: true,
          status: { $in: ['in-progress', 'completed'] }
        }
      },
      {
        $group: {
          _id: "$manager",
          totalProjects: { $sum: 1 },
          completedProjects: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] }
          },
          avgProgress: { $avg: "$progress" },
          delayedProjects: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$status", "in-progress"] },
                    { $lt: ["$deadline", new Date()] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $sort: { completedProjects: -1 }
      },
      {
        $limit: 10
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'manager'
        }
      },
      {
        $unwind: "$manager"
      },
      {
        $project: {
          managerName: "$manager.name",
          managerId: "$manager._id",
          totalProjects: 1,
          completedProjects: 1,
          avgProgress: { $round: ["$avgProgress", 2] },
          delayedProjects: 1,
          completionRate: {
            $cond: [
              { $gt: ["$totalProjects", 0] },
              { $round: [{ $multiply: [{ $divide: ["$completedProjects", "$totalProjects"] }, 100] }, 2] },
              0
            ]
          }
        }
      }
    ]);
    
    const metrics = {
      projectsByStatus,
      monthlyRevenue,
      clientRevenue,
      teamPerformance
    };
    
    return res
      .status(200)
      .json(new ApiResponse(200, metrics, "Dashboard metrics fetched successfully"));
      
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    throw new ApiError(500, "Failed to fetch dashboard metrics");
  }
});

const getQuickStats = asynchandler(async (req, res) => {
  try {
    // Get counts for various entities
    const [
      totalClients,
      totalProjects,
      totalInvoices,
      totalEmployees,
      activeProjects,
      pendingInvoices,
      overdueProjects,
      recentActivities
    ] = await Promise.all([
      Client.countDocuments(),
      Project.countDocuments({ isActive: true }),
      Invoice.countDocuments({ isActive: true }),
      Employee.countDocuments({ status: 'active' }),
      Project.countDocuments({ status: 'in-progress', isActive: true }),
      Invoice.countDocuments({ 
        status: { $in: ['draft', 'sent'] }, 
        balanceDue: { $gt: 0 },
        isActive: true 
      }),
      Project.countDocuments({ 
        status: 'in-progress', 
        deadline: { $lt: new Date() },
        isActive: true 
      }),
      // Get count of recent activities (last 7 days)
      (async () => {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        try {
          const ActivityLog = mongoose.model('ActivityLog');
          return await ActivityLog.countDocuments({ 
            createdAt: { $gte: sevenDaysAgo } 
          });
        } catch (error) {
          // Fallback to invoice count from last 7 days
          return await Invoice.countDocuments({ 
            createdAt: { $gte: sevenDaysAgo },
            isActive: true 
          });
        }
      })()
    ]);
    
    const stats = {
      totalClients,
      totalProjects,
      totalInvoices,
      totalEmployees,
      activeProjects,
      pendingInvoices,
      overdueProjects,
      recentActivities
    };
    
    return res
      .status(200)
      .json(new ApiResponse(200, stats, "Quick stats fetched successfully"));
      
  } catch (error) {
    console.error('Error fetching quick stats:', error);
    throw new ApiError(500, "Failed to fetch quick stats");
  }
});

const getOverdueSummary = asynchandler(async (req, res) => {
  try {
    // Overdue invoices
    const overdueInvoices = await Invoice.aggregate([
      {
        $match: {
          status: 'overdue',
          isActive: true,
          balanceDue: { $gt: 0 }
        }
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          totalAmount: { $sum: "$balanceDue" },
          avgOverdueDays: {
            $avg: {
              $ceil: {
                $divide: [
                  { $subtract: [new Date(), "$dueDate"] },
                  1000 * 60 * 60 * 24
                ]
              }
            }
          }
        }
      }
    ]);
    
    // Overdue projects
    const overdueProjects = await Project.aggregate([
      {
        $match: {
          status: 'in-progress',
          isActive: true,
          deadline: { $lt: new Date() }
        }
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          avgDelayDays: {
            $avg: {
              $ceil: {
                $divide: [
                  { $subtract: [new Date(), "$deadline"] },
                  1000 * 60 * 60 * 24
                ]
              }
            }
          }
        }
      }
    ]);
    
    // Overdue tasks from milestones
    const overdueTasks = await Project.aggregate([
      {
        $match: { isActive: true }
      },
      {
        $unwind: "$milestones"
      },
      {
        $match: {
          "milestones.status": { $ne: "completed" },
          "milestones.deadline": { $lt: new Date() }
        }
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          avgOverdueDays: {
            $avg: {
              $ceil: {
                $divide: [
                  { $subtract: [new Date(), "$milestones.deadline"] },
                  1000 * 60 * 60 * 24
                ]
              }
            }
          }
        }
      }
    ]);
    
    const summary = {
      invoices: overdueInvoices[0] || { count: 0, totalAmount: 0, avgOverdueDays: 0 },
      projects: overdueProjects[0] || { count: 0, avgDelayDays: 0 },
      tasks: overdueTasks[0] || { count: 0, avgOverdueDays: 0 }
    };
    
    return res
      .status(200)
      .json(new ApiResponse(200, summary, "Overdue summary fetched successfully"));
      
  } catch (error) {
    console.error('Error fetching overdue summary:', error);
    throw new ApiError(500, "Failed to fetch overdue summary");
  }
});

const getClientData = asynchandler(async (req, res) => {
  try {
    // Get client counts
    const totalClients = await Client.countDocuments();
    const activeClients = await Client.countDocuments({ status: 'active' });
    
    // Get recent clients with name, email, and company
    const recentClients = await Client.find({})
      .select('name email companyName status') // Select name, email, company
      .sort({ createdAt: -1 }) // Sort by newest first
      .limit(3) // Limit to 3 clients
      .lean(); // Convert to plain objects
    
    // Client data with counts and recent clients
    const clientData = {
      totalClients: totalClients,
      activeClients: activeClients,
      inactiveClients: totalClients - activeClients,
      recentClients: recentClients.map(client => ({
        name: client.name,
        email: client.email,
        company: client.companyName,
        status: client.status
      }))
    };
    
    return res
      .status(200)
      .json(new ApiResponse(200, clientData, "Client data fetched successfully"));
      
  } catch (error) {
    console.error('Error fetching client data:', error);
    throw new ApiError(500, "Failed to fetch client data");
  }
});

export {
  getDashboardSummary,
  getProjectHealth,
  getFinancialSnapshot,
  getRisksAndAlerts,
  getRecentActivities,
  getDashboardMetrics,
  getQuickStats,
  getOverdueSummary,
  getClientData,
  getNotifications
};