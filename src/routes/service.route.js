import { Router } from 'express';
import {
    getServiceCategories,
    createServiceCategory,
    updateServiceCategory,
    deleteServiceCategory,
} from '../controllers/service.controller.js';
import { verifyJwt } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', getServiceCategories);
router.post('/', verifyJwt, createServiceCategory);
router.patch('/:id', verifyJwt, updateServiceCategory);
router.delete('/:id', verifyJwt, deleteServiceCategory);

export default router;
