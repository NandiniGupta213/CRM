import { asynchandler } from "../utils/asynchHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { Task } from "../models/task.model.js";
import { Project } from "../models/project.model.js";
import { Employee } from "../models/employee.model.js";
import { ProjectTeam } from "../models/projectteam.model.js";
import { User } from "../models/user.model.js";
import mongoose from "mongoose";

// Configuration for dynamic fields
const TASK_CONFIG = {
  statuses: ['todo', 'in-progress', 'review', 'completed', 'on-hold', 'cancelled'],
  priorities: ['low', 'medium', 'high', 'critical'],
  taskTypes: ['development', 'design', 'testing', 'documentation', 'meeting', 'research', 'bug-fix', 'feature', 'other'],
  assigneeTypes: ['Employee', 'User', 'Team']
};

// Get all tasks with dynamic filtering
const getTasks = asynchandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search = '',
    status,
    priority,
    projectId,
    taskType,
    assignedTo,
    sortBy = '-createdAt',
    startDate,
    endDate,
    tags,
    showArchived = false
  } = req.query;

  // Build filter dynamically
  const filter = { isArchived: showArchived === 'true' };
  
  // Project filter
  if (projectId && projectId !== 'all') {
    if (mongoose.Types.ObjectId.isValid(projectId)) {
      filter.projectId = new mongoose.Types.ObjectId(projectId);
    }
  }
  
  // Status filter
  if (status && status !== 'all' && TASK_CONFIG.statuses.includes(status)) {
    filter.status = status;
  }
  
  // Priority filter
  if (priority && priority !== 'all' && TASK_CONFIG.priorities.includes(priority)) {
    filter.priority = priority;
  }
  
  // Task type filter
  if (taskType && taskType !== 'all' && TASK_CONFIG.taskTypes.includes(taskType)) {
    filter.taskType = taskType;
  }
  
  // Assigned to filter
  if (assignedTo) {
    const assigneeIds = assignedTo.split(',').filter(id => mongoose.Types.ObjectId.isValid(id));
    if (assigneeIds.length > 0) {
      filter['assignedTo.assigneeId'] = { $in: assigneeIds.map(id => new mongoose.Types.ObjectId(id)) };
    }
  }
  
  // Date range filter
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }
  
  // Tags filter
  if (tags) {
    const tagList = tags.split(',').map(tag => tag.trim());
    filter.tags = { $in: tagList };
  }
  
  // Search filter (dynamic search across multiple fields)
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { taskId: { $regex: search, $options: 'i' } },
      { 'assignedTo.name': { $regex: search, $options: 'i' } },
      { 'assignedTo.email': { $regex: search, $options: 'i' } }
    ];
  }

  // Parse pagination
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;

  // Get total count
  const total = await Task.countDocuments(filter);

  // Build sort dynamically
  const sortOptions = {};
  if (sortBy) {
    const direction = sortBy.startsWith('-') ? -1 : 1;
    const field = sortBy.replace(/^-/, '');
    sortOptions[field] = direction;
  }

  // Get tasks with dynamic population
  const tasks = await Task.find(filter)
    .populate('projectId', 'title projectId client status startDate deadline')
    .populate('assignedTo.assigneeId', 'firstName lastName email employeeId department avatarColor')
    .populate('createdBy', 'firstName lastName email')
    .populate('dependencies.taskId', 'title taskId status')
    .sort(sortOptions)
    .skip(skip)
    .limit(limitNum)
    .lean();

  return res.status(200).json(
    new ApiResponse(200, {
      tasks,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      },
      filters: {
        statuses: TASK_CONFIG.statuses,
        priorities: TASK_CONFIG.priorities,
        taskTypes: TASK_CONFIG.taskTypes
      }
    }, "Tasks fetched successfully")
  );
});

const getTaskStatistics = asynchandler(async (req, res) => {
  try {
    // Get projectId from params (if exists) or query (for /stats route)
    const projectId = req.params.projectId || req.query.projectId;
    const { timeframe = 'all' } = req.query;
    
    // Rest of the function remains the same...
    // Just update the projectId handling at the beginning:
    
    // Add project filter if specified
    let dateFilter = {};
    if (projectId && projectId !== 'all') {
      if (mongoose.Types.ObjectId.isValid(projectId)) {
        dateFilter.projectId = new mongoose.Types.ObjectId(projectId);
      }
    }
    
    // The rest of the function remains unchanged...
    // [Keep all the existing aggregation queries and logic]
    
  } catch (error) {
    console.error('Error fetching task statistics:', error);
    throw new ApiError(500, "Error fetching task statistics");
  }
});
// Create new task
const createTask = asynchandler(async (req, res) => {
  const {
    projectId,
    title,
    description,
    assignedTo,
    priority,
    deadline,
    taskType,
    estimatedHours,
    estimatedCost,
    tags,
    dependencies,
    customFields
  } = req.body;

  console.log('🔍 DEBUG - Creating task with data:', {
    projectId,
    title,
    assignedTo,
    priority,
    deadline
  });

  console.log('🔍 DEBUG - req.user from JWT:', req.user);

  // Validate required fields
  if (!projectId || !title || !deadline) {
    throw new ApiError(400, "Project ID, title, and deadline are required");
  }

  // Validate project exists
  const project = await Project.findById(projectId);
  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  // Get creator info - FIXED LOGIC
  let creatorName = 'Unknown';
  let creatorEmployeeId = null;
  
  try {
    // 1. Find the logged-in User
    const user = await User.findById(req.user._id);
    
    if (!user) {
      throw new ApiError(404, "User not found in database");
    }

    console.log('🔍 DEBUG - Found user:', {
      _id: user._id,
      email: user.email,
      roleName: user.roleName,
      employeeRef: user.employeeRef
    });

    // 2. Find the corresponding Employee using employeeRef
    if (user.employeeRef) {
      const employee = await Employee.findById(user.employeeRef);
      
      if (employee) {
        console.log('🔍 DEBUG - Found creator employee:', {
          _id: employee._id,
          name: `${employee.firstName} ${employee.lastName}`,
          employeeId: employee.employeeId,
          designation: employee.designation
        });
        
        creatorName = `${employee.firstName} ${employee.lastName}`;
        creatorEmployeeId = employee._id;
      } else {
        // Employee not found, use User info
        console.log('⚠️ Employee not found for employeeRef:', user.employeeRef);
        creatorName = user.username || user.email;
      }
    } else {
      // User doesn't have employeeRef, check if User ID matches any Employee's userId
      const employee = await Employee.findOne({ userId: user._id });
      
      if (employee) {
        console.log('🔍 DEBUG - Found creator employee via userId:', {
          _id: employee._id,
          name: `${employee.firstName} ${employee.lastName}`
        });
        
        creatorName = `${employee.firstName} ${employee.lastName}`;
        creatorEmployeeId = employee._id;
      } else {
        // No Employee found, use User info
        console.log('⚠️ No Employee record found for User');
        creatorName = user.username || user.email;
      }
    }
  } catch (error) {
    console.error('❌ Error fetching creator info:', error);
    // Fallback to using User info
    creatorName = req.user.email || 'Unknown';
  }

  // Validate and format assignedTo
  const validatedAssignees = [];
  if (assignedTo && Array.isArray(assignedTo)) {
    for (const assignee of assignedTo) {
      if (!assignee.assigneeId) {
        throw new ApiError(400, "Assignee ID is required");
      }

      // Validate assignee exists
      const assigneeEmployee = await Employee.findById(assignee.assigneeId);
      if (!assigneeEmployee) {
        throw new ApiError(404, `Employee not found for ID: ${assignee.assigneeId}`);
      }

      validatedAssignees.push({
        assigneeId: assignee.assigneeId,
        assigneeType: 'Employee',
        name: `${assigneeEmployee.firstName} ${assigneeEmployee.lastName}`,
        email: assigneeEmployee.email,
        employeeCode: assigneeEmployee.employeeId,
        department: assigneeEmployee.department,
        role: assigneeEmployee.designation,
        avatarColor: assignee.avatarColor || `#${Math.floor(Math.random()*16777215).toString(16)}`,
        allocationPercentage: assignee.allocationPercentage || 100,
        startDate: assignee.startDate || new Date(),
        endDate: assignee.endDate,
        isActive: assignee.isActive !== undefined ? assignee.isActive : true
      });
    }
  }

  // Validate task type
  if (taskType && !TASK_CONFIG.taskTypes.includes(taskType)) {
    throw new ApiError(400, `Invalid task type. Must be one of: ${TASK_CONFIG.taskTypes.join(', ')}`);
  }

  // Validate priority
  if (priority && !TASK_CONFIG.priorities.includes(priority)) {
    throw new ApiError(400, `Invalid priority. Must be one of: ${TASK_CONFIG.priorities.join(', ')}`);
  }

  // Create task
  const taskData = {
    projectId,
    title,
    description,
    assignedTo: validatedAssignees,
    priority: priority || 'medium',
    deadline: new Date(deadline),
    taskType: taskType || 'development',
    estimatedHours,
    estimatedCost,
    tags: tags || [],
    dependencies: dependencies || [],
    customFields: customFields || {},
    createdBy: creatorEmployeeId || req.user._id, // Use Employee ID if available, otherwise User ID
    createdByName: creatorName,
    activityLog: [{
      action: 'task_created',
      details: { title, project: project.title },
      performedBy: req.user._id,
      performedByName: creatorName,
      timestamp: new Date()
    }]
  };

  console.log('📝 Task data to save:', taskData);

  const task = await Task.create(taskData);

  // Populate response
  const populatedTask = await Task.findById(task._id)
    .populate('projectId', 'title projectId client status')
    .populate('createdBy', 'firstName lastName email employeeId')
    .populate('assignedTo.assigneeId', 'firstName lastName email employeeId department')
    .lean();

  return res
    .status(201)
    .json(new ApiResponse(201, populatedTask, "Task created successfully"));
});

// Update task
const updateTask = asynchandler(async (req, res) => {
  const { taskId } = req.params;
  const updateData = req.body;

  if (!mongoose.Types.ObjectId.isValid(taskId)) {
    throw new ApiError(400, "Invalid task ID");
  }

  // Find existing task
  const existingTask = await Task.findById(taskId);
  if (!existingTask) {
    throw new ApiError(404, "Task not found");
  }

  // Get updater info
  const updater = await Employee.findById(req.user._id);
  if (!updater) {
    throw new ApiError(404, "Updater not found");
  }

  // Prepare update data with activity logging
  const updatePayload = {
    ...updateData,
    updatedBy: req.user._id,
    updatedByName: `${updater.firstName} ${updater.lastName}`
  };

  // Handle status change
  if (updateData.status && updateData.status !== existingTask.status) {
    updatePayload.statusChangeReason = updateData.statusChangeReason || 'Status updated by user';
    
    // Log status change in activity log
    updatePayload.$push = {
      activityLog: {
        action: 'status_changed',
        details: {
          from: existingTask.status,
          to: updateData.status,
          reason: updateData.statusChangeReason
        },
        performedBy: req.user._id,
        performedByName: `${updater.firstName} ${updater.lastName}`,
        timestamp: new Date()
      }
    };
  }

  // Handle assignee changes
  if (updateData.assignedTo) {
    // Log assignment changes
    const newAssigneeIds = updateData.assignedTo.map(a => a.assigneeId?.toString());
    const oldAssigneeIds = existingTask.assignedTo.map(a => a.assigneeId?.toString());
    
    const added = newAssigneeIds.filter(id => !oldAssigneeIds.includes(id));
    const removed = oldAssigneeIds.filter(id => !newAssigneeIds.includes(id));
    
    if (added.length > 0 || removed.length > 0) {
      updatePayload.$push = updatePayload.$push || {};
      updatePayload.$push.activityLog = {
        action: 'assignment_updated',
        details: {
          added: added,
          removed: removed
        },
        performedBy: req.user._id,
        performedByName: `${updater.firstName} ${updater.lastName}`,
        timestamp: new Date()
      };
    }
  }

  // Update task
  const updatedTask = await Task.findByIdAndUpdate(
    taskId,
    updatePayload,
    { new: true, runValidators: true }
  )
  .populate('projectId', 'title projectId client status')
  .populate('assignedTo.assigneeId', 'firstName lastName email employeeId department')
  .populate('createdBy', 'firstName lastName email')
  .lean();

  return res
    .status(200)
    .json(new ApiResponse(200, updatedTask, "Task updated successfully"));
});

// Get task details
const getTaskDetails = asynchandler(async (req, res) => {
  const { taskId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(taskId)) {
    throw new ApiError(400, "Invalid task ID");
  }

  const task = await Task.findById(taskId)
    .populate('projectId', 'title projectId client status startDate deadline budget')
    .populate('assignedTo.assigneeId', 'firstName lastName email employeeId department designation avatarColor')
    .populate('createdBy', 'firstName lastName email')
    .populate('dependencies.taskId', 'title taskId status priority deadline')
    .populate('comments.commentedBy', 'firstName lastName email')
    .populate('activityLog.performedBy', 'firstName lastName email')
    .populate('statusHistory.changedBy', 'firstName lastName email')
    .lean();

  if (!task) {
    throw new ApiError(404, "Task not found");
  }

  // Calculate dynamic fields
  const daysLeft = task.deadline 
    ? Math.ceil((new Date(task.deadline) - new Date()) / (1000 * 60 * 60 * 24))
    : null;
  
  task.dynamicInfo = {
    isOverdue: daysLeft < 0 && !['completed', 'cancelled'].includes(task.status),
    daysLeft: daysLeft,
    completionPercentage: task.calculateProgress ? task.calculateProgress() : (task.progress || 0),
    isActive: task.status !== 'completed' && task.status !== 'cancelled'
  };

  return res
    .status(200)
    .json(new ApiResponse(200, task, "Task details fetched successfully"));
});

// Get my tasks (tasks assigned to current user)
const getMyTasks = asynchandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    status,
    priority,
    sortBy = '-createdAt'
  } = req.query;

  // Build filter for tasks assigned to current user
  const filter = {
    'assignedTo.assigneeId': req.user._id,
    'assignedTo.assigneeType': 'Employee',
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

  // Parse pagination
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;

  // Get total count
  const total = await Task.countDocuments(filter);

  // Build sort
  const sortOptions = {};
  if (sortBy) {
    const direction = sortBy.startsWith('-') ? -1 : 1;
    const field = sortBy.replace(/^-/, '');
    sortOptions[field] = direction;
  }

  // Get tasks
  const tasks = await Task.find(filter)
    .populate('projectId', 'title projectId client status')
    .populate('createdBy', 'firstName lastName email')
    .sort(sortOptions)
    .skip(skip)
    .limit(limitNum)
    .lean();

  // Calculate dynamic info for each task
  const enhancedTasks = tasks.map(task => {
    const daysLeft = task.deadline 
      ? Math.ceil((new Date(task.deadline) - new Date()) / (1000 * 60 * 60 * 24))
      : null;
    
    return {
      ...task,
      dynamicInfo: {
        isOverdue: daysLeft < 0 && !['completed', 'cancelled'].includes(task.status),
        daysLeft: daysLeft,
        needsAttention: daysLeft <= 3 && daysLeft >= 0 && task.status !== 'completed',
        completionPercentage: task.progress || 0
      }
    };
  });

  return res.status(200).json(
    new ApiResponse(200, {
      tasks: enhancedTasks,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    }, "My tasks fetched successfully")
  );
});

// Add task comment
const addTaskComment = asynchandler(async (req, res) => {
  const { taskId } = req.params;
  const { content, attachments } = req.body;

  if (!mongoose.Types.ObjectId.isValid(taskId)) {
    throw new ApiError(400, "Invalid task ID");
  }

  if (!content || content.trim() === '') {
    throw new ApiError(400, "Comment content is required");
  }

  // Get commenter info
  const commenter = await Employee.findById(req.user._id);
  if (!commenter) {
    throw new ApiError(404, "Commenter not found");
  }

  const comment = {
    content: content.trim(),
    commentedBy: req.user._id,
    commentedByName: `${commenter.firstName} ${commenter.lastName}`,
    createdAt: new Date(),
    attachments: attachments || []
  };

  const updatedTask = await Task.findByIdAndUpdate(
    taskId,
    {
      $push: { 
        comments: comment,
        activityLog: {
          action: 'comment_added',
          details: { commentLength: content.length },
          performedBy: req.user._id,
          performedByName: `${commenter.firstName} ${commenter.lastName}`,
          timestamp: new Date()
        }
      }
    },
    { new: true }
  )
  .populate('comments.commentedBy', 'firstName lastName email avatarColor')
  .lean();

  if (!updatedTask) {
    throw new ApiError(404, "Task not found");
  }

  // Return the newly added comment
  const newComment = updatedTask.comments[updatedTask.comments.length - 1];

  return res
    .status(201)
    .json(new ApiResponse(201, newComment, "Comment added successfully"));
});

// Delete task
const deleteTask = asynchandler(async (req, res) => {
  const { taskId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(taskId)) {
    throw new ApiError(400, "Invalid task ID");
  }

  const task = await Task.findByIdAndDelete(taskId);

  if (!task) {
    throw new ApiError(404, "Task not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Task deleted successfully"));
});

// Get project tasks (your existing route)
const getProjectTasks = asynchandler(async (req, res) => {
  const { projectId } = req.params;
  
  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    throw new ApiError(400, "Invalid project ID");
  }

  const tasks = await Task.find({ projectId, isArchived: false })
    .populate('assignedTo.assigneeId', 'firstName lastName email')
    .sort('-createdAt')
    .lean();

  return res
    .status(200)
    .json(new ApiResponse(200, tasks, "Project tasks fetched successfully"));
});

const getAvailableAssignees = asynchandler(async (req, res) => {
  try {
    const { projectId } = req.query;
    
    console.log('🔍 Fetching assignees for project ID:', projectId);
    
    if (!projectId) {
      console.log('⚠️ No projectId provided');
      return res
        .status(200)
        .json(new ApiResponse(200, [], "No project ID provided"));
    }
    
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      console.log('⚠️ Invalid projectId format:', projectId);
      return res
        .status(200)
        .json(new ApiResponse(200, [], "Invalid project ID format"));
    }

    // 1. Find the ProjectTeam document for this project
    const projectTeam = await ProjectTeam.findOne({ projectId: projectId });
    
    console.log('📊 ProjectTeam found:', projectTeam ? '✅ Yes' : '❌ No');
    
    if (!projectTeam) {
      console.log('📝 No ProjectTeam found for this project');
      return res
        .status(200)
        .json(new ApiResponse(200, [], "No team assigned to this project"));
    }

    // Debug: Check project team structure
    console.log('👥 Team members count in ProjectTeam:', projectTeam.teamMembers?.length || 0);
    
    let assignees = [];
    
    // 2. Check if teamMembers array exists and has data
    if (projectTeam.teamMembers && Array.isArray(projectTeam.teamMembers) && projectTeam.teamMembers.length > 0) {
      console.log('🔄 Processing team members:', projectTeam.teamMembers.length);
      
      // Extract employee IDs from teamMembers array
      const employeeIds = projectTeam.teamMembers
        .filter(member => {
          // Check if member has employeeId
          if (!member.employeeId) {
            console.log(`⚠️ Team member has no employeeId:`, member);
            return false;
          }
          
          // Convert employeeId to string for validation
          const employeeIdStr = member.employeeId.toString ? member.employeeId.toString() : String(member.employeeId);
          
          if (!mongoose.Types.ObjectId.isValid(employeeIdStr)) {
            console.log(`⚠️ Invalid employeeId format: ${employeeIdStr}`, member);
            return false;
          }
          
          // Check if member is active (default to true if not specified)
          const isActive = member.isActive !== false;
          if (!isActive) {
            console.log(`⚠️ Team member is not active: ${member.name || 'unnamed'}`);
            return false;
          }
          
          return true;
        })
        .map(member => {
          try {
            return new mongoose.Types.ObjectId(member.employeeId);
          } catch (error) {
            console.error('❌ Error converting employeeId to ObjectId:', member.employeeId, error);
            return null;
          }
        })
        .filter(id => id !== null);

      console.log('🎯 Valid employee IDs to fetch:', employeeIds.length);
      
      if (employeeIds.length > 0) {
        // 3. Fetch detailed employee information
        const employees = await Employee.find({
          _id: { $in: employeeIds },
          isActive: true,
          status: 'active'
        })
        .select('_id firstName lastName email employeeId department designation role avatarColor')
        .sort('firstName')
        .lean();

        console.log('👤 Employees found in database:', employees.length);
        
        // 4. Create a map of employee details for quick lookup
        const employeeMap = {};
        employees.forEach(emp => {
          employeeMap[emp._id.toString()] = emp;
        });

        // 5. Map the team members with their details
        assignees = projectTeam.teamMembers
          .filter(teamMember => {
            if (!teamMember.employeeId) return false;
            
            const employeeIdStr = teamMember.employeeId.toString ? teamMember.employeeId.toString() : String(teamMember.employeeId);
            const isValidId = mongoose.Types.ObjectId.isValid(employeeIdStr);
            const isActive = teamMember.isActive !== false;
            
            return isValidId && isActive;
          })
          .map(teamMember => {
            const employeeIdStr = teamMember.employeeId.toString ? teamMember.employeeId.toString() : String(teamMember.employeeId);
            const employeeDetails = employeeMap[employeeIdStr];
            
            if (employeeDetails) {
              return {
                _id: employeeDetails._id,
                name: `${employeeDetails.firstName} ${employeeDetails.lastName}`,
                firstName: employeeDetails.firstName,
                lastName: employeeDetails.lastName,
                email: employeeDetails.email || teamMember.email,
                employeeId: employeeDetails.employeeId,
                employeeCode: employeeDetails.employeeId,
                department: employeeDetails.department || teamMember.department,
                designation: employeeDetails.designation || employeeDetails.role || teamMember.role,
                role: teamMember.role,
                avatarColor: employeeDetails.avatarColor || `#${Math.floor(Math.random()*16777215).toString(16)}`,
                assigneeType: 'Employee',
                allocationPercentage: teamMember.allocationPercentage || 100,
                startDate: teamMember.startDate,
                endDate: teamMember.endDate
              };
            } else {
              // If employee not found in Employee collection, use data from ProjectTeam
              return {
                _id: teamMember.employeeId,
                name: teamMember.name || 'Unknown',
                firstName: teamMember.name?.split(' ')[0] || 'Unknown',
                lastName: teamMember.name?.split(' ').slice(1).join(' ') || '',
                email: teamMember.email || '',
                employeeId: teamMember.employeeId,
                employeeCode: teamMember.employeeId,
                department: teamMember.department || '',
                designation: teamMember.role,
                role: teamMember.role,
                avatarColor: `#${Math.floor(Math.random()*16777215).toString(16)}`,
                assigneeType: 'Employee',
                allocationPercentage: teamMember.allocationPercentage || 100,
                startDate: teamMember.startDate,
                endDate: teamMember.endDate
              };
            }
          })
          .filter(assignee => assignee !== null);
      }
    }

    console.log('✅ Final assignees count:', assignees.length);
    console.log('📋 Assignees:', assignees.map(a => ({ name: a.name, id: a._id })));
    
    return res
      .status(200)
      .json(new ApiResponse(200, assignees, "Available assignees fetched successfully"));
  } catch (error) {
    console.error('❌ Detailed error fetching assignees:', error);
    console.error('📜 Error stack:', error.stack);
    throw new ApiError(500, `Error fetching assignees: ${error.message}`);
  }
});

// Get task configuration (statuses, priorities, types)
const getTaskConfiguration = asynchandler(async (req, res) => {
  const config = {
    statuses: TASK_CONFIG.statuses.map(status => ({
      value: status,
      label: status.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
      color: getStatusColor(status),
      icon: getStatusIcon(status)
    })),
    priorities: TASK_CONFIG.priorities.map(priority => ({
      value: priority,
      label: priority.charAt(0).toUpperCase() + priority.slice(1),
      color: getPriorityColor(priority),
      icon: getPriorityIcon(priority)
    })),
    taskTypes: TASK_CONFIG.taskTypes.map(type => ({
      value: type,
      label: type.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
      color: getTaskTypeColor(type),
      icon: getTaskTypeIcon(type)
    })),
    assigneeTypes: TASK_CONFIG.assigneeTypes
  };

  return res
    .status(200)
    .json(new ApiResponse(200, config, "Task configuration fetched successfully"));
});

// Helper functions for configuration
function getStatusColor(status) {
  const colors = {
    'todo': 'default',
    'in-progress': 'primary',
    'review': 'warning',
    'completed': 'success',
    'on-hold': 'info',
    'cancelled': 'error'
  };
  return colors[status] || 'default';
}

function getStatusIcon(status) {
  const icons = {
    'todo': 'mingcute:time-line',
    'in-progress': 'mingcute:progress-line',
    'review': 'mingcute:eye-line',
    'completed': 'mingcute:check-circle-line',
    'on-hold': 'mingcute:pause-circle-line',
    'cancelled': 'mingcute:close-circle-line'
  };
  return icons[status] || 'mingcute:help-line';
}

function getPriorityColor(priority) {
  const colors = {
    'low': 'success',
    'medium': 'info',
    'high': 'warning',
    'critical': 'error'
  };
  return colors[priority] || 'default';
}

function getPriorityIcon(priority) {
  const icons = {
    'low': 'mingcute:flag-1-line',
    'medium': 'mingcute:flag-line',
    'high': 'mingcute:flag-2-line',
    'critical': 'mingcute:alert-line'
  };
  return icons[priority] || 'mingcute:help-line';
}

function getTaskTypeColor(type) {
  const colors = {
    'development': '#1976d2',
    'design': '#2e7d32',
    'testing': '#ed6c02',
    'documentation': '#7b1fa2',
    'meeting': '#00838f',
    'research': '#5d4037',
    'bug-fix': '#d32f2f',
    'feature': '#388e3c',
    'other': '#757575'
  };
  return colors[type] || '#757575';
}

function getTaskTypeIcon(type) {
  const icons = {
    'development': 'mingcute:code-line',
    'design': 'mingcute:palette-line',
    'testing': 'mingcute:bug-line',
    'documentation': 'mingcute:file-document-line',
    'meeting': 'mingcute:calendar-line',
    'research': 'mingcute:search-line',
    'bug-fix': 'mingcute:bug-2-line',
    'feature': 'mingcute:rocket-line',
    'other': 'mingcute:more-1-line'
  };
  return icons[type] || 'mingcute:help-line';
}

export {
  getTasks,          // New: Get all tasks with dynamic filtering
  getTaskStatistics, // Enhanced: More comprehensive statistics
  createTask,        // Enhanced: Dynamic task creation
  updateTask,        // Enhanced: Better update handling
  deleteTask,        // Existing
  getTaskDetails,    // Enhanced: More detailed task info
  addTaskComment,    // Existing
  getMyTasks,        // Enhanced: Better filtering for user tasks
  getProjectTasks,   // Existing: For backward compatibility
  getAvailableAssignees,  // New: Get assignees for dropdowns
  getTaskConfiguration    // New: Get all config options
};