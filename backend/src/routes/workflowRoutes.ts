import express from 'express';
import { prisma } from '../db.js';
import { Stage, SLAStatus } from '@prisma/client';

const router = express.Router();

// GET /api/workflow/metrics - Get workflow monitoring telemetry (FR-4)
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

// GET /api/workflow/bottlenecks - FR-5 Automated Bottleneck Detection Engine
router.get('/bottlenecks', async (req, res) => {
  try {
    const { warehouse } = req.query;
    const whereFilter: any = {};
    if (warehouse && typeof warehouse === 'string' && warehouse !== 'ALL') {
      whereFilter.warehouse = warehouse;
    }

    const orders = await prisma.order.findMany({ where: whereFilter });
    const stageLogs = await prisma.stageLogs.findMany();

    const queueLengths: Record<string, number> = {
      ORDER_RECEIVED: 0,
      PICKING: 0,
      PACKING: 0,
      QUALITY_CHECK: 0,
      DISPATCH: 0,
      DELIVERY: 0,
    };

    orders.forEach((ord) => {
      if (queueLengths[ord.currentStage] !== undefined) {
        queueLengths[ord.currentStage] = (queueLengths[ord.currentStage] || 0) + 1;
      }
    });

    const stageTimesSum: Record<string, { totalTime: number; count: number }> = {
      ORDER_RECEIVED: { totalTime: 0, count: 0 },
      PICKING: { totalTime: 0, count: 0 },
      PACKING: { totalTime: 0, count: 0 },
      QUALITY_CHECK: { totalTime: 0, count: 0 },
      DISPATCH: { totalTime: 0, count: 0 },
      DELIVERY: { totalTime: 0, count: 0 },
    };

    stageLogs.forEach((log) => {
      const item = stageTimesSum[log.stage];
      if (item) {
        item.totalTime += log.processingTime;
        item.count += 1;
      }
    });

    const stagesAnalysis: Array<{
      stage: string;
      queueLength: number;
      avgDurationMinutes: number;
      severity: 'NORMAL' | 'WARNING' | 'CRITICAL';
      diagnosticMessage: string;
      recommendation: string;
    }> = [];

    const stagesList = ['ORDER_RECEIVED', 'PICKING', 'PACKING', 'QUALITY_CHECK', 'DISPATCH', 'DELIVERY'];

    stagesList.forEach((stageKey) => {
      const queue = queueLengths[stageKey] || 0;
      const timeItem = stageTimesSum[stageKey];
      const avgDuration = timeItem && timeItem.count > 0 ? Math.round((timeItem.totalTime / timeItem.count) * 10) / 10 : 0;

      let severity: 'NORMAL' | 'WARNING' | 'CRITICAL' = 'NORMAL';
      let diagnosticMessage = 'Stage operating within normal SLA benchmarks.';
      let recommendation = 'Maintain current shift staffing.';

      if (queue >= 6 || avgDuration > 20) {
        severity = 'CRITICAL';
        diagnosticMessage = `CRITICAL BOTTLENECK: High queue (${queue} orders) & elevated processing time (${avgDuration} mins).`;
        recommendation = 'Immediately reassign additional packing/picking staff to clear queue.';
      } else if (queue >= 3 || avgDuration > 12) {
        severity = 'WARNING';
        diagnosticMessage = `MODERATE DELAY: Queue buildup detected (${queue} orders waiting).`;
        recommendation = 'Monitor stage queue and prepare shift support.';
      }

      stagesAnalysis.push({
        stage: stageKey,
        queueLength: queue,
        avgDurationMinutes: avgDuration,
        severity,
        diagnosticMessage,
        recommendation,
      });
    });

    const flaggedBottlenecks = stagesAnalysis.filter((s) => s.severity !== 'NORMAL');

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        totalStages: stagesList.length,
        criticalCount: stagesAnalysis.filter((s) => s.severity === 'CRITICAL').length,
        warningCount: stagesAnalysis.filter((s) => s.severity === 'WARNING').length,
        normalCount: stagesAnalysis.filter((s) => s.severity === 'NORMAL').length,
      },
      flaggedBottlenecks,
      allStages: stagesAnalysis,
    });
  } catch (error) {
    console.error('Error detecting bottlenecks:', error);
    res.status(500).json({ error: 'Failed to execute bottleneck detection engine' });
  }
});

export default router;
