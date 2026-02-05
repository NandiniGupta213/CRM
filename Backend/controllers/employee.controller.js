import { asynchandler } from "../utils/asynchHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { Employee } from "../models/employee.model.js";
import { User } from "../models/user.model.js";
import mongoose from "mongoose";
import bcrypt from "bcrypt";

// Generate employee ID
const generateEmployeeId = async () => {
  const year = new Date().getFullYear();
  
  // Get ALL employees for current year
  const employees = await Employee.find({
    employeeId: { $regex: `^EMP-${year}-` }
  }).lean();
  
  // Find the highest sequence number
  let maxSequence = 0;
  
  employees.forEach(employee => {
    if (employee.employeeId) {
      // Extract the number part after last dash
      const parts = employee.employeeId.split('-');
      if (parts.length === 3) {
        const sequenceStr = parts[2];
        // Remove leading zeros to compare numbers properly
        const sequence = parseInt(sequenceStr, 10);
        
        if (!isNaN(sequence) && sequence > maxSequence) {
          maxSequence = sequence;
        }
      }
    }
  });
  
  // Next sequence
  const nextSequence = maxSequence + 1;
  
  // Pad with zeros: 3 → "0003", 2027 → "2028"
  return `EMP-${year}-${nextSequence.toString().padStart(4, '0')}`;
};

// Generate default password for new user
const generateDefaultPassword = (firstName, lastName) => {
  const namePart = firstName.toLowerCase().slice(0, 3) + lastName.toLowerCase().slice(0, 3);
  const randomNum = Math.floor(100 + Math.random() * 900);
  return `${namePart}@${randomNum}`;
};

// Create new employee (Project Manager or Employee)
const createEmployee = asynchandler(async (req, res) => {
  const {
    firstName,
    lastName,
    email,
    phone,
    roleId,
    department,
    status = 'active',
    address,
    emergencyContact
  } = req.body;

  console.log('Creating employee with data:', { firstName, lastName, email, roleId, department });

  // Validate required fields
  if (!firstName || !lastName || !email || !phone || !roleId || !department) {
    throw new ApiError(400, "Required fields are missing");
  }

  // Check if email already exists in Employee collection
  const existingEmployee = await Employee.findOne({ email });
  if (existingEmployee) {
    throw new ApiError(400, "Employee with this email already exists");
  }

  // Check if email already exists in User collection
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError(400, "User with this email already exists");
  }

  // Validate role
  const roleNum = parseInt(roleId);
  if (![2, 3].includes(roleNum)) {
    throw new ApiError(400, "Invalid role ID. Use '2' for Project Manager or '3' for Employee");
  }

  // Generate employee ID
  const employeeId = await generateEmployeeId();

  // Generate default username and password for User account
  const username = `${firstName} ${lastName}`.trim();
  const defaultPassword = generateDefaultPassword(firstName, lastName);
  
  // Hash the password
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

  // Determine User role based on Employee roleId
  let userRole, userRoleName;
  if (roleNum === 2) {
    userRole = 2; // Project Manager
    userRoleName = "Project Manager";
  } else if (roleNum === 3) {
    userRole = 3; // Employee
    userRoleName = "Employee";
  }

  // 1. CREATE USER FIRST
  let createdUser = null;
  try {
    // Only include fields that exist in your User model
    const userData = {
      username: username,
      email: email,
      password: hashedPassword,
      role: userRole,
      roleName: userRoleName,
      isActive: true,
      employeeId: employeeId  // Store employee ID in User model
    };

    console.log('Creating User account with data:', userData);

    createdUser = await User.create(userData);
    console.log('User created successfully:', createdUser._id);
  } catch (error) {
    console.error('Error creating User account:', error);
    throw new ApiError(500, `Failed to create User account: ${error.message}`);
  }

  // 2. CREATE EMPLOYEE RECORD
  const employeeData = {
    firstName,
    lastName,
    email,
    phone,
    employeeId,
    roleId: roleId.toString(), // '2' or '3'
    department,
    status: status ? 'active' : 'inactive',
    createdBy: req.user._id,
    userId: createdUser._id  // Link to the created User
  };

  // Add optional fields if provided
  if (address) employeeData.address = address;
  if (emergencyContact) employeeData.emergencyContact = emergencyContact;

  console.log('Creating Employee with data:', employeeData);
  
  let createdEmployee = null;
  try {
    createdEmployee = await Employee.create(employeeData);
    console.log('Employee created successfully:', createdEmployee._id);
  } catch (error) {
    // If Employee creation fails, delete the created User
    if (createdUser) {
      await User.findByIdAndDelete(createdUser._id);
      console.log('Rolled back: Deleted created User due to Employee creation failure');
    }
    throw new ApiError(500, `Failed to create Employee: ${error.message}`);
  }

  // 3. UPDATE USER WITH EMPLOYEE REFERENCE
  try {
    await User.findByIdAndUpdate(createdUser._id, {
      $set: { employeeRef: createdEmployee._id }
    });
    console.log('Updated User with Employee reference');
  } catch (error) {
    console.error('Failed to update User with Employee reference:', error);
  }

  // Populate createdBy
  const populatedEmployee = await Employee.findById(createdEmployee._id)
    .populate('createdBy', 'username email');

  // Prepare response with user credentials
  const responseData = {
    employee: populatedEmployee,
    userCredentials: {
      username: createdUser.username,
      email: createdUser.email,
      defaultPassword: defaultPassword,
      role: userRoleName,
      note: "Please change the default password on first login"
    }
  };

  return res
    .status(201)
    .json(new ApiResponse(201, responseData, "Employee and User account created successfully"));
});

// Get all employees with filters
const getAllEmployees = asynchandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search = '',
    status,
    department,
    roleId,
    sortBy = '-createdAt'
  } = req.query;

  // Build filter query
  const filter = { isActive: true };
  
  if (status && status !== 'all') {
    filter.status = status;
  }
  
  if (department && department !== 'all') {
    filter.department = department;
  }
  
  if (roleId && roleId !== 'all') {
    filter.roleId = roleId;
  }
  
  // Search filter
  if (search) {
    filter.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { employeeId: { $regex: search, $options: 'i' } },
      { department: { $regex: search, $options: 'i' } }
    ];
  }

  // Parse pagination
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;

  // Get total count
  const total = await Employee.countDocuments(filter);

  // Get employees with pagination
  const employees = await Employee.find(filter)
    .populate({
      path: 'userId',
      model: 'User',
      select: 'username status role roleName'
    })
    .populate('createdBy', 'name email')
    .sort(sortBy)
    .skip(skip)
    .limit(limitNum)
    .lean();

  // Get unique departments for filter
  const departments = await Employee.distinct('department', { isActive: true });

  return res.status(200).json(
    new ApiResponse(200, {
      employees,
      departments,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    }, "Employees fetched successfully")
  );
});

// Get single employee
const getEmployeeById = asynchandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid employee ID");
  }

  const employee = await Employee.findById(id)
    .populate({
      path: 'userId',
      model: 'User',
      select: 'username status role roleName'
    })
    .populate('createdBy', 'name email')
    .lean();

  if (!employee) {
    throw new ApiError(404, "Employee not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, employee, "Employee fetched successfully"));
});

// Get employee statistics
const getEmployeeStats = asynchandler(async (req, res) => {
  const totalEmployees = await Employee.countDocuments({ isActive: true });
  const activeEmployees = await Employee.countDocuments({ 
    isActive: true, 
    status: 'active' 
  });
  const inactiveEmployees = await Employee.countDocuments({ 
    isActive: true, 
    status: 'inactive' 
  });
  
  // Get department-wise count
  const departmentStats = await Employee.aggregate([
    { $match: { isActive: true } },
    { $group: { 
      _id: '$department', 
      count: { $sum: 1 },
      active: { 
        $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } 
      }
    }},
    { $sort: { count: -1 } }
  ]);

  // Get role-wise count
  const roleStats = await Employee.aggregate([
    { $match: { isActive: true } },
    { $group: { 
      _id: '$roleId', 
      count: { $sum: 1 },
      label: { 
        $first: { 
          $switch: {
            branches: [
              { case: { $eq: ['$roleId', '2'] }, then: 'Project Manager' },
              { case: { $eq: ['$roleId', '3'] }, then: 'Employee' }
            ],
            default: 'Unknown'
          }
        }
      }
    }}
  ]);

  const activePercentage = totalEmployees > 0 
    ? Math.round((activeEmployees / totalEmployees) * 100) 
    : 0;

  return res.status(200).json(
    new ApiResponse(200, {
      totalEmployees,
      activeEmployees,
      inactiveEmployees,
      activePercentage,
      departmentStats,
      roleStats
    }, "Employee statistics fetched successfully")
  );
});

// Update employee
const updateEmployee = asynchandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  console.log('Updating employee:', id, 'with data:', updateData);

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid employee ID");
  }

  // Check if employee exists
  const existingEmployee = await Employee.findById(id);
  if (!existingEmployee) {
    throw new ApiError(404, "Employee not found");
  }

  // Check if email already exists for another employee
  if (updateData.email && updateData.email !== existingEmployee.email) {
    const employeeWithEmail = await Employee.findOne({ 
      email: updateData.email,
      _id: { $ne: id }
    });
    
    if (employeeWithEmail) {
      throw new ApiError(400, "Email already exists for another employee");
    }

    // Also check User collection
    const userWithEmail = await User.findOne({ 
      email: updateData.email,
      _id: { $ne: existingEmployee.userId }
    });
    
    if (userWithEmail) {
      throw new ApiError(400, "Email already exists for another user");
    }
  }

  // Handle status conversion
  if (updateData.status !== undefined) {
    updateData.status = updateData.status ? 'active' : 'inactive';
  }

  updateData.updatedBy = req.user._id;
  updateData.updatedAt = new Date();

  // Update Employee record
  const employee = await Employee.findByIdAndUpdate(
    id,
    updateData,
    { new: true, runValidators: true }
  )
  .populate('updatedBy', 'name email');

  if (!employee) {
    throw new ApiError(404, "Employee not found");
  }

  // Also update corresponding User record if it exists
  if (employee.userId) {
    try {
      const userUpdateData = {};
      
      if (updateData.email) userUpdateData.email = updateData.email;
      if (updateData.firstName || updateData.lastName) {
        userUpdateData.name = `${updateData.firstName || employee.firstName} ${updateData.lastName || employee.lastName}`;
        if (updateData.firstName) userUpdateData.firstName = updateData.firstName;
        if (updateData.lastName) userUpdateData.lastName = updateData.lastName;
      }
      if (updateData.phone) userUpdateData.phone = updateData.phone;
      if (updateData.department) userUpdateData.department = updateData.department;
      if (updateData.status !== undefined) {
        userUpdateData.status = updateData.status ? 'active' : 'inactive';
      }
      
      // Map Employee roleId to User role
      if (updateData.roleId) {
        const roleNum = parseInt(updateData.roleId);
        if (roleNum === 2) {
          userUpdateData.role = 2;
          userUpdateData.roleName = 'Project Manager';
        } else if (roleNum === 3) {
          userUpdateData.role = 3;
          userUpdateData.roleName = 'Employee';
        }
      }
      
      await User.findByIdAndUpdate(employee.userId, userUpdateData);
      console.log('Updated corresponding User record');
    } catch (error) {
      console.error('Failed to update User record:', error);
    }
  }

  return res
    .status(200)
    .json(new ApiResponse(200, employee, "Employee updated successfully"));
});

// Update employee status
const updateEmployeeStatus = asynchandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid employee ID");
  }

  if (!['active', 'inactive'].includes(status)) {
    throw new ApiError(400, "Invalid status value. Use 'active' or 'inactive'");
  }

  const employee = await Employee.findByIdAndUpdate(
    id,
    { 
      status,
      updatedBy: req.user._id,
      updatedAt: new Date()
    },
    { new: true }
  );

  if (!employee) {
    throw new ApiError(404, "Employee not found");
  }

  // Also update corresponding User status
  if (employee.userId) {
    try {
      await User.findByIdAndUpdate(employee.userId, {
        status: status,
        updatedAt: new Date()
      });
      console.log('Updated User status as well');
    } catch (error) {
      console.error('Failed to update User status:', error);
    }
  }

  return res
    .status(200)
    .json(new ApiResponse(200, employee, "Employee status updated successfully"));
});

// Delete employee (soft delete)
const deleteEmployee = asynchandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid employee ID");
  }

  const employee = await Employee.findByIdAndUpdate(
    id,
    { 
      isActive: false,
      status: 'inactive',
      updatedBy: req.user._id,
      updatedAt: new Date()
    },
    { new: true }
  );

  if (!employee) {
    throw new ApiError(404, "Employee not found");
  }

  // Also soft delete corresponding User if it exists
  if (employee.userId) {
    try {
      await User.findByIdAndUpdate(employee.userId, {
        isActive: false,
        status: 'inactive',
        updatedAt: new Date()
      });
      console.log('Soft deleted corresponding User');
    } catch (error) {
      console.error('Failed to soft delete User:', error);
    }
  }

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Employee deleted successfully"));
});

// REMOVED: getAvailableManagers function completely

export {
  createEmployee,
  getAllEmployees,
  getEmployeeById,
  getEmployeeStats,
  updateEmployee,
  updateEmployeeStatus,
  deleteEmployee,
  // REMOVED: getAvailableManagers from exports
};