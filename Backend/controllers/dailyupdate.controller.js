// controllers/dailyUpdate.controller.js
import { DailyUpdate } from '../models/dailyupdate.model.js';
import { Task } from '../models/task.model.js';
import { Project } from '../models/project.model.js';
import { User } from '../models/user.model.js';
import { Employee } from '../models/employee.model.js'; // ADD THIS IMPORT
import { ApiResponse } from '../utils/ApiResponse.js';
import { asynchandler } from '../utils/asynchHandler.js';
import mongoose from 'mongoose'; // ADD THIS IMPORT

// Helper function to find employee by userId
const findEmployeeByUserId = async (userId) => {
  try {
    console.log('🔍 Finding employee for userId:', userId);
    
    // Method 1: Direct match by userId field
    let employee = await Employee.findOne({ userId: userId });
    
    if (employee) {
      console.log('✅ Found employee by direct userId match');
      return employee;
    }
    
    // Method 2: Find user first, then match by email
    const userDoc = await User.findById(userId).select('email username employeeRef').lean();
    
    if (userDoc) {
      console.log('👤 Found user:', userDoc.email);
      
      // Try employeeRef if exists
      if (userDoc.employeeRef) {
        employee = await Employee.findById(userDoc.employeeRef);
        if (employee) {
          console.log('✅ Found employee via employeeRef');
          return employee;
        }
      }
      
      // Try matching by email
      if (userDoc.email) {
        employee = await Employee.findOne({ email: userDoc.email });
        if (employee) {
          console.log('✅ Found employee by email match');
          return employee;
        }
      }
      
      // Try matching by username pattern
      if (userDoc.username) {
        employee = await Employee.findOne({
          $or: [
            { email: { $regex: userDoc.username, $options: 'i' } },
            { firstName: { $regex: userDoc.username, $options: 'i' } }
          ]
        });
        
        if (employee) {
          console.log('✅ Found employee by username pattern');
          return employee;
        }
      }
    }
    
    console.log('❌ No employee found for userId:', userId);
    return null;
  } catch (error) {
    console.error('❌ Error in findEmployeeByUserId:', error);
    return null;
  }
};

// Get tasks for employee - FIXED VERSION
export const getEmployeeTasks = asynchandler(async (req, res) => {
  const user = req.user;
  
  if (user.role !== 3) {
    return res.status(403).json(
      new ApiResponse(403, null, 'Only employees can access this view')
    );
  }
  
  try {
    console.log('👤 User from JWT:', {
      userId: user._id,
      email: user.email,
      name: user.name || user.username
    });
    
    // STEP 1: Find the employee record for this user
    const employee = await findEmployeeByUserId(user._id);
    
    if (!employee) {
      console.log('❌ No employee found for user');
      return res.status(200).json(
        new ApiResponse(200, [], 'No employee profile found. Please contact administrator.')
      );
    }
    
    console.log('✅ Found employee:', {
      employeeId: employee._id,
      email: employee.email,
      fullName: `${employee.firstName || ''} ${employee.lastName || ''}`.trim()
    });
    
    // STEP 2: Get tasks assigned to this employee
    const tasks = await Task.find({
      $or: [
        { "assignedTo.assigneeId": employee._id },
        { "assignedTo.email": employee.email }
      ],
      isArchived: false
    })
    .populate({
      path: 'projectId',
      select: 'title manager projectId'
    })
    .select('_id taskId title description deadline status priority taskType projectId createdByName')
    .sort({ deadline: 1 })
    .lean();
    
    console.log(`📋 Found ${tasks.length} tasks for employee`);
    
    // STEP 3: Create or get daily updates for these tasks
    const updates = [];
    
    for (const task of tasks) {
      // Try to find existing daily update
      let update = await DailyUpdate.findOne({
        taskId: task._id,
        employeeId: user._id
      });
      
      if (!update) {
        // Get project manager info
        let projectManagerId = null;
        let projectManagerName = 'Unassigned';
        
        if (task.projectId?.manager) {
          projectManagerId = task.projectId.manager;
          const pmUser = await User.findById(projectManagerId).select('name username email').lean();
          if (pmUser) {
            projectManagerName = pmUser.name || pmUser.username || pmUser.email || 'Unassigned';
          }
        } else if (task.createdByName) {
          projectManagerName = task.createdByName;
        }
        
        // Create new daily update
        update = new DailyUpdate({
          taskId: task._id,
          taskName: task.title,
          projectId: task.projectId?._id || null,
          projectName: task.projectId?.title || 'Unassigned',
          employeeId: user._id,
          employeeName: `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || user.name || user.email,
          projectManagerId: projectManagerId,
          projectManagerName: projectManagerName,
          currentStatus: task.status || 'todo',
          deadline: task.deadline,
          lastUpdate: 'Task assigned',
          lastUpdateTime: new Date(),
          taskDescription: task.description || '',
          taskPriority: task.priority || 'medium',
          taskType: task.taskType || 'general'
        });
        
        console.log('📝 Creating daily update for task:', task.title);
        await update.save();
      }
      
      // Convert to plain object and add task details
      const updateObj = update.toObject ? update.toObject() : update;
      
      updates.push({
        ...updateObj,
        taskDetails: {
          _id: task._id,
          taskId: task.taskId,
          title: task.title,
          description: task.description,
          deadline: task.deadline,
          status: task.status,
          priority: task.priority,
          taskType: task.taskType,
          project: task.projectId ? {
            _id: task.projectId._id,
            title: task.projectId.title,
            projectId: task.projectId.projectId
          } : null
        }
      });
    }
    
    console.log(`✅ Returning ${updates.length} daily updates`);
    
    // Return as array directly (not nested in an object)
    return res.status(200).json(
      new ApiResponse(200, updates, 'Employee tasks fetched successfully')
    );
    
  } catch (error) {
    console.error('❌ Error in getEmployeeTasks:', error);
    return res.status(500).json(
      new ApiResponse(500, [], `Failed to fetch tasks: ${error.message}`)
    );
  }
});

// Get tasks for project manager
export const getPMTasks = asynchandler(async (req, res) => {
  const user = req.user;
  
  if (user.role !== 2) {
    return res.status(403).json(
      new ApiResponse(403, null, 'Only project managers can access this view')
    );
  }
  
  try {
    // Get all daily updates where this PM is the project manager
    const updates = await DailyUpdate.find({
      projectManagerId: user._id
    })
    .populate('employeeId', 'name email')
    .populate('taskId', 'title description')
    .sort({ lastUpdateTime: -1 })
    .lean();
    
    res.status(200).json(
      new ApiResponse(200, updates, 'PM tasks fetched successfully')
    );
  } catch (error) {
    console.error('Error fetching PM tasks:', error);
    res.status(500).json(
      new ApiResponse(500, null, 'Failed to fetch tasks')
    );
  }
});

// Update task status (Employee only)
export const updateTaskStatus = asynchandler(async (req, res) => {
  const user = req.user;
  const { updateId } = req.params;
  const { status, comment } = req.body;
  
  if (user.role !== 3) {
    return res.status(403).json(
      new ApiResponse(403, null, 'Only employees can update task status')
    );
  }
  
  // Validate status
  const validStatuses = ['todo', 'in-progress', 'completed', 'blocked'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json(
      new ApiResponse(400, null, 'Invalid status')
    );
  }
  
  try {
    // Find the update
    const update = await DailyUpdate.findOne({
      _id: updateId,
      employeeId: user._id
    });
    
    if (!update) {
      return res.status(404).json(
        new ApiResponse(404, null, 'Task not found')
      );
    }
    
    // Update the daily update
    update.currentStatus = status;
    update.lastUpdate = comment || `Status changed to ${status}`;
    update.lastUpdateTime = new Date();
    
    // Add comment if provided
    if (comment && comment.trim() !== '') {
      update.comments.push({
        content: comment.trim(),
        authorName: user.name || user.username,
        authorRole: 'employee'
      });
    }
    
    await update.save();
    
    // Also update the main task status
    await Task.findByIdAndUpdate(update.taskId, {
      status: status,
      $push: {
        statusHistory: {
          fromStatus: update.currentStatus,
          toStatus: status,
          changedBy: user._id,
          changedByName: user.name || user.username,
          reason: comment || 'Status updated',
          timestamp: new Date()
        }
      }
    });
    
    res.status(200).json(
      new ApiResponse(200, update, 'Task status updated successfully')
    );
  } catch (error) {
    console.error('Error updating task status:', error);
    res.status(500).json(
      new ApiResponse(500, null, 'Failed to update task status')
    );
  }
});

// Add comment (Both employee and PM)
export const addComment = asynchandler(async (req, res) => {
  const user = req.user;
  const { updateId } = req.params;
  const { content } = req.body;
  
  if (!content || content.trim() === '') {
    return res.status(400).json(
      new ApiResponse(400, null, 'Comment content is required')
    );
  }
  
  try {
    let update;
    let canAccess = false;
    
    if (user.role === 3) {
      // Employee can only comment on their own tasks
      update = await DailyUpdate.findOne({
        _id: updateId,
        employeeId: user._id
      });
      canAccess = true;
    } else if (user.role === 2) {
      // PM can comment on any task they manage
      update = await DailyUpdate.findOne({
        _id: updateId,
        projectManagerId: user._id
      });
      canAccess = true;
    } else {
      return res.status(403).json(
        new ApiResponse(403, null, 'Access denied')
      );
    }
    
    if (!update) {
      return res.status(404).json(
        new ApiResponse(404, null, 'Task not found or access denied')
      );
    }
    
    // Add comment
    update.comments.push({
      content: content.trim(),
      authorName: user.name || user.username,
      authorRole: user.role === 2 ? 'project_manager' : 'employee'
    });
    
    update.lastUpdate = `New comment: ${content.substring(0, 50)}...`;
    update.lastUpdateTime = new Date();
    
    await update.save();
    
    res.status(200).json(
      new ApiResponse(200, update, 'Comment added successfully')
    );
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json(
      new ApiResponse(500, null, 'Failed to add comment')
    );
  }
});