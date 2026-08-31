import express from 'express';
import { prisma } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';
import { WarehouseStatus, ZoneType, Role } from '@prisma/client';

const router = express.Router();

// GET /api/warehouses - List all warehouses with optional filters
router.get('/', async (req, res) => {
  try {
    const { status, search } = req.query;

    const whereClause: any = {};

    if (status && (Object.values(WarehouseStatus) as string[]).includes(String(status))) {
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
    const id = String(req.params.id);

    const warehouse = await prisma.warehouse.findUnique({
      where: { id: id as string },
      include: {
        zones: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!warehouse) {
      res.status(404).json({ error: 'Warehouse not found' });
      return;
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
  requireRole([Role.ADMIN, Role.OPERATIONS_MANAGER]),
  async (req, res) => {
    try {
      const { name, location, capacity, status, isActive } = req.body;

      if (!name || !location || capacity === undefined) {
        res
          .status(400)
          .json({ error: 'Name, location, and operational capacity are required' });
        return;
      }

      const parsedCapacity = Number(capacity);
      if (isNaN(parsedCapacity) || parsedCapacity < 0) {
        res
          .status(400)
          .json({ error: 'Operational capacity must be a non-negative number' });
        return;
      }

      const warehouseStatus =
        status && (Object.values(WarehouseStatus) as string[]).includes(String(status))
          ? (status as WarehouseStatus)
          : WarehouseStatus.ACTIVE;

      const newWarehouse = await prisma.warehouse.create({
        data: {
          name: String(name),
          location: String(location),
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

// PUT /api/warehouses/:id - Update warehouse configuration & capacity (ADMIN & OPERATIONS_MANAGER)
router.put(
  '/:id',
  authenticateToken,
  requireRole([Role.ADMIN, Role.OPERATIONS_MANAGER]),
  async (req, res) => {
    try {
      const id = String(req.params.id);
      const { name, location, capacity, status, isActive } = req.body;

      const existingWarehouse = await prisma.warehouse.findUnique({
        where: { id: id as string },
      });

      if (!existingWarehouse) {
        res.status(404).json({ error: 'Warehouse not found' });
        return;
      }

      const updateData: any = {};

      if (name !== undefined) updateData.name = String(name);
      if (location !== undefined) updateData.location = String(location);
      if (capacity !== undefined) {
        const parsedCapacity = Number(capacity);
        if (isNaN(parsedCapacity) || parsedCapacity < 0) {
          res
            .status(400)
            .json({ error: 'Operational capacity must be a non-negative number' });
          return;
        }
        updateData.capacity = parsedCapacity;
      }
      if (status !== undefined && (Object.values(WarehouseStatus) as string[]).includes(String(status))) {
        updateData.status = status as WarehouseStatus;
        updateData.isActive = status === WarehouseStatus.ACTIVE;
      }
      if (isActive !== undefined) {
        updateData.isActive = Boolean(isActive);
      }

      const updatedWarehouse = await prisma.warehouse.update({
        where: { id: id as string },
        data: updateData,
        include: {
          zones: true,
        },
      });

      res.json({
        message: 'Warehouse updated successfully',
        warehouse: updatedWarehouse,
      });
    } catch (error) {
      console.error('Error updating warehouse:', error);
      res.status(500).json({ error: 'Failed to update warehouse' });
    }
  }
);

// POST /api/warehouses/:id/zones - Define a new zone for a warehouse (ADMIN, OPERATIONS_MANAGER, WAREHOUSE_SUPERVISOR)
router.post(
  '/:id/zones',
  authenticateToken,
  requireRole([Role.ADMIN, Role.OPERATIONS_MANAGER, Role.WAREHOUSE_SUPERVISOR]),
  async (req, res) => {
    try {
      const id = String(req.params.id);
      const { name, code, type, capacity } = req.body;

      if (!name || !code) {
        res.status(400).json({ error: 'Zone name and code are required' });
        return;
      }

      const existingWarehouse = await prisma.warehouse.findUnique({
        where: { id: id as string },
      });

      if (!existingWarehouse) {
        res.status(404).json({ error: 'Warehouse not found' });
        return;
      }

      const zoneType: ZoneType =
        type && (Object.values(ZoneType) as string[]).includes(String(type))
          ? (type as ZoneType)
          : ZoneType.STORAGE;

      const parsedCapacity = capacity !== undefined ? Number(capacity) : 100;

      const newZone = await prisma.warehouseZone.create({
        data: {
          warehouseId: id as string,
          name: String(name),
          code: String(code).toUpperCase(),
          type: zoneType,
          capacity: isNaN(parsedCapacity) ? 100 : parsedCapacity,
        },
      });

      res.status(201).json({
        message: 'Zone defined successfully',
        zone: newZone,
      });
    } catch (error) {
      console.error('Error defining warehouse zone:', error);
      res.status(500).json({ error: 'Failed to define warehouse zone' });
    }
  }
);

// DELETE /api/warehouses/:id/zones/:zoneId - Remove a zone from a warehouse (ADMIN & OPERATIONS_MANAGER)
router.delete(
  '/:id/zones/:zoneId',
  authenticateToken,
  requireRole([Role.ADMIN, Role.OPERATIONS_MANAGER]),
  async (req, res) => {
    try {
      const id = String(req.params.id);
      const zoneId = String(req.params.zoneId);

      const zone = await prisma.warehouseZone.findUnique({
        where: { id: zoneId as string },
      });

      if (!zone || zone.warehouseId !== id) {
        res.status(404).json({ error: 'Zone not found for this warehouse' });
        return;
      }

      await prisma.warehouseZone.delete({
        where: { id: zoneId as string },
      });

      res.json({ message: 'Zone deleted successfully' });
    } catch (error) {
      console.error('Error deleting warehouse zone:', error);
      res.status(500).json({ error: 'Failed to delete warehouse zone' });
    }
  }
);

export default router;
