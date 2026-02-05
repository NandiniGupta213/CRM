
import { Router } from "express";
import {
  createProject,
  getAllProjects,
  getProject,
  updateProject,
  updateProjectStatus,
  deleteProject,
  getProjectStats,
  searchProjects,
  addMilestone,
  updateMilestone,
  getProjectsByClient
} from "../controllers/project.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();


router.use(verifyJWT);

// Routes
router.route("/")
  .post(createProject)
  .get(getAllProjects);

router.route("/stats").get(getProjectStats);
router.route("/search").get(searchProjects);
router.route("/client/:clientId").get(getProjectsByClient);

router.route("/:id")
  .get(getProject)
  .put(updateProject)
  .delete(deleteProject);

router.route("/:id/status").put(updateProjectStatus);
router.route("/:id/milestones").post(addMilestone);
router.route("/:id/milestones/:milestoneId").put(updateMilestone);

export default router;