<<<<<<< HEAD
import { Router } from 'express';
=======
import { Router } from "express";
>>>>>>> baa216a3f97233b276b874973126bd29cd4ee64a
import {
    getServiceCategories,
    createServiceCategory,
    updateServiceCategory,
<<<<<<< HEAD
    deleteServiceCategory,
} from '../controllers/service.controller.js';
import { verifyJwt } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', getServiceCategories);
router.post('/', verifyJwt, createServiceCategory);
router.patch('/:id', verifyJwt, updateServiceCategory);
router.delete('/:id', verifyJwt, deleteServiceCategory);
=======
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
>>>>>>> baa216a3f97233b276b874973126bd29cd4ee64a

export default router;
