import type { Request, Response } from 'express';
import { prisma } from '../db.js';
import { Stage, SLAStatus } from '@prisma/client';
import { generateGroqRiskAnalysis } from '../services/groqService.js';

export interface RiskFactorBreakdown {
  factor: string;
  score: number;
  maxScore: number;
  weight: string;
  status: 'OPTIMAL' | 'ELEVATED' | 'HIGH_RISK';
  details: string;
}

export interface OrderRiskAssessment {
  orderId: string;
  customerId: string;
  warehouse: string;
  assignedEmployee: string;
  currentStage: Stage;
  currentStageLabel: string;
  processingTime: number;
  slaStatus: SLAStatus;
  riskScore: number; // 0 - 100
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  isPreDispatch: boolean;
  factors: RiskFactorBreakdown[];
  recommendations: string[];
  aiSummary?: string;
  predictedFailureVector?: string;
  rootCauseReasoning?: string;
  aiConfidence?: number;
  aiEngine?: string;
}

const STAGE_LABELS: Record<Stage, string> = {
  [Stage.ORDER_RECEIVED]: 'Order Intake',
  [Stage.PICKING]: 'Picking Station',
  [Stage.PACKING]: 'Packing Station',
  [Stage.QUALITY_CHECK]: 'Quality Audit',
  [Stage.DISPATCH]: 'Dispatch Staging',
  [Stage.DELIVERY]: 'Transit / Delivery',
};

/**
 * Multi-factor AI Risk & Intelligent Recommendation Engine
 */
function computeOrderRisk(
  order: any,
  stageQueueCounts: Record<string, number>,
  warehouseActiveCount: number,
  warehouseComplaintCount: number,
  employeeActiveCount: number
): OrderRiskAssessment {
  const processingTime = order.processingTime || 0;
  const currentStage = order.currentStage as Stage;
  const queueCount = stageQueueCounts[currentStage] || 0;

  // 1. Preparation & Dwell Time (Max 25 pts)
  let dwellScore = 3;
  let dwellStatus: 'OPTIMAL' | 'ELEVATED' | 'HIGH_RISK' = 'OPTIMAL';
  let dwellDetails = `Dwell time ${processingTime}m is within target SLA threshold.`;
  if (processingTime > 20 || order.slaStatus === SLAStatus.BREACHED) {
    dwellScore = 25;
    dwellStatus = 'HIGH_RISK';
    dwellDetails = `Critical dwell time (${processingTime} mins) - SLA Breached!`;
  } else if (processingTime > 12 || order.slaStatus === SLAStatus.AT_RISK) {
    dwellScore = 17;
    dwellStatus = 'ELEVATED';
    dwellDetails = `Elevated dwell time (${processingTime} mins) approaching delay limit.`;
  } else if (processingTime > 6) {
    dwellScore = 9;
    dwellStatus = 'OPTIMAL';
  }

  // 2. Queue Congestion Factor (Max 20 pts)
  let queueScore = 3;
  let queueStatus: 'OPTIMAL' | 'ELEVATED' | 'HIGH_RISK' = 'OPTIMAL';
  let queueDetails = `Normal queue load (${queueCount} orders waiting in ${STAGE_LABELS[currentStage]}).`;
  if (queueCount >= 5) {
    queueScore = 20;
    queueStatus = 'HIGH_RISK';
    queueDetails = `Heavy bottleneck queue (${queueCount} orders) in ${STAGE_LABELS[currentStage]}.`;
  } else if (queueCount >= 3) {
    queueScore = 13;
    queueStatus = 'ELEVATED';
    queueDetails = `Moderate queue buildup (${queueCount} orders) in ${STAGE_LABELS[currentStage]}.`;
  }

  // 3. Employee Workload & Quality History (Max 20 pts)
  let empScore = 3;
  let empStatus: 'OPTIMAL' | 'ELEVATED' | 'HIGH_RISK' = 'OPTIMAL';
  let empDetails = `Employee ${order.assignedEmployee || 'Staff'} workload normal (${employeeActiveCount} active orders).`;
  if (employeeActiveCount >= 4) {
    empScore = 20;
    empStatus = 'HIGH_RISK';
    empDetails = `Assigned worker is overloaded with ${employeeActiveCount} concurrent orders.`;
  } else if (employeeActiveCount >= 2) {
    empScore = 12;
    empStatus = 'ELEVATED';
    empDetails = `Assigned worker handling ${employeeActiveCount} active orders.`;
  }

  // 4. Warehouse Operational Load (Max 15 pts)
  let loadScore = 2;
  let loadStatus: 'OPTIMAL' | 'ELEVATED' | 'HIGH_RISK' = 'OPTIMAL';
  let loadDetails = `Hub load is balanced (${warehouseActiveCount} active pipeline orders).`;
  if (warehouseActiveCount >= 10) {
    loadScore = 15;
    loadStatus = 'HIGH_RISK';
    loadDetails = `High warehouse pipeline saturation (${warehouseActiveCount} orders in progress).`;
  } else if (warehouseActiveCount >= 5) {
    loadScore = 8;
    loadStatus = 'ELEVATED';
    loadDetails = `Moderate warehouse pipeline utilization (${warehouseActiveCount} orders).`;
  }

  // 5. Historical Defect / Complaint Rate (Max 20 pts)
  let complaintScore = 2;
  let complaintStatus: 'OPTIMAL' | 'ELEVATED' | 'HIGH_RISK' = 'OPTIMAL';
  let complaintDetails = `Low historical defect rate for ${order.warehouse}.`;
  if (warehouseComplaintCount >= 3) {
    complaintScore = 20;
    complaintStatus = 'HIGH_RISK';
    complaintDetails = `High historical defect incidence (${warehouseComplaintCount} complaints recorded in this hub).`;
  } else if (warehouseComplaintCount >= 1) {
    complaintScore = 11;
    complaintStatus = 'ELEVATED';
    complaintDetails = `Recent quality complaints recorded for this warehouse hub.`;
  }

  const rawScore = dwellScore + queueScore + empScore + loadScore + complaintScore;
  const riskScore = Math.min(100, Math.max(0, rawScore));

  let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
  if (riskScore >= 70) {
    riskLevel = 'HIGH';
  } else if (riskScore >= 40) {
    riskLevel = 'MEDIUM';
  }

  const isPreDispatch = currentStage !== Stage.DELIVERY;

  // FR-9 Intelligent Recommendations Generation
  const recommendations: string[] = [];

  if (riskLevel === 'HIGH') {
    if (currentStage === Stage.PACKING || currentStage === Stage.QUALITY_CHECK) {
      recommendations.push(
        'Trigger mandatory secondary QA inspection before dispatch: perform 100% item-count & seal audit.'
      );
    }
    if (currentStage === Stage.DISPATCH) {
      recommendations.push(
        'Delay dispatch handover for 3 minutes: perform express barcode verification to prevent wrong item delivery.'
      );
    }
    if (dwellScore >= 17) {
      recommendations.push(
        'Expedite transit handover: prioritize this order at the head of the dispatch queue.'
      );
    }
    if (empScore >= 15) {
      recommendations.push(
        `Reassign order from ${order.assignedEmployee} to an available supervisor line to eliminate backlog.`
      );
    }
    if (queueScore >= 15) {
      recommendations.push(
        `Open auxiliary packing/picking station at ${STAGE_LABELS[currentStage]} to drain heavy queue.`
      );
    }
  } else if (riskLevel === 'MEDIUM') {
    if (dwellScore >= 12) {
      recommendations.push(
        'Monitor dwell time closely to ensure packaging is completed within the remaining SLA buffer.'
      );
    }
    if (queueScore >= 12) {
      recommendations.push(
        `Prepare auxiliary staff support if ${STAGE_LABELS[currentStage]} queue rises above 4 orders.`
      );
    }
    if (recommendations.length === 0) {
      recommendations.push(
        'Standard processing flow; verify barcode scan at next stage transition.'
      );
    }
  } else {
    recommendations.push(
      'Order progressing smoothly within standard SLA parameters. Proceed with normal workflow.'
    );
  }

  const factors: RiskFactorBreakdown[] = [
    {
      factor: 'Preparation & Dwell Duration',
      score: dwellScore,
      maxScore: 25,
      weight: '25%',
      status: dwellStatus,
      details: dwellDetails,
    },
    {
      factor: 'Stage Queue Congestion',
      score: queueScore,
      maxScore: 20,
      weight: '20%',
      status: queueStatus,
      details: queueDetails,
    },
    {
      factor: 'Employee Workload & Capacity',
      score: empScore,
      maxScore: 20,
      weight: '20%',
      status: empStatus,
      details: empDetails,
    },
    {
      factor: 'Warehouse Operational Load',
      score: loadScore,
      maxScore: 15,
      weight: '15%',
      status: loadStatus,
      details: loadDetails,
    },
    {
      factor: 'Historical Complaint Frequency',
      score: complaintScore,
      maxScore: 20,
      weight: '20%',
      status: complaintStatus,
      details: complaintDetails,
    },
  ];

  return {
    orderId: order.id,
    customerId: order.customerId,
    warehouse: order.warehouse,
    assignedEmployee: order.assignedEmployee || 'Unassigned',
    currentStage,
    currentStageLabel: STAGE_LABELS[currentStage] || currentStage,
    processingTime,
    slaStatus: order.slaStatus,
    riskScore,
    riskLevel,
    isPreDispatch,
    factors,
    recommendations,
  };
}

/**
 * 1. GET /api/risk/order/:orderId - Single Order Pre-Dispatch Risk Assessment (FR-8, FR-9)
 */
export const getOrderRisk = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    if (!orderId || typeof orderId !== 'string') {
      return res.status(400).json({ message: 'Invalid order ID' });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { history: true },
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Compute pipeline context
    const allOrders = await prisma.order.findMany({
      where: { warehouse: order.warehouse },
    });

    const complaints = await prisma.complaint.findMany({
      where: { warehouse: order.warehouse },
    });

    const stageQueueCounts: Record<string, number> = {};
    let employeeActiveCount = 0;
    allOrders.forEach((o) => {
      stageQueueCounts[o.currentStage] = (stageQueueCounts[o.currentStage] || 0) + 1;
      if (o.assignedEmployee === order.assignedEmployee && o.currentStage !== Stage.DELIVERY) {
        employeeActiveCount += 1;
      }
    });

    const activeOrdersInWarehouse = allOrders.filter((o) => o.currentStage !== Stage.DELIVERY).length;

    const riskAssessment = computeOrderRisk(
      order,
      stageQueueCounts,
      activeOrdersInWarehouse,
      complaints.length,
      employeeActiveCount
    );

    // Call Groq Llama 3.3 for deep generative AI risk reasoning
    try {
      const groqAI = await generateGroqRiskAnalysis({
        orderId: order.id,
        customerId: order.customerId,
        warehouse: order.warehouse,
        currentStage: order.currentStage,
        processingTime: order.processingTime,
        assignedEmployee: order.assignedEmployee,
        slaStatus: order.slaStatus,
        heuristicRiskScore: riskAssessment.riskScore,
        stageHistory: order.history?.map((h: any) => ({ stage: h.stage, processingTime: h.processingTime })) || [],
        warehouseActiveCount: activeOrdersInWarehouse,
      });

      if (groqAI) {
        riskAssessment.aiSummary = groqAI.aiSummary;
        riskAssessment.predictedFailureVector = groqAI.predictedFailureVector;
        riskAssessment.rootCauseReasoning = groqAI.rootCauseReasoning;
        riskAssessment.aiConfidence = groqAI.aiConfidence || 95;
        riskAssessment.aiEngine = 'Groq Llama-3.3-70B';
        if (groqAI.actionableRecommendations?.length > 0) {
          riskAssessment.recommendations = groqAI.actionableRecommendations;
        }
      }
    } catch (llmErr) {
      console.warn('Groq AI enhancement skipped:', llmErr);
    }

    // Save computed score to DB
    await prisma.order.update({
      where: { id: orderId },
      data: { riskScore: riskAssessment.riskScore },
    });

    res.status(200).json({
      success: true,
      riskAssessment,
    });
  } catch (error: any) {
    console.error('Order risk calculation error:', error);
    res.status(500).json({
      message: 'Failed to compute pre-dispatch risk assessment',
      error: error.message,
    });
  }
};

/**
 * 2. GET /api/risk/pipeline - Bulk Risk Assessments Across Active Pipeline
 */
export const getPipelineRisks = async (req: Request, res: Response) => {
  try {
    const { warehouse } = req.query;

    const where: any = {};
    if (warehouse && typeof warehouse === 'string' && warehouse !== 'ALL') {
      where.warehouse = warehouse;
    }

    const orders = await prisma.order.findMany({
      where,
      include: { history: true },
      orderBy: { createdAt: 'desc' },
    });

    const complaints = await prisma.complaint.findMany({ where });

    // Precompute counts
    const stageQueueCounts: Record<string, number> = {};
    const empActiveCounts: Record<string, number> = {};
    const warehouseActiveCounts: Record<string, number> = {};

    orders.forEach((o) => {
      if (o.currentStage !== Stage.DELIVERY) {
        stageQueueCounts[o.currentStage] = (stageQueueCounts[o.currentStage] || 0) + 1;
        warehouseActiveCounts[o.warehouse] = (warehouseActiveCounts[o.warehouse] || 0) + 1;
        if (o.assignedEmployee) {
          empActiveCounts[o.assignedEmployee] = (empActiveCounts[o.assignedEmployee] || 0) + 1;
        }
      }
    });

    const assessments: OrderRiskAssessment[] = [];
    let highRiskCount = 0;
    let mediumRiskCount = 0;
    let lowRiskCount = 0;

    for (const order of orders) {
      const assessment = computeOrderRisk(
        order,
        stageQueueCounts,
        warehouseActiveCounts[order.warehouse] || 0,
        complaints.filter((c) => c.warehouse === order.warehouse).length,
        empActiveCounts[order.assignedEmployee] || 1
      );

      if (assessment.riskLevel === 'HIGH') highRiskCount += 1;
      else if (assessment.riskLevel === 'MEDIUM') mediumRiskCount += 1;
      else lowRiskCount += 1;

      assessments.push(assessment);
    }

    res.status(200).json({
      success: true,
      totalOrders: assessments.length,
      highRiskCount,
      mediumRiskCount,
      lowRiskCount,
      assessments: assessments.sort((a, b) => b.riskScore - a.riskScore),
    });
  } catch (error: any) {
    console.error('Pipeline risk evaluation error:', error);
    res.status(500).json({
      message: 'Failed to evaluate pipeline risk assessments',
      error: error.message,
    });
  }
};

/**
 * 3. GET /api/risk/recommendations - Global Intelligent Recommendations Feed (FR-9)
 */
export const getGlobalRecommendations = async (req: Request, res: Response) => {
  try {
    const { warehouse } = req.query;

    const where: any = {};
    if (warehouse && typeof warehouse === 'string' && warehouse !== 'ALL') {
      where.warehouse = warehouse;
    }

    const orders = await prisma.order.findMany({
      where,
      include: { history: true },
    });

    const complaints = await prisma.complaint.findMany({ where });

    const stageQueueCounts: Record<string, number> = {};
    const empActiveCounts: Record<string, number> = {};

    orders.forEach((o) => {
      if (o.currentStage !== Stage.DELIVERY) {
        stageQueueCounts[o.currentStage] = (stageQueueCounts[o.currentStage] || 0) + 1;
        if (o.assignedEmployee) {
          empActiveCounts[o.assignedEmployee] = (empActiveCounts[o.assignedEmployee] || 0) + 1;
        }
      }
    });

    const activeList = orders.filter((o) => o.currentStage !== Stage.DELIVERY);
    const activeRiskList = activeList.map((o) =>
      computeOrderRisk(
        o,
        stageQueueCounts,
        activeList.length,
        complaints.length,
        empActiveCounts[o.assignedEmployee] || 1
      )
    );

    const highRiskOrders = activeRiskList.filter((a) => a.riskLevel === 'HIGH');
    const mediumRiskOrders = activeRiskList.filter((a) => a.riskLevel === 'MEDIUM');

    const recommendedActions: Array<{
      id: string;
      category: string;
      priority: 'URGENT' | 'HIGH' | 'MEDIUM';
      title: string;
      description: string;
      orderCount: number;
      ordersAffected: string[];
    }> = [];

    if (highRiskOrders.length > 0) {
      recommendedActions.push({
        id: 'REC-01',
        category: 'Quality Check Intervention',
        priority: 'URGENT',
        title: 'Trigger Secondary Quality Inspection on High-Risk Packages',
        description: `Hold dispatch for ${highRiskOrders.length} high-risk orders to conduct mandatory barcode & weight double-checks.`,
        orderCount: highRiskOrders.length,
        ordersAffected: highRiskOrders.map((o) => o.orderId.slice(0, 8)),
      });
    }

    // Check Packing queue congestion
    const packingQueue = stageQueueCounts[Stage.PACKING] || 0;
    if (packingQueue >= 4) {
      recommendedActions.push({
        id: 'REC-02',
        category: 'Staff Reallocation',
        priority: 'HIGH',
        title: 'Open Auxiliary Packing Station & Reassign 2 Workers',
        description: `Packing queue is saturated (${packingQueue} orders waiting). Reassign available picking/dispatch workers immediately.`,
        orderCount: packingQueue,
        ordersAffected: activeList.filter((o) => o.currentStage === Stage.PACKING).map((o) => o.id.slice(0, 8)),
      });
    }

    // Check Employee Overload
    Object.keys(empActiveCounts).forEach((empName) => {
      const count = empActiveCounts[empName] || 0;
      if (count >= 4) {
        recommendedActions.push({
          id: `REC-EMP-${empName}`,
          category: 'Workforce Rebalancing',
          priority: 'HIGH',
          title: `Rebalance Active Orders for Worker "${empName}"`,
          description: `Worker is currently processing ${count} concurrent orders. Distribute workload to balance SLA compliance.`,
          orderCount: count,
          ordersAffected: activeList.filter((o) => o.assignedEmployee === empName).map((o) => o.id.slice(0, 8)),
        });
      }
    });

    res.status(200).json({
      success: true,
      totalRecommendations: recommendedActions.length,
      highRiskOrdersCount: highRiskOrders.length,
      mediumRiskOrdersCount: mediumRiskOrders.length,
      recommendations: recommendedActions,
    });
  } catch (error: any) {
    console.error('Get recommendations error:', error);
    res.status(500).json({
      message: 'Failed to generate intelligent recommendations',
      error: error.message,
    });
  }
};
