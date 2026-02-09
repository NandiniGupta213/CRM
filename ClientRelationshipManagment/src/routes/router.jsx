// src/routes/router.jsx (UPDATED)
/* eslint-disable react-refresh/only-export-components */
import React, { Suspense, lazy } from 'react';
import { Outlet, createBrowserRouter, Navigate } from 'react-router-dom';
import paths, { rootPaths } from './paths';
import MainLayout from '../layouts/main-layout';
import AuthLayout from '../layouts/auth-layout';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import Splash from '../components/loading/Splash';
import PageLoader from '../components/loading/PageLoader';
import {useAuth} from  '../contexts/AuthContext';
import { useNavigate, useLocation  } from 'react-router-dom';
import { useEffect } from 'react';

// Lazy-loaded components - REMOVED DashboardRouter
const App = lazy(() => import('../App'));
const Dashboard = lazy(() => import('../pages/dashboard/index')); // Admin Dashboard
const ProjectManagerDashboard = lazy(() => import('../components/sections/projectmanager/index'));
const ClientDashboard = lazy(() => import('../pages/dashboard/client'));
const EmployeeDashboard = lazy(() => import('../pages/dashboard/employee'));
const Login = lazy(() => import('../pages/authentication/Login'));
const Signup = lazy(() => import('../pages/authentication/Signup'));
const AddClientPage = lazy(() => import('../components/sections/dashboard/ClientForm'));
const AddEmployeePage = lazy(() => import('../components/sections/dashboard/EmployeeForm'));
const ProjectsPage = lazy(() => import('../components/sections/dashboard/Project'));
const InvoiceForm = lazy(() => import('../components/sections/dashboard/InvoiceForm'));
const InvoiceListPage = lazy(() => import('../components/sections/dashboard/InvoiceListPage'));
const ClientsPage = lazy(() => import('../components/sections/dashboard/ClientListPage'));
const ResetPassword = lazy(() => import('../pages/authentication/ResetPassword'));
const EmployeesPage = lazy(() => import('../components/sections/dashboard/EmployeesPage'));
const ProjectTeamManagement = lazy(() => import('../components/sections/dashboard/ProjectTeamManagement'));
const PMProject = lazy(() => import('../components/sections/projectmanager/project'));
const TaskManager = lazy(() => import('../components/sections/projectmanager/TaskManager'));
const projectStatus = lazy(() => import('../components/sections/projectmanager/projectStatus'));
const DailyUpdatesPage = lazy(() => import('../components/sections/projectmanager/DailyUpdatesPage'));
const EmployeeUpdatesPage = lazy(() => import('../components/sections/employee/EmployeeUpdatesPage'));
const EmployeeProjectsPage = lazy(() => import('../components/sections/employee/project'));
const SettingsPage = lazy(() => import('../components/sections/accountsetting'));
const ClientProjectsPage = lazy(() => import('../components/sections/client/project'));
const ClientInvoicesPage = lazy(() => import('../components/sections/client/Invoice'));


// Helper to wrap components in Suspense
const withSuspense = (Component, fallback) => (
  <Suspense fallback={fallback}>
    <Component />
  </Suspense>
);

// In router.jsx - Update DashboardRedirect
const DashboardRedirect = () => {
  const { user, getUserRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  useEffect(() => {
    console.log('DashboardRedirect - User:', user);
    
    if (!user) {
      console.log('DashboardRedirect: No user, redirecting to login');
      navigate(paths.login, { state: { from: location } });
      return;
    }
    
    const userRole = getUserRole();
    console.log('DashboardRedirect: User role is', userRole);
    
    // Redirect based on role
    let redirectPath = paths.dashboard;
    switch(userRole) {
      case 'admin':
        redirectPath = paths.adminDashboard;
        break;
      case 'project_manager':
        redirectPath = paths.projectManagerDashboard;
        break;
      case 'client':
        redirectPath = paths.clientDashboard;
        break;
      case 'employee':
        redirectPath = paths.employeeDashboard;
        break;
    }
    
    console.log('DashboardRedirect: Redirecting to', redirectPath);
    navigate(redirectPath, { replace: true });
  }, [user, getUserRole, navigate, location]); // Add getUserRole to dependencies
  
  return <PageLoader />;
};

const router = createBrowserRouter(
  [
    {
      // App root
      element: withSuspense(App, <Splash />),
      children: [
        // Main layout routes
        {
          element: (
            <MainLayout>
              <Outlet />
            </MainLayout>
          ),
          children: [
            {
          index: true, // Handles "/"
          element: <Navigate to="/authentication/login" replace />,
        },
            {
              path: 'pages/dashboard', // Generic dashboard path
              element: <DashboardRedirect />, // Redirects based on role
            },
            {
              path: 'pages/dashboard/admin',
              element: (
                <ProtectedRoute requiredRole="admin">
                  {withSuspense(Dashboard, <PageLoader />)}
                </ProtectedRoute>
              ),
            },
            {
              path: 'pages/dashboard/admin/client',
                element: (
                  <ProtectedRoute requiredRole="admin">
                    {withSuspense(ClientsPage, <PageLoader />)}
                  </ProtectedRoute>
                ),
            },
            {
              path: 'pages/dashboard/admin/addclient',
                element: (
                  <ProtectedRoute requiredRole="admin">
                    {withSuspense(AddClientPage, <PageLoader />)}
                  </ProtectedRoute>
                ),
            },
            {
              path: 'pages/dashboard/admin/addemployee',
                element: (
                  <ProtectedRoute requiredRole="admin">
                    {withSuspense(AddEmployeePage, <PageLoader />)}
                  </ProtectedRoute>
                ),
            },
            {
              path: 'pages/dashboard/admin/employees',
                element: (
                  <ProtectedRoute requiredRole="admin">
                    {withSuspense(EmployeesPage, <PageLoader />)}
                  </ProtectedRoute>
                ),
            },
            {
              path: 'pages/dashboard/admin/project',
                element: (
                  <ProtectedRoute requiredRole="admin">
                    {withSuspense(ProjectsPage, <PageLoader />)}
                  </ProtectedRoute>
                ),
            },
            {
              path: 'pages/dashboard/invoice/create',
                element: (
                  <ProtectedRoute requiredRole="admin">
                    {withSuspense(InvoiceForm, <PageLoader />)}
                  </ProtectedRoute>
                ),
            },
            {
              path: 'pages/dashboard/admin/invoice',
                element: (
                  <ProtectedRoute requiredRole="admin">
                    {withSuspense(InvoiceListPage, <PageLoader />)}
                  </ProtectedRoute>
                ),
            },
            {
              path: 'pages/dashboard/admin/projectTeam',
                element: (
                  <ProtectedRoute requiredRole="admin">
                    {withSuspense(ProjectTeamManagement, <PageLoader />)}
                  </ProtectedRoute>
                ),
            },
            {
              path: 'pages/dashboard/project-manager',
              element: (
                <ProtectedRoute requiredRole="project_manager">
                  {withSuspense(ProjectManagerDashboard, <PageLoader />)}
                </ProtectedRoute>
              ),
            },
            {
              path: 'pages/dashboard/projectmanager/project',
              element: (
                <ProtectedRoute requiredRole="project_manager">
                  {withSuspense(PMProject, <PageLoader />)}
                </ProtectedRoute>
              ),
              
            },
            {
              path: 'pages/dashboard/projectmanager/taskManagment',
              element: (
                <ProtectedRoute requiredRole="project_manager">
                  {withSuspense(TaskManager, <PageLoader />)}
                </ProtectedRoute>
              ),
            },
            {
              path: 'pages/dashboard/projectmanager/projectStatus',
              element: (
                <ProtectedRoute requiredRole="project_manager">
                  {withSuspense(projectStatus, <PageLoader />)}
                </ProtectedRoute>
              ),
            },
            {
              path: 'pages/dashboard/projectmanager/dailyupdate',
              element: (
                <ProtectedRoute requiredRole="project_manager">
                  {withSuspense(DailyUpdatesPage, <PageLoader />)}
                </ProtectedRoute>
              ),
            },
            {
              path: 'pages/dashboard/client',
              element: (
                <ProtectedRoute requiredRole="client">
                  {withSuspense(ClientDashboard, <PageLoader />)}
                </ProtectedRoute>
              ),
              
            },
            {
              path: 'pages/dashboard/client/project',
              element: (
                <ProtectedRoute requiredRole="client">
                  {withSuspense(ClientProjectsPage, <PageLoader />)}
                </ProtectedRoute>
              ),
              
            },
            {
              path: 'pages/dashboard/client/invoice',
              element: (
                <ProtectedRoute requiredRole="client">
                  {withSuspense(ClientInvoicesPage, <PageLoader />)}
                </ProtectedRoute>
              ),
              
            },
            {
              path: 'pages/dashboard/employee',
              element: (
                <ProtectedRoute requiredRole="employee">
                  {withSuspense(EmployeeDashboard, <PageLoader />)}
                </ProtectedRoute>
              ),
            },
            {
              path: 'pages/dashboard/employee/taskupdate',
              element: (
                <ProtectedRoute requiredRole="employee">
                  {withSuspense(EmployeeUpdatesPage, <PageLoader />)}
                </ProtectedRoute>
              ),
            },
             {
              path: 'pages/dashboard/employee/employeeproject',
              element: (
                <ProtectedRoute requiredRole="employee">
                  {withSuspense(EmployeeProjectsPage, <PageLoader />)}
                </ProtectedRoute>
              ),
            },
            {
              path: 'pages/account-settings',
              element: (
                <ProtectedRoute >
                  {withSuspense(SettingsPage, <PageLoader />)}
                </ProtectedRoute>
              ),
            },
            
          ],
        },

        // Authentication routes
        {
          path: rootPaths.authRoot,
          element: (
            <AuthLayout>
              <Outlet />
            </AuthLayout>
          ),
          children: [
            { 
              path: 'login', 
              element: withSuspense(Login, <PageLoader />) 
            },
            { 
              path: 'sign-up', 
              element: withSuspense(Signup, <PageLoader />) 
            },
            { 
            path: 'reset-password', 
            element: withSuspense(ResetPassword, <PageLoader />) 
          }
          ],
        },
      ],
    },
  ],
 
);

export default router;