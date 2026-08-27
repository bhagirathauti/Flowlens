import { Router } from "express";
import {
  createOrder,
  updateOrderStage,
  getOrder,
} from "../controllers/orderController.js";

const router = Router();

router.post("/", createOrder);
router.patch("/stage", updateOrderStage);
router.get("/:orderId", getOrder);

export default router;