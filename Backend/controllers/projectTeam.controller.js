import { asynchandler } from "../utils/asynchHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { ProjectTeam } from "../models/projectteam.model.js";
import { Project } from "../models/project.model.js";
import { Employee } from "../models/employee.model.js";
import { User } from "../models/user.model.js";
import mongoose from "mongoose";

// Create or update project team
const createOrUpdateProjectTeam = asynchandler(async (req, res) => {
  const { projectId, projectManager, teamMembers } = req.body;
  
  if (!projectId || !projectManager) {
    throw new ApiError(400, "Project ID and Project Manager are required");
  }

  // 1. Validate project exists
  const project = await Project.findById(projectId);
  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  // 2. Validate Employee (projectManager is Employee ID from frontend)
  const pmEmployee = await Employee.findById(projectManager);
  if (!pmEmployee) {
    throw new ApiError(404, "Project Manager Employee not found");
  }
  
  // Verify it's a Project Manager (roleId '2')
  if (pmEmployee.roleId !== '2') {
    throw new ApiError(400, "Selected employee is not a Project Manager");
  }

  // Check if active
  if (pmEmployee.status !== 'active' || !pmEmployee.isActive) {
    throw new ApiError(400, "Project Manager is not active");
  }

  // 3. Find User record from Employee's userId
  const pmUser = await User.findById(pmEmployee.userId);
  if (!pmUser) {
    throw new ApiError(404, "User account not found for this Project Manager");
  }

  // 4. Validate team members
  const validatedMembers = [];
  if (teamMembers && Array.isArray(teamMembers)) {
    for (const member of teamMembers) {
      if (!member.employeeId) {
        throw new ApiError(400, "Employee ID is required for team members");
      }

      const employee = await Employee.findById(member.employeeId);
      if (!employee) {
        throw new ApiError(404, `Employee not found for ID: ${member.employeeId}`);
      }

      // Check if active
      if (employee.status !== 'active' || !employee.isActive) {
        throw new ApiError(400, `Employee ${employee.firstName} ${employee.lastName} is not active`);
      }

      // Check if employee is the project manager
      if (employee._id.toString() === projectManager.toString()) {
        throw new ApiError(400, "Project Manager cannot be added as a team member");
      }

      // Find user for this employee
      const user = await User.findById(employee.userId);

      validatedMembers.push({
        employeeId: employee._id,
        userId: user ? user._id : null,
        name: `${employee.firstName} ${employee.lastName}`,
        email: employee.email,
        role: member.role || 'developer',
        department: member.department || employee.department || 'Not specified',
        allocationPercentage: member.allocationPercentage || 100,
        startDate: member.startDate || new Date(),
        endDate: member.endDate,
        isActive: member.isActive !== undefined ? member.isActive : true
      });
    }
  }

  // 5. Check if project team already exists for this project
  let projectTeam = await ProjectTeam.findOne({ projectId });

  if (projectTeam) {
    // Update existing team
    projectTeam.projectManager = projectManager; // Employee ID
    projectTeam.projectManagerUserId = pmUser._id; // User ID (extracted)
    projectTeam.projectManagerName = `${pmEmployee.firstName} ${pmEmployee.lastName}`;
    projectTeam.teamMembers = validatedMembers;
    projectTeam.updatedBy = req.user._id;
    
    // Update total team size
    projectTeam.totalTeamSize = validatedMembers.length + 1;
    
    await projectTeam.save();
  } else {
    // Create new team
    projectTeam = await ProjectTeam.create({
      projectId,
      projectName: project.title || project.projectName,
      projectManager: projectManager, // Employee ID (from frontend)
      projectManagerUserId: pmUser._id, // User ID (extracted)
      projectManagerName: `${pmEmployee.firstName} ${pmEmployee.lastName}`,
      teamMembers: validatedMembers,
      createdBy: req.user._id,
      totalTeamSize: validatedMembers.length + 1
    });
  }

  // 6. Return populated response
  const populatedTeam = await ProjectTeam.findById(projectTeam._id)
    .populate('projectManager', 'firstName lastName email employeeId department roleId')
    .populate('projectManagerUserId', 'username email role roleName')
    .populate('teamMembers.employeeId', 'firstName lastName email employeeId department roleId')
    .populate('teamMembers.userId', 'username email')
    .populate('projectId', 'title projectId client status')
    .populate('createdBy', 'username email')
    .populate('updatedBy', 'username email');

  return res
    .status(200)
    .json(new ApiResponse(200, populatedTeam, "Project team saved successfully"));
});

// Get all project teams with pagination and filtering
const getAllProjectTeams = asynchandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search = '',
    status,
    projectId,
    sortBy = '-createdAt'
  } = req.query;

  // Build filter query
  const filter = {};
  
  if (status && status !== 'all') {
    filter.status = status;
  }
  
  if (projectId && projectId !== 'all') {
    // Only apply projectId filter if it's a valid ObjectId
    if (mongoose.Types.ObjectId.isValid(projectId)) {
      filter.projectId = new mongoose.Types.ObjectId(projectId);
    }
  }
  
  // Search filter
  if (search) {
    filter.$or = [
      { projectName: { $regex: search, $options: 'i' } },
      { 'projectManagerName': { $regex: search, $options: 'i' } },
      { 'teamMembers.name': { $regex: search, $options: 'i' } }
    ];
  }

  // Parse pagination
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;

  // Get total count
  const total = await ProjectTeam.countDocuments(filter);

  // Get project teams with pagination
  const projectTeams = await ProjectTeam.find(filter)
    .populate('projectManager', 'firstName lastName email employeeId department')
    .populate('projectId', 'title projectId client status')
    .populate('createdBy', 'name email')
    .sort(sortBy)
    .skip(skip)
    .limit(limitNum)
    .lean();

  return res.status(200).json(
    new ApiResponse(200, {
      projectTeams,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    }, "Project teams fetched successfully")
  );
});

// Get project team by ID
const getProjectTeamById = asynchandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid project team ID");
  }

  const projectTeam = await ProjectTeam.findById(id)
    .populate('projectManager', 'firstName lastName email employeeId department roleId')
    .populate('teamMembers.employeeId', 'firstName lastName email employeeId department roleId')
    .populate('projectId', 'title projectId client status startDate deadline')
    .populate('createdBy', 'name email')
    .populate('updatedBy', 'name email')
    .lean();

  if (!projectTeam) {
    throw new ApiError(404, "Project team not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, projectTeam, "Project team fetched successfully"));
});

// Get available project managers
const getAvailableProjectManagers = asynchandler(async (req, res) => {
  try {
    const projectManagers = await Employee.find({
      isActive: true,
      status: 'active',
      roleId: '2' // Project Managers
    })
    .select('_id firstName lastName email employeeId department designation')
    .sort('firstName')
    .lean();

    const formattedPMs = projectManagers.map(pm => ({
      _id: pm._id,
      fullName: `${pm.firstName} ${pm.lastName}`,
      firstName: pm.firstName,
      lastName: pm.lastName,
      email: pm.email,
      employeeId: pm.employeeId,
      department: pm.department,
      designation: pm.designation
    }));

    return res
      .status(200)
      .json(new ApiResponse(200, formattedPMs, "Project managers fetched successfully"));
  } catch (error) {
    console.error('Error fetching project managers:', error);
    throw new ApiError(500, "Error fetching project managers");
  }
});

// Get available employees (for team members)
const getAvailableEmployees = asynchandler(async (req, res) => {
  try {
    const employees = await Employee.find({
      isActive: true,
      status: 'active',
      roleId: '3' // Employees (not project managers)
    })
    .select('_id firstName lastName email employeeId department designation')
    .sort('firstName')
    .lean();

    const formattedEmployees = employees.map(emp => ({
      _id: emp._id,
      fullName: `${emp.firstName} ${emp.lastName}`,
      firstName: emp.firstName,
      lastName: emp.lastName,
      email: emp.email,
      employeeId: emp.employeeId,
      department: emp.department,
      designation: emp.designation
    }));

    return res
      .status(200)
      .json(new ApiResponse(200, formattedEmployees, "Employees fetched successfully"));
  } catch (error) {
    console.error('Error fetching employees:', error);
    throw new ApiError(500, "Error fetching employees");
  }
});

// Update project team status
const updateProjectTeamStatus = asynchandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid project team ID");
  }

  if (!['active', 'completed', 'on-hold'].includes(status)) {
    throw new ApiError(400, "Invalid status value");
  }

  const projectTeam = await ProjectTeam.findByIdAndUpdate(
    id,
    { 
      status,
      updatedBy: req.user._id
    },
    { new: true }
  )
  .populate('projectManager', 'firstName lastName email employeeId department')
  .populate('teamMembers.employeeId', 'firstName lastName email employeeId department');

  if (!projectTeam) {
    throw new ApiError(404, "Project team not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, projectTeam, "Project team status updated successfully"));
});

// Delete project team
const deleteProjectTeam = asynchandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid project team ID");
  }

  const projectTeam = await ProjectTeam.findByIdAndDelete(id);

  if (!projectTeam) {
    throw new ApiError(404, "Project team not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Project team deleted successfully"));
});

// Get statistics
const getProjectTeamStats = asynchandler(async (req, res) => {
  try {
    const totalTeams = await ProjectTeam.countDocuments();
    const activeTeams = await ProjectTeam.countDocuments({ status: 'active' });
    const completedTeams = await ProjectTeam.countDocuments({ status: 'completed' });
    const onHoldTeams = await ProjectTeam.countDocuments({ status: 'on-hold' });

    // Get team size distribution
    const teamSizeStats = await ProjectTeam.aggregate([
      {
        $group: {
          _id: null,
          totalMembers: { $sum: { $add: [1, { $size: "$teamMembers" }] } },
          avgTeamSize: { $avg: { $add: [1, { $size: "$teamMembers" }] } },
          maxTeamSize: { $max: { $add: [1, { $size: "$teamMembers" }] } },
          minTeamSize: { $min: { $add: [1, { $size: "$teamMembers" }] } }
        }
      }
    ]);

    // Get department-wise employee count in teams
    const departmentStats = await ProjectTeam.aggregate([
      { $unwind: "$teamMembers" },
      {
        $group: {
          _id: "$teamMembers.department",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Get role distribution in teams
    const roleStats = await ProjectTeam.aggregate([
      { $unwind: "$teamMembers" },
      {
        $group: {
          _id: "$teamMembers.role",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    return res.status(200).json(
      new ApiResponse(200, {
        totalTeams,
        activeTeams,
        completedTeams,
        onHoldTeams,
        teamSizeStats: teamSizeStats[0] || {},
        departmentStats,
        roleStats
      }, "Project team statistics fetched successfully")
    );
  } catch (error) {
    console.error('Error fetching project team stats:', error);
    throw new ApiError(500, "Error fetching statistics");
  }
});

export {
  createOrUpdateProjectTeam,
  getAllProjectTeams,
  getProjectTeamById,
  getAvailableProjectManagers,
  getAvailableEmployees,
  updateProjectTeamStatus,
  deleteProjectTeam,
  getProjectTeamStats
};