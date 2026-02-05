// src/components/admin/invoices/InvoiceDetailModal.jsx
import { useState } from 'react'; 
import { 
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  Stack,
  Grid,
  Card,
  CardContent
} from '@mui/material';
import IconifyIcon from '../../base/IconifyIcon';

const InvoiceDetailModal = ({ open, invoice, onClose, onRecordPayment, onDownload }) => {
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  console.log('InvoiceDetailModal received invoice:', invoice); 
  
  if (!invoice) return null;

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  // In InvoiceDetailModal.jsx, update getStatusInfo to match backend:
  const getStatusInfo = (status) => {
    const statusMap = {
      'draft': { label: 'Draft', color: 'default', bgColor: '#e0e0e0' },
      'sent': { label: 'Sent', color: 'info', bgColor: '#d1ecf1' },
      'paid': { label: 'Paid', color: 'success', bgColor: '#d4edda' },
      'overdue': { label: 'Overdue', color: 'error', bgColor: '#f8d7da' },
    };
    
    return statusMap[status] || { label: 'Unknown', color: 'default', bgColor: '#e0e0e0' };
  };

  // Helper functions
  const getClientName = () => {
    if (invoice.client) {
      if (typeof invoice.client === 'object') {
        return invoice.client.name || invoice.client.companyName || invoice.clientName || 'Unknown Client';
      }
    }
    return invoice.clientName || 'Unknown Client';
  };

  const getCompanyName = () => {
    if (invoice.client) {
      if (typeof invoice.client === 'object') {
        return invoice.client.companyName || invoice.companyName || '';
      }
    }
    return invoice.companyName || '';
  };

  const getProjectName = () => {
    if (invoice.project) {
      if (typeof invoice.project === 'object') {
        return invoice.project.title || invoice.project.projectName || invoice.projectName || 'Unknown Project';
      }
    }
    return invoice.projectName || 'Unknown Project';
  };

  // Calculate if invoice is overdue
  const isOverdue = () => {
    if (!invoice.dueDate) return false;
    const today = new Date();
    const dueDate = new Date(invoice.dueDate);
    return dueDate < today && invoice.balanceDue > 0;
  };

  // Calculate balance due
 const balanceDue = invoice.balanceDue || 0;

  // Get status info
  const statusInfo = getStatusInfo(invoice.status || 'draft');

  // Calculate discount info
  const calculateDiscountInfo = () => {
    if (invoice.discountPercentage > 0) {
      return {
        amount: invoice.discountAmount || 0,
        percentage: invoice.discountPercentage,
        label: `Discount (${invoice.discountPercentage}%):`
      };
    } else if (invoice.discount > 0) {
      // Calculate percentage from amount
      const percentage = invoice.subtotal > 0 ? (invoice.discount / invoice.subtotal) * 100 : 0;
      return {
        amount: invoice.discount,
        percentage: percentage,
        label: `Discount (${percentage.toFixed(1)}%):`
      };
    }
    return { amount: 0, percentage: 0, label: 'Discount:' };
  };

  const discountInfo = calculateDiscountInfo();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ 
        sx: { 
          borderRadius: 2,
          maxHeight: '95vh'
        } 
      }}
    >
      {/* Header */}
      <DialogTitle sx={{ 
        p: 3,
        borderBottom: 1,
        borderColor: 'divider',
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h5" fontWeight={700} color="primary">
              INVOICE DETAILS
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Complete invoice information
            </Typography>
          </Box>
          <Chip
            label={statusInfo.label}
            sx={{
              color: 'text.primary',
              fontWeight: 600,
              px: 2,
              py: 1,
              fontSize: '0.875rem'
            }}
          />
        </Box>
      </DialogTitle>
      
      <DialogContent dividers sx={{ p: 0 }}>
        {downloadSuccess && (
          <Alert 
            severity="success" 
            onClose={() => setDownloadSuccess(false)}
            sx={{ 
              m: 2, 
              borderRadius: 1,
              position: 'sticky',
              top: 0,
              zIndex: 1
            }}
            icon={<IconifyIcon icon="mingcute:check-circle-fill" />}
          >
            Download started!
          </Alert>
        )}
        
        {/* Invoice Header */}
        <Box sx={{ p: 3, }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    INVOICE #
                  </Typography>
                  <Typography variant="h5" fontWeight={700} color="primary" gutterBottom>
                    {invoice.invoiceNumber || 'N/A'}
                  </Typography>
                  <Stack spacing={1}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Date Issued:</Typography>
                      <Typography variant="body2" fontWeight={500}>{formatDate(invoice.invoiceDate)}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Due Date:</Typography>
                      <Typography variant="body2" fontWeight={500} color={isOverdue() ? 'error' : 'inherit'}>
                        {formatDate(invoice.dueDate)}
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    PAYMENT STATUS
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Total Amount</Typography>
                      <Typography variant="h6" color="primary">{formatCurrency(invoice.total || 0)}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Balance Due</Typography>
                      <Typography variant="h6" color={balanceDue > 0 ? 'error' : 'success.main'}>
                        {formatCurrency(balanceDue)}
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>

        {/* Client Info */}
        <Box sx={{ p: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom color="primary">
                BILL TO
              </Typography>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="body1" fontWeight={600} gutterBottom>
                    {getClientName()}
                  </Typography>
                  {getCompanyName() && (
                    <Typography variant="body2" color="text.secondary">
                      {getCompanyName()}
                    </Typography>
                  )}
                  {invoice.billingAddress && (
                    <Typography variant="body2" color="text.secondary">
                      {invoice.billingAddress}
                    </Typography>
                  )}
                  {invoice.contactEmail && (
                    <Typography variant="body2" color="text.secondary">
                      {invoice.contactEmail}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>

        {/* Project Information */}
        <Box sx={{ px: 3, pb: 2 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom color="primary">
                PROJECT DETAILS
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">Project Name</Typography>
                  <Typography variant="body1" fontWeight={500}>{getProjectName()}</Typography>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Typography variant="body2" color="text.secondary">Project ID</Typography>
                  <Typography variant="body1" fontWeight={500}>{invoice.projectId || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Typography variant="body2" color="text.secondary">Billing Type</Typography>
                  <Typography variant="body1" fontWeight={500}>{invoice.billingType || 'Fixed'}</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Box>

        {/* Invoice Items */}
        <Box sx={{ p: 3 }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom color="primary">
            INVOICE ITEMS
          </Typography>
          
          {invoice.lineItems && invoice.lineItems.length > 0 ? (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'action.hover' }}>
                    <TableCell sx={{ fontWeight: 600, py: 2 }}>DESCRIPTION</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600, py: 2, width: '100px' }}>QTY</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, py: 2, width: '120px' }}>RATE</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, py: 2, width: '120px' }}>AMOUNT</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {invoice.lineItems.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell sx={{ py: 2 }}>{item.description || 'No description'}</TableCell>
                      <TableCell align="center" sx={{ py: 2 }}>{item.quantity || 0}</TableCell>
                      <TableCell align="right" sx={{ py: 2 }}>{formatCurrency(item.rate || 0)}</TableCell>
                      <TableCell align="right" sx={{ py: 2, fontWeight: 500 }}>
                        {formatCurrency(item.amount || 0)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Alert severity="info" sx={{ mt: 2 }}>
              No line items added to this invoice.
            </Alert>
          )}
        </Box>

        <Box sx={{ 
          p: 3, 
          borderTop: 1,
          borderColor: 'divider'
        }}>
          <Grid container spacing={2}>
            {/* Amount Summary */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, height: '100%' }}>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                  Amount Summary
                </Typography>
                <Stack spacing={1}>
                  <Grid container spacing={1}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Subtotal:</Typography>
                    </Grid>
                    <Grid item xs={6} sx={{ textAlign: 'right' }}>
                      <Typography variant="body2">{formatCurrency(invoice.subtotal || 0)}</Typography>
                    </Grid>
                    
                    {discountInfo.amount > 0 && (
                      <>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary">
                            {discountInfo.label}
                          </Typography>
                        </Grid>
                        <Grid item xs={6} sx={{ textAlign: 'right' }}>
                          <Typography variant="body2" color="error">
                            -{formatCurrency(discountInfo.amount)}
                          </Typography>
                        </Grid>
                      </>
                    )}
                    
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Tax ({invoice.taxRate || 0}%):</Typography>
                    </Grid>
                    <Grid item xs={6} sx={{ textAlign: 'right' }}>
                      <Typography variant="body2">{formatCurrency(invoice.taxAmount || 0)}</Typography>
                    </Grid>
                  </Grid>
                  
                  <Divider />
                  
                  <Grid container spacing={1}>
                    <Grid item xs={6}>
                      <Typography variant="body1" fontWeight={600}>Total:</Typography>
                    </Grid>
                    <Grid item xs={6} sx={{ textAlign: 'right' }}>
                      <Typography variant="h6" color="primary">
                        {formatCurrency(invoice.total || 0)}
                      </Typography>
                    </Grid>
                  </Grid>
                </Stack>
              </Paper>
            </Grid>
            
            {/* Payment Status */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, height: '100%' }}>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                  Payment Status
                </Typography>
                <Stack spacing={2}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">Paid:</Typography>
                    <Typography variant="body2" color="success.main" fontWeight={600}>
                      {formatCurrency(invoice.paidAmount || 0)}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body1" fontWeight={600}>Balance Due:</Typography>
                    <Typography 
                      variant="h6" 
                      color={balanceDue > 0 ? 'error' : 'success.main'} 
                      fontWeight={700}
                    >
                      {formatCurrency(balanceDue)}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ textAlign: 'center' }}>
                    <Chip
                      label={balanceDue === 0 ? 'Paid' : balanceDue > 0 ? 'Unpaid' : 'Overpaid'}
                      color={balanceDue === 0 ? 'success' : balanceDue > 0 ? 'error' : 'warning'}
                      size="small"
                    />
                  </Box>
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </Box>

        

        {/* Notes */}
        {invoice.notes && (
          <Box sx={{ p: 3}}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom color="primary">
              NOTES
            </Typography>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="body2">
                  {invoice.notes}
                </Typography>
              </CardContent>
            </Card>
          </Box>
        )}
      </DialogContent>
      
      {/* Footer */}
      <DialogActions sx={{ 
        p: 3, 
        borderTop: 1, 
        borderColor: 'divider',
      }}>
        <Stack direction="row" spacing={2} sx={{ width: '100%' }}>
          <Box sx={{ flex: 1 }}>
            <Button 
              onClick={onClose} 
              variant="outlined"
              startIcon={<IconifyIcon icon="mingcute:close-line" />}
              sx={{ mr: 1 }}
            >
              Close
            </Button>
            
            
          </Box>
          
          <Box>
            <Button 
              onClick={() => {
                onDownload && onDownload();
                setDownloadSuccess(true);
                setTimeout(() => setDownloadSuccess(false), 3000);
              }} 
              variant="contained"
              color="primary"
              startIcon={<IconifyIcon icon="mingcute:printer-line" />}
              sx={{ minWidth: 180 }}
            >
              Print/Download
            </Button>
          </Box>
        </Stack>
      </DialogActions>
    </Dialog>
  );
};

export default InvoiceDetailModal;