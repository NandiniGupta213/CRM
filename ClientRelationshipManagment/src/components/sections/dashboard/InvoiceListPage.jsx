// src/components/admin/invoices/InvoiceListPage.jsx
import { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  Stack, 
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputAdornment,
  Menu,
  MenuItem,
  Pagination,
  Alert,
  Tooltip,
  InputLabel,
  Menu as MuiMenu,
  CircularProgress,
  FormControl,
  Select
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import IconifyIcon from '../../base/IconifyIcon';
import InvoiceDetailModal from './InvoiceDetailModal';

const InvoiceListPage = () => {
  const [invoices, setInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [anchorEl, setAnchorEl] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
  const [paymentReference, setPaymentReference] = useState('');
  const [actionsMenuAnchor, setActionsMenuAnchor] = useState(null);
  const [selectedInvoiceForActions, setSelectedInvoiceForActions] = useState(null);
  const navigate = useNavigate();

  const API_BASE_URL = 'http://localhost:8000';
  const itemsPerPage = 10;

  // Fetch invoices from API
  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        setErrorMessage('Please login to access invoices');
        setTimeout(() => setErrorMessage(''), 5000);
        setLoading(false);
        navigate('/login');
        return;
      }

      const queryParams = new URLSearchParams({
        page: page,
        limit: itemsPerPage,
        search: searchTerm,
        status: statusFilter !== 'all' ? statusFilter : '',
        sort: '-invoiceDate'
      }).toString();

      console.log('Fetching invoices from:', `${API_BASE_URL}/invoices?${queryParams}`);
      
      const response = await fetch(`${API_BASE_URL}/invoices?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('accessToken');
          setErrorMessage('Session expired. Please login again.');
          setTimeout(() => setErrorMessage(''), 5000);
          navigate('/login');
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('API Response data:', data);
      
      if (data.success) {
        setInvoices(data.data?.invoices || data.invoices || []);
        setTotalPages(data.data?.pagination?.pages || data.pagination?.pages || 1);
      } else {
        setErrorMessage(data.message || 'Failed to load invoices');
        setTimeout(() => setErrorMessage(''), 5000);
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
      setErrorMessage('Failed to load invoices: ' + error.message);
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  // Fetch single invoice by ID
  const fetchInvoiceById = async (invoiceId) => {
    try {
      const token = localStorage.getItem('accessToken');
      
      if (!token) return null;

      console.log('Fetching invoice:', `${API_BASE_URL}/invoices/${invoiceId}`);
      
      const response = await fetch(`${API_BASE_URL}/invoices/${invoiceId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Single invoice data:', data);
        return data.success ? data.data : null;
      }
    } catch (error) {
      console.error('Error fetching invoice:', error);
    }
    return null;
  };

  useEffect(() => {
    fetchInvoices();
  }, [page, searchTerm, statusFilter]);

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
        month: 'short',
        day: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const getStatusInfo = (status, dueDate, paidAmount, totalAmount) => {
    const today = new Date();
    const due = dueDate ? new Date(dueDate) : today;
    const paid = paidAmount || 0;
    const total = totalAmount || 0;
    
    // Auto-update overdue status - check if invoice is sent and overdue
    if (status === 'sent' && due < today && (paid < total)) {
      status = 'overdue';
    }
    
    // Auto-update paid status - check if fully paid
    if ((status === 'sent' || status === 'draft') && paid >= total) {
      status = 'paid';
    }
    
    const statusMap = {
      'draft': { label: 'Draft', color: 'default', icon: 'mingcute:draft-line' },
      'sent': { label: 'Sent', color: 'info', icon: 'mingcute:send-plane-line' },
      'paid': { label: 'Paid', color: 'success', icon: 'mingcute:check-circle-line' },
      'overdue': { label: 'Overdue', color: 'error', icon: 'mingcute:alarm-line' },
    };
    
    return statusMap[status] || { label: 'Unknown', color: 'default', icon: 'mingcute:help-line' };
  };

  const handleStatusFilterClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleStatusFilterClose = (status) => {
    setStatusFilter(status);
    setAnchorEl(null);
    setPage(1);
  };

  const handleViewInvoice = async (invoice) => {
    console.log('Invoice data being passed to modal:', invoice);
    
    try {
      const fullInvoice = await fetchInvoiceById(invoice._id);
      if (fullInvoice) {
        console.log('Full invoice from API:', fullInvoice);
        setSelectedInvoice(fullInvoice);
        setDetailModalOpen(true);
      } else {
        setSelectedInvoice(invoice);
        setDetailModalOpen(true);
      }
    } catch (error) {
      console.error('Error viewing invoice:', error);
      setSelectedInvoice(invoice);
      setDetailModalOpen(true);
    }
  };


  const handleDownloadInvoice = async (invoice) => {
    try {
      const token = localStorage.getItem('accessToken');
      
      // Show loading
      setLoading(true);
      
      const response = await fetch(`${API_BASE_URL}/invoices/${invoice._id}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to download: ${response.status}`);
      }
      
      // Get the PDF blob
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${invoice.invoiceNumber || 'invoice'}.pdf`;
      
      // Append to body, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up URL
      window.URL.revokeObjectURL(url);
      
      setSuccessMessage(`Invoice ${invoice.invoiceNumber} downloaded successfully!`);
      setTimeout(() => setSuccessMessage(''), 3000);
      
    } catch (error) {
      console.error('Error downloading invoice:', error);
      setErrorMessage('Failed to download invoice. Please try again.');
      setTimeout(() => setErrorMessage(''), 3000);
      
      // Fallback to print view
      // generateClientSidePDF(invoice); // Uncomment if you have this function
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSubmit = async () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      setErrorMessage('Please enter a valid payment amount');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }

    if (!selectedInvoice) return;

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE_URL}/invoices/${selectedInvoice._id}/payment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: parseFloat(paymentAmount),
          method: paymentMethod,
          reference: paymentReference || `PAY-${Date.now()}`,
          date: paymentDate,
          notes: `Payment recorded for invoice ${selectedInvoice.invoiceNumber}`
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccessMessage(`Payment of ${formatCurrency(paymentAmount)} recorded successfully!`);
        setPaymentModalOpen(false);
        fetchInvoices();
        
        if (selectedInvoice) {
          const updatedInvoice = await fetchInvoiceById(selectedInvoice._id);
          if (updatedInvoice) {
            setSelectedInvoice(updatedInvoice);
          }
        }
      } else {
        setErrorMessage(data.message || 'Failed to record payment');
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      setErrorMessage('Failed to record payment');
    } finally {
      setTimeout(() => {
        setSuccessMessage('');
        setErrorMessage('');
      }, 3000);
      
      setPaymentAmount('');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setPaymentMethod('Bank Transfer');
      setPaymentReference('');
    }
  };

  const handleSendInvoice = async (invoice) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE_URL}/invoices/${invoice._id}/send`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccessMessage(`Invoice ${invoice.invoiceNumber} sent successfully!`);
        fetchInvoices();
      } else {
        setErrorMessage(data.message || 'Failed to send invoice');
      }
    } catch (error) {
      console.error('Error sending invoice:', error);
      setErrorMessage('Failed to send invoice');
    } finally {
      setTimeout(() => {
        setSuccessMessage('');
        setErrorMessage('');
      }, 3000);
    }
  };

  const handleDeleteInvoice = async (invoice) => {
    if (!window.confirm(`Are you sure you want to delete invoice ${invoice.invoiceNumber}?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE_URL}/invoices/${invoice._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccessMessage(`Invoice ${invoice.invoiceNumber} deleted successfully!`);
        fetchInvoices();
      } else {
        setErrorMessage(data.message || 'Failed to delete invoice');
      }
    } catch (error) {
      console.error('Error deleting invoice:', error);
      setErrorMessage('Failed to delete invoice');
    } finally {
      setTimeout(() => {
        setSuccessMessage('');
        setErrorMessage('');
      }, 3000);
    }
  };

  const handleActionsClick = (event, invoice) => {
    setActionsMenuAnchor(event.currentTarget);
    setSelectedInvoiceForActions(invoice);
  };

  const handleActionsClose = () => {
    setActionsMenuAnchor(null);
    setSelectedInvoiceForActions(null);
  };

  const calculateDaysLeft = (dueDate) => {
    if (!dueDate) return null;
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getClientName = (client) => {
    if (typeof client === 'object' && client !== null) {
      return client.name || client.companyName || 'Unknown Client';
    }
    return 'Unknown Client';
  };

  const getProjectName = (project) => {
    if (typeof project === 'object' && project !== null) {
      return project.title || 'Unknown Project';
    }
    return 'Unknown Project';
  };

  // Add missing function for payment method display
  const getPaymentMethodDisplay = (method) => {
    if (!method) return 'Bank Transfer';
    return method;
  };

  return (
    <Box sx={{ width: '100%', p: 3 }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 4,
        flexWrap: 'wrap',
        gap: 2 
      }}>
        <Box>
          <Typography variant="h4" fontWeight={600}>
            Invoice Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Track and manage all invoices
          </Typography>
        </Box>
      </Box>

      {successMessage && (
        <Alert 
          severity="success" 
          sx={{ mb: 3 }}
          onClose={() => setSuccessMessage('')}
        >
          {successMessage}
        </Alert>
      )}

      {errorMessage && (
        <Alert 
          severity="error" 
          sx={{ mb: 3 }}
          onClose={() => setErrorMessage('')}
        >
          {errorMessage}
        </Alert>
      )}

      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
          <TextField
            placeholder="Search invoices..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            variant="filled"
            size="small"
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <IconifyIcon icon="mingcute:search-line" />
                </InputAdornment>
              ),
            }}
          />
          
          <Button
            variant="outlined"
            onClick={handleStatusFilterClick}
            startIcon={<IconifyIcon icon="mingcute:filter-line" />}
            endIcon={<IconifyIcon icon="mingcute:down-line" />}
            sx={{ minWidth: 140 }}
          >
            {statusFilter === 'all' ? 'All Status' : getStatusInfo(statusFilter).label}
          </Button>
          
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
          >
            <MenuItem onClick={() => handleStatusFilterClose('all')}>All Invoices</MenuItem>
            <MenuItem onClick={() => handleStatusFilterClose('draft')}>
              <Chip label="Draft" size="small" color="default" variant="outlined" sx={{ mr: 1 }} />
              Draft
            </MenuItem>
            <MenuItem onClick={() => handleStatusFilterClose('sent')}>
              <Chip label="Sent" size="small" color="info" variant="outlined" sx={{ mr: 1 }} />
              Sent
            </MenuItem>
            <MenuItem onClick={() => handleStatusFilterClose('paid')}>
              <Chip label="Paid" size="small" color="success" variant="outlined" sx={{ mr: 1 }} />
              Paid
            </MenuItem>
            <MenuItem onClick={() => handleStatusFilterClose('overdue')}>
              <Chip label="Overdue" size="small" color="error" variant="outlined" sx={{ mr: 1 }} />
              Overdue
            </MenuItem>
          </Menu>
          
          <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
            {invoices.length} invoice{invoices.length !== 1 ? 's' : ''} found
          </Typography>
        </Stack>
      </Paper>

      <TableContainer component={Paper} sx={{ borderRadius: 2, mb: 3 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: 'action.hover' }}>
                <TableCell sx={{ fontWeight: 600 }}>Invoice #</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Project</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Client</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Amount</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Due Date</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {invoices.map((invoice) => {
                const statusInfo = getStatusInfo(invoice.status, invoice.dueDate, invoice.paidAmount, invoice.total);
                const daysLeft = calculateDaysLeft(invoice.dueDate);
                const balanceDue = invoice.total - (invoice.paidAmount || 0);
                
                return (
                  <TableRow 
                    key={invoice._id}
                    hover
                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {invoice.invoiceNumber || 'N/A'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(invoice.invoiceDate)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {getProjectName(invoice.project)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {invoice.projectId || 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {getClientName(invoice.client)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {formatCurrency(invoice.total || 0)}
                      </Typography>
                      {invoice.paidAmount > 0 && (
                        <Typography variant="caption" color="success.main">
                          Paid: {formatCurrency(invoice.paidAmount || 0)}
                        </Typography>
                      )}
                      
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2">
                          {formatDate(invoice.dueDate)}
                        </Typography>
                        {daysLeft > 0 && balanceDue > 0 && (
                          <Typography variant="caption" color={daysLeft < 7 ? 'error' : 'text.secondary'}>
                            {daysLeft} days left
                          </Typography>
                        )}
                        {daysLeft < 0 && balanceDue > 0 && (
                          <Typography variant="caption" color="error">
                            Overdue by {Math.abs(daysLeft)} days
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={statusInfo.label}
                        color={statusInfo.color}
                        size="small"
                        icon={<IconifyIcon icon={statusInfo.icon} />}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Tooltip title="View Invoice" arrow>
                          <IconButton
                            size="small"
                            onClick={() => handleViewInvoice(invoice)}
                            sx={{ color: 'primary.main', '&:hover': { backgroundColor: 'primary.lighter' } }}
                          >
                            <IconifyIcon icon="mingcute:eye-line" />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title="Record Payment" arrow>
                          <IconButton
                            size="small"
                            onClick={() => handleRecordPayment(invoice)}
                            disabled={invoice.paidAmount >= invoice.total}
                            sx={{ 
                              color: invoice.paidAmount >= invoice.total ? 'text.disabled' : 'success.main',
                              '&:hover': { backgroundColor: invoice.paidAmount >= invoice.total ? 'transparent' : 'success.lighter' }
                            }}
                          >
                            <IconifyIcon icon="mingcute:money-dollar-circle-line" />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title="Download/Print" arrow>
                          <IconButton
                            size="small"
                            onClick={() => handleDownloadInvoice(invoice)}
                            sx={{ color: 'info.main', '&:hover': { backgroundColor: 'info.lighter' } }}
                          >
                            <IconifyIcon icon="mingcute:download-line" />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title="More Actions" arrow>
                          <IconButton
                            size="small"
                            onClick={(e) => handleActionsClick(e, invoice)}
                            sx={{ color: 'text.secondary', '&:hover': { backgroundColor: 'action.hover' } }}
                          >
                            <IconifyIcon icon="mingcute:more-2-line" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
              
              {invoices.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <IconifyIcon icon="mingcute:file-search-line" fontSize={48} sx={{ opacity: 0.3, mb: 1 }} />
                    <Typography color="text.secondary">
                      {searchTerm ? 'No invoices found matching your search' : 'No invoices found'}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </TableContainer>

      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination 
            count={totalPages} 
            page={page} 
            onChange={(e, value) => setPage(value)}
            color="primary"
            showFirstButton 
            showLastButton
          />
        </Box>
      )}

      {selectedInvoice && (
        <InvoiceDetailModal
          open={detailModalOpen}
          invoice={selectedInvoice}
          onClose={() => {
            setDetailModalOpen(false);
            setSelectedInvoice(null);
          }}
          onRecordPayment={() => {
            setDetailModalOpen(false);
            handleRecordPayment(selectedInvoice);
          }}
          onDownload={() => handleDownloadInvoice(selectedInvoice)}
        />
      )}



      <MuiMenu
        anchorEl={actionsMenuAnchor}
        open={Boolean(actionsMenuAnchor)}
        onClose={handleActionsClose}
      >
        {selectedInvoiceForActions && (
          <>
            <MenuItem onClick={() => { handleActionsClose(); handleViewInvoice(selectedInvoiceForActions); }}>
              <IconifyIcon icon="mingcute:eye-line" sx={{ mr: 1 }} />
              View Details
            </MenuItem>
            
            
            
            <MenuItem onClick={() => { handleActionsClose(); handleDownloadInvoice(selectedInvoiceForActions); }}>
              <IconifyIcon icon="mingcute:download-line" sx={{ mr: 1 }} />
              Download/Print
            </MenuItem>
            
            
        
            <MenuItem 
              onClick={() => { handleActionsClose(); handleDeleteInvoice(selectedInvoiceForActions); }}
              sx={{ color: 'error.main' }}
            >
              <IconifyIcon icon="mingcute:delete-bin-line" sx={{ mr: 1 }} />
              Delete Invoice
            </MenuItem>
          </>
        )}
      </MuiMenu>
    </Box>
  );
};

export default InvoiceListPage;