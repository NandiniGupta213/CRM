import { asynchandler } from "../utils/asynchHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { Project } from "../models/project.model.js";
import { Client } from "../models/client.model.js";

/**
 * @desc    Get projects for logged-in client
 * @route   GET /api/client/my-projects
 * @access  Private (Client only)
 */
const getMyProjects = asynchandler(async (req, res) => {
  // Get logged-in user
  const user = req.user;
  
  // Check if user is a client
  if (user.role !== 4) {
    throw new ApiError(403, "Only clients can view projects");
  }

  // Find client by userId or email
  let client = await Client.findOne({ 
    $or: [
      { userId: user._id },
      { email: user.email }
    ]
  });

  if (!client) {
    return res.status(200).json(
      new ApiResponse(200, { projects: [] }, "No client profile found")
    );
  }

  // Get query params
  const { 
    page = 1, 
    limit = 10, 
    search = '', 
    status = '',
    sort = '-createdAt' 
  } = req.query;

  // Build filter
  const filter = { client: client._id };

  if (status && status !== 'all') {
    filter.status = status;
  }

  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { projectId: { $regex: search, $options: 'i' } }
    ];
  }

  // Get total count
  const total = await Project.countDocuments(filter);

  // Get projects
  const projects = await Project.find(filter)
    .populate('manager', 'name email')
    .select('projectId title description status progress startDate deadline budget')
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  // Return projects
  return res.status(200).json(
    new ApiResponse(200, {
      projects,
      client: {
        name: client.name,
        companyName: client.companyName,
        email: client.email
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    }, "Projects fetched successfully")
  );
});

/**
 * @desc    Get single project for logged-in client
 * @route   GET /api/client/my-projects/:projectId
 * @access  Private (Client only)
 */
const getMyProjectDetails = asynchandler(async (req, res) => {
  const user = req.user;
  const { projectId } = req.params;

  // Check if user is client
  if (user.role !== 4) {
    throw new ApiError(403, "Only clients can view project details");
  }

  // Find client
  const client = await Client.findOne({ 
    $or: [
      { userId: user._id },
      { email: user.email }
    ]
  });

  if (!client) {
    throw new ApiError(404, "Client profile not found");
  }

  // Get project - check if it belongs to this client
  const project = await Project.findOne({
    _id: projectId,
    client: client._id
  })
  .populate('manager', 'name email phone')
  .populate('client', 'name companyName email')
  .lean();

  if (!project) {
    throw new ApiError(404, "Project not found or not accessible");
  }

  return res.status(200).json(
    new ApiResponse(200, { project }, "Project details fetched")
  );
});

export { getMyProjects, getMyProjectDetails };