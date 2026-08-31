import express from 'express';
import { prisma } from '../db.js';
import { Stage, SLAStatus } from '@prisma/client';

const router = express.Router();

// GET /api/workflow/metrics - Get workflow monitoring telemetry
router.get('/metrics', async (req, res) => {
  try {
    const { warehouse } = req.query;

    const whereFilter: any = {};
    if (warehouse && typeof warehouse === 'string' && warehouse !== 'ALL') {
      whereFilter.warehouse = warehouse;
    }

    // 1. Fetch all orders with history logs
    const orders = await prisma.order.findMany({
      where: whereFilter,
      include: {
        history: true,
      },
    });

    // 2. Compute Queue Lengths per stage
    const queueLengths: Record<string, number> = {
      ORDER_RECEIVED: 0,
      PICKING: 0,
      PACKING: 0,
      QUALITY_CHECK: 0,
      DISPATCH: 0,
      DELIVERY: 0,
    };

    // 3. Compute Employee Workloads
    const employeeWorkloads: Record<string, { employeeName: string; activeOrders: number; totalProcessed: number }> = {};

    // 4. Track Delays (Breached or At-Risk orders)
    const delayedOrders: Array<{
      id: string;
      customerId: string;
      warehouse: string;
      stage: string;
      assignedEmployee: string;
      processingTime: number;
      slaStatus: string;
    }> = [];

    orders.forEach((order) => {
      // Increment queue length for active stage
      const currentQueue = queueLengths[order.currentStage];
      if (currentQueue !== undefined) {
        queueLengths[order.currentStage] = currentQueue + 1;
      }

      // Track workload
      if (order.assignedEmployee) {
        let emp = employeeWorkloads[order.assignedEmployee];
        if (!emp) {
          emp = {
            employeeName: order.assignedEmployee,
            activeOrders: 0,
            totalProcessed: 0,
          };
          employeeWorkloads[order.assignedEmployee] = emp;
        }
        if (order.currentStage !== Stage.DELIVERY) {
          emp.activeOrders += 1;
        }
        emp.totalProcessed += 1;
      }

      // Track delays (SLA Breach or Processing Time > 15 mins)
      if (order.slaStatus === SLAStatus.BREACHED || order.slaStatus === SLAStatus.AT_RISK || order.processingTime > 15) {
        delayedOrders.push({
          id: order.id,
          customerId: order.customerId,
          warehouse: order.warehouse,
          stage: order.currentStage,
          assignedEmployee: order.assignedEmployee,
          processingTime: order.processingTime,
          slaStatus: order.slaStatus,
        });
      }
    });

    // 5. Fetch StageLogs for Average Stage Processing Times
    const stageLogs = await prisma.stageLogs.findMany();

    const stageTimesSum: Record<string, { totalTime: number; count: number }> = {
      ORDER_RECEIVED: { totalTime: 0, count: 0 },
      PICKING: { totalTime: 0, count: 0 },
      PACKING: { totalTime: 0, count: 0 },
      QUALITY_CHECK: { totalTime: 0, count: 0 },
      DISPATCH: { totalTime: 0, count: 0 },
      DELIVERY: { totalTime: 0, count: 0 },
    };

    stageLogs.forEach((log) => {
      const stageItem = stageTimesSum[log.stage];
      if (stageItem) {
        stageItem.totalTime += log.processingTime;
        stageItem.count += 1;
      }
    });

    const averageStageDurations: Record<string, number> = {};
    Object.keys(stageTimesSum).forEach((stageKey) => {
      const item = stageTimesSum[stageKey];
      if (item && item.count > 0) {
        averageStageDurations[stageKey] = Math.round((item.totalTime / item.count) * 10) / 10;
      } else {
        averageStageDurations[stageKey] = 0;
      }
    });

    res.json({
      success: true,
      totalOrders: orders.length,
      queueLengths,
      averageStageDurations,
      employeeWorkloads: Object.values(employeeWorkloads),
      delays: {
        totalDelayed: delayedOrders.length,
        delayedOrders,
      },
    });
  } catch (error) {
    console.error('Error computing workflow metrics:', error);
    res.status(500).json({ error: 'Failed to calculate workflow monitoring metrics' });
  }
});

export default router;
