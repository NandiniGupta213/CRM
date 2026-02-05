import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import session from "express-session";
import UserRouter from "./routes/user.router.js";
import ClientRouter from "./routes/client.router.js"
import ProjectRouter from './routes/project.router.js';
import InvoiceRouter from './routes/invoice.router.js';
import EmployeeRoutes from './routes/employee.router.js';
import projectManagerRouter from "./routes/projectManager.router.js";
import projectTeamRoutes from './routes/projectTeam.router.js';
import TaskManagerRoutes from './routes/task.router.js';
import ProjectStatusRoutes from './routes/projectstatus.router.js';
import DailyUpdateRoutes from './routes/dailyupdate.router.js';
import EmployeeProjectRoutes from './routes/employeeproject.router.js';
import AdminDashboardRoutes from './routes/admindashboard.router.js';
import PMDashboardRoutes from './routes/pmdashboard.router.js';
import EmployeeDashboardRoutes from './routes/employeedashboard.router.js'
import ClientProjectRoutes from './routes/clientproject.router.js'
import ClientInvoiceRoutes from './routes/clientinvoice.router.js'
import ClientDashboardRoutes from './routes/clientdashboard.routes.js';


dotenv.config({
    path: './.env'
});

const app = express();


  app.use(cors({
    origin: ['https://fronetendcrm.onrender.com'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }));
  



app.set("trust proxy", 1); // REQUIRED on Render

app.use(session({
    resave: false,
    saveUninitialized: false,
    secret: process.env.SESSION_SECRET,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', 
      sameSite: 'None',
      maxAge: 3600000 
    }
  }));


app.use(express.json({limit: "16kb"}));
app.use(express.urlencoded({extended: true, limit: "16kb"}));

app.use("/user", UserRouter);
app.use("/clients", ClientRouter); 
app.use('/projects', ProjectRouter);
app.use('/invoices',InvoiceRouter);
app.use('/employees', EmployeeRoutes);
app.use('/project-teams', projectTeamRoutes);


app.use("/pm", projectManagerRouter);
app.use("/tm", TaskManagerRoutes);
app.use("/ps", ProjectStatusRoutes);
app.use("/dailyupdate", DailyUpdateRoutes);

app.use("/employeeproject", EmployeeProjectRoutes);

app.use('/client-projects', ClientProjectRoutes);
app.use('/client-invoice', ClientInvoiceRoutes);


app.use("/admindashboard", AdminDashboardRoutes);
app.use('/pmdashboard', PMDashboardRoutes);
app.use('/employeedashboard', EmployeeDashboardRoutes);
app.use('/clientdashboard', ClientDashboardRoutes);






export default app;