import { asynchandler } from "../utils/asynchHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { Task } from "../models/task.model.js";
import { Project } from "../models/project.model.js";
import { Employee } from "../models/employee.model.js";
import { ProjectTeam } from "../models/projectteam.model.js";
import { DailyUpdate } from "../models/dailyupdate.model.js";
import mongoose from "mongoose";

// FIXED VERSION of findEmployeeByUserId
const findEmployeeByUserId = async (userId) => {
  try {
    console.log('🔍 Finding employee for userId:', userId);
    
    // Method 1: Look for employee where userId matches exactly
    let employee = await Employee.findOne({ userId: userId });
    
    if (employee) {
      console.log('✅ Found employee by direct userId match:', {
        employeeId: employee._id,
        email: employee.email,
        fullName: employee.fullName
      });
      return employee;
    }
    
    // Method 2: Find user first, then find employee by email
    const User = mongoose.model('User');
    const user = await User.findById(userId).select('email username employeeRef').lean();
    
    if (user) {
      console.log('👤 Found user:', {
        email: user.email,
        username: user.username,
        employeeRef: user.employeeRef
      });
      
      // Method 2A: Check if user has employeeRef
      if (user.employeeRef) {
        employee = await Employee.findById(user.employeeRef);
        if (employee) {
          console.log('✅ Found employee via employeeRef:', employee._id);
          return employee;
        }
      }
      
      // Method 2B: Find employee by email
      if (user.email) {
        employee = await Employee.findOne({ email: user.email });
        if (employee) {
          console.log('✅ Found employee by email match:', employee._id);
          return employee;
        }
      }
      
      // Method 2C: Find employee by username/email pattern
      if (user.username) {
        employee = await Employee.findOne({
          $or: [
            { email: { $regex: user.username, $options: 'i' } },
            { firstName: { $regex: user.username, $options: 'i' } }
          ]
        });
        
        if (employee) {
          console.log('✅ Found employee by username pattern:', employee._id);
          return employee;
        }
      }
    }
    
    // Method 3: Last resort - find any employee and link manually
    console.log('⚠️ No direct match found. Checking all employees...');
    const allEmployees = await Employee.find({}).limit(10).select('email fullName userId');
    console.log('📋 First 10 employees:', allEmployees);
    
    return null;
  } catch (error) {
    console.error('❌ Error in findEmployeeByUserId:', error);
    return null;
  }
};

// 🔸 A. Get My Work Summary - FIXED
const getMyWorkSummary = asynchandler(async (req, res) => {
  try {
    const employeeId = req.user?._id;
    console.log('User ID from token:', employeeId);
    
    // Find employee by user ID
    const employee = await findEmployeeByUserId(employeeId);
    
    if (!employee) {
      console.log('Employee not found for user ID:', employeeId);
      // Try to find any employee to debug
      const allEmployees = await Employee.find({}).limit(5);
      console.log('First 5 employees in DB:', allEmployees.map(e => ({ 
        _id: e._id, 
        email: e.email, 
        userId: e.userId,
        fullName: e.fullName 
      })));
      
      throw new ApiError(404, "Employee profile not found. Please contact administrator.");
    }

    console.log('Found employee:', {
      _id: employee._id,
      email: employee.email,
      fullName: employee.fullName
    });

    const employeeObjectId = employee._id;

    // 1. Count Assigned Tasks - Find tasks assigned by employeeId OR email
    const assignedTasks = await Task.countDocuments({
      $or: [
        { "assignedTo.assigneeId": employeeObjectId },
        { "assignedTo.email": employee.email }
      ],
      "assignedTo.isActive": true,
      status: { $nin: ['completed', 'cancelled'] },
      isArchived: false
    });
    console.log('Assigned tasks count:', assignedTasks);

    // 2. Tasks Due Today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const tasksDueToday = await Task.countDocuments({
      $or: [
        { "assignedTo.assigneeId": employeeObjectId },
        { "assignedTo.email": employee.email }
      ],
      "assignedTo.isActive": true,
      deadline: {
        $gte: today,
        $lt: tomorrow
      },
      status: { $nin: ['completed', 'cancelled'] },
      isArchived: false
    });
    console.log('Tasks due today count:', tasksDueToday);

    // 3. Overdue Tasks
    const overdueTasks = await Task.countDocuments({
      $or: [
        { "assignedTo.assigneeId": employeeObjectId },
        { "assignedTo.email": employee.email }
      ],
      "assignedTo.isActive": true,
      deadline: { $lt: today },
      status: { $nin: ['completed', 'cancelled'] },
      isArchived: false
    });
    console.log('Overdue tasks count:', overdueTasks);

    // 4. Completed Tasks (This Week)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const completedTasks = await Task.countDocuments({
      $or: [
        { "assignedTo.assigneeId": employeeObjectId },
        { "assignedTo.email": employee.email }
      ],
      "assignedTo.isActive": true,
      status: 'completed',
      updatedAt: { $gte: oneWeekAgo },
      isArchived: false
    });
    console.log('Completed tasks this week:', completedTasks);

    // 5. In Progress Tasks
    const inProgressTasks = await Task.countDocuments({
      $or: [
        { "assignedTo.assigneeId": employeeObjectId },
        { "assignedTo.email": employee.email }
      ],
      "assignedTo.isActive": true,
      status: 'in-progress',
      isArchived: false
    });
    console.log('In progress tasks:', inProgressTasks);

    const summary = {
      assignedTasks,
      tasksDueToday,
      overdueTasks,
      completedTasks,
      inProgressTasks,
      totalWorkload: assignedTasks + inProgressTasks
    };

    return res
      .status(200)
      .json(new ApiResponse(200, summary, "Work summary fetched successfully"));

  } catch (error) {
    console.error('Error fetching work summary:', error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, "Failed to fetch work summary: " + error.message);
  }
});

// 🔸 B. Get Today's Tasks - Tasks CREATED or ASSIGNED Today
const getTodaysTasks = asynchandler(async (req, res) => {
  try {
    const employeeId = req.user?._id;
    const employee = await findEmployeeByUserId(employeeId);
    
    if (!employee) {
      throw new ApiError(404, "Employee not found");
    }

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    console.log('📅 Looking for tasks from today:', {
      today: today.toISOString(),
      employee: employee.email
    });

    // Get tasks that were either:
    // 1. CREATED today, OR
    // 2. Have "assignedTo.date" set to today
    const todaysTasks = await Task.find({
      $or: [
        { "assignedTo.assigneeId": employee._id },
        { "assignedTo.email": employee.email }
      ],
      "assignedTo.isActive": true,
      $or: [
        { createdAt: { $gte: today, $lt: tomorrow } }, // Created today
        { "assignedTo.startDate": { $gte: today, $lt: tomorrow } } // Assigned today
      ],
      status: { $nin: ['completed', 'cancelled'] },
      isArchived: false
    })
    .populate('projectId', 'title projectId')
    .select('taskId title description deadline status progress priority taskType projectId createdAt')
    .sort({ createdAt: -1, priority: -1 })
    .lean();

    console.log(`✅ Found ${todaysTasks.length} tasks for today`);
    
    // Detailed logging
    if (todaysTasks.length > 0) {
      todaysTasks.forEach(task => {
        console.log(`   📝 ${task.title} - Created: ${task.createdAt}`);
      });
    } else {
      console.log('📭 No tasks found for today');
    }

    // Process tasks
    const processedTasks = todaysTasks.map(task => ({
      _id: task._id,
      taskId: task.taskId,
      taskName: task.title,
      description: task.description,
      deadline: task.deadline,
      status: task.status,
      progress: task.progress,
      priority: task.priority,
      taskType: task.taskType,
      createdAt: task.createdAt,
      isNewToday: true, // Flag to indicate it's from today
      project: {
        _id: task.projectId?._id,
        name: task.projectId?.title,
        projectId: task.projectId?.projectId
      }
    }));

    return res
      .status(200)
      .json(new ApiResponse(200, processedTasks, "Today's tasks fetched successfully"));

  } catch (error) {
    console.error('Error fetching today\'s tasks:', error);
    throw new ApiError(500, "Failed to fetch today's tasks");
  }
});

const getMyProjects = asynchandler(async (req, res) => {
  try {
    const currentUserId = req.user._id;
   
    const {
      status = '',
      search = '',
      page = 1,
      limit = 10,
      sort = '-createdAt'
    } = req.query;

    // Parse pagination
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const baseFilter = {};

    // Add status filter if provided and valid
    if (status && status !== 'all') {
      if (['planned', 'in-progress', 'completed', 'on-hold', 'cancelled'].includes(status)) {
        baseFilter.status = status;
      }
    }

    // Build search filter
    const searchFilter = {};
    if (search) {
      searchFilter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { projectId: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // STEP 1: Find current user's Employee record
    const currentEmployee = await Employee.findOne({ 
      userId: currentUserId 
    }).select('_id employeeId firstName lastName userId roleId department');
    
    if (!currentEmployee) {
    
      return res.status(200).json(
        new ApiResponse(200, {
          projects: [],
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: 0,
            pages: 0
          }
        }, "No employee record found for the current user")
      );
    }
    
    const currentEmployeeId = currentEmployee._id.toString();


    // STEP 2: Get projects where user is manager
    const managerFilter = {
      ...baseFilter,
      ...searchFilter,
      manager: currentUserId
    };

    // STEP 3: Get ALL ProjectTeam entries
    const allProjectTeams = await ProjectTeam.find({
      status: 'active'
    })
    .populate({
      path: 'projectManager',
      select: '_id username email',
      model: 'User' // Changed to User model
    })
    .populate({
      path: 'teamMembers.employeeId',
      select: '_id firstName lastName email department',
      model: 'Employee'
    })
    .lean();


    // STEP 4: Filter ProjectTeams where current user is involved
    const relevantProjectIds = [];
    
    for (const projectTeam of allProjectTeams) {
      let isUserInvolved = false;
      
      // Check if user is the Project Manager
      if (projectTeam.projectManager && 
          projectTeam.projectManager._id.toString() === currentUserId.toString()) {
        isUserInvolved = true;
        console.log(`User is Project Manager for project: ${projectTeam.projectName}`);
      }
      
      // Check if user is in team members by comparing employeeId
      if (!isUserInvolved && projectTeam.teamMembers && projectTeam.teamMembers.length > 0) {
        for (const teamMember of projectTeam.teamMembers) {
          if (teamMember.employeeId) {
            const teamMemberEmployeeId = teamMember.employeeId._id 
              ? teamMember.employeeId._id.toString() 
              : teamMember.employeeId.toString();
            
            console.log(`Comparing: Team member employeeId ${teamMemberEmployeeId} vs Current employeeId ${currentEmployeeId}`);
            
            if (teamMemberEmployeeId === currentEmployeeId) {
              isUserInvolved = true;
              console.log(`✅ MATCH FOUND! User is team member for project: ${projectTeam.projectName}, Role: ${teamMember.role}`);
              break;
            }
          }
        }
      }
      
      if (isUserInvolved && projectTeam.projectId) {
        relevantProjectIds.push(projectTeam.projectId);
        console.log(`Added project ${projectTeam.projectName} to relevant projects`);
      } else {
        console.log(`User NOT involved in project: ${projectTeam.projectName}`);
      }
    }

    // STEP 5: Check if projects actually exist
    const existingProjectIds = [];
    for (const projectId of relevantProjectIds) {
      if (mongoose.Types.ObjectId.isValid(projectId)) {
        const project = await Project.findById(projectId).select('_id title status');
        
        if (project) {
          existingProjectIds.push(projectId);
        } else {
          console.log(`❌ Warning: Project ${projectId} not found in database`);
        }
      }
    }

    // Build team member filter
    const teamFilter = {
      ...baseFilter,
      ...searchFilter,
      _id: { $in: existingProjectIds }
    };

    // Combine both filters
    const finalFilter = {
      $or: [managerFilter, teamFilter]
    };


    // Get total count
    const total = await Project.countDocuments(finalFilter);

    // Initialize enhancedProjects as empty array
    let enhancedProjects = [];

    // Only process if there are projects
    if (total > 0) {
      // Get projects with populated data
      const projects = await Project.find(finalFilter)
        .populate('client', 'name companyName')
        .populate({
          path: 'manager',
          select: 'username email',
          model: 'User'
        })
        .select('projectId title client manager status progress startDate deadline createdAt')
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean();

      console.log(`✅ Retrieved ${projects.length} projects from database`);
      
      // Log the projects found
      projects.forEach(p => {
        console.log(`   - ${p.title} (${p.projectId}), Status: ${p.status}`);
      });

      // Create a map of projectId to ProjectTeam for quick lookup
      const projectTeamMap = new Map();
      allProjectTeams.forEach(pt => {
        if (pt.projectId) {
          projectTeamMap.set(pt.projectId.toString(), pt);
        }
      });

      // Enhance projects with additional data
      enhancedProjects = await Promise.all(
        projects.map(async (project) => {
          const enhanced = { ...project };
          
          // Find the ProjectTeam for this project
          const projectTeam = projectTeamMap.get(project._id.toString());

          // Get Project Manager name
          if (projectTeam) {
            console.log(`\n=== Processing project: ${project.title} ===`);
            console.log("ProjectTeam data:", {
              projectManager: projectTeam.projectManager,
              projectManagerName: projectTeam.projectManagerName
            });
            
            // Method 1: Use projectManagerName from ProjectTeam (direct field)
            if (projectTeam.projectManagerName) {
              enhanced.pmName = projectTeam.projectManagerName;
              enhanced.pmEmail = projectTeam.projectManager?.email || '';
              console.log(`Using projectManagerName field: ${enhanced.pmName}`);
            }
            // Method 2: Get from populated User model
            else if (projectTeam.projectManager && projectTeam.projectManager.username) {
              enhanced.pmName = projectTeam.projectManager.username;
              enhanced.pmEmail = projectTeam.projectManager.email || '';
              console.log(`Using populated User model: ${enhanced.pmName}`);
              
              // Try to get full name from Employee if available
              if (projectTeam.projectManager.employeeId) {
                const pmEmployee = await Employee.findOne({
                  employeeId: projectTeam.projectManager.employeeId
                }).select('firstName lastName');
                
                if (pmEmployee) {
                  enhanced.pmName = `${pmEmployee.firstName} ${pmEmployee.lastName}`;
                  console.log(`Updated with Employee name: ${enhanced.pmName}`);
                }
              }
            }
            // Method 3: Get from User model directly
            else if (projectTeam.projectManager) {
              try {
                const pmUser = await User.findById(projectTeam.projectManager)
                  .select('username email employeeId');
                
                if (pmUser) {
                  enhanced.pmName = pmUser.username || 'Unknown User';
                  enhanced.pmEmail = pmUser.email || '';
                  console.log(`Fetched from User model: ${enhanced.pmName}`);
                }
              } catch (error) {
                console.error("Error fetching PM User:", error);
              }
            }
          }
          
          // Method 4: Fallback to Project.manager
          if (!enhanced.pmName || enhanced.pmName === 'Not Assigned') {
            if (project.manager && project.manager.username) {
              enhanced.pmName = project.manager.username;
              enhanced.pmEmail = project.manager.email || '';
              console.log(`Fallback to Project.manager: ${enhanced.pmName}`);
            } else {
              enhanced.pmName = 'Not Assigned';
              enhanced.pmEmail = '';
              console.log("No manager data found");
            }
          }

          // Get team members count
          if (projectTeam) {
            enhanced.teamCount = projectTeam.teamMembers.length + 1;
            
            // Check if current user is in this team
            enhanced.isTeamMember = false;
            enhanced.isProjectManager = false;
            
            // Check if user is PM
            if (projectTeam.projectManager && 
                projectTeam.projectManager._id.toString() === currentUserId.toString()) {
              enhanced.isProjectManager = true;
            }
            
            // Check if user is team member
            if (!enhanced.isProjectManager && projectTeam.teamMembers) {
              for (const teamMember of projectTeam.teamMembers) {
                if (teamMember.employeeId) {
                  const teamMemberEmployeeId = teamMember.employeeId._id 
                    ? teamMember.employeeId._id.toString() 
                    : teamMember.employeeId.toString();
                  
                  if (teamMemberEmployeeId === currentEmployeeId) {
                    enhanced.isTeamMember = true;
                    enhanced.teamMemberRole = teamMember.role || 'Team Member';
                    break;
                  }
                }
              }
            }
          } else {
            enhanced.teamCount = 1;
            enhanced.isProjectManager = project.manager && 
              project.manager._id.toString() === currentUserId.toString();
            enhanced.isTeamMember = false;
          }

          // Calculate days left
          const today = new Date();
          const deadline = new Date(project.deadline);
          const diffTime = deadline.getTime() - today.getTime();
          enhanced.daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          // Auto-detect delayed status
          if (enhanced.daysLeft < 0 && project.status === 'in-progress') {
            enhanced.actualStatus = 'delayed';
          } else {
            enhanced.actualStatus = project.status;
          }

          // Format dates
          enhanced.formattedDeadline = deadline.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          });

          enhanced.formattedStartDate = new Date(project.startDate).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          });

          console.log(`Final PM Name for ${project.title}: ${enhanced.pmName}`);
          
          return enhanced;
        })
      );
    }

    return res.status(200).json(
      new ApiResponse(200, {
        projects: enhancedProjects,
        userInfo: {
          employeeId: currentEmployee.employeeId,
          fullName: `${currentEmployee.firstName} ${currentEmployee.lastName}`,
          role: currentEmployee.roleId === '2' ? 'Project Manager' : 'Employee',
          department: currentEmployee.department,
          isProjectManager: currentEmployee.roleId === '2'
        },
        debug: {
          managerProjectsCount: await Project.countDocuments(managerFilter),
          projectTeamsCount: allProjectTeams.length,
          relevantProjectsCount: relevantProjectIds.length,
          existingProjectsCount: existingProjectIds.length,
          totalProjects: total
        },
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }, "Projects fetched successfully")
    );
  } catch (error) {
    console.error('Error fetching my projects:', error);
    throw new ApiError(500, "Error fetching projects");
  }
});

// 🔸 D. Get Notifications - SIMPLIFIED
const getNotifications = asynchandler(async (req, res) => {
  try {
    const employeeId = req.user?._id;
    const employee = await findEmployeeByUserId(employeeId);
    
    if (!employee) {
      throw new ApiError(404, "Employee not found");
    }

    const notifications = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    console.log('📱 Fetching notifications for:', employee.email);

    // 1. TODAY'S TASKS - Tasks created/assigned today
    const todaysTasks = await Task.find({
      $or: [
        { "assignedTo.assigneeId": employee._id },
        { "assignedTo.email": employee.email }
      ],
      "assignedTo.isActive": true,
      $or: [
        { createdAt: { $gte: today, $lt: tomorrow } },
        { "assignedTo.startDate": { $gte: today, $lt: tomorrow } }
      ],
      isArchived: false
    })
    .populate('projectId', 'title')
    .populate('createdBy', 'username')
    .select('taskId title createdAt')
    .limit(10)
    .lean();

    console.log(`Found ${todaysTasks.length} tasks for today`);

    todaysTasks.forEach(task => {
      const assignerName = task.createdBy?.username || 'Project Manager';
      
      notifications.push({
        type: 'new_task',
        title: 'New Task Assigned',
        message: `You have been assigned task: "${task.title}"`,
        timestamp: task.createdAt,
        data: { 
          taskId: task._id,
          taskTitle: task.title 
        }
      });
    });

    // 2. COMMENTS FROM PM - Last 3 days
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const pmComments = await Task.aggregate([
      {
        $match: {
          $or: [
            { "assignedTo.assigneeId": employee._id },
            { "assignedTo.email": employee.email }
          ],
          "assignedTo.isActive": true,
          "comments.createdAt": { $gte: threeDaysAgo },
          isArchived: false
        }
      },
      {
        $unwind: "$comments"
      },
      {
        $match: {
          "comments.createdAt": { $gte: threeDaysAgo }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'comments.commentedBy',
          foreignField: '_id',
          as: 'commenter'
        }
      },
      {
        $unwind: "$commenter"
      },
      {
        $lookup: {
          from: 'projects',
          localField: 'projectId',
          foreignField: '_id',
          as: 'project'
        }
      },
      {
        $unwind: "$project"
      },
      {
        $project: {
          taskId: "$_id",
          taskTitle: "$title",
          comment: "$comments.content",
          commenterName: "$commenter.username",
          projectManagerId: "$project.manager",
          timestamp: "$comments.createdAt"
        }
      },
      {
        $addFields: {
          isFromPM: {
            $eq: ["$projectManagerId", "$comment.commentedBy"]
          }
        }
      },
      {
        $match: {
          $or: [
            { isFromPM: true },
            { commenterName: { $regex: /manager|pm|lead|director/i } }
          ]
        }
      },
      {
        $sort: { timestamp: -1 }
      },
      {
        $limit: 10
      }
    ]);

    console.log(`Found ${pmComments.length} comments from PM`);

    pmComments.forEach(comment => {
      const shortComment = comment.comment?.substring(0, 50) + 
        (comment.comment?.length > 50 ? '...' : '');
      
      notifications.push({
        type: 'pm_comment',
        title: 'Comment from PM',
        message: `PM commented on your task "${comment.taskTitle}": ${shortComment}`,
        timestamp: comment.timestamp,
        data: { 
          taskId: comment.taskId,
          taskTitle: comment.taskTitle,
          commenter: comment.commenterName 
        }
      });
    });

    // 3. TASK DEADLINES - Due today or tomorrow
    const deadlines = await Task.find({
      $or: [
        { "assignedTo.assigneeId": employee._id },
        { "assignedTo.email": employee.email }
      ],
      "assignedTo.isActive": true,
      deadline: { 
        $gte: today,
        $lt: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000) // Next 2 days
      },
      status: { $nin: ['completed', 'cancelled'] },
      isArchived: false
    })
    .populate('projectId', 'title')
    .select('taskId title deadline')
    .limit(10)
    .lean();

    console.log(`Found ${deadlines.length} tasks with approaching deadlines`);

    deadlines.forEach(task => {
      const deadline = new Date(task.deadline);
      const diffTime = deadline - today;
      const daysUntilDue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      let title = 'Deadline Reminder';
      if (daysUntilDue === 0) title = 'Task Due Today';
      if (daysUntilDue === 1) title = 'Task Due Tomorrow';
      
      notifications.push({
        type: 'deadline',
        title: title,
        message: `Task "${task.title}" is due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}`,
        timestamp: new Date(),
        data: { 
          taskId: task._id,
          taskTitle: task.title,
          daysUntilDue: daysUntilDue
        }
      });
    });

    // Sort by timestamp (newest first)
    notifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Count by type
    const summary = {
      new_task: notifications.filter(n => n.type === 'new_task').length,
      pm_comment: notifications.filter(n => n.type === 'pm_comment').length,
      deadline: notifications.filter(n => n.type === 'deadline').length,
      total: notifications.length
    };

    console.log(`Total notifications: ${summary.total}`);

    return res
      .status(200)
      .json(new ApiResponse(200, {
        notifications: notifications.slice(0, 50), // Limit to 50
        summary
      }, "Notifications fetched successfully"));

  } catch (error) {
    console.error('Error fetching notifications:', error);
    throw new ApiError(500, "Failed to fetch notifications");
  }
});

// 🔸 Update Task Status - FIXED
const updateTaskStatus = asynchandler(async (req, res) => {
  try {
    const { taskId } = req.params;
    const { status, comment } = req.body;
    const userId = req.user?._id;
    const employee = await findEmployeeByUserId(userId);
    
    if (!employee) {
      throw new ApiError(404, "Employee not found");
    }

    // Check if task exists and is assigned to employee
    const task = await Task.findOne({
      _id: taskId,
      $or: [
        { "assignedTo.assigneeId": employee._id },
        { "assignedTo.email": employee.email }
      ],
      "assignedTo.isActive": true
    });

    if (!task) {
      throw new ApiError(404, "Task not found or not assigned to you");
    }

    const oldStatus = task.status;
    
    // Update task status
    task.status = status;
    
    // Add to status history
    task.statusHistory.push({
      fromStatus: oldStatus,
      toStatus: status,
      changedBy: employee._id,
      changedByName: employee.fullName,
      reason: comment || 'Status updated by employee',
      timestamp: new Date()
    });

    // Add comment if provided
    if (comment) {
      task.comments.push({
        content: comment,
        commentedBy: employee._id,
        commentedByName: employee.fullName,
        createdAt: new Date()
      });
    }

    // Log activity
    task.activityLog.push({
      action: 'status_updated',
      details: { 
        from: oldStatus, 
        to: status,
        comment: comment || null
      },
      performedBy: employee._id,
      performedByName: employee.fullName,
      timestamp: new Date()
    });

    // Update progress based on status
    if (status === 'completed') {
      task.progress = 100;
      task.completionDate = new Date();
    } else if (status === 'in-progress' && task.progress === 0) {
      task.progress = 25;
    }

    await task.save();

    // Update daily update if exists
    await DailyUpdate.findOneAndUpdate(
      { 
        taskId: task._id,
        $or: [
          { employeeId: employee._id },
          { employeeName: employee.email }
        ]
      },
      {
        $set: {
          taskName: task.title,
          projectId: task.projectId,
          employeeId: employee._id,
          employeeName: employee.fullName,
          currentStatus: status,
          lastUpdate: comment || 'Status updated',
          lastUpdateTime: new Date()
        }
      },
      { upsert: true, new: true }
    );

    return res
      .status(200)
      .json(new ApiResponse(200, task, "Task status updated successfully"));

  } catch (error) {
    console.error('Error updating task status:', error);
    throw new ApiError(500, "Failed to update task status");
  }
});

// 🔸 Add Task Comment - FIXED
const addTaskComment = asynchandler(async (req, res) => {
  try {
    const { taskId } = req.params;
    const { content } = req.body;
    const userId = req.user?._id;
    const employee = await findEmployeeByUserId(userId);
    
    if (!employee) {
      throw new ApiError(404, "Employee not found");
    }

    if (!content) {
      throw new ApiError(400, "Comment content is required");
    }

    // Check if task exists and is assigned to employee
    const task = await Task.findOne({
      _id: taskId,
      $or: [
        { "assignedTo.assigneeId": employee._id },
        { "assignedTo.email": employee.email }
      ],
      "assignedTo.isActive": true
    });

    if (!task) {
      throw new ApiError(404, "Task not found or not assigned to you");
    }

    // Add comment
    task.comments.push({
      content,
      commentedBy: employee._id,
      commentedByName: employee.fullName,
      createdAt: new Date()
    });

    // Log activity
    task.activityLog.push({
      action: 'comment_added',
      details: { 
        content: content.substring(0, 100)
      },
      performedBy: employee._id,
      performedByName: employee.fullName,
      timestamp: new Date()
    });

    await task.save();

    // Update daily update
    await DailyUpdate.findOneAndUpdate(
      { 
        taskId: task._id,
        $or: [
          { employeeId: employee._id },
          { employeeName: employee.email }
        ]
      },
      {
        $set: {
          lastUpdate: content,
          lastUpdateTime: new Date()
        }
      },
      { upsert: true, new: true }
    );

    return res
      .status(200)
      .json(new ApiResponse(200, task.comments[task.comments.length - 1], "Comment added successfully"));

  } catch (error) {
    console.error('Error adding comment:', error);
    throw new ApiError(500, "Failed to add comment");
  }
});

// 🔸 Get Task Details - FIXED
const getTaskDetails = asynchandler(async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.user?._id;
    const employee = await findEmployeeByUserId(userId);
    
    if (!employee) {
      throw new ApiError(404, "Employee not found");
    }

    // Get task with all details
    const task = await Task.findOne({
      _id: taskId,
      $or: [
        { "assignedTo.assigneeId": employee._id },
        { "assignedTo.email": employee.email }
      ],
      "assignedTo.isActive": true
    })
    .populate('projectId', 'title projectId description')
    .populate('createdBy', 'name email')
    .populate('comments.commentedBy', 'name email role')
    .lean();

    if (!task) {
      throw new ApiError(404, "Task not found or not assigned to you");
    }

    // Calculate overdue status
    const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== 'completed';

    // Get assignment details for current employee
    const myAssignment = task.assignedTo.find(assignment => 
      assignment.assigneeId?.toString() === employee._id.toString() ||
      assignment.email === employee.email
    );

    return res
      .status(200)
      .json(new ApiResponse(200, {
        ...task,
        isOverdue,
        myAssignment,
        canUpdate: ['todo', 'in-progress', 'review', 'on-hold'].includes(task.status)
      }, "Task details fetched successfully"));

  } catch (error) {
    console.error('Error fetching task details:', error);
    throw new ApiError(500, "Failed to fetch task details");
  }
});

// 🔸 Get All My Tasks with Filters - FIXED
const getAllMyTasks = asynchandler(async (req, res) => {
  try {
    const { 
      status, 
      priority, 
      projectId, 
      search,
      page = 1,
      limit = 20 
    } = req.query;
    
    const userId = req.user?._id;
    const employee = await findEmployeeByUserId(userId);
    
    if (!employee) {
      throw new ApiError(404, "Employee not found");
    }

    // Build filter
    const filter = {
      $or: [
        { "assignedTo.assigneeId": employee._id },
        { "assignedTo.email": employee.email }
      ],
      "assignedTo.isActive": true,
      isArchived: false
    };

    // Add status filter
    if (status && status !== 'all') {
      filter.status = status;
    }

    // Add priority filter
    if (priority && priority !== 'all') {
      filter.priority = priority;
    }

    // Add project filter
    if (projectId && projectId !== 'all') {
      filter.projectId = projectId;
    }

    // Add search filter
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { taskId: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get tasks with pagination
    const [tasks, total] = await Promise.all([
      Task.find(filter)
        .populate('projectId', 'title projectId')
        .select('taskId title description deadline status progress priority taskType projectId')
        .sort({ deadline: 1, priority: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Task.countDocuments(filter)
    ]);

    // Process tasks
    const processedTasks = tasks.map(task => ({
      ...task,
      isOverdue: task.deadline && new Date(task.deadline) < new Date() && task.status !== 'completed',
      project: task.projectId ? {
        _id: task.projectId._id,
        name: task.projectId.title,
        projectId: task.projectId.projectId
      } : null
    }));

    return res
      .status(200)
      .json(new ApiResponse(200, {
        tasks: processedTasks,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }, "Tasks fetched successfully"));

  } catch (error) {
    console.error('Error fetching tasks:', error);
    throw new ApiError(500, "Failed to fetch tasks");
  }
});

// 🔸 Submit Daily Update - FIXED
const submitDailyUpdate = asynchandler(async (req, res) => {
  try {
    const { taskId, update, status } = req.body;
    const userId = req.user?._id;
    const employee = await findEmployeeByUserId(userId);
    
    if (!employee) {
      throw new ApiError(404, "Employee not found");
    }

    if (!taskId || !update) {
      throw new ApiError(400, "Task ID and update are required");
    }

    // Get task details
    const task = await Task.findOne({
      _id: taskId,
      $or: [
        { "assignedTo.assigneeId": employee._id },
        { "assignedTo.email": employee.email }
      ]
    })
    .populate('projectId', 'title')
    .populate({
      path: 'projectId',
      populate: { path: 'manager', select: 'name email' }
    });

    if (!task) {
      throw new ApiError(404, "Task not found or not assigned to you");
    }

    // Create or update daily update
    const dailyUpdate = await DailyUpdate.findOneAndUpdate(
      { 
        taskId, 
        $or: [
          { employeeId: employee._id },
          { employeeName: employee.email }
        ]
      },
      {
        taskName: task.title,
        projectId: task.projectId?._id,
        projectName: task.projectId?.title || 'Unassigned',
        employeeId: employee._id,
        employeeName: employee.fullName,
        projectManagerId: task.projectId?.manager?._id,
        currentStatus: status || task.status,
        lastUpdate: update,
        lastUpdateTime: new Date(),
        deadline: task.deadline
      },
      { upsert: true, new: true }
    );

    // Add comment to task
    if (update) {
      task.comments.push({
        content: `Daily Update: ${update}`,
        commentedBy: employee._id,
        commentedByName: employee.fullName,
        createdAt: new Date()
      });

      await task.save();
    }

    return res
      .status(200)
      .json(new ApiResponse(200, dailyUpdate, "Daily update submitted successfully"));

  } catch (error) {
    console.error('Error submitting daily update:', error);
    throw new ApiError(500, "Failed to submit daily update");
  }
});

export {
  getMyWorkSummary,
  getTodaysTasks,
  getMyProjects,
  getNotifications,
  updateTaskStatus,
  addTaskComment,
  getTaskDetails,
  getAllMyTasks,
  submitDailyUpdate
};