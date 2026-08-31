import express from 'express';
import { prisma } from '../db.js';
import { Stage, SLAStatus } from '@prisma/client';

const router = express.Router();

export interface BottleneckAlert {
  stage: Stage;
  stageLabel: string;
  severity: 'CRITICAL' | 'WARNING' | 'HEALTHY';
  bottleneckScore: number; // 0 to 100
  queueCount: number;
  avgDurationMinutes: number;
  targetDurationMinutes: number;
  breachCount: number;
  atRiskCount: number;
  reasons: string[];
  suggestedAction: string;
}

export interface BottleneckReport {
  systemHealth: 'OPTIMAL' | 'DEGRADED' | 'CRITICAL';
  totalActiveOrders: number;
  criticalCount: number;
  warningCount: number;
  bottlenecks: BottleneckAlert[];
  detectedIssues: {
    longQueues: string[];
    slowStages: string[];
    frequentFailures: string[];
  };
}

const STAGE_TARGET_DURATIONS: Record<Stage, number> = {
  [Stage.ORDER_RECEIVED]: 5,
  [Stage.PICKING]: 10,
  [Stage.PACKING]: 12,
  [Stage.QUALITY_CHECK]: 8,
  [Stage.DISPATCH]: 10,
  [Stage.DELIVERY]: 20,
};

const STAGE_FRIENDLY_NAMES: Record<Stage, string> = {
  [Stage.ORDER_RECEIVED]: 'Order Intake',
  [Stage.PICKING]: 'Picking Station',
  [Stage.PACKING]: 'Packing Station',
  [Stage.QUALITY_CHECK]: 'Quality Audit',
  [Stage.DISPATCH]: 'Dispatch Hub',
  [Stage.DELIVERY]: 'Transit / Delivery',
};

/**
 * FR-5 Bottleneck Analysis Engine
 */
function analyzeBottlenecks(
  orders: Array<{ id: string; currentStage: Stage; processingTime: number; slaStatus: SLAStatus; assignedEmployee: string | null }>,
  averageStageDurations: Record<string, number>
): BottleneckReport {
  const activeOrders = orders.filter((o) => o.currentStage !== Stage.DELIVERY);
  const totalActive = activeOrders.length;

  const stageOrderMap: Record<Stage, typeof orders> = {
    [Stage.ORDER_RECEIVED]: [],
    [Stage.PICKING]: [],
    [Stage.PACKING]: [],
    [Stage.QUALITY_CHECK]: [],
    [Stage.DISPATCH]: [],
    [Stage.DELIVERY]: [],
  };

  orders.forEach((o) => {
    if (stageOrderMap[o.currentStage]) {
      stageOrderMap[o.currentStage].push(o);
    }
  });

  const bottleneckAlerts: BottleneckAlert[] = [];
  const longQueues: string[] = [];
  const slowStages: string[] = [];
  const frequentFailures: string[] = [];

  const stagesList = Object.values(Stage);

  for (const stage of stagesList) {
    if (stage === Stage.DELIVERY) continue; // Delivery handled externally

    const stageOrders = stageOrderMap[stage] || [];
    const queueCount = stageOrders.length;
    const targetDuration = STAGE_TARGET_DURATIONS[stage] || 10;
    const avgDuration = averageStageDurations[stage] || 0;

    const breachCount = stageOrders.filter((o) => o.slaStatus === SLAStatus.BREACHED).length;
    const atRiskCount = stageOrders.filter((o) => o.slaStatus === SLAStatus.AT_RISK).length;

    const reasons: string[] = [];
    let score = 0;

    // 1. Long Queue Detection (Weight: 35 pts)
    const queueRatio = totalActive > 0 ? queueCount / totalActive : 0;
    if (queueCount >= 5 || (totalActive >= 5 && queueRatio >= 0.4)) {
      score += 35;
      const msg = `${STAGE_FRIENDLY_NAMES[stage]}: Heavy queue (${queueCount} orders, ${Math.round(queueRatio * 100)}% of pipeline)`;
      reasons.push(msg);
      longQueues.push(msg);
    } else if (queueCount >= 3) {
      score += 20;
      reasons.push(`${STAGE_FRIENDLY_NAMES[stage]}: Moderate queue buildup (${queueCount} orders)`);
    }

    // 2. High Waiting Time & Slow Processing Stage Detection (Weight: 35 pts)
    if (avgDuration > targetDuration * 1.5) {
      score += 35;
      const msg = `${STAGE_FRIENDLY_NAMES[stage]}: High stage duration (avg ${avgDuration}m vs ${targetDuration}m SLA baseline)`;
      reasons.push(msg);
      slowStages.push(msg);
    } else if (avgDuration > targetDuration * 1.15) {
      score += 20;
      reasons.push(`${STAGE_FRIENDLY_NAMES[stage]}: Processing duration approaching threshold (avg ${avgDuration}m)`);
    }

    // 3. Frequently Failing Workflow Steps (Weight: 30 pts)
    if (breachCount >= 2 || (queueCount > 0 && breachCount / queueCount >= 0.4)) {
      score += 30;
      const msg = `${STAGE_FRIENDLY_NAMES[stage]}: High failure rate (${breachCount} orders breached SLA)`;
      reasons.push(msg);
      frequentFailures.push(msg);
    } else if (breachCount >= 1 || atRiskCount >= 2) {
      score += 15;
      reasons.push(`${STAGE_FRIENDLY_NAMES[stage]}: Active delay warnings (${breachCount} breached, ${atRiskCount} at-risk)`);
    }

    score = Math.min(100, score);

    let severity: 'CRITICAL' | 'WARNING' | 'HEALTHY' = 'HEALTHY';
    if (score >= 55 || breachCount >= 2) {
      severity = 'CRITICAL';
    } else if (score >= 25 || queueCount >= 3) {
      severity = 'WARNING';
    }

    // Dynamic Corrective Action Recommendation
    let suggestedAction = 'Stage operating within standard tolerances. No intervention needed.';
    if (severity === 'CRITICAL') {
      if (queueCount >= 4 && stage === Stage.PACKING) {
        suggestedAction = 'Reallocate 2 available picking/dispatch staff to Packing Stations immediately.';
      } else if (queueCount >= 4 && stage === Stage.PICKING) {
        suggestedAction = 'Assign auxiliary wave pickers and verify cart availability.';
      } else if (stage === Stage.QUALITY_CHECK) {
        suggestedAction = 'Open secondary Quality Check inspection lane to unblock dispatch flow.';
      } else if (breachCount >= 2) {
        suggestedAction = 'Prioritize expedite tags for breached orders before intake of new batches.';
      } else {
        suggestedAction = 'Increase workforce allocation and inspect station equipment for delays.';
      }
    } else if (severity === 'WARNING') {
      if (queueCount >= 3) {
        suggestedAction = 'Monitor throughput closely; prepare to balance workforce if queue exceeds 4.';
      } else {
        suggestedAction = 'Review handling times to ensure orders remain within SLA limits.';
      }
    }

    bottleneckAlerts.push({
      stage,
      stageLabel: STAGE_FRIENDLY_NAMES[stage],
      severity,
      bottleneckScore: score,
      queueCount,
      avgDurationMinutes: avgDuration,
      targetDurationMinutes: targetDuration,
      breachCount,
      atRiskCount,
      reasons,
      suggestedAction,
    });
  }

  const criticalCount = bottleneckAlerts.filter((b) => b.severity === 'CRITICAL').length;
  const warningCount = bottleneckAlerts.filter((b) => b.severity === 'WARNING').length;

  let systemHealth: 'OPTIMAL' | 'DEGRADED' | 'CRITICAL' = 'OPTIMAL';
  if (criticalCount > 0) {
    systemHealth = 'CRITICAL';
  } else if (warningCount > 0) {
    systemHealth = 'DEGRADED';
  }

  return {
    systemHealth,
    totalActiveOrders: totalActive,
    criticalCount,
    warningCount,
    bottlenecks: bottleneckAlerts.sort((a, b) => b.bottleneckScore - a.bottleneckScore),
    detectedIssues: {
      longQueues,
      slowStages,
      frequentFailures,
    },
  };
}

// GET /api/workflow/metrics - Get workflow monitoring telemetry + embedded FR-5 bottleneck report
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

    // 6. Compute FR-5 Bottleneck Report
    const bottleneckReport = analyzeBottlenecks(orders, averageStageDurations);

    // 7. Dynamic Complaint & Accuracy Metrics
    const totalComplaints = await prisma.complaint.count({
      where: warehouse && warehouse !== 'ALL' ? { warehouse: String(warehouse) } : {},
    });
    const inProgressCount = orders.filter((o) => o.currentStage !== Stage.DELIVERY).length;
    const avgPrepTime = orders.length > 0 ? Math.round((orders.reduce((acc, o) => acc + o.processingTime, 0) / orders.length) * 10) / 10 : 14.2;
    const accuracy = orders.length > 0 ? Math.max(0, Math.round((1 - totalComplaints / orders.length) * 1000) / 10) : 99.8;
    const complaintRate = orders.length > 0 ? Math.round((totalComplaints / orders.length) * 1000) / 10 : 0.4;
    const highRiskOrdersCount = orders.filter((o) => (o.riskScore || 0) >= 60 || o.slaStatus === SLAStatus.BREACHED).length;

    // 8. Overall Operation Risk percentage
    const totalRisk = orders.reduce((acc, o) => acc + (o.riskScore || (o.slaStatus === SLAStatus.BREACHED ? 90 : o.slaStatus === SLAStatus.AT_RISK ? 60 : 20)), 0);
    const operationRisk = orders.length > 0 ? Math.round(totalRisk / orders.length) : 35;

    // 9. Dynamic Active Alerts
    const dynamicAlerts = [
      ...delayedOrders.map((d) => ({
        id: `sla-${d.id}`,
        type: 'SLA_BREACH',
        title: 'SLA Breach Warning',
        description: `Order ${d.id.slice(0, 8)} in ${d.stage} is ${d.slaStatus} (${d.processingTime}m)`,
        severity: 'CRITICAL',
        timeAgo: 'Just now',
      })),
      ...(bottleneckReport.bottlenecks.filter((b) => b.severity !== 'HEALTHY').map((b) => ({
        id: `btn-${b.stage}`,
        type: 'BOTTLENECK',
        title: `${b.severity} Bottleneck at ${b.stageLabel}`,
        description: `${b.queueCount} orders queued. Suggested: ${b.suggestedAction}`,
        severity: b.severity,
        timeAgo: 'Live',
      }))),
    ];

    res.json({
      success: true,
      totalOrders: orders.length,
      inProgressCount,
      avgPrepTime,
      accuracy,
      complaintRate,
      highRiskOrdersCount,
      operationRisk,
      totalComplaints,
      queueLengths,
      averageStageDurations,
      employeeWorkloads: Object.values(employeeWorkloads),
      delays: {
        totalDelayed: delayedOrders.length,
        delayedOrders,
      },
      bottleneckReport,
      activeAlerts: dynamicAlerts,
    });
  } catch (error) {
    console.error('Error computing workflow metrics:', error);
    res.status(500).json({ error: 'Failed to calculate workflow monitoring metrics' });
  }
});

// GET /api/workflow/bottlenecks - Dedicated FR-5 Bottleneck Detection endpoint
router.get('/bottlenecks', async (req, res) => {
  try {
    const { warehouse } = req.query;

    const whereFilter: any = {};
    if (warehouse && typeof warehouse === 'string' && warehouse !== 'ALL') {
      whereFilter.warehouse = warehouse;
    }

    const orders = await prisma.order.findMany({
      where: whereFilter,
    });

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
      const item = stageTimesSum[log.stage];
      if (item) {
        item.totalTime += log.processingTime;
        item.count += 1;
      }
    });

    const averageStageDurations: Record<string, number> = {};
    Object.keys(stageTimesSum).forEach((k) => {
      const item = stageTimesSum[k];
      averageStageDurations[k] = item && item.count > 0 ? Math.round((item.totalTime / item.count) * 10) / 10 : 0;
    });

    const report = analyzeBottlenecks(orders, averageStageDurations);
    res.json({ success: true, ...report });
  } catch (error) {
    console.error('Error detecting bottlenecks:', error);
    res.status(500).json({ error: 'Failed to perform bottleneck detection analysis' });
  }
});

export default router;
