import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Stack,
  Avatar,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Alert,
  CircularProgress,
  Pagination,
  LinearProgress,
  Tooltip
} from '@mui/material';
import {
  Search as SearchIcon,
  Receipt as ReceiptIcon,
  AttachMoney,
  CheckCircle,
  Pending,
  Warning,
  Download,
  Visibility,
  FileDownload
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

const ClientInvoicesPage = () => {
  const navigate = useNavigate();
  
  const [invoices, setInvoices] = useState([]);
  const [stats, setStats] = useState(null);
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState({ start: null, end: null });
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;
  
  // Dialog state
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [invoiceDetails, setInvoiceDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const API_BASE_URL = 'http://localhost:8000';

  // Fetch client invoices
  const fetchMyInvoices = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        navigate('/login');
        return;
      }

      const queryParams = new URLSearchParams({
        page,
        limit: itemsPerPage,
        search: searchTerm,
        status: statusFilter !== 'all' ? statusFilter : '',
        ...(dateFilter.start && { startDate: dateFilter.start.toISOString() }),
        ...(dateFilter.end && { endDate: dateFilter.end.toISOString() })
      }).toString();

      const response = await fetch(
        `${API_BASE_URL}/client-invoice/my-invoices?${queryParams}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        if (response.status === 403) {
          setError('Access denied. Only clients can view invoices.');
          return;
        }
        throw new Error(`Failed to fetch invoices: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setInvoices(data.data.invoices || []);
        setClient(data.data.client);
        setTotalPages(data.data.pagination?.pages || 1);
      } else {
        setError(data.message || 'Failed to load invoices');
      }
    } catch (err) {
      setError(err.message);
      console.error('Error fetching invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch invoice statistics
  const fetchInvoiceStats = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(
        `${API_BASE_URL}/client-invoice/my-invoices/stats`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setStats(data.data);
        }
      }
    } catch (err) {
      console.error('Error fetching invoice stats:', err);
    }
  };

  // View invoice details
  const handleViewInvoice = async (invoiceId) => {
    try {
      setLoadingDetails(true);
      const token = localStorage.getItem('accessToken');
      const response = await fetch(
        `${API_BASE_URL}/client-invoice/my-invoices/${invoiceId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setInvoiceDetails(data.data.invoice);
          setDialogOpen(true);
        }
      }
    } catch (err) {
      console.error('Error fetching invoice details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Download invoice PDF using your existing endpoint
  const handleDownloadInvoice = async (invoiceId, invoiceNumber) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(
        `${API_BASE_URL}/invoices/${invoiceId}/download`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          }
        }
      );

      if (response.ok) {
        // Create blob from response
        const blob = await response.blob();
        
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice-${invoiceNumber}.pdf`;
        document.body.appendChild(a);
        a.click();
        
        // Cleanup
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        console.error('Failed to download invoice');
        // Fallback: Open in new tab if download doesn't work
        window.open(`${API_BASE_URL}/invoices/${invoiceId}/download`, '_blank');
      }
    } catch (err) {
      console.error('Error downloading invoice:', err);
      // Fallback: Try to open in new tab
      window.open(`${API_BASE_URL}/invoices/${invoiceId}/download`, '_blank');
    }
  };

  // Status chip colors and icons
  const getStatusInfo = (status) => {
    switch (status) {
      case 'paid':
        return { color: 'success', icon: <CheckCircle fontSize="small" />, label: 'Paid' };
      case 'sent':
        return { color: 'primary', icon: <Pending fontSize="small" />, label: 'Pending' };
      case 'overdue':
        return { color: 'error', icon: <Warning fontSize="small" />, label: 'Overdue' };
      case 'draft':
        return { color: 'default', icon: <ReceiptIcon fontSize="small" />, label: 'Draft' };
      default:
        return { color: 'default', icon: <ReceiptIcon fontSize="small" />, label: status };
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Calculate days left
  const calculateDaysLeft = (dueDate) => {
    const today = new Date();
    const deadline = new Date(dueDate);
    const diffTime = deadline.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Initial load
  useEffect(() => {
    fetchMyInvoices();
    fetchInvoiceStats();
  }, [page, searchTerm, statusFilter, dateFilter]);

  if (loading && !invoices.length) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" gutterBottom fontWeight="bold">
            My Invoices
          </Typography>
          <Typography variant="body1" color="text.secondary">
            View and download all your invoices
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Stats Cards */}
        {stats && (
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                      <ReceiptIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="h6">{stats.totalInvoices}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Invoices
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Avatar sx={{ bgcolor: 'success.main' }}>
                      <CheckCircle />
                    </Avatar>
                    <Box>
                      <Typography variant="h6">{stats.paidInvoices}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Paid Invoices
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Avatar sx={{ bgcolor: 'warning.main' }}>
                      <Warning />
                    </Avatar>
                    <Box>
                      <Typography variant="h6">{stats.overdueInvoices}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Overdue Invoices
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={2}>
                     <Avatar sx={{ bgcolor: 'info.main' }}>
  <Typography variant="body1" fontWeight="bold">
    RS
  </Typography>
</Avatar>
                    <Box>
                      <Typography variant="h6">
                        {formatCurrency(stats.totalAmount)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Amount
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Filters */}
        <Card sx={{ mb: 3, borderRadius: 2 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  placeholder="Search by invoice #, project..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={statusFilter}
                    label="Status"
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setPage(1);
                    }}
                  >
                    <MenuItem value="all">All Status</MenuItem>
                    <MenuItem value="paid">Paid</MenuItem>
                    <MenuItem value="sent">Pending</MenuItem>
                    <MenuItem value="overdue">Overdue</MenuItem>
                    <MenuItem value="draft">Draft</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={5}>
                <Stack direction="row" spacing={2}>
                  <DatePicker
                    label="Start Date"
                    value={dateFilter.start}
                    onChange={(newValue) => {
                      setDateFilter(prev => ({ ...prev, start: newValue }));
                      setPage(1);
                    }}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                  <DatePicker
                    label="End Date"
                    value={dateFilter.end}
                    onChange={(newValue) => {
                      setDateFilter(prev => ({ ...prev, end: newValue }));
                      setPage(1);
                    }}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </Stack>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Invoices Table */}
        <Card sx={{ borderRadius: 2 }}>
          <CardContent>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ backgroundColor: 'action.hover' }}>
                        <TableCell sx={{ fontWeight: 600 }}>Invoice #</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Project</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Amount</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Due Date</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Days Left</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {invoices.map((invoice) => {
                        const statusInfo = getStatusInfo(invoice.status);
                        const daysLeft = calculateDaysLeft(invoice.dueDate);
                        const isOverdue = daysLeft < 0 && invoice.status !== 'paid';
                        
                        return (
                          <TableRow key={invoice._id} hover>
                            <TableCell>
                              <Typography variant="subtitle2" fontWeight={600}>
                                {invoice.invoiceNumber}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {formatDate(invoice.invoiceDate)}
                              </Typography>
                            </TableCell>
                            
                            <TableCell>
                              <Box>
                                <Typography variant="body2">
                                  {invoice.projectName}
                                </Typography>
                                {invoice.projectId && (
                                  <Typography variant="caption" color="text.secondary">
                                    ID: {invoice.projectId}
                                  </Typography>
                                )}
                              </Box>
                            </TableCell>
                            
                            <TableCell>
                              <Typography variant="body2" fontWeight={600}>
                                {formatCurrency(invoice.amount)}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Paid: {formatCurrency(invoice.paid)}
                              </Typography>
                            </TableCell>
                            
                            <TableCell>
                              <Chip
                                icon={statusInfo.icon}
                                label={statusInfo.label}
                                color={statusInfo.color}
                                size="small"
                                variant="outlined"
                              />
                            </TableCell>
                            
                            <TableCell>
                              <Typography variant="body2">
                                {formatDate(invoice.dueDate)}
                              </Typography>
                            </TableCell>
                            
                            <TableCell>
                              {isOverdue ? (
                                <Typography variant="caption" color="error" fontWeight={500}>
                                  Overdue by {Math.abs(daysLeft)} days
                                </Typography>
                              ) : invoice.status === 'paid' ? (
                                <Typography variant="caption" color="success" fontWeight={500}>
                                  Paid
                                </Typography>
                              ) : (
                                <Typography variant="caption" color="primary" fontWeight={500}>
                                  {daysLeft} days left
                                </Typography>
                              )}
                            </TableCell>
                            
                            <TableCell>
                              <Stack direction="row" spacing={1}>
                                <Tooltip title="View Details">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleViewInvoice(invoice._id)}
                                    sx={{ 
                                      bgcolor: 'primary.light',
                                      '&:hover': { bgcolor: 'primary.main', color: 'white' }
                                    }}
                                  >
                                    <Visibility fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                
                                <Tooltip title="Download PDF">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleDownloadInvoice(invoice._id, invoice.invoiceNumber)}
                                    sx={{ 
                                      bgcolor: 'success.light',
                                      '&:hover': { bgcolor: 'success.main', color: 'white' }
                                    }}
                                  >
                                    <FileDownload fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      
                      {invoices.length === 0 && !loading && (
                        <TableRow>
                          <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                            <Box sx={{ textAlign: 'center' }}>
                              <ReceiptIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
                              <Typography variant="h6" color="text.secondary" gutterBottom>
                                No invoices found
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {searchTerm || statusFilter !== 'all' 
                                  ? 'No invoices match your search criteria' 
                                  : 'You have no invoices yet'}
                              </Typography>
                            </Box>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Pagination */}
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
              </>
            )}
          </CardContent>
        </Card>

        {/* Invoice Details Dialog */}
        <Dialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{ sx: { borderRadius: 3 } }}
        >
          {loadingDetails ? (
            <DialogContent sx={{ py: 4 }}>
              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <CircularProgress />
              </Box>
            </DialogContent>
          ) : invoiceDetails ? (
            <>
              <DialogTitle sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Box>
                  <Typography variant="h5" gutterBottom>
                    Invoice #{invoiceDetails.invoiceNumber}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {invoiceDetails.projectName} • {formatDate(invoiceDetails.invoiceDate)}
                  </Typography>
                </Box>
              </DialogTitle>
              
              <DialogContent dividers sx={{ pt: 3 }}>
                {/* Client and Status Info */}
                <Grid container spacing={3} sx={{ mb: 4 }}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                      Billed To
                    </Typography>
                    {invoiceDetails.client && (
                      <Box>
                        <Typography variant="body1" fontWeight={600}>
                          {invoiceDetails.client.companyName || invoiceDetails.client.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {invoiceDetails.client.email}
                        </Typography>
                        {invoiceDetails.client.phone && (
                          <Typography variant="body2" color="text.secondary">
                            Phone: {invoiceDetails.client.phone}
                          </Typography>
                        )}
                        {invoiceDetails.client.address && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            {invoiceDetails.client.address}
                          </Typography>
                        )}
                      </Box>
                    )}
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <Box>
                        <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                          Invoice Details
                        </Typography>
                        <Typography variant="body2">
                          Issue Date: {formatDate(invoiceDetails.invoiceDate)}
                        </Typography>
                        <Typography variant="body2">
                          Due Date: {formatDate(invoiceDetails.dueDate)}
                        </Typography>
                        {invoiceDetails.isOverdue && (
                          <Typography variant="caption" color="error" fontWeight={500}>
                            Overdue by {invoiceDetails.daysLeft} days
                          </Typography>
                        )}
                      </Box>
                      
                      <Chip
                        label={getStatusInfo(invoiceDetails.status).label}
                        color={getStatusInfo(invoiceDetails.status).color}
                        size="medium"
                      />
                    </Box>
                  </Grid>
                </Grid>

                {/* Line Items Table */}
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Line Items
                </Typography>
                <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Description</TableCell>
                        <TableCell align="right">Qty</TableCell>
                        <TableCell align="right">Rate</TableCell>
                        <TableCell align="right">Amount</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {invoiceDetails.lineItems?.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Typography variant="body2">{item.description}</Typography>
                          </TableCell>
                          <TableCell align="right">{item.quantity}</TableCell>
                          <TableCell align="right">{formatCurrency(item.rate)}</TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight={500}>
                              {formatCurrency(item.amount)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Payment Summary */}
                <Box sx={{ maxWidth: 300, ml: 'auto' }}>
                  <Stack spacing={1}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">
                        Subtotal:
                      </Typography>
                      <Typography variant="body2">
                        {formatCurrency(invoiceDetails.subtotal || 0)}
                      </Typography>
                    </Box>
                    
                    {invoiceDetails.discount > 0 && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">
                          Discount:
                        </Typography>
                        <Typography variant="body2" color="error">
                          -{formatCurrency(invoiceDetails.discount || 0)}
                        </Typography>
                      </Box>
                    )}
                    
                    {invoiceDetails.taxAmount > 0 && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">
                          Tax ({invoiceDetails.taxRate || 18}%):
                        </Typography>
                        <Typography variant="body2">
                          {formatCurrency(invoiceDetails.taxAmount || 0)}
                        </Typography>
                      </Box>
                    )}
                    
                    <Divider />
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="subtitle1" fontWeight={600}>
                        Total:
                      </Typography>
                      <Typography variant="h6" fontWeight={600}>
                        {formatCurrency(invoiceDetails.total || 0)}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">
                        Paid Amount:
                      </Typography>
                      <Typography variant="body2" color="success.main" fontWeight={500}>
                        {formatCurrency(invoiceDetails.paidAmount || 0)}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">
                        Balance Due:
                      </Typography>
                      <Typography variant="body1" fontWeight={600} 
                        color={invoiceDetails.balanceDue > 0 ? 'error.main' : 'success.main'}>
                        {formatCurrency(invoiceDetails.balanceDue || 0)}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>

                {/* Payment Progress */}
                {!invoiceDetails.isFullyPaid && (
                  <Box sx={{ mt: 4 }}>
                    <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                      Payment Progress
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box sx={{ flexGrow: 1 }}>
                        <LinearProgress
                          variant="determinate"
                          value={invoiceDetails.paidPercentage || 0}
                          sx={{ height: 10, borderRadius: 5 }}
                        />
                      </Box>
                      <Typography variant="body2" fontWeight={600}>
                        {invoiceDetails.paidPercentage || 0}%
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      {formatCurrency(invoiceDetails.paidAmount || 0)} of {formatCurrency(invoiceDetails.total || 0)} paid
                    </Typography>
                  </Box>
                )}

                {/* Payment History */}
                {invoiceDetails.paymentHistory?.length > 0 && (
                  <Box sx={{ mt: 4 }}>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      Payment History
                    </Typography>
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Date</TableCell>
                            <TableCell>Method</TableCell>
                            <TableCell align="right">Amount</TableCell>
                            <TableCell>Reference</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {invoiceDetails.paymentHistory.map((payment, index) => (
                            <TableRow key={index}>
                              <TableCell>{formatDate(payment.date)}</TableCell>
                              <TableCell>{payment.method}</TableCell>
                              <TableCell align="right">
                                <Typography variant="body2" color="success.main" fontWeight={500}>
                                  {formatCurrency(payment.amount)}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="caption" color="text.secondary">
                                  {payment.reference || 'N/A'}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                )}
              </DialogContent>
              
              <DialogActions sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                <Button 
                  onClick={() => setDialogOpen(false)}
                  variant="outlined"
                >
                  Close
                </Button>
                
                {/* Download PDF Button using your existing endpoint */}
                <Button 
                  variant="contained" 
                  color="primary"
                  startIcon={<Download />}
                  onClick={() => handleDownloadInvoice(invoiceDetails._id, invoiceDetails.invoiceNumber)}
                >
                  Download PDF
                </Button>
              </DialogActions>
            </>
          ) : null}
        </Dialog>
      </Container>
    </LocalizationProvider>
  );
};

export default ClientInvoicesPage;