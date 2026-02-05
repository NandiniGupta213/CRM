import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Stack, 
  Button, 
  Typography, 
  TextField,
  InputAdornment,
  IconButton,
  Select,
  MenuItem,
  InputLabel,
  Box,
  Alert,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  FormControl,
  CircularProgress
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import IconifyIcon from '../../base/IconifyIcon';
import { LoadingButton } from '@mui/lab';

const InvoiceForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
 const { project, invoiceNumber: passedInvoiceNumber } = location.state || {};
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [actionType, setActionType] = useState('');
  const [clients, setClients] = useState([]);
  const [fetchingData, setFetchingData] = useState(false);

  const [invoiceData, setInvoiceData] = useState({
    // 1️⃣ Invoice Header
    invoiceNumber: '',
    invoiceDate: dayjs(),
    dueDate: dayjs().add(30, 'day'),
    status: 'draft',
    
    // 2️⃣ Client Information
    client: '',
    clientName: '',
    companyName: '',
    billingAddress: '',
    contactEmail: '',
    
    // 3️⃣ Project Reference
    project: '',
    projectName: '',
    projectId: '',
    projectManager: '',
    projectDuration: '',
    billingType: 'Fixed',
    
    // 4️⃣ Invoice Line Items
    lineItems: [
      {
        id: 1,
        description: '',
        quantity: 1,
        rate: 0,
        amount: 0
      }
    ],
    
    // 5️⃣ Calculations
    subtotal: 0,
    discount: 0,
    discountType: 'amount',
    taxRate: 18,
    taxAmount: 0,
    total: 0,
    
    // 6️⃣ Payment Information
    paymentMethod: 'Bank Transfer',
    bankDetails: 'State Bank of India | A/C: XXXXXX123456 | IFSC: SBIN0001234',
    upiId: '',
    paymentTerms: 'Payment due within 30 days',
  });

  const API_BASE_URL = 'http://localhost:8000';

  // Fetch clients for dropdown
  const fetchClients = async () => {
    setFetchingData(true);
    try {
      const token = localStorage.getItem('accessToken');
      
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/clients/create?limit=100`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setClients(data.data.clients || []);
        }
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setFetchingData(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

useEffect(() => {
  if (!project) {
    setErrorMessage('No project data found. Please select a project first.');
    return;
  }

  // Use the invoice number passed separately OR from project
  const invoiceNumberToUse = passedInvoiceNumber || project.invoiceNumber;
  
  // Calculate project duration
  const startDate = new Date(project.startDate);
  const endDate = new Date(project.deadline);
  const duration = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
  
  // Find project client in clients list
  const projectClient = clients.find(client => client._id === project.client?._id || client._id === project.client);
  
  // Auto-fill project data
  setInvoiceData(prev => ({
    ...prev,
    invoiceNumber: invoiceNumberToUse || prev.invoiceNumber, // Use passed invoice number
    project: project._id,
    projectName: project.title,
    projectId: project.projectId || project._id.toString().slice(-6),
    projectManager: project.manager?._id || project.manager,
    projectDuration: `${duration} days`,
    
    client: project.client?._id || project.client || '',
    clientName: projectClient?.name || project.client?.name || 'Unknown Client',
    companyName: projectClient?.companyName || project.client?.companyName || '',
    billingAddress: projectClient 
      ? `${projectClient.address}, ${projectClient.city}, ${projectClient.state} ${projectClient.postalCode}`
      : 'Address not available',
    contactEmail: projectClient?.email || project.client?.email || 'accounts@clientcompany.com',
    
    // Set default line item based on project budget
    lineItems: [{
      id: 1,
      description: `${project.title} - Project Development`,
      quantity: 1,
      rate: project.budget || project.estimatedHours * 100 || 0,
      amount: project.budget || project.estimatedHours * 100 || 0
    }]
  }));
}, [project, clients, passedInvoiceNumber]);



useEffect(() => {
  const subtotal = invoiceData.lineItems.reduce((sum, item) => sum + item.amount, 0);
  let discountAmount = 0;
  
  if (invoiceData.discount > 0) {
    if (invoiceData.discountType === 'percentage') {
      // FIX: Make sure discount is treated as percentage (e.g., 10, not 10%)
      const discountValue = invoiceData.discount;
      discountAmount = (subtotal * discountValue) / 100;
    } else {
      discountAmount = invoiceData.discount;
    }
  }
  
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = (taxableAmount * invoiceData.taxRate) / 100;
  const total = taxableAmount + taxAmount;
  
  setInvoiceData(prev => ({
    ...prev,
    subtotal,
    taxAmount,
    total,
    discountAmount: discountAmount,
  }));
}, [invoiceData.lineItems, invoiceData.discount, invoiceData.discountType, invoiceData.taxRate]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleInputChange = (field, value) => {
    setInvoiceData(prev => ({ ...prev, [field]: value }));
    
    // If client changes, update client details
    if (field === 'client') {
      const selectedClient = clients.find(client => client._id === value);
      if (selectedClient) {
        setInvoiceData(prev => ({
          ...prev,
          clientName: selectedClient.name,
          companyName: selectedClient.companyName,
          billingAddress: `${selectedClient.address}, ${selectedClient.city}, ${selectedClient.state} ${selectedClient.postalCode}`,
          contactEmail: selectedClient.email,
        }));
      }
    }
  };

  const handleLineItemChange = (index, field, value) => {
    const updatedItems = [...invoiceData.lineItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    // Recalculate amount if rate or quantity changes
    if (field === 'rate' || field === 'quantity') {
      updatedItems[index].amount = updatedItems[index].rate * updatedItems[index].quantity;
    }
    
    setInvoiceData(prev => ({
      ...prev,
      lineItems: updatedItems
    }));
  };

  const handleAddLineItem = () => {
    const newItem = {
      id: invoiceData.lineItems.length + 1,
      description: '',
      quantity: 1,
      rate: 0,
      amount: 0
    };
    
    setInvoiceData(prev => ({
      ...prev,
      lineItems: [...prev.lineItems, newItem]
    }));
  };

  const handleRemoveLineItem = (index) => {
    if (invoiceData.lineItems.length <= 1) return;
    
    const updatedItems = invoiceData.lineItems.filter((_, i) => i !== index);
    setInvoiceData(prev => ({
      ...prev,
      lineItems: updatedItems
    }));
  };

const handleSaveDraft = async () => {
  setActionType('generate');
  setLoading(true);
  setErrorMessage('');
  
  try {
    const token = localStorage.getItem('accessToken');
    
    if (!token) {
      setErrorMessage('Please login to create invoice');
      setLoading(false);
      return;
    }

    // Validate required fields
    if (!invoiceData.invoiceNumber) {
      setErrorMessage('Invoice number is required');
      setLoading(false);
      return;
    }
    
    if (!invoiceData.client) {
      setErrorMessage('Please select a client');
      setLoading(false);
      return;
    }
    
    if (!invoiceData.lineItems || invoiceData.lineItems.length === 0) {
      setErrorMessage('Please add at least one line item');
      setLoading(false);
      return;
    }

    // Validate line items
    const invalidItems = invoiceData.lineItems.filter(item => 
      !item.description || item.quantity <= 0 || item.rate < 0
    );
    
    if (invalidItems.length > 0) {
      setErrorMessage('Please check all line items have valid description, quantity, and rate');
      setLoading(false);
      return;
    }

    // Prepare data for API - ADD STATUS HERE
    const apiData = {
      projectId: invoiceData.project,
      clientId: invoiceData.client,
      clientName: invoiceData.clientName,
      companyName: invoiceData.companyName,
      billingAddress: invoiceData.billingAddress,
      contactEmail: invoiceData.contactEmail,
      lineItems: invoiceData.lineItems.map(item => ({
        description: item.description,
        quantity: item.quantity,
        rate: item.rate
      })),
      discount: invoiceData.discount,
      discountType: invoiceData.discountType,
      taxRate: invoiceData.taxRate,
      paymentMethod: invoiceData.paymentMethod,
      bankDetails: invoiceData.bankDetails,
      paymentTerms: invoiceData.paymentTerms,
      dueDate: invoiceData.dueDate.toISOString(),
      status: invoiceData.status, // ADD THIS LINE
      invoiceNumber: invoiceData.invoiceNumber ,// Make sure this is included too
      billingType: invoiceData.billingType.toLowerCase(),
    };

    console.log('Sending invoice data to backend with status:', apiData.status);

    const response = await fetch(`${API_BASE_URL}/invoices`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(apiData)
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Server error response:', data);
      setErrorMessage(data.message || `Error ${response.status}: ${response.statusText}`);
      setLoading(false);
      return;
    }
    
    if (data.success) {
      setSuccess(true);
      console.log('Invoice created successfully with status:', data.data.status);
      
      setTimeout(() => {
        setSuccess(false);
        navigate('/pages/dashboard/admin/project');
      }, 2000);
    } else {
      setErrorMessage(data.message || 'Failed to create invoice');
    }
  } catch (error) {
    console.error('Error creating invoice:', error);
    
    if (error.name === 'SyntaxError') {
      setErrorMessage('Server returned invalid response. Please check backend.');
    } else if (error.message.includes('Failed to fetch')) {
      setErrorMessage('Cannot connect to server. Please check if backend is running.');
    } else {
      setErrorMessage('Failed to create invoice: ' + error.message);
    }
  } finally {
    setLoading(false);
    setActionType('');
  }
};

  if (!project) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <IconifyIcon icon="mingcute:warning-line" fontSize={48} sx={{ color: 'warning.main', mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          No Project Selected
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Please select a project from the projects page to generate an invoice.
        </Typography>
        <Button
          variant="contained"
          onClick={() => navigate('/pages/dashboard/admin/project')}
          startIcon={<IconifyIcon icon="mingcute:arrow-left-line" />}
        >
          Back to Projects
        </Button>
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ width: '100%', p: 3, maxWidth: 1200, margin: '0 auto' }}>
        {/* Header with Action Buttons */}
        <Box sx={{ position: 'relative', mb: 10 }}>
          <Typography align="center" variant="h3" fontWeight={600} marginBottom={3}>
            Create Invoice
          </Typography>
          
          <Typography align="center" variant="body1" color="text.secondary" sx={{ mb: 8 }}>
            Project: {project.title} • Client: {invoiceData.clientName || 'Unknown Client'}
          </Typography>
        </Box>

        {success && (
          <Alert 
            severity="success" 
            sx={{ 
              mb: 3,
              borderRadius: 1,
              '& .MuiAlert-icon': { alignItems: 'center' }
            }}
            icon={<IconifyIcon icon="mingcute:check-circle-fill" />}
          >
            Invoice created successfully! Redirecting to projects...
          </Alert>
        )}
        
        {errorMessage && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setErrorMessage('')}>
            {errorMessage}
          </Alert>
        )}

        {fetchingData ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Stack direction="column" gap={2} mt={4}>
            {/* 1️⃣ Invoice Header */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              {/* Invoice Number - Auto-generated */}
              <Box sx={{ position: 'relative', width: '100%' }}>
                <InputLabel 
                  sx={{
                    position: 'absolute',
                    left: 34,
                    top: 8,
                    zIndex: 1,
                    color: 'text.secondary',
                    fontSize: '0.875rem',
                    display: invoiceData.invoiceNumber ? 'none' : 'block'
                  }}
                >
                  Invoice Number 
                </InputLabel>
                <TextField
                  value={invoiceData.invoiceNumber}
                  fullWidth
                  variant="filled"
                  disabled
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <IconifyIcon icon="mingcute:hashtag-fill" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiFilledInput-root': {
                      paddingTop: invoiceData.invoiceNumber ? '25px' : '8px',
                      paddingLeft: '14px',
                    },
                  }}
                />
              </Box>
              
              {/* Invoice Date */}
              <Box sx={{ position: 'relative', width: '100%' }}>
                <InputLabel 
                  sx={{
                    position: 'absolute',
                    left: 14,
                    top: 8,
                    zIndex: 1,
                    color: 'text.secondary',
                    fontSize: '0.875rem',
                    display: invoiceData.invoiceDate ? 'none' : 'block'
                  }}
                >
                  Invoice Date
                </InputLabel>
                <DatePicker
                  value={invoiceData.invoiceDate}
                  onChange={(date) => handleInputChange('invoiceDate', date)}
                  slotProps={{ 
                    textField: { 
                      fullWidth: true,
                      variant: 'filled',
                      InputProps: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <IconifyIcon icon="mingcute:calendar-fill" />
                          </InputAdornment>
                        ),
                      },
                      sx: {
                        '& .MuiFilledInput-root': {
                          paddingTop: invoiceData.invoiceDate ? '25px' : '8px',
                          paddingLeft: '14px',
                        },
                      }
                    } 
                  }}
                />
              </Box>
              
              {/* Due Date */}
              <Box sx={{ position: 'relative', width: '100%' }}>
                <InputLabel 
                  sx={{
                    position: 'absolute',
                    left: 14,
                    top: 8,
                    zIndex: 1,
                    color: 'text.secondary',
                    fontSize: '0.875rem',
                    display: invoiceData.dueDate ? 'none' : 'block'
                  }}
                >
                  Due Date
                </InputLabel>
                <DatePicker
                  value={invoiceData.dueDate}
                  onChange={(date) => handleInputChange('dueDate', date)}
                  slotProps={{ 
                    textField: { 
                      fullWidth: true,
                      variant: 'filled',
                      InputProps: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <IconifyIcon icon="mingcute:calendar-event-fill" />
                          </InputAdornment>
                        ),
                      },
                      sx: {
                        '& .MuiFilledInput-root': {
                          paddingTop: invoiceData.dueDate ? '25px' : '8px',
                          paddingLeft: '14px',
                        },
                      }
                    } 
                  }}
                />
              </Box>

              {/* Status */}
            <Box sx={{ position: 'relative', width: '100%' }}>
              <InputLabel 
                sx={{
                  position: 'absolute',
                  left: 14,
                  top: 8,
                  zIndex: 1,
                  color: 'text.secondary',
                  fontSize: '0.875rem',
                  display: invoiceData.status ? 'none' : 'block'
                }}
              >
                Status
              </InputLabel>
              <FormControl variant="filled" fullWidth>
                <Select
                  value={invoiceData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  label={invoiceData.status ? '' : 'Status'}
                  sx={{
                    '& .MuiFilledInput-root': {
                      paddingTop: invoiceData.status ? '25px' : '8px',
                      paddingLeft: '14px',
                    },
                  }}
                >
                  <MenuItem value="draft">Draft</MenuItem>
                  <MenuItem value="sent">Sent</MenuItem>
                  <MenuItem value="paid">Paid</MenuItem>
                  <MenuItem value="overdue">Overdue</MenuItem>
                </Select>
              </FormControl>
            </Box>
            </Stack>

            <Divider sx={{ my: 1 }} />

            {/* 2️⃣ Client Information */}
            <Box sx={{ position: 'relative' }}>
              <InputLabel 
                sx={{
                  position: 'absolute',
                  left: 14,
                  top: 8,
                  zIndex: 1,
                  color: 'text.secondary',
                  fontSize: '0.875rem',
                  display: invoiceData.client ? 'none' : 'block',
                  mt: 0.5,
                  ml: 3
                }}
              >
                Select Client
              </InputLabel>
              <FormControl variant="filled" fullWidth>
                <Select
                  value={invoiceData.client}
                  onChange={(e) => handleInputChange('client', e.target.value)}
                  label={invoiceData.client ? '' : 'Select Client'}
                  sx={{
                    '& .MuiFilledInput-root': {
                      paddingTop: invoiceData.client ? '25px' : '8px',
                      paddingLeft: '14px',
                    },
                  }}
                >
                  <MenuItem value="">Select a client</MenuItem>
                  {clients.map((client) => (
                    <MenuItem key={client._id} value={client._id}>
                      {client.name} - {client.companyName || 'No Company'}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Box sx={{ position: 'relative' }}>
              <InputLabel 
                sx={{
                  position: 'absolute',
                  left: 14,
                  top: 8,
                  zIndex: 1,
                  color: 'text.secondary',
                  fontSize: '0.875rem',
                  display: invoiceData.clientName ? 'none' : 'block',
                  mt: 0.5,
                  ml: 3
                }}
              >
                Client Name
              </InputLabel>
              <TextField
                value={invoiceData.clientName}
                onChange={(e) => handleInputChange('clientName', e.target.value)}
                fullWidth
                variant="filled"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <IconifyIcon icon="mingcute:user-2-fill" />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiFilledInput-root': {
                    paddingTop: invoiceData.clientName ? '25px' : '8px',
                    paddingLeft: '14px',
                  },
                }}
              />
            </Box>

            <Box sx={{ position: 'relative' }}>
              <InputLabel 
                sx={{
                  position: 'absolute',
                  left: 14,
                  top: 8,
                  zIndex: 1,
                  color: 'text.secondary',
                  fontSize: '0.875rem',
                  display: invoiceData.companyName ? 'none' : 'block',
                  mt: 0.5,
                  ml: 3
                }}
              >
                Company Name
              </InputLabel>
              <TextField
                value={invoiceData.companyName}
                onChange={(e) => handleInputChange('companyName', e.target.value)}
                fullWidth
                variant="filled"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <IconifyIcon icon="mingcute:building-fill" />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiFilledInput-root': {
                    paddingTop: invoiceData.companyName ? '25px' : '8px',
                    paddingLeft: '14px',
                  },
                }}
              />
            </Box>

            <Box sx={{ position: 'relative' }}>
              <InputLabel 
                sx={{
                  position: 'absolute',
                  left: 14,
                  top: 8,
                  zIndex: 1,
                  color: 'text.secondary',
                  fontSize: '0.875rem',
                  display: invoiceData.billingAddress ? 'none' : 'block',
                  mt: 0.5,
                  ml: 3
                }}
              >
                Billing Address
              </InputLabel>
              <TextField
                value={invoiceData.billingAddress}
                onChange={(e) => handleInputChange('billingAddress', e.target.value)}
                fullWidth
                variant="filled"
                multiline
                rows={2}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1.5 }}>
                      <IconifyIcon icon="mingcute:location-fill" />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiFilledInput-root': {
                    paddingTop: invoiceData.billingAddress ? '25px' : '8px',
                    paddingLeft: '14px',
                  },
                }}
              />
            </Box>

            <Box sx={{ position: 'relative' }}>
              <InputLabel 
                sx={{
                  position: 'absolute',
                  left: 14,
                  top: 8,
                  zIndex: 1,
                  color: 'text.secondary',
                  fontSize: '0.875rem',
                  display: invoiceData.contactEmail ? 'none' : 'block',
                  mt: 0.5,
                  ml: 3
                }}
              >
                Contact Email
              </InputLabel>
              <TextField
                value={invoiceData.contactEmail}
                onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                fullWidth
                variant="filled"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <IconifyIcon icon="mingcute:mail-fill" />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiFilledInput-root': {
                    paddingTop: invoiceData.contactEmail ? '25px' : '8px',
                    paddingLeft: '14px',
                  },
                }}
              />
            </Box>

            <Divider sx={{ my: 1 }} />

            {/* 3️⃣ Project Reference */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Box sx={{ position: 'relative', width: '100%' }}>
                <InputLabel 
                  sx={{
                    position: 'absolute',
                    left: 14,
                    top: 8,
                    zIndex: 1,
                    color: 'text.secondary',
                    fontSize: '0.875rem',
                    display: invoiceData.projectName ? 'none' : 'block',
                    mt: 0.5,
                    ml: 3
                  }}
                >
                  Project Name
                </InputLabel>
                <TextField
                  value={invoiceData.projectName}
                  fullWidth
                  variant="filled"
                  disabled
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <IconifyIcon icon="mingcute:projector-fill" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiFilledInput-root': {
                      paddingTop: invoiceData.projectName ? '25px' : '8px',
                      paddingLeft: '14px',
                    },
                  }}
                />
              </Box>

              <Box sx={{ position: 'relative', width: '100%' }}>
                <InputLabel 
                  sx={{
                    position: 'absolute',
                    left: 14,
                    top: 8,
                    zIndex: 1,
                    color: 'text.secondary',
                    fontSize: '0.875rem',
                    display: invoiceData.projectId ? 'none' : 'block',
                    mt: 0.5,
                    ml: 3
                  }}
                >
                  Project ID
                </InputLabel>
                <TextField
                  value={invoiceData.projectId}
                  fullWidth
                  variant="filled"
                  disabled
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <IconifyIcon icon="mingcute:hashtag-fill" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiFilledInput-root': {
                      paddingTop: invoiceData.projectId ? '25px' : '8px',
                      paddingLeft: '14px',
                    },
                  }}
                />
              </Box>
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Box sx={{ position: 'relative', width: '100%' }}>
                <InputLabel 
                  sx={{
                    position: 'absolute',
                    left: 14,
                    top: 8,
                    zIndex: 1,
                    color: 'text.secondary',
                    fontSize: '0.875rem',
                    display: invoiceData.projectDuration ? 'none' : 'block',
                    mt: 0.5,
                    ml: 3
                  }}
                >
                  Duration
                </InputLabel>
                <TextField
                  value={invoiceData.projectDuration}
                  fullWidth
                  variant="filled"
                  disabled
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <IconifyIcon icon="mingcute:clock-fill" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiFilledInput-root': {
                      paddingTop: invoiceData.projectDuration ? '25px' : '8px',
                      paddingLeft: '14px',
                    },
                  }}
                />
              </Box>

              <FormControl variant="filled" fullWidth>
                <InputLabel 
                  sx={{
                    display: invoiceData.billingType ? 'none' : 'block',
                    mt: 0.5,
                    ml: 3
                  }}
                >
                  Billing Type
                </InputLabel>
                <Select
                  value={invoiceData.billingType}
                  onChange={(e) => handleInputChange('billingType', e.target.value)}
                  label={invoiceData.billingType ? '' : 'Billing Type'}
                  sx={{
                    '& .MuiFilledInput-root': {
                      paddingTop: invoiceData.billingType ? '25px' : '8px',
                      paddingLeft: '14px',
                    },
                  }}
                >
                  <MenuItem value="Fixed">Fixed</MenuItem>
                  <MenuItem value="Hourly">Hourly</MenuItem>
                  <MenuItem value="Monthly">Monthly</MenuItem>
                  <MenuItem value="Milestone">Milestone</MenuItem>
                </Select>
              </FormControl>
            </Stack>

            <Divider sx={{ my: 1 }} />

            {/* 4️⃣ Invoice Line Items */}
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={600}>
                  Invoice Items
                </Typography>
                
                <Button
                  variant="outlined"
                  startIcon={<IconifyIcon icon="mingcute:add-line" />}
                  onClick={handleAddLineItem}
                  size="small"
                  sx={{ 
                    py: 0.5,
                    fontSize: '0.8125rem'
                  }}
                >
                  Add Item
                </Button>
              </Box>
              
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: 'action.hover' }}>
                      <TableCell width="50%">Description</TableCell>
                      <TableCell align="center" width="15%">Qty</TableCell>
                      <TableCell align="right" width="20%">Rate (₹)</TableCell>
                      <TableCell align="right" width="15%">Amount (₹)</TableCell>
                      <TableCell align="center" width="5%"></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {invoiceData.lineItems.map((item, index) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <TextField
                            value={item.description}
                            onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                            fullWidth
                            size="small"
                            variant="filled"
                            placeholder="e.g., UI Development - 40 hrs"
                            sx={{
                              '& .MuiFilledInput-root': {
                                paddingTop: item.description ? '16px' : '8px',
                              },
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleLineItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                            size="small"
                            variant="filled"
                            sx={{ width: '100%' }}
                            inputProps={{ min: 1 }}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            type="number"
                            value={item.rate}
                            onChange={(e) => handleLineItemChange(index, 'rate', parseInt(e.target.value) || 0)}
                            size="small"
                            variant="filled"
                            sx={{ width: '100%' }}
                            inputProps={{ min: 0 }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight={500}>
                            {formatCurrency(item.amount)}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="Remove">
                            <IconButton 
                              size="small" 
                              onClick={() => handleRemoveLineItem(index)}
                              disabled={invoiceData.lineItems.length <= 1}
                              sx={{ opacity: invoiceData.lineItems.length <= 1 ? 0.3 : 1 }}
                            >
                              <IconifyIcon icon="mingcute:close-line" fontSize={16} />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>

            <Divider sx={{ my: 1 }} />

            {/* 5️⃣ Calculations */}
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body1">Subtotal:</Typography>
                <Typography variant="body1" fontWeight={600}>{formatCurrency(invoiceData.subtotal)}</Typography>
              </Box>
              
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                  <Typography variant="body1" sx={{ minWidth: 80 }}>Discount:</Typography>
                  <FormControl size="small" sx={{ width: 100 }}>
                    <Select
                      value={invoiceData.discountType}
                      onChange={(e) => handleInputChange('discountType', e.target.value)}
                      size="small"
                      variant="filled"
                    >
                      <MenuItem value="amount">₹</MenuItem>
                      <MenuItem value="percentage">%</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField
                    type="number"
                    value={invoiceData.discount}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      // If percentage, ensure it's not > 100
                      if (invoiceData.discountType === 'percentage') {
                        handleInputChange('discount', Math.min(100, value));
                      } else {
                        handleInputChange('discount', value);
                      }
                    }}
                    size="small"
                    variant="filled"
                    sx={{ width: 120 }}
                    inputProps={{ 
                      min: 0,
                      max: invoiceData.discountType === 'percentage' ? 100 : undefined
                    }}
                    helperText={invoiceData.discountType === 'percentage' && invoiceData.discount > 100 ? "Discount cannot exceed 100%" : ""}
                  />
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                  <Typography variant="body1" sx={{ minWidth: 80 }}>Tax (GST):</Typography>
                  <TextField
                    type="number"
                    value={invoiceData.taxRate}
                    onChange={(e) => handleInputChange('taxRate', parseFloat(e.target.value) || 0)}
                    size="small"
                    variant="filled"
                    sx={{ width: 120 }}
                    inputProps={{ min: 0 }}
                  />
                </Box>
              </Stack>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body1">Tax ({invoiceData.taxRate}%):</Typography>
                <Typography variant="body1" fontWeight={600}>{formatCurrency(invoiceData.taxAmount)}</Typography>
              </Box>
              
              <Divider />
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                <Typography variant="h6">Total Amount:</Typography>
                <Typography variant="h5" color="primary" fontWeight={700}>
                  {formatCurrency(invoiceData.total)}
                </Typography>
              </Box>
            </Stack>

            <Divider sx={{ my: 1 }} />

            {/* 6️⃣ Payment Information */}
            <FormControl variant="filled" fullWidth>
              <InputLabel 
                sx={{
                  display: invoiceData.paymentMethod ? 'none' : 'block'
                }}
              >
                Payment Method
              </InputLabel>
              <Select
                value={invoiceData.paymentMethod}
                onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                label={invoiceData.paymentMethod ? '' : 'Payment Method'}
                sx={{
                  '& .MuiFilledInput-root': {
                    paddingTop: invoiceData.paymentMethod ? '25px' : '8px',
                    paddingLeft: '14px',
                  },
                }}
              >
                <MenuItem value="Bank Transfer">Bank Transfer</MenuItem>
                <MenuItem value="UPI">UPI</MenuItem>
                <MenuItem value="Credit Card">Credit Card</MenuItem>
                <MenuItem value="Cash">Cash</MenuItem>
                <MenuItem value="Cheque">Cheque</MenuItem>
              </Select>
            </FormControl>

            <Box sx={{ position: 'relative' }}>
              <InputLabel 
                sx={{
                  position: 'absolute',
                  left: 14,
                  top: 8,
                  zIndex: 1,
                  color: 'text.secondary',
                  fontSize: '0.875rem',
                  display: invoiceData.bankDetails ? 'none' : 'block',
                  mt: 0.5,
                  ml: 3
                }}
              >
                Bank Details
              </InputLabel>
              <TextField
                value={invoiceData.bankDetails}
                onChange={(e) => handleInputChange('bankDetails', e.target.value)}
                fullWidth
                variant="filled"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <IconifyIcon icon="mingcute:bank-fill" />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiFilledInput-root': {
                    paddingTop: invoiceData.bankDetails ? '25px' : '8px',
                    paddingLeft: '14px',
                  },
                }}
              />
            </Box>

            <Box sx={{ position: 'relative' }}>
              <InputLabel 
                sx={{
                  position: 'absolute',
                  left: 14,
                  top: 8,
                  zIndex: 1,
                  color: 'text.secondary',
                  fontSize: '0.875rem',
                  display: invoiceData.upiId ? 'none' : 'block',
                  mt: 0.5,
                  ml: 3
                }}
              >
                UPI ID (Optional)
              </InputLabel>
              <TextField
                value={invoiceData.upiId}
                onChange={(e) => handleInputChange('upiId', e.target.value)}
                fullWidth
                variant="filled"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <IconifyIcon icon="mingcute:scan-fill" />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiFilledInput-root': {
                    paddingTop: invoiceData.upiId ? '25px' : '8px',
                    paddingLeft: '14px',
                  },
                }}
              />
            </Box>

            <Box sx={{ position: 'relative' }}>
              <InputLabel 
                sx={{
                  position: 'absolute',
                  left: 14,
                  top: 8,
                  zIndex: 1,
                  color: 'text.secondary',
                  fontSize: '0.875rem',
                  display: invoiceData.paymentTerms ? 'none' : 'block',
                  mt: 0.5,
                  ml: 3
                }}
              >
                Payment Terms
              </InputLabel>
              <TextField
                value={invoiceData.paymentTerms}
                onChange={(e) => handleInputChange('paymentTerms', e.target.value)}
                fullWidth
                variant="filled"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <IconifyIcon icon="mingcute:file-text-fill" />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiFilledInput-root': {
                    paddingTop: invoiceData.paymentTerms ? '25px' : '8px',
                    paddingLeft: '14px',
                  },
                }}
              />
            </Box>

            {/* Action Buttons */}
            <Stack direction="row" spacing={1} mt={2} justifyContent="flex-end">
              <Button
                variant="outlined"
                color="inherit"
                onClick={() => navigate('/pages/dashboard/admin/project')}
                startIcon={<IconifyIcon icon="mingcute:arrow-left-line" />}
                size="small"
                sx={{ 
                  py: 0.75,
                  fontSize: '0.8125rem'
                }}
              >
                Back to Projects
              </Button>
              
              <LoadingButton
                variant="contained"
                color="primary"
                startIcon={<IconifyIcon icon="mingcute:save-line" />}
                onClick={handleSaveDraft}
                loading={loading && actionType === 'generate'}
                loadingPosition="start"
                size="small"
                sx={{ 
                  py: 0.75,
                  fontSize: '0.8125rem'
                }}
              >
                {loading && actionType === 'generate' ? 'Creating...' : 'Create Invoice'}
              </LoadingButton>
            </Stack>
          </Stack>
        )}
      </Box>
    </LocalizationProvider>
  );
};

export default InvoiceForm;