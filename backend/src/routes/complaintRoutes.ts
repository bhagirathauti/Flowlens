import { Router } from 'express';
import {
  createComplaint,
  getComplaints,
  getComplaintById,
  updateComplaint,
  deleteComplaint,
  getComplaintSummary,
} from '../controllers/complaintController.js';

const router = Router();

router.get('/summary', getComplaintSummary);
router.get('/', getComplaints);
router.post('/', createComplaint);
router.get('/:id', getComplaintById);
router.patch('/:id', updateComplaint);
router.delete('/:id', deleteComplaint);

export default router;
