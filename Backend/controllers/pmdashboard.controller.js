import { Project } from '../models/project.model.js';
import { Task } from '../models/task.model.js';
import { ProjectTeam } from '../models/projectteam.model.js';
import { Employee } from '../models/employee.model.js';
import { DailyUpdate } from '../models/dailyupdate.model.js';
import { asynchandler } from "../utils/asynchHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import mongoose from 'mongoose';

// Add this function to your pmdashboard.controller.js
export const getPMNotifications = asynchandler(async (req, res) => {
  try {
    const pmId = req.user.id;
    const notifications = [];
    const today = new Date();

    // Get PM's projects
    const pmProjects = await Project.find({
      manager: pmId,
      isActive: true
    }).select('_id title deadline status');
    
    const projectIds = pmProjects.map(p => p._id);

    if (projectIds.length === 0) {
      return res.status(200).json(new ApiResponse(200, {
        total: 0,
        notifications: []
      }, "No projects found"));
    }

    // Get all tasks for PM's projects
    const allTasks = await Task.find({
      projectId: { $in: projectIds },
      isArchived: { $ne: true }
    })
    .populate('projectId', 'title')
    .populate('assignedTo.assigneeId', 'firstName lastName')
    .lean();

    // Process each task
    allTasks.forEach(task => {
      const taskDeadline = new Date(task.deadline);
      const daysLeft = Math.ceil((taskDeadline - today) / (1000 * 60 * 60 * 24));
      
      // 1. Blocked tasks
      if (['blocked', 'on-hold'].includes(task.status)) {
        const blockedSince = task.updatedAt || task.createdAt;
        const daysBlocked = blockedSince ? 
          Math.ceil((today - new Date(blockedSince)) / (1000 * 60 * 60 * 24)) : 1;
        
        notifications.push({
          id: task._id,
          type: 'task_blocked',
          title: 'Task Blocked',
          message: `Task "${task.title}" is blocked for ${daysBlocked} day(s)`,
          priority: 'high',
          timestamp: new Date(),
          data: {
            taskId: task._id,
            taskTitle: task.title,
            projectTitle: task.projectId?.title || 'Unknown',
            assignee: task.assignedTo?.[0]?.assigneeId?.name || 'Unassigned'
          }
        });
      }
      
      // 2. Overdue tasks
      else if (daysLeft < 0 && !['completed', 'cancelled'].includes(task.status)) {
        const daysOverdue = Math.abs(daysLeft);
        
        notifications.push({
          id: task._id,
          type: 'task_overdue',
          title: 'Task Overdue',
          message: `Task "${task.title}" is ${daysOverdue} day(s) overdue`,
          priority: daysOverdue > 7 ? 'critical' : 'high',
          timestamp: new Date(),
          data: {
            taskId: task._id,
            taskTitle: task.title,
            projectTitle: task.projectId?.title || 'Unknown',
            assignee: task.assignedTo?.[0]?.assigneeId?.name || 'Unassigned',
            daysOverdue: daysOverdue
          }
        });
      }
      
      // 3. Tasks due in 3-5 days
      else if (daysLeft >= 3 && daysLeft <= 5 && !['completed', 'cancelled'].includes(task.status)) {
        notifications.push({
          id: task._id,
          type: 'task_due_soon',
          title: 'Task Due Soon',
          message: `Task "${task.title}" due in ${daysLeft} day(s)`,
          priority: daysLeft <= 3 ? 'high' : 'medium',
          timestamp: new Date(),
          data: {
            taskId: task._id,
            taskTitle: task.title,
            projectTitle: task.projectId?.title || 'Unknown',
            assignee: task.assignedTo?.[0]?.assigneeId?.name || 'Unassigned',
            daysUntilDue: daysLeft
          }
        });
      }
    });

    // Process each project for project-level notifications
    pmProjects.forEach(project => {
      const projectDeadline = new Date(project.deadline);
      const daysLeft = Math.ceil((projectDeadline - today) / (1000 * 60 * 60 * 24));
      
      // 4. Projects due in 3-5 days
      if (daysLeft >= 3 && daysLeft <= 5 && project.status === 'in-progress') {
        notifications.push({
          id: project._id,
          type: 'project_deadline_soon',
          title: 'Project Deadline Approaching',
          message: `Project "${project.title}" deadline in ${daysLeft} day(s)`,
          priority: daysLeft <= 3 ? 'high' : 'medium',
          timestamp: new Date(),
          data: {
            projectId: project._id,
            projectTitle: project.title,
            daysUntilDeadline: daysLeft
          }
        });
      }
      
      // 5. Delayed projects
      else if (daysLeft < 0 && project.status === 'in-progress') {
        const daysDelayed = Math.abs(daysLeft);
        
        notifications.push({
          id: project._id,
          type: 'project_delayed',
          title: 'Project Delayed',
          message: `Project "${project.title}" is ${daysDelayed} day(s) behind schedule`,
          priority: daysDelayed > 7 ? 'critical' : 'high',
          timestamp: new Date(),
          data: {
            projectId: project._id,
            projectTitle: project.title,
            daysDelayed: daysDelayed
          }
        });
      }
    });

    // Simple sort by priority
    const priorityOrder = { critical: 1, high: 2, medium: 3, low: 4 };
    notifications.sort((a, b) => {
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return new Date(b.timestamp) - new Date(a.timestamp);
    });

    const total = notifications.length;

    return res.status(200).json(new ApiResponse(200, {
      total,
      notifications: notifications
    }, "PM notifications fetched successfully"));

  } catch (error) {
    console.error('Error fetching PM notifications:', error);
    throw new ApiError(500, "Failed to fetch PM notifications");
  }
});
// Get PM Dashboard Summary Cards
export const getPMSummary = async (req, res) => {
  try {
    const pmId = req.user.id; // Assuming user ID is stored in req.user from auth middleware
    const pmEmployee = await Employee.findOne({ userId: pmId });
    
    if (!pmEmployee) {
      return res.status(404).json({
        success: false,
        message: 'Project Manager not found'
      });
    }

    // Get current date for today's tasks
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get all projects where user is the manager
    const projects = await Project.find({ manager: pmId, isActive: true });

    // Calculate summary statistics
    const assignedProjects = projects.length;
    
    // Active projects (in-progress status)
    const activeProjects = projects.filter(p => p.status === 'in-progress').length;
    
    // Delayed projects (deadline passed and status is in-progress)
    const delayedProjects = projects.filter(p => {
      return p.status === 'in-progress' && new Date(p.deadline) < new Date();
    }).length;

    // Tasks due today across all projects
    const tasksDueToday = await Task.countDocuments({
      projectId: { $in: projects.map(p => p._id) },
      deadline: { $gte: today, $lt: tomorrow },
      status: { $nin: ['completed', 'cancelled'] }
    });

    res.status(200).json({
      success: true,
      data: {
        assignedProjects,
        activeProjects,
        delayedProjects,
        tasksDueToday
      }
    });
  } catch (error) {
    console.error('Error fetching PM summary:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard summary',
      error: error.message
    });
  }
};

// Get My Projects with details
export const getMyProjects = async (req, res) => {
  try {
    const pmId = req.user.id;
    const { status, search } = req.query;

    // Build filter
    const filter = { 
      manager: new mongoose.Types.ObjectId(pmId),
      isActive: true 
    };

    // Add status filter if provided
    if (status && ['planned', 'in-progress', 'completed', 'on-hold', 'cancelled'].includes(status)) {
      filter.status = status;
    }

    // Add search filter
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { projectId: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Get projects with populated client data
    const projects = await Project.find(filter)
      .populate('client', 'name companyName email phone')
      .populate('manager', 'name email phone')
      .select('title client deadline status progress projectId')
      .sort({ deadline: 1 })
      .lean();

    // Calculate days left and enhance project data
    const enhancedProjects = projects.map(project => {
      const deadline = new Date(project.deadline);
      const today = new Date();
      const daysLeft = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
      
      // Check if project is delayed (in-progress and deadline passed)
      let actualStatus = project.status;
      if (project.status === 'in-progress' && daysLeft < 0) {
        actualStatus = 'delayed';
      }

      return {
        ...project,
        daysLeft,
        actualStatus,
        clientName: project.client?.name || project.client?.companyName || 'No Client'
      };
    });

    res.status(200).json({
      success: true,
      data: enhancedProjects,
      count: enhancedProjects.length
    });
  } catch (error) {
    console.error('Error fetching PM projects:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching projects',
      error: error.message
    });
  }
};


// Get Task Execution Snapshot with Monthly Task Details
export const getTaskExecutionSnapshot = async (req, res) => {
  try {
    const pmId = req.user.id;
    
    // Get all projects managed by this PM
    const projects = await Project.find({ 
      manager: pmId,
      isActive: true 
    }).select('_id title projectId');

    const projectIds = projects.map(p => p._id);

    if (projectIds.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          pendingTasks: 0,
          blockedTasks: 0,
          overdueTasks: 0,
          monthlyTasks: [],
          trends: {
            labels: generateMonthLabels(),
            total: [],
            pending: [],
            inProgress: [],
            completed: []
          }
        }
      });
    }

    // Get current task counts - FIXED LOGIC
    const [pendingTasks, blockedTasks, overdueTasks] = await Promise.all([
      // Pending tasks = status 'todo'
      Task.countDocuments({
        projectId: { $in: projectIds },
        status: 'todo',
        isArchived: { $ne: true }
      }),

      // Blocked tasks = status 'on-hold'
      Task.countDocuments({
        projectId: { $in: projectIds },
        status: 'on-hold',
        isArchived: { $ne: true }
      }),

      // Overdue tasks = deadline passed AND status is NOT completed/cancelled
      Task.countDocuments({
        projectId: { $in: projectIds },
        deadline: { $lt: new Date() },
        status: { $nin: ['completed', 'cancelled'] },
        isArchived: { $ne: true }
      })
    ]);

    // Get ALL tasks (not just recent) with full details
    const allTasks = await Task.find({
      projectId: { $in: projectIds },
      isArchived: { $ne: true }
    })
    .select('_id taskId title description status priority deadline progress taskType createdAt updatedAt assignedTo')
    .populate('projectId', 'title projectId')
    .populate('assignedTo.assigneeId', 'firstName lastName email')
    .lean();

    console.log(`📊 Found ${allTasks.length} total tasks for PM`);

    // Group tasks by month created (Jan, Feb, Mar... Dec)
    const monthlyData = processTasksByMonth(allTasks);

    // Generate trend data for chart
    const trends = generateTrendDataFromMonthlyTasks(monthlyData);

    res.status(200).json({
      success: true,
      data: {
        pendingTasks,
        blockedTasks,
        overdueTasks,
        monthlyTasks: monthlyData, // All tasks grouped by month with details
        trends
      }
    });
  } catch (error) {
    console.error('Error fetching task snapshot:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching task execution snapshot',
      error: error.message
    });
  }
};

// Process all tasks by month
function processTasksByMonth(tasks) {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  
  // Initialize monthly data structure
  const monthlyData = {};
  months.forEach(month => {
    monthlyData[month] = {
      total: 0,
      tasks: [], // This will hold task details for hover
      statusBreakdown: {
        todo: 0,
        'in-progress': 0,
        review: 0,
        completed: 0,
        'on-hold': 0,
        cancelled: 0
      },
      priorityBreakdown: {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0
      }
    };
  });

  // Process each task
  tasks.forEach(task => {
    if (!task.createdAt) return;
    
    const taskDate = new Date(task.createdAt);
    const monthIndex = taskDate.getMonth(); // 0 = Jan, 1 = Feb, etc.
    const monthName = months[monthIndex];
    
    if (!monthlyData[monthName]) {
      monthlyData[monthName] = {
        total: 0,
        tasks: [],
        statusBreakdown: {
          todo: 0,
          'in-progress': 0,
          review: 0,
          completed: 0,
          'on-hold': 0,
          cancelled: 0
        },
        priorityBreakdown: {
          low: 0,
          medium: 0,
          high: 0,
          critical: 0
        }
      };
    }

    // Add task to monthly data
    monthlyData[monthName].total++;
    
    // Add task details for hover
    monthlyData[monthName].tasks.push({
      _id: task._id,
      taskId: task.taskId,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      deadline: task.deadline,
      progress: task.progress,
      taskType: task.taskType,
      createdAt: task.createdAt,
      assignedTo: task.assignedTo?.map(assignee => ({
        name: assignee.name || (assignee.assigneeId ? 
          `${assignee.assigneeId.firstName || ''} ${assignee.assigneeId.lastName || ''}`.trim() : 
          'Unassigned'),
        email: assignee.email || (assignee.assigneeId?.email || '')
      })),
      project: task.projectId ? {
        title: task.projectId.title,
        projectId: task.projectId.projectId
      } : null
    });

    // Update status breakdown
    if (task.status && monthlyData[monthName].statusBreakdown[task.status] !== undefined) {
      monthlyData[monthName].statusBreakdown[task.status]++;
    }

    // Update priority breakdown
    if (task.priority && monthlyData[monthName].priorityBreakdown[task.priority] !== undefined) {
      monthlyData[monthName].priorityBreakdown[task.priority]++;
    }
  });

  // Convert to array format for frontend
  return months.map(month => ({
    month,
    total: monthlyData[month]?.total || 0,
    tasks: monthlyData[month]?.tasks || [],
    statusBreakdown: monthlyData[month]?.statusBreakdown || {
      todo: 0, 'in-progress': 0, review: 0, completed: 0, 'on-hold': 0, cancelled: 0
    },
    priorityBreakdown: monthlyData[month]?.priorityBreakdown || {
      low: 0, medium: 0, high: 0, critical: 0
    }
  }));
}

// Generate trend data from monthly tasks
function generateTrendDataFromMonthlyTasks(monthlyData) {
  const labels = monthlyData.map(m => m.month);
  
  const totalTrend = monthlyData.map(m => m.total);
  const pendingTrend = monthlyData.map(m => m.statusBreakdown.todo);
  const inProgressTrend = monthlyData.map(m => m.statusBreakdown['in-progress']);
  const completedTrend = monthlyData.map(m => m.statusBreakdown.completed);

  return {
    labels,
    total: totalTrend,
    pending: pendingTrend,
    inProgress: inProgressTrend,
    completed: completedTrend
  };
}

// Generate month labels (Jan, Feb, Mar... Dec)
function generateMonthLabels() {
  return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
}

// Update the helper function in getPMDashboardData
async function getTaskSnapshotData(pmId) {
  const projects = await Project.find({ 
    manager: pmId,
    isActive: true 
  }).select('_id');

  const projectIds = projects.map(p => p._id);

  if (projectIds.length === 0) {
    return {
      pendingTasks: 0,
      blockedTasks: 0,
      overdueTasks: 0,
      monthlyTasks: [],
      trends: {
        labels: generateMonthLabels(),
        total: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        pending: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        inProgress: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        completed: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
      }
    };
  }

  const [pendingTasks, blockedTasks, overdueTasks, allTasks] = await Promise.all([
    Task.countDocuments({
      projectId: { $in: projectIds },
      status: 'todo',
      isArchived: { $ne: true }
    }),
    Task.countDocuments({
      projectId: { $in: projectIds },
      status: 'on-hold',
      isArchived: { $ne: true }
    }),
    Task.countDocuments({
      projectId: { $in: projectIds },
      deadline: { $lt: new Date() },
      status: { $nin: ['completed', 'cancelled'] },
      isArchived: { $ne: true }
    }),
    Task.find({
      projectId: { $in: projectIds },
      isArchived: { $ne: true }
    }).select('_id status createdAt').lean()
  ]);

  // Group tasks by month
  const monthlyData = processTasksByMonth(allTasks);
  const trends = generateTrendDataFromMonthlyTasks(monthlyData);

  return { 
    pendingTasks, 
    blockedTasks, 
    overdueTasks,
    monthlyTasks: monthlyData,
    trends
  };
}



// Helper function to generate date labels
function generateDateLabels() {
  const labels = [];
  for (let i = 8; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const label = date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
    labels.push(label);
  }
  return labels;
}

// Get Team Load Indicator
export const getTeamLoad = async (req, res) => {
  try {
    const pmId = req.user.id;
    
    // Find all project teams where this PM is the manager
    const projectTeams = await ProjectTeam.find({ 
      projectManager: pmId,
      status: 'active'
    }).populate('teamMembers.employeeId', 'firstName lastName designation department');

    // Aggregate tasks by team members
    const teamLoadMap = new Map();

    for (const team of projectTeams) {
      for (const member of team.teamMembers) {
        if (!member.isActive) continue;

        const employeeId = member.employeeId._id;
        const key = employeeId.toString();

        if (!teamLoadMap.has(key)) {
          teamLoadMap.set(key, {
            employeeId: employeeId,
            employeeName: `${member.employeeId.firstName} ${member.employeeId.lastName}`,
            designation: member.employeeId.designation,
            department: member.employeeId.department,
            taskCount: 0,
            overdueTasks: 0,
            projects: []
          });
        }

        // Get tasks assigned to this employee
        const tasks = await Task.find({
          'assignedTo.assigneeId': employeeId,
          'assignedTo.isActive': true,
          projectId: { $in: projectTeams.map(t => t.projectId) }
        });

        const loadData = teamLoadMap.get(key);
        loadData.taskCount += tasks.length;
        loadData.overdueTasks += tasks.filter(t => {
          return t.deadline < new Date() && 
                 !['completed', 'cancelled'].includes(t.status);
        }).length;
        
        // Add project name
        if (!loadData.projects.includes(team.projectName)) {
          loadData.projects.push(team.projectName);
        }
      }
    }

    const teamLoad = Array.from(teamLoadMap.values())
      .sort((a, b) => b.taskCount - a.taskCount);

    res.status(200).json({
      success: true,
      data: teamLoad
    });
  } catch (error) {
    console.error('Error fetching team load:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching team load',
      error: error.message
    });
  }
};

// Get Daily Updates Feed
export const getDailyUpdates = async (req, res) => {
  try {
    const pmId = req.user.id;
    const { limit = 10 } = req.query;

    // Get all projects managed by this PM
    const projects = await Project.find({ 
      manager: pmId,
      isActive: true 
    }).select('_id title');

    const projectIds = projects.map(p => p._id);
    const projectMap = new Map(projects.map(p => [p._id.toString(), p.title]));

    // Get daily updates for these projects
    const updates = await DailyUpdate.find({
      projectId: { $in: projectIds }
    })
    .sort({ lastUpdateTime: -1 })
    .limit(parseInt(limit))
    .lean();

    // Enhance updates with project name
    const enhancedUpdates = updates.map(update => ({
      ...update,
      projectName: projectMap.get(update.projectId.toString()) || 'Unknown Project',
      formattedTime: formatUpdateTime(update.lastUpdateTime)
    }));

    res.status(200).json({
      success: true,
      data: enhancedUpdates
    });
  } catch (error) {
    console.error('Error fetching daily updates:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching daily updates',
      error: error.message
    });
  }
};

// Get Comprehensive PM Dashboard Data (All in one)
export const getPMDashboardData = async (req, res) => {
  try {
    const pmId = req.user.id;
    
    // Fetch all data in parallel
    const [summary, projects, taskSnapshot, teamLoad, dailyUpdates] = await Promise.all([
      getPMSummaryData(pmId),
      getPMProjectsData(pmId),
      getTaskSnapshotData(pmId),
      getTeamLoadData(pmId),
      getDailyUpdatesData(pmId)
    ]);

    res.status(200).json({
      success: true,
      data: {
        summary,
        projects,
        taskSnapshot,
        teamLoad,
        dailyUpdates
      }
    });
  } catch (error) {
    console.error('Error fetching PM dashboard data:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard data',
      error: error.message
    });
  }
};

// Helper functions for comprehensive data fetch
async function getPMSummaryData(pmId) {
  const pmEmployee = await Employee.findOne({ userId: pmId });
  if (!pmEmployee) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const projects = await Project.find({ manager: pmId, isActive: true });
  
  const assignedProjects = projects.length;
  const activeProjects = projects.filter(p => p.status === 'in-progress').length;
  
  const delayedProjects = projects.filter(p => {
    return p.status === 'in-progress' && new Date(p.deadline) < new Date();
  }).length;

  const tasksDueToday = await Task.countDocuments({
    projectId: { $in: projects.map(p => p._id) },
    deadline: { $gte: today, $lt: tomorrow },
    status: { $nin: ['completed', 'cancelled'] }
  });

  return {
    assignedProjects,
    activeProjects,
    delayedProjects,
    tasksDueToday
  };
}

async function getPMProjectsData(pmId) {
  const projects = await Project.find({ 
    manager: new mongoose.Types.ObjectId(pmId),
    isActive: true 
  })
  .populate('client', 'name companyName email phone')
  .select('title client deadline status progress projectId')
  .sort({ deadline: 1 })
  .limit(10)
  .lean();

  return projects.map(project => {
    const deadline = new Date(project.deadline);
    const today = new Date();
    const daysLeft = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
    
    let actualStatus = project.status;
    if (project.status === 'in-progress' && daysLeft < 0) {
      actualStatus = 'delayed';
    }

    return {
      ...project,
      daysLeft,
      actualStatus,
      clientName: project.client?.name || project.client?.companyName || 'No Client'
    };
  });
}


async function getTeamLoadData(pmId) {
  const projectTeams = await ProjectTeam.find({ 
    projectManager: pmId,
    status: 'active'
  }).populate('teamMembers.employeeId', 'firstName lastName designation department');

  const teamLoadMap = new Map();

  for (const team of projectTeams) {
    for (const member of team.teamMembers) {
      if (!member.isActive) continue;

      const employeeId = member.employeeId._id;
      const key = employeeId.toString();

      if (!teamLoadMap.has(key)) {
        teamLoadMap.set(key, {
          employeeId: employeeId,
          employeeName: `${member.employeeId.firstName} ${member.employeeId.lastName}`,
          designation: member.employeeId.designation,
          department: member.employeeId.department,
          taskCount: 0,
          overdueTasks: 0
        });
      }

      const tasks = await Task.find({
        'assignedTo.assigneeId': employeeId,
        'assignedTo.isActive': true,
        projectId: { $in: projectTeams.map(t => t.projectId) }
      });

      const loadData = teamLoadMap.get(key);
      loadData.taskCount += tasks.length;
      loadData.overdueTasks += tasks.filter(t => {
        return t.deadline < new Date() && 
               !['completed', 'cancelled'].includes(t.status);
      }).length;
    }
  }

  return Array.from(teamLoadMap.values())
    .sort((a, b) => b.taskCount - a.taskCount)
    .slice(0, 5); // Limit to top 5
}

async function getDailyUpdatesData(pmId) {
  const projects = await Project.find({ 
    manager: pmId,
    isActive: true 
  }).select('_id title');

  const projectIds = projects.map(p => p._id);
  const projectMap = new Map(projects.map(p => [p._id.toString(), p.title]));

  const updates = await DailyUpdate.find({
    projectId: { $in: projectIds }
  })
  .sort({ lastUpdateTime: -1 })
  .limit(5)
  .lean();

  return updates.map(update => ({
    ...update,
    projectName: projectMap.get(update.projectId.toString()) || 'Unknown Project',
    formattedTime: formatUpdateTime(update.lastUpdateTime)
  }));
}

// Helper function to format update time
function formatUpdateTime(date) {
  const now = new Date();
  const updateTime = new Date(date);
  const diffMinutes = Math.floor((now - updateTime) / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return updateTime.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  }
}
