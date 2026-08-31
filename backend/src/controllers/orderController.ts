import type { Request, Response } from "express";
import { prisma } from "../db.js";
import { Stage, SLAStatus } from "@prisma/client";

/**
 * Helper to compute SLA status based on stage duration (in minutes)
 */
const calculateSLAStatus = (durationMinutes: number): SLAStatus => {
  if (durationMinutes > 20) return SLAStatus.BREACHED;
  if (durationMinutes > 10) return SLAStatus.AT_RISK;
  return SLAStatus.ON_TIME;
};

/**
 * 1. GET ALL ORDERS (with search & filtering)
 */
export const getOrders = async (req: Request, res: Response) => {
  try {
    const { warehouse, stage, slaStatus, search } = req.query;

    const where: any = {};

    if (warehouse && typeof warehouse === "string" && warehouse !== "ALL") {
      where.warehouse = warehouse;
    }

    if (stage && typeof stage === "string" && stage !== "ALL") {
      where.currentStage = stage as Stage;
    }

    if (slaStatus && typeof slaStatus === "string" && slaStatus !== "ALL") {
      where.slaStatus = slaStatus as SLAStatus;
    }

    if (search && typeof search === "string" && search.trim() !== "") {
      const q = search.trim();
      where.OR = [
        { id: { contains: q } },
        { customerId: { contains: q } },
        { assignedEmployee: { contains: q } },
        { warehouse: { contains: q } },
      ];
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        history: {
          orderBy: { changedAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({
      success: true,
      total: orders.length,
      orders,
    });
  } catch (error: any) {
    console.error("Get orders error:", error);
    res.status(500).json({
      message: "Failed to fetch orders",
      error: error.message,
    });
  }
};

/**
 * 2. CREATE ORDER
 */
export const createOrder = async (req: Request, res: Response) => {
  try {
    const { customerId, warehouse, assignedEmployee } = req.body;

    if (!customerId || !warehouse) {
      return res.status(400).json({ message: "customerId and warehouse are required" });
    }

    const initialStage = Stage.ORDER_RECEIVED;
    const now = new Date();

    const order = await prisma.order.create({
      data: {
        customerId,
        warehouse,
        assignedEmployee: assignedEmployee || "Auto-Assigning",
        currentStage: initialStage,
        stageTimestamp: now,
        processingTime: 0,
        slaStatus: SLAStatus.ON_TIME,
        history: {
          create: {
            stage: initialStage,
            changedAt: now,
            processingTime: 0,
          },
        },
      },
      include: {
        history: true,
      },
    });

    res.status(201).json({
      message: "Order created successfully",
      order,
    });
  } catch (error: any) {
    console.error("Create order error:", error);
    res.status(500).json({
      message: "Failed to create order",
      error: error.message,
    });
  }
};

/**
 * 3. UPDATE ORDER STAGE
 */
export const updateOrderStage = async (req: Request, res: Response) => {
  try {
    const { orderId, nextStage, assignedEmployee } = req.body;

    if (!orderId || !nextStage) {
      return res.status(400).json({ message: "orderId and nextStage are required" });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const currentTime = new Date();
    const stageDuration = Math.max(
      1,
      Math.round((currentTime.getTime() - new Date(order.stageTimestamp).getTime()) / (1000 * 60))
    );
    const totalProcessingTime = order.processingTime + stageDuration;
    const computedSLA = calculateSLAStatus(totalProcessingTime);

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        currentStage: nextStage as Stage,
        stageTimestamp: currentTime,
        processingTime: totalProcessingTime,
        slaStatus: computedSLA,
        assignedEmployee: assignedEmployee || order.assignedEmployee,
        history: {
          create: {
            stage: nextStage as Stage,
            changedAt: currentTime,
            processingTime: stageDuration,
          },
        },
      },
      include: {
        history: {
          orderBy: { changedAt: "asc" },
        },
      },
    });

    res.status(200).json({
      message: "Order stage updated successfully",
      order: updatedOrder,
    });
  } catch (error: any) {
    console.error("Update order stage error:", error);
    res.status(500).json({
      message: "Failed to update order stage",
      error: error.message,
    });
  }
};

/**
 * 4. GET SINGLE ORDER
 */
export const getOrder = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;

    if (!orderId || typeof orderId !== "string") {
      return res.status(400).json({ message: "Invalid or missing order ID" });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        history: {
          orderBy: { changedAt: "asc" },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.status(200).json({ order });
  } catch (error: any) {
    console.error("Get order error:", error);
    res.status(500).json({
      message: "Failed to fetch order",
      error: error.message,
    });
  }
};

/**
 * 5. DELETE ORDER
 */
export const deleteOrder = async (req: Request, res: Response) => {
  try {
    const orderId = req.params.orderId as string;
    if (!orderId) {
      return res.status(400).json({ message: "Order ID is required" });
    }
    await prisma.stageLogs.deleteMany({ where: { orderId } });
    await prisma.order.delete({ where: { id: orderId } });
    res.status(200).json({ message: "Order deleted successfully" });
  } catch (error: any) {
    console.error("Delete order error:", error);
    res.status(500).json({ message: "Failed to delete order", error: error.message });
  }
};