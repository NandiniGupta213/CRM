// src/models/client.model.js
import mongoose from "mongoose";
import { Project } from "./project.model.js";
import { Invoice } from "./invoice.model.js";

const clientSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Client name is required"],
      trim: true
    },
    companyName: {
      type: String,
      required: [true, "Company name is required"],
      trim: true
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true
    },
    address: {
      type: String,
      required: [true, "Address is required"]
    },
    city: {
      type: String,
      required: [true, "City is required"]
    },
    state: {
      type: String,
      required: [true, "State is required"]
    },
    postalCode: {
      type: String,
      required: [true, "Postal code is required"]
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active'
    },
    
    // Project Stats
    totalProjects: {
      type: Number,
      default: 0
    },
    activeProjects: {
      type: Number,
      default: 0
    },
 userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
    
    // Billing Stats - CORRECTED VERSION
    totalBilled: {      // Sum of ALL invoice totals (what we invoiced)
      type: Number,
      default: 0
    },
    totalPaid: {        // Sum of paidAmount from ALL invoices
      type: Number,
      default: 0
    },
    totalOutstanding: { // Sum of balanceDue from ALL invoices
      type: Number,
      default: 0
    },
    
    notes: {
      type: String,
      default: ''
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  },
  {
    timestamps: true
  }
);

// Virtual fields for related data
clientSchema.virtual('projects', {
  ref: 'Project',
  localField: '_id',
  foreignField: 'client'
});

clientSchema.virtual('invoices', {
  ref: 'Invoice',
  localField: '_id',
  foreignField: 'client'
});

// CORRECTED: Static method to calculate and update client stats
clientSchema.statics.updateClientStats = async function(clientId) {
  try {
    console.log(`=== Calculating stats for client: ${clientId} ===`);
    
    // 1. Calculate project counts
    const totalProjects = await Project.countDocuments({ 
      client: new mongoose.Types.ObjectId(clientId) 
    });
    
    const activeProjects = await Project.countDocuments({ 
      client: new mongoose.Types.ObjectId(clientId), 
      status: { $in: ['planned', 'in-progress'] } 
    });
    
    console.log(`Projects - Total: ${totalProjects}, Active: ${activeProjects}`);
    
    // 2. Calculate ALL invoice amounts for this client (ALL statuses)
    const invoiceStats = await Invoice.aggregate([
      {
        $match: { 
          client: new mongoose.Types.ObjectId(clientId),
          isActive: true // Only active invoices
        }
      },
      {
        $group: {
          _id: null,
          // TOTAL BILLED: Sum of ALL invoice totals
          totalBilled: { $sum: '$total' },
          // TOTAL PAID: Sum of paidAmount from ALL invoices
          totalPaid: { $sum: '$paidAmount' },
          // OUTSTANDING: Sum of balanceDue from ALL invoices
          totalOutstanding: { $sum: '$balanceDue' },
          // Count invoices for reference
          invoiceCount: { $sum: 1 }
        }
      }
    ]);
    
    // Extract results
    const statsResult = invoiceStats[0] || {
      totalBilled: 0,
      totalPaid: 0,
      totalOutstanding: 0,
      invoiceCount: 0
    };
    
    console.log(`Found ${statsResult.invoiceCount} invoices`);
    console.log(`Total Billed: ${statsResult.totalBilled}`);
    console.log(`Total Paid: ${statsResult.totalPaid}`);
    console.log(`Total Outstanding: ${statsResult.totalOutstanding}`);
    
    // 3. Update client document with ALL stats
    const updatedClient = await this.findByIdAndUpdate(
      clientId,
      {
        totalProjects,
        activeProjects,
        totalBilled: statsResult.totalBilled,
        totalPaid: statsResult.totalPaid,
        totalOutstanding: statsResult.totalOutstanding
      },
      { 
        new: true,
        timestamps: false 
      }
    );
    
    console.log('Client stats updated successfully');
    
    // 4. Return complete stats
    return {
      totalProjects,
      activeProjects,
      completedProjects: totalProjects - activeProjects,
      totalBilled: statsResult.totalBilled,
      totalPaid: statsResult.totalPaid,
      totalOutstanding: statsResult.totalOutstanding,
      invoiceCount: statsResult.invoiceCount
    };
    
  } catch (error) {
    console.error('Error calculating client stats:', error);
    throw error;
  }
};

// CORRECTED: Static method to get clients with calculated stats
clientSchema.statics.getClientsWithStats = async function(filter = {}, options = {}) {
  const {
    page = 1,
    limit = 10,
    sort = '-createdAt'
  } = options;
  
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;
  
  // Get clients
  const clients = await this.find(filter)
    .select("-__v")
    .sort(sort)
    .skip(skip)
    .limit(limitNum);
  
  // Calculate stats for each client
  const clientsWithStats = await Promise.all(
    clients.map(async (client) => {
      const clientObj = client.toObject();
      
      try {
        // Get fresh stats for this client
        const stats = await this.updateClientStats(client._id);
        
        // Merge stats into client object
        clientObj.totalProjects = stats.totalProjects;
        clientObj.activeProjects = stats.activeProjects;
        clientObj.completedProjects = stats.completedProjects;
        clientObj.totalBilled = stats.totalBilled;
        clientObj.totalPaid = stats.totalPaid;
        clientObj.totalOutstanding = stats.totalOutstanding;
        clientObj.invoiceCount = stats.invoiceCount;
        
        console.log(`Client ${client.name}: Billed=${stats.totalBilled}, Paid=${stats.totalPaid}, Due=${stats.totalOutstanding}`);
        
      } catch (error) {
        console.error(`Error calculating stats for client ${client._id}:`, error);
        // Keep existing values if calculation fails
        clientObj.totalProjects = client.totalProjects || 0;
        clientObj.activeProjects = client.activeProjects || 0;
        clientObj.completedProjects = (client.totalProjects || 0) - (client.activeProjects || 0);
        clientObj.totalBilled = client.totalBilled || 0;
        clientObj.totalPaid = client.totalPaid || 0;
        clientObj.totalOutstanding = client.totalOutstanding || 0;
        clientObj.invoiceCount = 0;
      }
      
      return clientObj;
    })
  );
  
  return clientsWithStats;
};

// Helper method to update ALL clients stats (run periodically)
clientSchema.statics.updateAllClientsStats = async function() {
  try {
    console.log('=== Updating stats for ALL clients ===');
    
    const clients = await this.find({}, '_id name');
    let updatedCount = 0;
    
    for (const client of clients) {
      try {
        await this.updateClientStats(client._id);
        updatedCount++;
        console.log(`Updated stats for: ${client.name}`);
      } catch (error) {
        console.error(`Failed to update stats for ${client.name}:`, error);
      }
    }
    
    console.log(`Successfully updated ${updatedCount}/${clients.length} clients`);
    return { updated: updatedCount, total: clients.length };
    
  } catch (error) {
    console.error('Error updating all clients stats:', error);
    throw error;
  }
};

// Method to get client summary (for dashboard)
clientSchema.statics.getClientSummary = async function() {
  try {
    const totalClients = await this.countDocuments();
    const activeClients = await this.countDocuments({ status: 'active' });
    
    // Get billing summary from ALL clients
    const billingSummary = await this.aggregate([
      {
        $group: {
          _id: null,
          totalBilled: { $sum: '$totalBilled' },
          totalPaid: { $sum: '$totalPaid' },
          totalOutstanding: { $sum: '$totalOutstanding' },
          avgBilledPerClient: { $avg: '$totalBilled' }
        }
      }
    ]);
    
    const summary = billingSummary[0] || {
      totalBilled: 0,
      totalPaid: 0,
      totalOutstanding: 0,
      avgBilledPerClient: 0
    };
    
    return {
      totalClients,
      activeClients,
      inactiveClients: totalClients - activeClients,
      ...summary,
      activePercentage: totalClients > 0 
        ? Math.round((activeClients / totalClients) * 100)
        : 0
    };
    
  } catch (error) {
    console.error('Error getting client summary:', error);
    throw error;
  }
};

export const Client = mongoose.model("Client", clientSchema);