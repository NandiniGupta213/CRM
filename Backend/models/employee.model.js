import mongoose from "mongoose";

const employeeSchema = new mongoose.Schema({
  // Personal Information
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  avatar: {
    type: String,
    default: ''
  },

  // Professional Information
  employeeId: {
    type: String,
    unique: true,
    required: true,
    trim: true
  },
  designation: {
    type: String,
    trim: true
  },
  department: {
    type: String,
    required: true,
    trim: true
  },
  roleId: {
    type: String,
    required: true,
    enum: ['2', '3'], // 2: Project Manager, 3: Employee
    default: '3'
  },
  
  // REMOVED: managerId and reportingTo fields completely

  // Employment Details
  hireDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Additional Information
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    postalCode: String
  },
  emergencyContact: {
    name: String,
    relationship: String,
    phone: String
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Generate employee ID before saving
employeeSchema.pre('save', async function() {
  if (this.isNew) {
    const year = new Date().getFullYear();
    const lastEmployee = await this.constructor.findOne({}, {}, { sort: { 'createdAt': -1 } });
    
    let sequence = 1;
    if (lastEmployee && lastEmployee.employeeId) {
      const lastNum = lastEmployee.employeeId.match(/\d+/);
      if (lastNum) {
        sequence = parseInt(lastNum[0]) + 1;
      }
    }
    
    this.employeeId = `EMP-${year}-${sequence.toString().padStart(4, '0')}`;
  }
});

// Virtual for full name
employeeSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

export const Employee = mongoose.model("Employee", employeeSchema);