import { asynchandler } from "../utils/asynchHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { Project } from "../models/project.model.js";
import { Client } from "../models/client.model.js";
import { ProjectTeam } from "../models/projectteam.model.js";
import { Employee } from "../models/employee.model.js";
import { User } from "../models/user.model.js";
import mongoose from "mongoose";

// Get projects assigned to the logged-in PM
const getPMProjects = asynchandler(async (req, res) => {
  try {
    const currentUser = req.user;
    const { status = '', search = '' } = req.query;
    
    console.log('Current User ID:', currentUser._id);
    
    // Build query array - always check User ID in projectManagerUserId
    const queryConditions = [
      { projectManagerUserId: currentUser._id }
    ];
    
    // Optional: Also check Employee ID if employee exists in projectManager field
    const pmEmployee = await Employee.findOne({ 
      userId: currentUser._id 
    });
    
    if (pmEmployee) {
      console.log('Found Employee:', pmEmployee._id);
      queryConditions.push({ projectManager: pmEmployee._id });
    }
    
    // Query ProjectTeam with $or
    const projectTeams = await ProjectTeam.find({ 
      $or: queryConditions
    })
    .select('projectId projectName teamMembers totalTeamSize status')
    .lean();
    
    console.log('Found ProjectTeams:', projectTeams.length);
    
    if (projectTeams.length === 0) {
      return res.status(200).json(
        new ApiResponse(200, [], "No projects assigned to you as project manager")
      );
    }
    
    // Build project query
    const projectIds = projectTeams.map(team => team.projectId);
    const projectQuery = { 
      _id: { $in: projectIds }
    };
    
    // Apply status filter
    if (status && status.trim() !== '') {
      projectQuery.status = status;
    }
    
    // Apply search filter
    if (search && search.trim() !== '') {
      projectQuery.$or = [
        { title: { $regex: search, $options: 'i' } },
        { projectId: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Get project details
    const projects = await Project.find(projectQuery)
      .populate('client', 'name companyName email phone')
      .populate('manager', 'name email phone')
      .sort('-createdAt')
      .lean();
    
    // Create map for ProjectTeam data
    const projectTeamMap = {};
    projectTeams.forEach(team => {
      projectTeamMap[team.projectId.toString()] = {
        projectTeamId: team._id,
        projectTeamName: team.projectName,
        teamStatus: team.status,
        teamMembers: team.teamMembers || [],
        totalTeamSize: team.totalTeamSize || 0
      };
    });
    
    // Enrich project data
    const enrichedProjects = projects.map(project => {
      const projectTeamData = projectTeamMap[project._id.toString()] || {};
      
      // Calculate days left
      let daysLeft = null;
      let actualStatus = project.status;
      
      if (project.deadline) {
        const today = new Date();
        const deadline = new Date(project.deadline);
        const diffTime = deadline.getTime() - today.getTime();
        daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (daysLeft < 0 && project.status === 'in-progress') {
          actualStatus = 'delayed';
        }
      }

      return {
        // Project data
        ...project,
        
        // ProjectTeam data
        projectTeamId: projectTeamData.projectTeamId,
        projectTeamName: projectTeamData.projectTeamName || project.title,
        teamStatus: projectTeamData.teamStatus || 'active',
        teamMembers: projectTeamData.teamMembers || [],
        totalTeamSize: projectTeamData.totalTeamSize || 0,
        
        // Calculated fields
        daysLeft: daysLeft,
        actualStatus: actualStatus,
        isProjectManager: true,
        
        // Progress
        milestoneProgress: project.milestones?.length > 0 ? 
          Math.round((project.milestones.filter(m => m.status === 'completed').length / 
                     project.milestones.length) * 100) : 0
      };
    });
    
    return res.status(200).json(
      new ApiResponse(200, enrichedProjects, "Projects fetched successfully")
    );
  } catch (error) {
    console.error('Error fetching PM projects:', error);
    throw new ApiError(500, "Error fetching projects");
  }
});

// Update project status (PM only)
const updateProjectStatus = asynchandler(async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    
    const {
      status,
      progressPercentage,
      delayReason,
      description,
      remarks
    } = req.body;

    console.log('Updating project:', id);
    console.log('User:', userId);
    console.log('Update data:', req.body);

    // Find project
    const project = await Project.findById(id);
    
    if (!project) {
      throw new ApiError(404, "Project not found");
    }

    console.log('Found project:', project.title);
    console.log('Project manager:', project.manager);
    console.log('Current user:', userId);

    // Check if user is the project manager
    if (project.manager.toString() !== userId.toString() && req.user.role !== 1) {
      throw new ApiError(403, "Only the assigned project manager can update status");
    }

    // Validate delay reason for delayed status
    if (status === 'delayed' && (!delayReason || delayReason.trim() === '')) {
      throw new ApiError(400, "Delay reason is required when status is Delayed");
    }

    // Validate progress percentage
    if (progressPercentage < 0 || progressPercentage > 100) {
      throw new ApiError(400, "Progress percentage must be between 0 and 100");
    }

    // Update project fields
    project.status = status;
    project.progress = progressPercentage;
    
    // Set actual end date if completed
    if (status === 'completed' && project.status !== 'completed') {
      project.actualEndDate = new Date();
      project.progress = 100;
    }
    
    // Clear actual end date if moving from completed
    if (project.status === 'completed' && status !== 'completed') {
      project.actualEndDate = null;
    }

    // Add to notes if description provided
    if (description) {
      project.notes = project.notes || [];
      project.notes.push({
        content: `Status Update: ${description}`,
        addedBy: userId,
        addedAt: new Date()
      });
    }

    // Add delay reason to notes if provided
    if (delayReason && status === 'delayed') {
      project.notes = project.notes || [];
      project.notes.push({
        content: `Delay Reason: ${delayReason}`,
        addedBy: userId,
        addedAt: new Date()
      });
    }

    // Add remarks to notes if provided
    if (remarks) {
      project.notes = project.notes || [];
      project.notes.push({
        content: `Remarks: ${remarks}`,
        addedBy: userId,
        addedAt: new Date()
      });
    }

    // Save the updated project
    const updatedProject = await project.save();

    // Populate for response
    const populatedProject = await Project.findById(updatedProject._id)
      .populate('client', 'name companyName email phone')
      .populate('manager', 'name email phone')
      .populate('notes.addedBy', 'name email')
      .lean();

    console.log('Project updated successfully');

    return res.status(200).json(
      new ApiResponse(200, populatedProject, "Project status updated successfully")
    );
  } catch (error) {
    console.error('Error updating project status:', error);
    throw new ApiError(500, "Failed to update project status");
  }
});

// Get project statistics for dashboard
const getProjectStats = asynchandler(async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;

    let query = { status: { $ne: 'cancelled' } };
    
    // PM can only see their projects
    if (userRole === 2) {
      // Find Employee record for this User
      const pmEmployee = await Employee.findOne({ 
        userId: userId 
      });
      
      // Build query array for ProjectTeam
      const queryConditions = [
        { projectManagerUserId: userId }
      ];
      
      if (pmEmployee) {
        queryConditions.push({ projectManager: pmEmployee._id });
      }
      
      // Get project teams
      const projectTeams = await ProjectTeam.find({ 
        $or: queryConditions
      }).select('projectId').lean();
      
      if (projectTeams.length === 0) {
        return res.status(200).json(
          new ApiResponse(200, {
            stats: {
              totalProjects: 0,
              totalBudget: 0,
              totalEstimatedHours: 0,
              inProgress: 0,
              delayed: 0,
              completed: 0,
              onHold: 0,
              planned: 0,
              averageProgress: 0
            },
            recentUpdates: []
          }, "Project statistics fetched successfully")
        );
      }
      
      const projectIds = projectTeams.map(team => team.projectId);
      query._id = { $in: projectIds };
    }

    const projects = await Project.find(query);

    // Calculate statistics
    const stats = {
      totalProjects: projects.length,
      totalBudget: projects.reduce((sum, p) => sum + (p.budget || 0), 0),
      totalEstimatedHours: projects.reduce((sum, p) => sum + (p.estimatedHours || 0), 0),
      inProgress: 0,
      delayed: 0,
      completed: 0,
      onHold: 0,
      planned: 0,
      averageProgress: 0
    };

    let totalProgress = 0;
    
    projects.forEach(project => {
      // Count statuses
      if (project.status === 'in-progress') stats.inProgress++;
      else if (project.status === 'delayed') stats.delayed++;
      else if (project.status === 'completed') stats.completed++;
      else if (project.status === 'on-hold') stats.onHold++;
      else if (project.status === 'planned') stats.planned++;
      
      totalProgress += project.progress || 0;
    });

    stats.averageProgress = projects.length > 0 
      ? Math.round(totalProgress / projects.length) 
      : 0;

    // Get recent updates
    const recentUpdates = await Project.find(query)
      .sort('-updatedAt')
      .limit(5)
      .select('title projectId status progress startDate deadline updatedAt')
      .populate('manager', 'name email')
      .populate('client', 'name companyName');

    return res.status(200).json(
      new ApiResponse(200, {
        stats,
        recentUpdates
      }, "Project statistics fetched successfully")
    );
  } catch (error) {
    console.error('Error fetching project stats:', error);
    throw new ApiError(500, "Failed to fetch project statistics");
  }
});

// Get single project by ID
const getProjectById = asynchandler(async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;

    console.log('Getting project by ID:', id);
    console.log('User role:', userRole);

    // Find project
    let project;
    
    if (userRole === 1) { // Admin
      project = await Project.findById(id)
        .populate('client', 'name companyName email phone address')
        .populate('manager', 'name email phone department')
        .populate('teamMembers.user', 'name email role department avatar')
        .populate('notes.addedBy', 'name email avatar')
        .lean();
    } else if (userRole === 2) { // Project Manager
      // First check if user is project manager via ProjectTeam
      const pmEmployee = await Employee.findOne({ 
        userId: userId 
      });
      
      // Build query array for ProjectTeam
      const queryConditions = [
        { projectManagerUserId: userId }
      ];
      
      if (pmEmployee) {
        queryConditions.push({ projectManager: pmEmployee._id });
      }
      
      // Check if project exists in user's project teams
      const projectTeam = await ProjectTeam.findOne({
        projectId: id,
        $or: queryConditions
      });
      
      if (!projectTeam) {
        throw new ApiError(403, "You do not have permission to view this project");
      }
      
      // Get project details
      project = await Project.findById(id)
        .populate('client', 'name companyName email phone address')
        .populate('manager', 'name email phone department')
        .populate('teamMembers.user', 'name email role department avatar')
        .populate('notes.addedBy', 'name email avatar')
        .lean();
    } else {
      throw new ApiError(403, "You do not have permission to view project details");
    }

    if (!project) {
      throw new ApiError(404, "Project not found");
    }

    // Calculate additional metrics
    if (project.deadline) {
      const today = new Date();
      const deadline = new Date(project.deadline);
      const diffTime = deadline.getTime() - today.getTime();
      project.daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (project.daysLeft < 0 && project.status === 'in-progress') {
        project.actualStatus = 'delayed';
      } else {
        project.actualStatus = project.status;
      }
    }

    // Get ProjectTeam data
    const projectTeam = await ProjectTeam.findOne({
      projectId: id
    }).select('teamMembers totalTeamSize status');

    if (projectTeam) {
      project.teamMembers = projectTeam.teamMembers || [];
      project.totalTeamSize = projectTeam.totalTeamSize || 0;
      project.teamStatus = projectTeam.status || 'active';
    }

    return res.status(200).json(
      new ApiResponse(200, project, "Project details fetched successfully")
    );
  } catch (error) {
    console.error('Error fetching project:', error);
    throw new ApiError(500, "Failed to fetch project details");
  }
});

export {
  getPMProjects,
  updateProjectStatus,
  getProjectStats,
  getProjectById
};