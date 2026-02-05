// src/controllers/client.controller.js
import { asynchandler } from "../utils/asynchHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { Client } from "../models/client.model.js";
import { Project } from "../models/project.model.js";
import { Invoice } from "../models/invoice.model.js";
import { User } from "../models/user.model.js";

const generateRandomPassword = (length = 10) => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  let password = "";
  
  // Create array of random bytes
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  
  // Use crypto for true randomness
  for (let i = 0; i < length; i++) {
    const randomIndex = randomValues[i] % chars.length;
    password += chars[randomIndex];
  }
  
  return password;
};

// Create new client with auto-generated password
const createClient = asynchandler(async (req, res) => {
  const {
    name,
    companyName,
    email,
    phone,
    address,
    city,
    state,
    postalCode,
    status = 'active',
    notes
  } = req.body;

  console.log('Creating client with data:', { name, companyName, email });

  // Check required fields
  const requiredFields = ['name', 'companyName', 'email', 'phone', 'address', 'city', 'state', 'postalCode'];
  for (const field of requiredFields) {
    if (!req.body[field]?.trim()) {
      throw new ApiError(400, `${field} is required`);
    }
  }

  // Check if client already exists by email
  const existingClient = await Client.findOne({ email });
  if (existingClient) {
    throw new ApiError(409, "Client with this email already exists");
  }

  // Check if user already exists with this email
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError(409, "User with this email already exists");
  }

  // Generate random password for client user
  const randomPassword = generateRandomPassword();
  console.log('Generated password for client:', randomPassword);

  // Create User account (role 4 = Client)
  let createdUser = null;
  try {
    // Use email as username for simplicity
    const userData = {
      username: name.trim(), // Use email as username
      email: email,
      password: randomPassword, // Auto-generated password
      name: name,
      phone: phone,
      role: 4, // Client role
      roleName: "Client",
      isActive: status === 'active',
      createdBy: req.user._id
    };

    console.log('Creating User account for client');
    createdUser = await User.create(userData);
    console.log('User created successfully for client:', createdUser._id);
  } catch (error) {
    console.error('Error creating User account for client:', error);
    throw new ApiError(500, `Failed to create User account: ${error.message}`);
  }

  // Create Client record
  const clientData = {
    name,
    companyName,
    email,
    phone,
    address,
    city,
    state,
    postalCode,
    status,
    notes: notes || '',
    createdBy: req.user._id,
    userId: createdUser._id // Link to user account
  };

  console.log('Creating Client record');
  
  let createdClient = null;
  try {
    createdClient = await Client.create(clientData);
    console.log('Client created successfully:', createdClient._id);
  } catch (error) {
    // If Client creation fails, delete the created User
    if (createdUser) {
      await User.findByIdAndDelete(createdUser._id);
      console.log('Rolled back: Deleted created User due to Client creation failure');
    }
    throw new ApiError(500, `Failed to create Client: ${error.message}`);
  }

  // Update User record with Client reference
  try {
    await User.findByIdAndUpdate(createdUser._id, {
      $set: { clientRef: createdClient._id }
    });
    console.log('Updated User with Client reference');
  } catch (error) {
    console.error('Failed to update User with Client reference:', error);
  }

  // Get the created client with user info
  const populatedClient = await Client.findById(createdClient._id)
    .populate('userId', 'username email role roleName isActive')
    .populate('createdBy', 'name email')
    .select("-__v");

  // Return response with temporary password
  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        {
          client: populatedClient,
          temporaryPassword: randomPassword, // Send back the generated password
          message: "Client created successfully. Please note the temporary password for the client user account."
        },
        "Client and user account created successfully"
      )
    );
});

// Get all clients WITH CALCULATED STATS
const getAllClients = asynchandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search = '',
    status = '',
    sort = '-createdAt'
  } = req.query;

  // Build filter
  const filter = {};
  
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { companyName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }

  if (status && ['active', 'inactive'].includes(status)) {
    filter.status = status;
  }

  // Get total count
  const total = await Client.countDocuments(filter);

  // Get clients with calculated stats using the new method
  const clients = await Client.getClientsWithStats(filter, {
    page,
    limit,
    sort
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {
          clients,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          }
        },
        "Clients fetched successfully"
      )
    );
});

// Get single client with stats
const getClient = asynchandler(async (req, res) => {
  const { id } = req.params;

  const client = await Client.findById(id).select("-__v");
  
  if (!client) {
    throw new ApiError(404, "Client not found");
  }

  // Calculate and update stats for this client
  const stats = await Client.updateClientStats(id);
  const clientWithStats = {
    ...client.toObject(),
    ...stats
  };

  return res
    .status(200)
    .json(new ApiResponse(200, clientWithStats, "Client fetched successfully"));
});

// Update client
const updateClient = asynchandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  // Remove fields that shouldn't be updated
  delete updateData.createdBy;
  delete updateData._id;
  delete updateData.totalProjects;
  delete updateData.activeProjects;
  delete updateData.totalBilled;

  const client = await Client.findByIdAndUpdate(
    id,
    { $set: updateData },
    { 
      new: true,
      runValidators: true 
    }
  ).select("-__v");

  if (!client) {
    throw new ApiError(404, "Client not found");
  }

  // Recalculate stats after update
  await Client.updateClientStats(id);

  return res
    .status(200)
    .json(new ApiResponse(200, client, "Client updated successfully"));
});

// Delete client
const deleteClient = asynchandler(async (req, res) => {
  const { id } = req.params;

  const client = await Client.findByIdAndDelete(id);

  if (!client) {
    throw new ApiError(404, "Client not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Client deleted successfully"));
});

// Get client statistics (Dashboard stats)
const getClientStats = asynchandler(async (req, res) => {
  // Get client counts
  const totalClients = await Client.countDocuments();
  const activeClients = await Client.countDocuments({ status: 'active' });
  
  // Calculate ALL revenue stats from ALL invoices
  const revenueStats = await Invoice.aggregate([
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$total' },           // Sum of ALL invoice totals
        paidRevenue: { $sum: '$paidAmount' },       // Sum of ALL paid amounts
        outstandingRevenue: { $sum: '$balanceDue' } // Sum of ALL outstanding
      }
    }
  ]);

  const revenueData = revenueStats[0] || {
    totalRevenue: 0,
    paidRevenue: 0,
    outstandingRevenue: 0
  };

  // Calculate project stats
  const totalProjects = await Project.countDocuments();
  const activeProjects = await Project.countDocuments({ 
    status: { $in: ['planned', 'in-progress'] } 
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {
          totalClients,
          activeClients,
          inactiveClients: totalClients - activeClients,
          totalProjects,
          activeProjects,
          completedProjects: totalProjects - activeProjects,
          ...revenueData,
          activePercentage: totalClients > 0 
            ? Math.round((activeClients / totalClients) * 100)
            : 0
        },
        "Statistics fetched successfully"
      )
    );
});

// Search clients with stats
const searchClients = asynchandler(async (req, res) => {
  const { query } = req.query;

  if (!query?.trim()) {
    throw new ApiError(400, "Search query is required");
  }

  const filter = {
    $or: [
      { name: { $regex: query, $options: 'i' } },
      { companyName: { $regex: query, $options: 'i' } },
      { email: { $regex: query, $options: 'i' } },
      { phone: { $regex: query, $options: 'i' } },
      { city: { $regex: query, $options: 'i' } }
    ]
  };

  const clients = await Client.getClientsWithStats(filter, { limit: 20 });

  return res
    .status(200)
    .json(new ApiResponse(200, clients, "Search results fetched successfully"));
});

export {
  createClient,
  getAllClients,
  getClient,
  updateClient,
  deleteClient,
  getClientStats,
  searchClients
};