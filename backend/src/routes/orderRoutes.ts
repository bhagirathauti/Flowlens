import { Router } from "express";
import {
  getOrders,
  createOrder,
  updateOrderStage,
  getOrder,
  deleteOrder,
} from "../controllers/orderController.js";

const router = Router();

router.get("/", getOrders);
router.post("/", createOrder);
router.patch("/stage", updateOrderStage);
router.get("/:orderId", getOrder);
router.delete("/:orderId", deleteOrder);

export default router;