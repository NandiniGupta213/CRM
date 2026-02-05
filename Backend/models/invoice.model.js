import mongoose from 'mongoose';

const LineItemSchema = new mongoose.Schema({
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1'],
    default: 1
  },
  rate: {
    type: Number,
    required: [true, 'Rate is required'],
    min: [0, 'Rate cannot be negative'],
    default: 0
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative'],
    default: 0
  }
});

const PaymentHistorySchema = new mongoose.Schema({
  date: {
    type: Date,
    default: Date.now
  },
  amount: {
    type: Number,
    required: [true, 'Payment amount is required'],
    min: [0, 'Payment amount cannot be negative']
  },
  method: {
    type: String,
    required: [true, 'Payment method is required'],
    enum: ['Bank Transfer', 'UPI', 'Credit Card', 'Cash', 'Cheque', 'Stripe', 'PayPal']
  },
  reference: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['completed', 'pending', 'failed'],
    default: 'completed'
  }
});

const InvoiceSchema = new mongoose.Schema({
  // 1️⃣ Invoice Header
  invoiceNumber: {
    type: String,
    required: [true, 'Invoice number is required'],
    unique: true,
    trim: true,
    uppercase: true
  },
  invoiceDate: {
    type: Date,
    required: [true, 'Invoice date is required'],
    default: Date.now
  },
  dueDate: {
    type: Date,
    required: [true, 'Due date is required']
  },
  status: {
    type: String,
    enum: ['draft', 'sent', 'paid', 'overdue'],
    default: 'draft'
  },

  // 2️⃣ Client Information
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: [true, 'Client is required']
  },
  clientName: {
    type: String,
    required: [true, 'Client name is required'],
    trim: true
  },
  companyName: {
    type: String,
    trim: true
  },
  billingAddress: {
    type: String,
    trim: true
  },
  contactEmail: {
    type: String,
    trim: true,
    lowercase: true
  },

  // 3️⃣ Project Reference
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: [true, 'Project is required']
  },
  projectName: {
    type: String,
    required: [true, 'Project name is required'],
    trim: true
  },
  projectId: {
    type: String,
    trim: true
  },
  billingType: {
    type: String,
    enum: ['fixed', 'hourly', 'monthly', 'milestone'],
    default: 'fixed'
  },

  // 4️⃣ Invoice Line Items
  lineItems: [LineItemSchema],

  // 5️⃣ Calculations
  subtotal: {
    type: Number,
    min: [0, 'Subtotal cannot be negative'],
    default: 0
  },
  discountPercentage: {
    type: Number,
    min: [0, 'Discount percentage cannot be negative'],
    max: [100, 'Discount percentage cannot exceed 100%'],
    default: 0
  },
  discountAmount: {
    type: Number,
    min: [0, 'Discount amount cannot be negative'],
    default: 0
  },
  discount: {
    type: Number,
    min: [0, 'Discount cannot be negative'],
    default: 0
  },
  discountType: {
    type: String,
    enum: ['amount', 'percentage'],
    default: 'amount'
  },
  taxRate: {
    type: Number,
    min: [0, 'Tax rate cannot be negative'],
    max: [100, 'Tax rate cannot exceed 100%'],
    default: 18
  },
  taxAmount: {
    type: Number,
    min: [0, 'Tax amount cannot be negative'],
    default: 0
  },
  total: {
    type: Number,
    min: [0, 'Total amount cannot be negative'],
    default: 0
  },
  paidAmount: {
    type: Number,
    min: [0, 'Paid amount cannot be negative'],
    default: 0
  },
  balanceDue: {
    type: Number,
    min: [0, 'Balance due cannot be negative'],
    default: 0
  },

  // 6️⃣ Payment Information
  paymentMethod: {
    type: String,
    enum: ['Bank Transfer', 'UPI', 'Credit Card', 'Cash', 'Cheque', 'Stripe', 'PayPal'],
    default: 'Bank Transfer'
  },
  bankDetails: {
    type: String,
    trim: true
  },
  paymentTerms: {
    type: String,
    trim: true
  },
  paymentHistory: [PaymentHistorySchema],

  // 7️⃣ System Fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  notes: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Fixed pre-save middleware without next parameter
InvoiceSchema.pre('save', function() {
  // Calculate subtotal if not set
  if (this.lineItems && Array.isArray(this.lineItems)) {
    this.lineItems.forEach(item => {
      if (!item.amount && item.quantity && item.rate) {
        item.amount = item.quantity * item.rate;
      }
    });
    
    // Recalculate subtotal from line items
    const calculatedSubtotal = this.lineItems.reduce((sum, item) => {
      return sum + (item.amount || 0);
    }, 0);
    
    if (calculatedSubtotal > 0) {
      this.subtotal = calculatedSubtotal;
    }
  }
  
  // ✅ CRITICAL FIX: Ensure status, paidAmount, and balanceDue are consistent
  if (this.status === 'paid') {
    // If status is paid, paidAmount should equal total
    this.paidAmount = this.total;
    this.balanceDue = 0;
  } else {
    // For non-paid invoices, recalculate balance due
    this.balanceDue = Math.max(0, this.total - (this.paidAmount || 0));
    
    // Auto-update status if fully paid
    if (this.balanceDue === 0 && this.total > 0) {
      this.status = 'paid';
    }
  }
  
  // Auto-update overdue status
  if (this.status === 'sent' && this.dueDate) {
    const today = new Date();
    const dueDate = new Date(this.dueDate);
    if (dueDate < today && this.balanceDue > 0) {
      this.status = 'overdue';
    }
  }
});

// Add method to update status
InvoiceSchema.methods.updateStatus = function() {
  const today = new Date();
  const dueDate = this.dueDate ? new Date(this.dueDate) : today;
  
  // If fully paid
  if (this.balanceDue === 0 && this.total > 0) {
    this.status = 'paid';
    return;
  }
  
  // If overdue
  if (dueDate < today && this.balanceDue > 0) {
    this.status = 'overdue';
    return;
  }
  
  // Default to draft if not set
  if (!this.status) {
    this.status = 'draft';
  }
};

// Add instance method to record payment
InvoiceSchema.methods.recordPayment = function(paymentData) {
  // Add to payment history
  this.paymentHistory.push({
    amount: paymentData.amount,
    method: paymentData.method,
    reference: paymentData.reference || `PAY-${Date.now()}`,
    date: paymentData.date || new Date(),
    status: 'completed'
  });

  // Update paid amount
  this.paidAmount = (this.paidAmount || 0) + paymentData.amount;
  
  // Recalculate balance due
  this.balanceDue = Math.max(0, this.total - this.paidAmount);
  
  // Update status if fully paid
  if (this.balanceDue === 0) {
    this.status = 'paid';
  }
  
  return this.save();
};

// Virtual for formatted invoice number
InvoiceSchema.virtual('formattedInvoiceNumber').get(function() {
  return `INV-${this.invoiceNumber}`;
});

// Virtual for days until due
InvoiceSchema.virtual('daysUntilDue').get(function() {
  if (!this.dueDate) return null;
  const today = new Date();
  const dueDate = new Date(this.dueDate);
  const diffTime = dueDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Ensure virtuals are included in JSON output
InvoiceSchema.set('toJSON', { virtuals: true });
InvoiceSchema.set('toObject', { virtuals: true });

export const Invoice = mongoose.model('Invoice', InvoiceSchema);