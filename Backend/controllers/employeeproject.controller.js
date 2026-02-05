// src/controllers/employeeproject.controller.js
import { asynchandler } from "../utils/asynchHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { Project } from "../models/project.model.js";
import { ProjectTeam } from "../models/projectteam.model.js";
import { Employee } from "../models/employee.model.js";
import mongoose from "mongoose";

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

// Get project statistics for current user
const getMyProjectStats = asynchandler(async (req, res) => {
  try {
    const currentUserId = req.user._id;

    // STEP 1: Find current user's Employee record
    const currentEmployee = await Employee.findOne({ 
      userId: currentUserId 
    }).select('_id roleId');
    
    if (!currentEmployee) {
      return res.status(200).json(
        new ApiResponse(200, {
          totalProjects: 0,
          plannedProjects: 0,
          inProgressProjects: 0,
          completedProjects: 0,
          onHoldProjects: 0,
          cancelledProjects: 0,
          delayedProjects: 0,
          averageProgress: 0,
          upcomingDeadlines: 0,
          userRole: 'Unknown',
          statusDistribution: {
            planned: 0,
            'in-progress': 0,
            completed: 0,
            'on-hold': 0,
            cancelled: 0
          }
        }, "No employee record found")
      );
    }

    // STEP 2: Get projects where user is manager
    const managerProjects = await Project.find({
      manager: currentUserId,
      isActive: true
    });

    // STEP 3: Get ALL ProjectTeam entries and check user involvement
    const allProjectTeams = await ProjectTeam.find({
      status: 'active'
    })
    .populate({
      path: 'projectManager',
      select: '_id'
    })
    .populate({
      path: 'teamMembers.employeeId',
      select: '_id userId',
      model: 'Employee'
    })
    .lean();

    // Filter ProjectTeams where current user is involved
    const relevantProjectIds = [];
    
    for (const projectTeam of allProjectTeams) {
      let isUserInvolved = false;
      
      // Check if user is the Project Manager
      if (projectTeam.projectManager && 
          projectTeam.projectManager._id.toString() === currentUserId.toString()) {
        isUserInvolved = true;
      }
      
      // Check if user is in team members
      if (!isUserInvolved && projectTeam.teamMembers && projectTeam.teamMembers.length > 0) {
        for (const teamMember of projectTeam.teamMembers) {
          if (teamMember.employeeId && teamMember.employeeId.userId &&
              teamMember.employeeId.userId.toString() === currentUserId.toString()) {
            isUserInvolved = true;
            break;
          }
        }
      }
      
      if (isUserInvolved && projectTeam.projectId) {
        relevantProjectIds.push(projectTeam.projectId);
      }
    }

    // Get detailed stats from relevant projects
    const projects = await Project.find({
      _id: { $in: relevantProjectIds },
      isActive: true
    });

    // Calculate statistics
    const totalProjects = relevantProjectIds.length;
    const plannedProjects = projects.filter(p => p.status === 'planned').length;
    const inProgressProjects = projects.filter(p => p.status === 'in-progress').length;
    const completedProjects = projects.filter(p => p.status === 'completed').length;
    const onHoldProjects = projects.filter(p => p.status === 'on-hold').length;
    const cancelledProjects = projects.filter(p => p.status === 'cancelled').length;

    // Calculate delayed projects
    const today = new Date();
    const delayedProjects = projects.filter(p => {
      const deadline = new Date(p.deadline);
      const daysLeft = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return p.status === 'in-progress' && daysLeft < 0;
    }).length;

    // Calculate average progress
    const totalProgress = projects.reduce((sum, p) => sum + (p.progress || 0), 0);
    const averageProgress = totalProjects > 0 ? Math.round(totalProgress / totalProjects) : 0;

    // Get upcoming deadlines (within 7 days)
    const upcomingDeadlines = projects.filter(p => {
      const deadline = new Date(p.deadline);
      const daysLeft = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return daysLeft >= 0 && daysLeft <= 7 && p.status === 'in-progress';
    }).length;

    // Determine user role
    const userRole = currentEmployee.roleId === '2' ? 'Project Manager' : 'Team Member';

    return res.status(200).json(
      new ApiResponse(200, {
        totalProjects,
        plannedProjects,
        inProgressProjects,
        completedProjects,
        onHoldProjects,
        cancelledProjects,
        delayedProjects,
        averageProgress,
        upcomingDeadlines,
        userRole,
        statusDistribution: {
          planned: plannedProjects,
          'in-progress': inProgressProjects,
          completed: completedProjects,
          'on-hold': onHoldProjects,
          cancelled: cancelledProjects
        }
      }, "Project statistics fetched successfully")
    );
  } catch (error) {
    console.error('Error fetching project stats:', error);
    throw new ApiError(500, "Error fetching project statistics");
  }
});

// Get project details for a specific project
const getProjectDetails = asynchandler(async (req, res) => {
  try {
    const { projectId } = req.params;
    const currentUserId = req.user._id;

    // STEP 1: Find current user's Employee record
    const currentEmployee = await Employee.findOne({ 
      userId: currentUserId 
    });
    
    if (!currentEmployee) {
      throw new ApiError(403, "No employee record found for this user");
    }

    // STEP 2: Check if user has access to this project
    const hasAccessAsManager = await Project.findOne({
      _id: projectId,
      isActive: true,
      manager: currentUserId
    });

    let hasAccessAsTeamMember = false;
    
    if (!hasAccessAsManager) {
      // Check through ProjectTeam
      const projectTeam = await ProjectTeam.findOne({
        projectId: projectId,
        status: 'active'
      })
      .populate({
        path: 'projectManager',
        select: '_id'
      })
      .populate({
        path: 'teamMembers.employeeId',
        select: '_id userId',
        model: 'Employee'
      })
      .lean();

      if (projectTeam) {
        // Check if user is PM
        if (projectTeam.projectManager && 
            projectTeam.projectManager._id.toString() === currentUserId.toString()) {
          hasAccessAsTeamMember = true;
        }
        
        // Check if user is team member
        if (!hasAccessAsTeamMember && projectTeam.teamMembers) {
          for (const teamMember of projectTeam.teamMembers) {
            if (teamMember.employeeId && teamMember.employeeId.userId &&
                teamMember.employeeId.userId.toString() === currentUserId.toString()) {
              hasAccessAsTeamMember = true;
              break;
            }
          }
        }
      }
    }

    if (!hasAccessAsManager && !hasAccessAsTeamMember) {
      throw new ApiError(403, "You don't have access to this project");
    }

    // Get project details with full population
    const project = await Project.findById(projectId)
      .populate('client', 'name companyName email phone address')
      .populate('manager', 'firstName lastName email phone')
      .populate('teamMembers.user', 'firstName lastName email phone')
      .populate('milestones')
      .lean();

    if (!project) {
      throw new ApiError(404, "Project not found");
    }

    // Get project team details
    const projectTeam = await ProjectTeam.findOne({ projectId })
      .populate('projectManager', 'firstName lastName email')
      .populate('teamMembers.employeeId', 'firstName lastName email department')
      .populate('teamMembers.userId', 'firstName lastName email');

    // Calculate additional metrics
    const today = new Date();
    const deadline = new Date(project.deadline);
    const diffTime = deadline.getTime() - today.getTime();
    project.daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Format dates
    project.formattedDeadline = deadline.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    project.formattedStartDate = new Date(project.startDate).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    return res.status(200).json(
      new ApiResponse(200, {
        project,
        projectTeam,
        userRole: currentEmployee.roleId === '2' ? 'Project Manager' : 'Team Member'
      }, "Project details fetched successfully")
    );
  } catch (error) {
    console.error('Error fetching project details:', error);
    throw new ApiError(500, "Error fetching project details");
  }
});

export {
  getMyProjects,
  getMyProjectStats,
  getProjectDetails
};