import pdf from 'html-pdf';

// Function to format date
const formatDate = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

// Function to format currency
const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Function to generate HTML for PDF
const generateInvoiceHTML = (invoice) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
        .company { flex: 1; }
        .invoice-info { text-align: right; }
        .invoice-number { font-size: 24px; font-weight: bold; color: #1976d2; }
        .section { margin-bottom: 20px; }
        .section-title { font-weight: bold; color: #1976d2; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-bottom: 10px; }
        .bill-to, .project-info { background: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th { background: #1976d2; color: white; padding: 10px; text-align: left; }
        td { padding: 10px; border-bottom: 1px solid #ddd; }
        .totals { float: right; width: 300px; }
        .total-row { display: flex; justify-content: space-between; margin-bottom: 10px; }
        .grand-total { font-weight: bold; font-size: 16px; border-top: 2px solid #1976d2; padding-top: 10px; }
        .footer { margin-top: 50px; text-align: center; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company">
          <h1 style="color: #1976d2; margin: 0 0 10px 0;">INVOICE</h1>
          <div><strong>CodeSmarter</strong></div>
          <div>Street 28, Bangalore</div>
          <div>Phone: +91 3456782345</div>
          <div>Email: codesmarter@gmail.com</div>
        </div>
        <div class="invoice-info">
          <div class="invoice-number">${invoice.invoiceNumber || 'N/A'}</div>
          <div><strong>Date:</strong> ${formatDate(invoice.invoiceDate)}</div>
          <div><strong>Due Date:</strong> ${formatDate(invoice.dueDate)}</div>
          <div><strong>Status:</strong> ${invoice.status}</div>
        </div>
      </div>

      <div class="section">
        <div class="bill-to">
          <div class="section-title">Bill To:</div>
          <div><strong>${invoice.clientName || 'N/A'}</strong></div>
          <div>${invoice.companyName || ''}</div>
          <div>${invoice.contactEmail || ''}</div>
          <div>${invoice.billingAddress || ''}</div>
        </div>
        
        <div class="project-info">
          <div class="section-title">Project:</div>
          <div><strong>${invoice.projectName || 'N/A'}</strong></div>
          <div>Project ID: ${invoice.projectId || ''}</div>
          <div>Billing Type: ${invoice.billingType || 'Fixed'}</div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Invoice Items</div>
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th>Qty</th>
              <th>Rate</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${(invoice.lineItems || []).map(item => `
              <tr>
                <td>${item.description || ''}</td>
                <td>${item.quantity || 0}</td>
                <td>${formatCurrency(item.rate || 0)}</td>
                <td>${formatCurrency(item.amount || 0)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="totals">
        <div class="total-row">
          <span>Subtotal:</span>
          <span>${formatCurrency(invoice.subtotal || 0)}</span>
        </div>
        ${invoice.discount > 0 ? `
          <div class="total-row">
            <span>Discount:</span>
            <span>-${formatCurrency(invoice.discount || 0)}</span>
          </div>
        ` : ''}
        <div class="total-row">
          <span>Tax (${invoice.taxRate || 0}%):</span>
          <span>${formatCurrency(invoice.taxAmount || 0)}</span>
        </div>
        <div class="total-row grand-total">
          <span>TOTAL:</span>
          <span>${formatCurrency(invoice.total || 0)}</span>
        </div>
        <div class="total-row">
          <span>Paid Amount:</span>
          <span style="color: green;">${formatCurrency(invoice.paidAmount || 0)}</span>
        </div>
        <div class="total-row">
          <span>Balance Due:</span>
          <span style="color: ${invoice.balanceDue > 0 ? 'red' : 'green'}; font-weight: bold;">
            ${formatCurrency(invoice.balanceDue || 0)}
          </span>
        </div>
      </div>

      <div class="footer">
        <p>Thank you for your business!</p>
        <p>Please make payment by the due date to avoid late fees.</p>
        <p>If you have any questions about this invoice, please contact us.</p>
      </div>
    </body>
    </html>
  `;
};

// Main function to generate PDF
export const generatePDF = (invoice) => {
  return new Promise((resolve, reject) => {
    const html = generateInvoiceHTML(invoice);
    
    const options = {
      format: 'A4',
      border: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm'
      },
      type: 'pdf',
      timeout: 30000
    };
    
    pdf.create(html, options).toBuffer((err, buffer) => {
      if (err) {
        reject(err);
      } else {
        resolve(buffer);
      }
    });
  });
};