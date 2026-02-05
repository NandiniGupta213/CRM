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
    
    console.log('Current User ID:', currentUser._id);
    
    // Build query array - always check User ID
    const queryConditions = [
      { projectManagerUserId: currentUser._id }
    ];
    
    // Optional: Also check Employee ID if employee exists
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
    
    return res.status(200).json(
      new ApiResponse(200, await enrichProjects(projectTeams), "Projects fetched successfully")
    );
  } catch (error) {
    console.error('Error fetching PM projects:', error);
    throw new ApiError(500, "Error fetching projects");
  }
});

// Helper function to enrich projects with details
async function enrichProjects(projectTeams) {
  // Extract project IDs
  const projectIds = projectTeams.map(team => team.projectId);
  
  // Get projects using the project IDs
  const projects = await Project.find({
    _id: { $in: projectIds }
  })
  .populate('client', 'name companyName email phone city state')
  .populate('manager', 'name email')
  .populate('createdBy', 'name email')
  .sort('-createdAt')
  .lean();
  
  // Create a map for ProjectTeam data
  const projectTeamMap = {};
  projectTeams.forEach(team => {
    projectTeamMap[team.projectId.toString()] = {
      projectTeamName: team.projectName,
      teamMembers: team.teamMembers || [],
      totalTeamSize: team.totalTeamSize || 0,
      teamStatus: team.status || 'active'
    };
  });
  
  // Enrich projects with ProjectTeam data
  return projects.map(project => {
    const projectTeamData = projectTeamMap[project._id.toString()] || {};
    
    return {
      ...project,
      projectTeamName: projectTeamData.projectTeamName || project.title,
      teamMembers: projectTeamData.teamMembers || [],
      totalTeamSize: projectTeamData.totalTeamSize || 0,
      teamStatus: projectTeamData.teamStatus || 'active'
    };
  });
}

// Get clients from PM's projects
const getPMClients = asynchandler(async (req, res) => {
  try {
    const currentUser = req.user;
    
    // Build query array
    const queryConditions = [
      { projectManagerUserId: currentUser._id }
    ];
    
    // Optional: Add Employee ID if exists
    const pmEmployee = await Employee.findOne({ 
      userId: currentUser._id 
    });
    
    if (pmEmployee) {
      queryConditions.push({ projectManager: pmEmployee._id });
    }
    
    // Query with $or
    const projectTeams = await ProjectTeam.find({ 
      $or: queryConditions
    }).select('projectId').lean();
    
    if (projectTeams.length === 0) {
      return res.status(200).json(
        new ApiResponse(200, [], "No clients found")
      );
    }
    
    return res.status(200).json(
      new ApiResponse(200, await extractClients(projectTeams), "Clients fetched successfully")
    );
  } catch (error) {
    console.error('Error fetching PM clients:', error);
    throw new ApiError(500, "Error fetching clients");
  }
});

// Helper function to extract clients
async function extractClients(projectTeams) {
  const projectIds = projectTeams.map(team => team.projectId);
  
  const projects = await Project.find({
    _id: { $in: projectIds },
    client: { $exists: true, $ne: null }
  })
  .populate('client', 'name companyName email phone city state status')
  .select('client')
  .lean();
  
  const clientMap = new Map();
  projects.forEach(project => {
    if (project.client && project.client._id) {
      if (!clientMap.has(project.client._id.toString())) {
        clientMap.set(project.client._id.toString(), {
          ...project.client,
          projectCount: 1
        });
      } else {
        const existingClient = clientMap.get(project.client._id.toString());
        existingClient.projectCount++;
      }
    }
  });
  
  return Array.from(clientMap.values());
}

// Get team members from PM's projects
const getPMTeamMembers = asynchandler(async (req, res) => {
  try {
    const currentUser = req.user;
    
    // Build query array
    const queryConditions = [
      { projectManagerUserId: currentUser._id }
    ];
    
    // Optional: Add Employee ID if exists
    const pmEmployee = await Employee.findOne({ 
      userId: currentUser._id 
    });
    
    if (pmEmployee) {
      queryConditions.push({ projectManager: pmEmployee._id });
    }
    
    // Query with $or
    const projectTeams = await ProjectTeam.find({ 
      $or: queryConditions
    })
    .populate({
      path: 'teamMembers.employeeId',
      select: 'firstName lastName email employeeId department designation roleId userId'
    })
    .populate({
      path: 'projectId',
      select: 'title projectId'
    })
    .lean();
    
    // Extract and format team members
    const teamMembers = [];
    
    projectTeams.forEach(team => {
      if (team.teamMembers && team.teamMembers.length > 0) {
        team.teamMembers.forEach(member => {
          if (member.employeeId) {
            teamMembers.push({
              _id: member.employeeId._id,
              userId: member.employeeId.userId,
              name: `${member.employeeId.firstName} ${member.employeeId.lastName}`,
              email: member.employeeId.email,
              employeeId: member.employeeId.employeeId,
              department: member.employeeId.department,
              designation: member.employeeId.designation,
              role: member.role || 'Team Member',
              memberRole: member.role,
              projectId: team.projectId?.projectId || 'N/A',
              projectTitle: team.projectId?.title || 'Unknown Project',
              allocationPercentage: member.allocationPercentage,
              startDate: member.startDate,
              isActive: member.isActive
            });
          }
        });
      }
    });
    
    // Remove duplicates (same employee in multiple projects)
    const uniqueTeamMembers = teamMembers.filter((member, index, self) =>
      index === self.findIndex(m => 
        m._id.toString() === member._id.toString()
      )
    );
    
    return res.status(200).json(
      new ApiResponse(200, { 
        teamMembers: uniqueTeamMembers,
        totalProjects: projectTeams.length
      }, "Team members fetched successfully")
    );
  } catch (error) {
    console.error('Error fetching PM team members:', error);
    throw new ApiError(500, "Error fetching team members");
  }
});

// Get PM dashboard statistics
const getPMDashboardStats = asynchandler(async (req, res) => {
  try {
    const currentUser = req.user;
    
    // Build query array
    const queryConditions = [
      { projectManagerUserId: currentUser._id }
    ];
    
    // Optional: Add Employee ID if exists
    const pmEmployee = await Employee.findOne({ 
      userId: currentUser._id 
    });
    
    if (pmEmployee) {
      queryConditions.push({ projectManager: pmEmployee._id });
    }
    
    // Query with $or
    const projectTeams = await ProjectTeam.find({ 
      $or: queryConditions
    }).lean();
    
    if (projectTeams.length === 0) {
      return res.status(200).json(
        new ApiResponse(200, {
          totalProjects: 0,
          activeProjects: 0,
          completedProjects: 0,
          plannedProjects: 0,
          onHoldProjects: 0,
          totalTeamMembers: 0,
          totalClients: 0,
          avgProgress: 0,
          projectTeamsCount: 0
        }, "Dashboard statistics fetched successfully")
      );
    }
    
    // Calculate statistics
    const totalProjects = projectTeams.length;
    
    // Get projects to check their status
    const projectIds = projectTeams.map(team => team.projectId);
    const projects = await Project.find({
      _id: { $in: projectIds }
    }).select('status progress').lean();
    
    // Count projects by status
    const activeProjects = projects.filter(p => p.status === 'in-progress').length;
    const completedProjects = projects.filter(p => p.status === 'completed').length;
    const plannedProjects = projects.filter(p => p.status === 'planned').length;
    const onHoldProjects = projects.filter(p => p.status === 'on-hold').length;
    
    // Calculate total team members
    let totalTeamMembers = 0;
    projectTeams.forEach(team => {
      totalTeamMembers += team.teamMembers?.length || 0;
    });
    
    // Get unique clients count
    const uniqueClientIds = new Set();
    for (const team of projectTeams) {
      const project = await Project.findById(team.projectId).select('client').lean();
      if (project?.client) {
        uniqueClientIds.add(project.client.toString());
      }
    }
    
    // Calculate average progress
    const avgProgress = projects.length > 0 
      ? projects.reduce((sum, p) => sum + (p.progress || 0), 0) / projects.length 
      : 0;
    
    return res.status(200).json(
      new ApiResponse(200, {
        totalProjects,
        activeProjects,
        completedProjects,
        plannedProjects,
        onHoldProjects,
        totalTeamMembers,
        totalClients: uniqueClientIds.size,
        avgProgress: Math.round(avgProgress),
        projectTeamsCount: projectTeams.length
      }, "Dashboard statistics fetched successfully")
    );
  } catch (error) {
    console.error('Error fetching PM dashboard stats:', error);
    throw new ApiError(500, "Error fetching dashboard statistics");
  }
});

export {
  getPMProjects,
  getPMClients,
  getPMTeamMembers,
  getPMDashboardStats
};