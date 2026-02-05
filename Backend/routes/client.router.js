import { Router } from "express";
import {
  createClient,
  getAllClients,
  getClient,
  updateClient,
  deleteClient,
  getClientStats,
  searchClients
} from "../controllers/client.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Apply auth middleware to all routes
router.use(verifyJWT);

// Routes
router.route("/create").post(createClient).get(getAllClients);

router.route("/stats").get(getClientStats);

router.route("/search").get(searchClients);

router.route("/:id").get(getClient).put(updateClient).delete(deleteClient);

export default router;