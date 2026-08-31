import type { Request, Response } from 'express';
import { prisma } from '../db.js';
import { ComplaintType, ComplaintStatus, ComplaintSeverity } from '@prisma/client';

/**
 * 1. CREATE COMPLAINT (FR-6)
 */
export const createComplaint = async (req: Request, res: Response) => {
  try {
    const {
      orderId,
      complaintType,
      warehouse,
      deliveryExecutive,
      rootCause,
      severity,
      notes,
    } = req.body;

    if (!orderId || !complaintType) {
      return res.status(400).json({ message: 'orderId and complaintType are required' });
    }

    // Verify order exists
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { history: true },
    });

    if (!order) {
      return res.status(404).json({ message: `Order with ID "${orderId}" not found` });
    }

    const complaintWarehouse = warehouse || order.warehouse;

    const complaint = await prisma.complaint.create({
      data: {
        orderId,
        complaintType: complaintType as ComplaintType,
        warehouse: complaintWarehouse,
        deliveryExecutive: deliveryExecutive || null,
        rootCause: rootCause || null,
        severity: (severity as ComplaintSeverity) || ComplaintSeverity.MEDIUM,
        status: ComplaintStatus.OPEN,
        notes: notes || null,
      },
      include: {
        order: {
          include: { history: true },
        },
      },
    });

    res.status(201).json({
      message: 'Complaint logged successfully',
      complaint,
    });
  } catch (error: any) {
    console.error('Create complaint error:', error);
    res.status(500).json({
      message: 'Failed to create complaint',
      error: error.message,
    });
  }
};

/**
 * 2. GET ALL COMPLAINTS (with search & filtering)
 */
export const getComplaints = async (req: Request, res: Response) => {
  try {
    const { warehouse, complaintType, status, severity, search, orderId } = req.query;

    const where: any = {};

    if (warehouse && typeof warehouse === 'string' && warehouse !== 'ALL') {
      where.warehouse = warehouse;
    }

    if (complaintType && typeof complaintType === 'string' && complaintType !== 'ALL') {
      where.complaintType = complaintType as ComplaintType;
    }

    if (status && typeof status === 'string' && status !== 'ALL') {
      where.status = status as ComplaintStatus;
    }

    if (severity && typeof severity === 'string' && severity !== 'ALL') {
      where.severity = severity as ComplaintSeverity;
    }

    if (orderId && typeof orderId === 'string') {
      where.orderId = orderId;
    }

    if (search && typeof search === 'string' && search.trim() !== '') {
      const q = search.trim();
      where.OR = [
        { id: { contains: q } },
        { orderId: { contains: q } },
        { warehouse: { contains: q } },
        { deliveryExecutive: { contains: q } },
        { rootCause: { contains: q } },
        { notes: { contains: q } },
      ];
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
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      success: true,
      total: complaints.length,
      complaints,
    });
  } catch (error: any) {
    console.error('Get complaints error:', error);
    res.status(500).json({
      message: 'Failed to fetch complaints',
      error: error.message,
    });
  }
};

/**
 * 3. GET SINGLE COMPLAINT BY ID
 */
export const getComplaintById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: 'Invalid complaint ID' });
    }

    const complaint = await prisma.complaint.findUnique({
      where: { id },
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

    res.status(200).json({ success: true, complaint });
  } catch (error: any) {
    console.error('Get complaint by ID error:', error);
    res.status(500).json({
      message: 'Failed to fetch complaint details',
      error: error.message,
    });
  }
};

/**
 * 4. UPDATE COMPLAINT (Status, Root Cause, Severity, Notes)
 */
export const updateComplaint = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, rootCause, severity, notes, deliveryExecutive } = req.body;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: 'Invalid complaint ID' });
    }

    const dataToUpdate: any = {};
    if (status) dataToUpdate.status = status as ComplaintStatus;
    if (rootCause !== undefined) dataToUpdate.rootCause = rootCause;
    if (severity) dataToUpdate.severity = severity as ComplaintSeverity;
    if (notes !== undefined) dataToUpdate.notes = notes;
    if (deliveryExecutive !== undefined) dataToUpdate.deliveryExecutive = deliveryExecutive;

    const updated = await prisma.complaint.update({
      where: { id },
      data: dataToUpdate,
      include: {
        order: {
          include: { history: true },
        },
      },
    });

    res.status(200).json({
      message: 'Complaint updated successfully',
      complaint: updated,
    });
  } catch (error: any) {
    console.error('Update complaint error:', error);
    res.status(500).json({
      message: 'Failed to update complaint',
      error: error.message,
    });
  }
};

/**
 * 5. DELETE COMPLAINT
 */
export const deleteComplaint = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: 'Invalid complaint ID' });
    }

    await prisma.complaint.delete({ where: { id } });
    res.status(200).json({ message: 'Complaint deleted successfully' });
  } catch (error: any) {
    console.error('Delete complaint error:', error);
    res.status(500).json({
      message: 'Failed to delete complaint',
      error: error.message,
    });
  }
};

/**
 * 6. COMPLAINT SUMMARY & ANALYTICS
 */
export const getComplaintSummary = async (req: Request, res: Response) => {
  try {
    const { warehouse } = req.query;

    const where: any = {};
    if (warehouse && typeof warehouse === 'string' && warehouse !== 'ALL') {
      where.warehouse = warehouse;
    }

    const complaints = await prisma.complaint.findMany({ where });

    const totalComplaints = complaints.length;
    const openCount = complaints.filter((c) => c.status === ComplaintStatus.OPEN).length;
    const investigatingCount = complaints.filter((c) => c.status === ComplaintStatus.INVESTIGATING).length;
    const resolvedCount = complaints.filter((c) => c.status === ComplaintStatus.RESOLVED).length;

    const resolutionRate = totalComplaints > 0 ? Math.round((resolvedCount / totalComplaints) * 100) : 100;

    // Breakdown by type
    const byType: Record<string, number> = {
      WRONG_ITEM: 0,
      MISSING_ITEM: 0,
      DAMAGED_ITEM: 0,
      LATE_DELIVERY: 0,
    };
    complaints.forEach((c) => {
      const current = byType[c.complaintType];
      if (current !== undefined) {
        byType[c.complaintType] = current + 1;
      }
    });

    // Breakdown by warehouse
    const byWarehouse: Record<string, number> = {};
    complaints.forEach((c) => {
      const count = byWarehouse[c.warehouse] || 0;
      byWarehouse[c.warehouse] = count + 1;
    });

    res.status(200).json({
      success: true,
      totalComplaints,
      openCount,
      investigatingCount,
      resolvedCount,
      resolutionRate,
      byType,
      byWarehouse,
    });
  } catch (error: any) {
    console.error('Get complaint summary error:', error);
    res.status(500).json({
      message: 'Failed to fetch complaint analytics summary',
      error: error.message,
    });
  }
};
