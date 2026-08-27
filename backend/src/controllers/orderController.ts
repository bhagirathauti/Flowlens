import type { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
// const libsql = createClient({
//   url: process.env.DATABASE_URL || "file:./dev.db",
// });

// const adapter = new PrismaLibSql(libsql);
// const prisma = new PrismaClient({ adapter });
const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL || "file:./dev.db",
});

const prisma = new PrismaClient({ adapter });
/**
 * 1. CREATE ORDER
 */
export const createOrder = async (req: Request, res: Response) => {
  try {
    const { customerId, warehouse, assignedEmployee } = req.body;

    const order = await prisma.order.create({
      data: {
        customerId,
        warehouse,
        assignedEmployee,
        currentStage: "ORDER_RECEIVED",
        stageTimestamp: new Date(),
        slaStatus: "ON_TIME",
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
 * 2. UPDATE ORDER STAGE
 */
export const updateOrderStage = async (req: Request, res: Response) => {
  try {
    const { orderId, nextStage } = req.body;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const currentTime = new Date();
    const processingTime = Math.round(
      (currentTime.getTime() - new Date(order.stageTimestamp).getTime()) / (1000 * 60)
    );

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        currentStage: nextStage,
        stageTimestamp: currentTime,
        processingTime: processingTime,
        history: {
          create: {
            stage: nextStage,
            changedAt: currentTime,
            processingTime: processingTime,
          },
        },
      },
      include: {
        history: true,
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
 * 3. GET ORDER
 */
export const getOrder = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;

    // Ensure orderId is a single valid string
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