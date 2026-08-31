import type { Request, Response } from 'express';
import { prisma } from '../db.js';
import { ComplaintType, Stage } from '@prisma/client';
import { generateGroqRCATrace } from '../services/groqService.js';

export interface RCATraceResult {
  complaintId: string;
  orderId: string;
  complaintType: ComplaintType;
  responsibleWarehouse: string;
  responsibleStage: Stage;
  responsibleStageLabel: string;
  responsibleShift: string;
  responsibleEmployee: string;
  confidenceScore: number;
  failureMechanism: string;
  identifiedRootCause?: string;
  escapePoint: string;
  preventiveRecommendation: string;
  aiEngine?: string;
  traceTimeline: Array<{
    stage: string;
    employee: string;
    durationMinutes: number;
    timestamp: string;
    shift: string;
    isCulpritStage: boolean;
    isEscapePoint: boolean;
  }>;
}

/**
 * Determine Shift from DateTime
 */
function getShiftFromDate(date: Date): { shiftName: string; shiftCode: 'MORNING' | 'EVENING' | 'NIGHT' } {
  const hours = date.getHours();
  if (hours >= 6 && hours < 14) {
    return { shiftName: 'Morning Shift (06:00 - 14:00)', shiftCode: 'MORNING' };
  } else if (hours >= 14 && hours < 22) {
    return { shiftName: 'Evening Shift (14:00 - 22:00)', shiftCode: 'EVENING' };
  } else {
    return { shiftName: 'Night Shift (22:00 - 06:00)', shiftCode: 'NIGHT' };
  }
}

const STAGE_LABELS: Record<Stage, string> = {
  [Stage.ORDER_RECEIVED]: 'Order Intake',
  [Stage.PICKING]: 'Item Picking Station',
  [Stage.PACKING]: 'Packing & Box Assembly',
  [Stage.QUALITY_CHECK]: 'Quality Check Audit',
  [Stage.DISPATCH]: 'Dispatch & Vehicle Loading',
  [Stage.DELIVERY]: 'Transit & Delivery',
};

/**
 * Core RCA Back-Trace Engine
 */
function executeRCABackTrace(complaint: any, order: any): RCATraceResult {
  const stageLogs = order.history || [];
  const complaintType = complaint.complaintType as ComplaintType;

  let responsibleStage: Stage = Stage.PICKING;
  let escapePoint: Stage = Stage.QUALITY_CHECK;
  let failureMechanism = '';
  let preventiveRecommendation = '';
  let baseConfidence = 80;

  // Find stage with highest processing time if looking for delay
  let slowestStage: Stage = Stage.PACKING;
  let maxDuration = 0;
  stageLogs.forEach((log: any) => {
    if (log.processingTime > maxDuration) {
      maxDuration = log.processingTime;
      slowestStage = log.stage as Stage;
    }
  });

  switch (complaintType) {
    case ComplaintType.WRONG_ITEM:
      responsibleStage = Stage.PICKING;
      escapePoint = Stage.QUALITY_CHECK;
      failureMechanism =
        'SKU misidentification during picking. The picker retrieved an adjacent or similar SKU from the shelf, and the discrepancy was not flagged during barcode verification.';
      preventiveRecommendation =
        'Enforce mandatory double-barcode scan validation in Picking zone and configure automated weight disparity alerts at Packing station.';
      baseConfidence = 90;
      break;

    case ComplaintType.MISSING_ITEM:
      responsibleStage = Stage.PACKING;
      escapePoint = Stage.QUALITY_CHECK;
      failureMechanism =
        'Item omission during packing aggregation. Multi-item cart was sealed into shipping carton without reconciling all picklist line items.';
      preventiveRecommendation =
        'Install inline carton checkweighers at Packing station to automatically reject boxes with gross weight variance before taping.';
      baseConfidence = 88;
      break;

    case ComplaintType.DAMAGED_ITEM:
      responsibleStage = Stage.PACKING;
      escapePoint = Stage.DISPATCH;
      failureMechanism =
        'Insufficient protective cushioning / void fill during box packaging, or excessive carton compression during dispatch staging.';
      preventiveRecommendation =
        'Mandate standard bubble-wrap and air-pillow fill rules for fragile product categories; limit maximum stack height on dispatch pallets to 4 layers.';
      baseConfidence = 85;
      break;

    case ComplaintType.LATE_DELIVERY:
      responsibleStage = slowestStage || Stage.DISPATCH;
      escapePoint = Stage.DELIVERY;
      failureMechanism = `Operational bottleneck during ${STAGE_LABELS[responsibleStage]} (dwell time: ${maxDuration} mins), which breached delivery SLA window prior to customer handover.`;
      preventiveRecommendation =
        'Implement dynamic queue auto-balancing: trigger supervisor alerts whenever stage dwell time exceeds 12 minutes to expedite handoffs.';
      baseConfidence = maxDuration > 15 ? 92 : 78;
      break;
  }

  // Find log timestamp for responsible stage
  const culpritLog = stageLogs.find((l: any) => l.stage === responsibleStage);
  const logDate = culpritLog ? new Date(culpritLog.changedAt) : new Date(order.createdAt);
  const shiftInfo = getShiftFromDate(logDate);

  // Construct structured timeline
  const traceTimeline = stageLogs.map((log: any) => {
    const d = new Date(log.changedAt);
    const logShift = getShiftFromDate(d);
    return {
      stage: log.stage,
      employee: order.assignedEmployee || 'Unassigned',
      durationMinutes: log.processingTime,
      timestamp: log.changedAt,
      shift: logShift.shiftName,
      isCulpritStage: log.stage === responsibleStage,
      isEscapePoint: log.stage === escapePoint,
    };
  });

  return {
    complaintId: complaint.id,
    orderId: order.id,
    complaintType,
    responsibleWarehouse: complaint.warehouse || order.warehouse,
    responsibleStage,
    responsibleStageLabel: STAGE_LABELS[responsibleStage] || responsibleStage,
    responsibleShift: shiftInfo.shiftName,
    responsibleEmployee: order.assignedEmployee || 'Unassigned Staff',
    confidenceScore: baseConfidence,
    failureMechanism,
    escapePoint: STAGE_LABELS[escapePoint] || escapePoint,
    preventiveRecommendation,
    traceTimeline,
  };
}

/**
 * 1. GET /api/rca/trace/:complaintId - Execute RCA Back-Trace for single complaint
 */
export const traceComplaintRCA = async (req: Request, res: Response) => {
  try {
    const { complaintId } = req.params;
    if (!complaintId || typeof complaintId !== 'string') {
      return res.status(400).json({ message: 'Invalid complaint ID' });
    }

    const complaint = await prisma.complaint.findUnique({
      where: { id: complaintId },
      include: {
        order: {
          include: {
            history: {
              orderBy: { changedAt: 'asc' },
            },
          },
        },
      },
    });

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    const rcaResult = executeRCABackTrace(complaint, complaint.order);

    // Call Groq Llama 3.3 for forensic generative RCA trace
    try {
      const groqRCA = await generateGroqRCATrace({
        complaintId: complaint.id,
        complaintType: complaint.complaintType,
        severity: complaint.severity,
        notes: complaint.notes || '',
        orderId: complaint.orderId,
        warehouse: complaint.warehouse,
        deliveryExecutive: complaint.deliveryExecutive,
        stageHistory: complaint.order?.history?.map((h: any) => ({
          stage: h.stage,
          processingTime: h.processingTime,
          changedAt: h.changedAt.toISOString ? h.changedAt.toISOString() : String(h.changedAt),
        })) || [],
      });

      if (groqRCA) {
        rcaResult.identifiedRootCause = groqRCA.identifiedRootCause || rcaResult.identifiedRootCause;
        rcaResult.failureMechanism = groqRCA.failureMechanism || rcaResult.failureMechanism;
        rcaResult.confidenceScore = groqRCA.confidenceScore || 96;
        rcaResult.preventiveRecommendation = groqRCA.preventativeDirective || rcaResult.preventiveRecommendation;
        rcaResult.aiEngine = 'Groq Llama-3.3-70B';
      }
    } catch (llmErr) {
      console.warn('Groq RCA enhancement skipped:', llmErr);
    }

    res.status(200).json({
      success: true,
      rcaResult,
    });
  } catch (error: any) {
    console.error('RCA Trace error:', error);
    res.status(500).json({
      message: 'Failed to perform Root Cause Analysis trace',
      error: error.message,
    });
  }
};

/**
 * 2. GET /api/rca/analytics - Global RCA Analytics & Vulnerability Intelligence
 */
export const getRCAAnalytics = async (req: Request, res: Response) => {
  try {
    const { warehouse } = req.query;

    const where: any = {};
    if (warehouse && typeof warehouse === 'string' && warehouse !== 'ALL') {
      where.warehouse = warehouse;
    }

    const complaints = await prisma.complaint.findMany({
      where,
      include: {
        order: {
          include: {
            history: {
              orderBy: { changedAt: 'asc' },
            },
          },
        },
      },
    });

    const total = complaints.length;

    // Aggregate statistics
    const stageFailures: Record<string, number> = {
      [Stage.PICKING]: 0,
      [Stage.PACKING]: 0,
      [Stage.QUALITY_CHECK]: 0,
      [Stage.DISPATCH]: 0,
      [Stage.DELIVERY]: 0,
    };

    const shiftFailures: Record<string, number> = {
      MORNING: 0,
      EVENING: 0,
      NIGHT: 0,
    };

    const employeeIncidence: Record<string, { employeeName: string; count: number; types: string[] }> = {};
    const recurringCauses: Array<{ title: string; count: number; stage: string; recommendation: string }> = [
      {
        title: 'Barcode Scanning Bypass in Picking',
        count: 0,
        stage: 'Picking Station',
        recommendation: 'Enforce mandatory barcode scan before tote placement.',
      },
      {
        title: 'Checkweigher Discrepancy & Item Omission',
        count: 0,
        stage: 'Packing Station',
        recommendation: 'Calibrate packaging inline weight verification.',
      },
      {
        title: 'Insufficient Carton Cushioning / Void Fill',
        count: 0,
        stage: 'Packing Station',
        recommendation: 'Provide standard bubble-wrap guides for fragile SKUs.',
      },
      {
        title: 'Queue Dwell Time Exceeded in Staging',
        count: 0,
        stage: 'Dispatch Hub',
        recommendation: 'Trigger dynamic workload rebalancing on queues > 10m.',
      },
    ];

    complaints.forEach((c) => {
      const rca = executeRCABackTrace(c, c.order);

      // Stage failures count
      const stageKey = rca.responsibleStage;
      if (stageFailures[stageKey] !== undefined) {
        stageFailures[stageKey] += 1;
      }

      // Shift failures count
      const shiftDate = new Date(c.createdAt);
      const shiftCode = getShiftFromDate(shiftDate).shiftCode;
      if (shiftFailures[shiftCode] !== undefined) {
        shiftFailures[shiftCode] += 1;
      }

      // Employee count
      const emp = rca.responsibleEmployee;
      if (emp) {
        const existing = employeeIncidence[emp] || { employeeName: emp, count: 0, types: [] };
        existing.count += 1;
        if (!existing.types.includes(c.complaintType)) {
          existing.types.push(c.complaintType);
        }
        employeeIncidence[emp] = existing;
      }

      // Categorize recurring patterns
      if (c.complaintType === ComplaintType.WRONG_ITEM && recurringCauses[0]) {
        recurringCauses[0].count += 1;
      } else if (c.complaintType === ComplaintType.MISSING_ITEM && recurringCauses[1]) {
        recurringCauses[1].count += 1;
      } else if (c.complaintType === ComplaintType.DAMAGED_ITEM && recurringCauses[2]) {
        recurringCauses[2].count += 1;
      } else if (c.complaintType === ComplaintType.LATE_DELIVERY && recurringCauses[3]) {
        recurringCauses[3].count += 1;
      }
    });

    res.status(200).json({
      success: true,
      totalComplaintsAnalyzed: total,
      stageFailures,
      shiftFailures,
      employeeIncidence: Object.values(employeeIncidence).sort((a, b) => b.count - a.count),
      recurringCauses: recurringCauses.filter((r) => r.count > 0),
    });
  } catch (error: any) {
    console.error('RCA Analytics error:', error);
    res.status(500).json({
      message: 'Failed to calculate Root Cause Analysis analytics',
      error: error.message,
    });
  }
};
