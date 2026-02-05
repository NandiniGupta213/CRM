// src/controllers/project.controller.js
import { asynchandler } from "../utils/asynchHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { Project } from "../models/project.model.js";
import { Client } from "../models/client.model.js";
import { User } from "../models/user.model.js";
import mongoose from "mongoose";

// Generate project ID
const generateProjectId = async () => {
  const count = await Project.countDocuments();
  return `PROJ-${String(count + 1).padStart(3, '0')}`;
};

// Create new project
const createProject = asynchandler(async (req, res) => {
  const {
    title,
    client,
    manager,
    description,
    projectType,
    startDate,
    deadline,
    estimatedHours,
    budget,
    billingType,
    billingRate,
    isBillable = false,
    priority = 'medium',
    teamMembers = [],
    tags = []
  } = req.body;

  // Check required fields
  const requiredFields = ['title', 'client', 'manager', 'projectType', 'startDate', 'deadline'];
  for (const field of requiredFields) {
    if (!req.body[field]?.toString().trim()) {
      throw new ApiError(400, `${field} is required`);
    }
  }

  // Validate dates
  const start = new Date(startDate);
  const end = new Date(deadline);
  if (start >= end) {
    throw new ApiError(400, "Deadline must be after start date");
  }

  // Check if client exists
  const clientExists = await Client.findById(client);
  if (!clientExists) {
    throw new ApiError(404, "Client not found");
  }

  // Check if manager exists
  const managerExists = await User.findById(manager);
  if (!managerExists) {
    throw new ApiError(404, "Manager not found");
  }

  // Generate project ID
  const projectId = await generateProjectId();

  // Create project
  const project = await Project.create({
    projectId,
    title: title.trim(),
    client,
    manager,
    description: description.trim(),
    projectType,
    startDate: start,
    deadline: end,
    estimatedHours: estimatedHours || 0,
    budget: budget || 0,
    billingType: billingType || 'fixed',
    billingRate: billingRate || 0,
    isBillable,
    priority,
    teamMembers: teamMembers.map(member => ({
      user: member.user,
      role: member.role || 'developer'
    })),
    tags,
    createdBy: req.user._id
  });

  const createdProject = await Project.findById(project._id)
    .populate('client', 'name companyName email phone')
    .populate('manager', 'name email')
    .populate('teamMembers.user', 'name email role')
    .select("-__v");

  // ✅ CRITICAL: Update client's project stats
  try {
    await Client.updateClientStats(client);
    console.log(`Updated client stats after creating project ${projectId}`);
  } catch (error) {
    console.error('Error updating client stats:', error);
    // Don't throw, just log
  }

  return res
    .status(201)
    .json(new ApiResponse(201, createdProject, "Project created successfully"));
});

// Get all projects
const getAllProjects = asynchandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search = '',
    status = '',
    client = '',
    manager = '',
    sort = '-createdAt'
  } = req.query;

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  // Build filter
  const filter = {};
  
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { projectId: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  if (status && ['planned', 'in-progress', 'completed', 'on-hold', 'cancelled'].includes(status)) {
    filter.status = status;
  }

  if (client) {
    filter.client = new mongoose.Types.ObjectId(client);
  }

  if (manager) {
    filter.manager = new mongoose.Types.ObjectId(manager);
  }

  // Get total count
  const total = await Project.countDocuments(filter);

  // Get projects with populated fields
  const projects = await Project.find(filter)
    .populate('client', 'name companyName email phone')
    .populate('manager', 'name email')
    .populate('teamMembers.user', 'name email role')
    .select("-__v")
    .sort(sort)
    .skip(skip)
    .limit(limitNum);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {
          projects,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum)
          }
        },
        "Projects fetched successfully"
      )
    );
});

// Get single project
const getProject = asynchandler(async (req, res) => {
  const { id } = req.params;

  const project = await Project.findById(id)
    .populate('client', 'name companyName email phone address city state postalCode gstNumber')
    .populate('manager', 'name email phone department')
    .populate('teamMembers.user', 'name email phone role department')
    .populate('createdBy', 'name email')
    .populate('notes.addedBy', 'name email')
    .select("-__v");
  
  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, project, "Project fetched successfully"));
});

// Update project
const updateProject = asynchandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  // Remove fields that shouldn't be updated
  delete updateData.createdBy;
  delete updateData._id;
  delete updateData.projectId;

  // Store the original project to check client changes
  const originalProject = await Project.findById(id);
  if (!originalProject) {
    throw new ApiError(404, "Project not found");
  }

  // Handle milestone updates
  if (updateData.milestones) {
    // Update milestones
    originalProject.milestones = updateData.milestones;
    
    // Recalculate progress
    originalProject.progress = originalProject.calculateProgress();
    
    // If all milestones are completed, mark project as completed
    const allCompleted = originalProject.milestones.every(m => m.status === 'completed');
    if (allCompleted && originalProject.milestones.length > 0) {
      originalProject.status = 'completed';
      originalProject.actualEndDate = new Date();
    }

    await originalProject.save();
  } else {
    // Update other fields
    const project = await Project.findByIdAndUpdate(
      id,
      { $set: updateData },
      { 
        new: true,
        runValidators: true 
      }
    )
    .populate('client', 'name companyName email phone')
    .populate('manager', 'name email')
    .populate('teamMembers.user', 'name email role')
    .select("-__v");

    if (!project) {
      throw new ApiError(404, "Project not found");
    }
  }

  const updatedProject = await Project.findById(id)
    .populate('client', 'name companyName email phone')
    .populate('manager', 'name email')
    .select("-__v");

  // ✅ CRITICAL: Update client stats if client changed
  if (updateData.client && updateData.client !== originalProject.client.toString()) {
    try {
      // Update stats for old client
      await Client.updateClientStats(originalProject.client);
      // Update stats for new client
      await Client.updateClientStats(updateData.client);
      console.log(`Updated client stats after project client change for project ${updatedProject.projectId}`);
    } catch (error) {
      console.error('Error updating client stats:', error);
    }
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedProject, "Project updated successfully"));
});

// Update project status - UPDATED with client stats
const updateProjectStatus = asynchandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['planned', 'in-progress', 'completed', 'on-hold', 'cancelled'].includes(status)) {
    throw new ApiError(400, "Invalid status value");
  }

  // Get original project to check old status
  const originalProject = await Project.findById(id);
  if (!originalProject) {
    throw new ApiError(404, "Project not found");
  }

  const updateData = { status };
  
  // If marking as completed, set actual end date
  if (status === 'completed') {
    updateData.actualEndDate = new Date();
    updateData.progress = 100;
  }

  // If moving from completed to another status, clear actual end date
  if (originalProject.status === 'completed' && status !== 'completed') {
    updateData.actualEndDate = null;
  }

  const updatedProject = await Project.findByIdAndUpdate(
    id,
    { $set: updateData },
    { 
      new: true,
      runValidators: true 
    }
  )
  .populate('client', 'name companyName email phone')
  .populate('manager', 'name email')
  .select("-__v");

  if (!updatedProject) {
    throw new ApiError(404, "Project not found");
  }

  // ✅ CRITICAL: Update client stats when project status changes
  try {
    if (updatedProject.client) {
      await Client.updateClientStats(updatedProject.client._id);
      console.log(`Updated client stats after project status change for project ${updatedProject.projectId}`);
    }
  } catch (error) {
    console.error('Error updating client stats:', error);
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedProject, "Project status updated successfully"));
});

// Delete project - UPDATED with client stats
const deleteProject = asynchandler(async (req, res) => {
  const { id } = req.params;

  const project = await Project.findById(id);
  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  // Store client ID before deletion
  const clientId = project.client;

  // Delete the project
  await Project.findByIdAndDelete(id);

  // ✅ CRITICAL: Update client stats after deletion
  try {
    if (clientId) {
      await Client.updateClientStats(clientId);
      console.log(`Updated client stats after deleting project ${project.projectId}`);
    }
  } catch (error) {
    console.error('Error updating client stats:', error);
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Project deleted successfully"));
});

// Get project statistics
const getProjectStats = asynchandler(async (req, res) => {
  // Get total projects
  const totalProjects = await Project.countDocuments();
  
  // Get projects by status
  const statusStats = await Project.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  // Convert to object format
  const statusCounts = {
    planned: 0,
    'in-progress': 0,
    completed: 0,
    'on-hold': 0,
    cancelled: 0
  };

  statusStats.forEach(stat => {
    statusCounts[stat._id] = stat.count;
  });

  // Get financial stats
  const financialStats = await Project.aggregate([
    {
      $group: {
        _id: null,
        totalBudget: { $sum: '$budget' },
        totalActualCost: { $sum: '$actualCost' },
        totalEstimatedHours: { $sum: '$estimatedHours' },
        totalActualHours: { $sum: '$actualHours' },
        billableProjects: { $sum: { $cond: ['$isBillable', 1, 0] } }
      }
    }
  ]);

  const financial = financialStats[0] || {
    totalBudget: 0,
    totalActualCost: 0,
    totalEstimatedHours: 0,
    totalActualHours: 0,
    billableProjects: 0
  };

  // Get overdue projects
  const today = new Date();
  const overdueProjects = await Project.countDocuments({
    deadline: { $lt: today },
    status: { $nin: ['completed', 'cancelled'] }
  });

  // Get recent projects (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const recentProjects = await Project.countDocuments({
    createdAt: { $gte: thirtyDaysAgo }
  });

  // Get average progress
  const avgProgress = await Project.aggregate([
    {
      $group: {
        _id: null,
        avgProgress: { $avg: '$progress' }
      }
    }
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {
          totalProjects,
          ...statusCounts,
          ...financial,
          overdueProjects,
          recentProjects,
          avgProgress: avgProgress[0]?.avgProgress || 0,
          completionRate: totalProjects > 0 
            ? Math.round((statusCounts.completed / totalProjects) * 100)
            : 0
        },
        "Project statistics fetched successfully"
      )
    );
});

// Search projects
const searchProjects = asynchandler(async (req, res) => {
  const { query } = req.query;

  if (!query?.trim()) {
    throw new ApiError(400, "Search query is required");
  }

  const projects = await Project.find({
    $or: [
      { title: { $regex: query, $options: 'i' } },
      { projectId: { $regex: query, $options: 'i' } },
      { description: { $regex: query, $options: 'i' } },
      { 'client.name': { $regex: query, $options: 'i' } },
      { 'client.companyName': { $regex: query, $options: 'i' } }
    ]
  })
  .populate('client', 'name companyName')
  .populate('manager', 'name')
  .select("-__v")
  .limit(20);

  return res
    .status(200)
    .json(new ApiResponse(200, projects, "Search results fetched successfully"));
});

// Add milestone to project
const addMilestone = asynchandler(async (req, res) => {
  const { id } = req.params;
  const milestoneData = req.body;

  const project = await Project.findById(id);
  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  project.milestones.push({
    ...milestoneData,
    status: milestoneData.status || 'pending'
  });

  // Recalculate progress
  project.progress = project.calculateProgress();
  await project.save();

  const updatedProject = await Project.findById(id)
    .populate('client', 'name companyName email phone')
    .select("-__v");

  return res
    .status(200)
    .json(new ApiResponse(200, updatedProject, "Milestone added successfully"));
});

// Update milestone
const updateMilestone = asynchandler(async (req, res) => {
  const { id, milestoneId } = req.params;
  const updateData = req.body;

  const project = await Project.findById(id);
  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  const milestone = project.milestones.id(milestoneId);
  if (!milestone) {
    throw new ApiError(404, "Milestone not found");
  }

  // Store old status
  const oldStatus = milestone.status;

  // Update milestone
  Object.assign(milestone, updateData);
  
  // If marking as completed, set completed date
  if (updateData.status === 'completed' && !milestone.completedDate) {
    milestone.completedDate = new Date();
  }

  // Recalculate progress
  project.progress = project.calculateProgress();
  
  // If all milestones are completed, mark project as completed
  const allCompleted = project.milestones.every(m => m.status === 'completed');
  if (allCompleted && project.milestones.length > 0) {
    project.status = 'completed';
    project.actualEndDate = new Date();
  }

  await project.save();

  // ✅ CRITICAL: Update client stats if milestone completion changes project status
  if (oldStatus !== 'completed' && updateData.status === 'completed') {
    try {
      if (project.client) {
        await Client.updateClientStats(project.client);
        console.log(`Updated client stats after milestone completion for project ${project.projectId}`);
      }
    } catch (error) {
      console.error('Error updating client stats:', error);
    }
  }

  const updatedProject = await Project.findById(id)
    .populate('client', 'name companyName email phone')
    .select("-__v");

  return res
    .status(200)
    .json(new ApiResponse(200, updatedProject, "Milestone updated successfully"));
});

// Get projects by client
const getProjectsByClient = asynchandler(async (req, res) => {
  const { clientId } = req.params;

  const projects = await Project.find({ client: clientId })
    .populate('manager', 'name email')
    .select("-__v")
    .sort('-createdAt');

  return res
    .status(200)
    .json(new ApiResponse(200, projects, "Client projects fetched successfully"));
});

// NEW: Get projects for dashboard
const getDashboardProjects = asynchandler(async (req, res) => {
  try {
    // Get recent projects (last 10)
    const recentProjects = await Project.find()
      .populate('client', 'name companyName')
      .populate('manager', 'name email')
      .select('projectId title client manager status progress deadline')
      .sort('-createdAt')
      .limit(10);

    // Get projects by status for chart
    const projectsByStatus = await Project.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get overdue projects
    const today = new Date();
    const overdueProjects = await Project.find({
      deadline: { $lt: today },
      status: { $nin: ['completed', 'cancelled'] }
    })
    .populate('client', 'name')
    .populate('manager', 'name')
    .select('projectId title client manager deadline')
    .limit(5);

    // Get projects nearing deadline (within 7 days)
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    
    const upcomingDeadlines = await Project.find({
      deadline: { $gte: today, $lte: sevenDaysFromNow },
      status: { $in: ['planned', 'in-progress'] }
    })
    .populate('client', 'name')
    .populate('manager', 'name')
    .select('projectId title client manager deadline')
    .limit(5);

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          {
            recentProjects,
            projectsByStatus,
            overdueProjects,
            upcomingDeadlines
          },
          "Dashboard projects data fetched successfully"
        )
      );
      
  } catch (error) {
    console.error('Error fetching dashboard projects:', error);
    throw new ApiError(500, "Failed to fetch dashboard projects data");
  }
});

// NEW: Update project progress
const updateProjectProgress = asynchandler(async (req, res) => {
  const { id } = req.params;
  const { progress } = req.body;

  if (progress === undefined || progress < 0 || progress > 100) {
    throw new ApiError(400, "Valid progress value (0-100) is required");
  }

  const project = await Project.findById(id);
  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  // Update progress
  project.progress = progress;
  
  // If progress is 100%, mark as completed
  if (progress === 100) {
    project.status = 'completed';
    project.actualEndDate = new Date();
  }
  
  await project.save();

  // ✅ CRITICAL: Update client stats if project completed
  if (progress === 100) {
    try {
      if (project.client) {
        await Client.updateClientStats(project.client);
        console.log(`Updated client stats after project completion via progress update for project ${project.projectId}`);
      }
    } catch (error) {
      console.error('Error updating client stats:', error);
    }
  }

  const updatedProject = await Project.findById(id)
    .populate('client', 'name companyName email phone')
    .populate('manager', 'name email')
    .select("-__v");

  return res
    .status(200)
    .json(new ApiResponse(200, updatedProject, "Project progress updated successfully"));
});

export {
  createProject,
  getAllProjects,
  getProject,
  updateProject,
  updateProjectStatus,
  updateProjectProgress, // Added
  deleteProject,
  getProjectStats,
  searchProjects,
  addMilestone,
  updateMilestone,
  getProjectsByClient,
  getDashboardProjects // Added
};