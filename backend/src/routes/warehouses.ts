import express from 'express';
import { prisma } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';
import { WarehouseStatus } from '@prisma/client';

const router = express.Router();

// GET /api/warehouses - List all warehouses with optional filters
router.get('/', async (req, res) => {
  try {
    const { status, search } = req.query;

    const whereClause: any = {};

    if (status && Object.values(WarehouseStatus).includes(status as WarehouseStatus)) {
      whereClause.status = status as WarehouseStatus;
    }

    if (search && typeof search === 'string') {
      whereClause.OR = [
        { name: { contains: search } },
        { location: { contains: search } },
      ];
    }

    const warehouses = await prisma.warehouse.findMany({
      where: whereClause,
      include: {
        zones: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({ warehouses, count: warehouses.length });
  } catch (error) {
    console.error('Error fetching warehouses:', error);
    res.status(500).json({ error: 'Failed to retrieve warehouses' });
  }
});

// GET /api/warehouses/:id - Get detailed warehouse information by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const warehouse = await prisma.warehouse.findUnique({
      where: { id },
      include: {
        zones: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!warehouse) {
      return res.status(404).json({ error: 'Warehouse not found' });
    }

    res.json({ warehouse });
  } catch (error) {
    console.error('Error fetching warehouse details:', error);
    res.status(500).json({ error: 'Failed to retrieve warehouse details' });
  }
});

// POST /api/warehouses - Register a new warehouse (ADMIN & OPERATIONS_MANAGER)
router.post(
  '/',
  authenticateToken,
  requireRole(['ADMIN', 'OPERATIONS_MANAGER']),
  async (req, res) => {
    try {
      const { name, location, capacity, status, isActive } = req.body;

      if (!name || !location || capacity === undefined) {
        return res
          .status(400)
          .json({ error: 'Name, location, and operational capacity are required' });
      }

      const parsedCapacity = Number(capacity);
      if (isNaN(parsedCapacity) || parsedCapacity < 0) {
        return res
          .status(400)
          .json({ error: 'Operational capacity must be a non-negative number' });
      }

      const warehouseStatus =
        status && Object.values(WarehouseStatus).includes(status)
          ? status
          : WarehouseStatus.ACTIVE;

      const newWarehouse = await prisma.warehouse.create({
        data: {
          name,
          location,
          capacity: parsedCapacity,
          status: warehouseStatus,
          isActive: isActive !== undefined ? Boolean(isActive) : warehouseStatus === WarehouseStatus.ACTIVE,
        },
        include: {
          zones: true,
        },
      });

      res.status(201).json({
        message: 'Warehouse registered successfully',
        warehouse: newWarehouse,
      });
    } catch (error) {
      console.error('Error registering warehouse:', error);
      res.status(500).json({ error: 'Failed to register warehouse' });
    }
  }
);

export default router;
