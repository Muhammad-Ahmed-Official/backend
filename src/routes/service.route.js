import { Router } from "express";
import {
    getServiceCategories,
    createServiceCategory,
    updateServiceCategory,
    deleteServiceCategory
} from "../controllers/admin.controller.js";
import { verifyJwt } from "../middleware/auth.middleware.js";

const router = Router();

// Public: Get all services
router.route("/").get(getServiceCategories);

// Protected: Admin operations
router.route("/").post(verifyJwt, createServiceCategory);
router.route("/:id").patch(verifyJwt, updateServiceCategory);
router.route("/:id").delete(verifyJwt, deleteServiceCategory);

export default router;
