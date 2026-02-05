// src/routes/paths.js
export const rootPaths = {
  root: '/',
  pagesRoot: 'pages',
  authRoot: 'authentication',
  errorRoot: 'error',
  dashboardRoot: 'dashboard',
};

export default {
  // Main dashboard entry point - will redirect based on role
  dashboard: `/${rootPaths.pagesRoot}/${rootPaths.dashboardRoot}`,
  
  // Role-specific dashboards
  adminDashboard: `/${rootPaths.pagesRoot}/${rootPaths.dashboardRoot}/admin`,
  projectManagerDashboard: `/${rootPaths.pagesRoot}/${rootPaths.dashboardRoot}/project-manager`,
  clientDashboard: `/${rootPaths.pagesRoot}/${rootPaths.dashboardRoot}/client`,
  employeeDashboard: `/${rootPaths.pagesRoot}/${rootPaths.dashboardRoot}/employee`,
  
  // Existing routes
  addclient: `/${rootPaths.pagesRoot}/${rootPaths.dashboardRoot}/admin/addclient`,
  employees: `/${rootPaths.pagesRoot}/${rootPaths.dashboardRoot}/admin/employees`,
  addemployee: `/${rootPaths.pagesRoot}/${rootPaths.dashboardRoot}/admin/addemployee`,
  project: `/${rootPaths.pagesRoot}/${rootPaths.dashboardRoot}/admin/project`,
  invoice: `/${rootPaths.pagesRoot}/${rootPaths.dashboardRoot}/admin/invoice`,
  client: `/${rootPaths.pagesRoot}/${rootPaths.dashboardRoot}/admin/client`,
  projectTeam:`/${rootPaths.pagesRoot}/${rootPaths.dashboardRoot}/admin/projectTeam`,
  PMproject: `/${rootPaths.pagesRoot}/${rootPaths.dashboardRoot}/projectmanager/project`,
  taskManagment:`/${rootPaths.pagesRoot}/${rootPaths.dashboardRoot}/projectmanager/taskManagment`,
  projectStatus:`/${rootPaths.pagesRoot}/${rootPaths.dashboardRoot}/projectmanager/projectStatus`,
  dailyupdate:`/${rootPaths.pagesRoot}/${rootPaths.dashboardRoot}/projectmanager/dailyupdate`,
  taskupdate:`/${rootPaths.pagesRoot}/${rootPaths.dashboardRoot}/employee/taskupdate`,
  employeeproject:`/${rootPaths.pagesRoot}/${rootPaths.dashboardRoot}/employee/employeeproject`,
  clientproject:`/${rootPaths.pagesRoot}/${rootPaths.dashboardRoot}/client/project`,
  clientinvoice:`/${rootPaths.pagesRoot}/${rootPaths.dashboardRoot}/client/invoice`,
  users: `/${rootPaths.pagesRoot}/users`,
  pricing: `/${rootPaths.pagesRoot}/pricing`,
  integrations: `/${rootPaths.pagesRoot}/integrations`,
  settings: `/${rootPaths.pagesRoot}/settings`,
  templatePages: `/${rootPaths.pagesRoot}/template-pages`,
  accountSettings: `/${rootPaths.pagesRoot}/account-settings`,


  login: `/${rootPaths.authRoot}/login`,
  signup: `/${rootPaths.authRoot}/sign-up`,
  resetpassword: `/${rootPaths.authRoot}/reset-password`,
  forgotPassword: `/${rootPaths.authRoot}/forgot-password`,
  comingSoon: `/coming-soon`,
  '404': `/${rootPaths.errorRoot}/404`,
};