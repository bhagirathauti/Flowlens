import { Role, WarehouseStatus, ZoneType, Stage, SLAStatus, ComplaintType, ComplaintSeverity, ComplaintStatus } from '@prisma/client';
import bcrypt from 'bcrypt';
import { prisma } from '../src/db.js';

async function main() {
  console.log('Seeding FlowLens presentation database with 20+ rich scenario records...');

  const hashedPassword = await bcrypt.hash('password123', 10);

  // 1. Clear existing data
  await prisma.complaint.deleteMany({});
  await prisma.stageLogs.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.warehouseZone.deleteMany({});
  await prisma.warehouse.deleteMany({});
  await prisma.user.deleteMany({});

  // 2. Create 10+ Users across all 4 RBAC roles
  const usersData = [
    { name: 'Arthur Vance (Global Admin)', email: 'admin@flowlens.com', role: Role.ADMIN },
    { name: 'Victoria Sterling (Platform Admin)', email: 'victoria@flowlens.com', role: Role.ADMIN },
    { name: 'Sarah Connor (Head of Operations)', email: 'ops@flowlens.com', role: Role.OPERATIONS_MANAGER },
    { name: 'Devon Patel (Shift Operations Lead)', email: 'devon@flowlens.com', role: Role.OPERATIONS_MANAGER },
    { name: 'Marcus Miller (North Hub Supervisor)', email: 'supervisor@flowlens.com', role: Role.WAREHOUSE_SUPERVISOR },
    { name: 'Elena Rostova (South Hub Supervisor)', email: 'elena.sup@flowlens.com', role: Role.WAREHOUSE_SUPERVISOR },
    { name: 'Carlos Mendez (West Coast Supervisor)', email: 'carlos@flowlens.com', role: Role.WAREHOUSE_SUPERVISOR },
    { name: 'Dr. Emily Watson (QA Lead Auditor)', email: 'qa@flowlens.com', role: Role.QA_TEAM },
    { name: 'Amina Diallo (Senior QA Specialist)', email: 'amina@flowlens.com', role: Role.QA_TEAM },
    { name: 'Liam Takahashi (Root Cause Analyst)', email: 'liam@flowlens.com', role: Role.QA_TEAM },
  ];

  for (const u of usersData) {
    await prisma.user.create({
      data: {
        name: u.name,
        email: u.email,
        password: hashedPassword,
        role: u.role,
      },
    });
  }
  console.log(`✓ Seeded ${usersData.length} RBAC users.`);

  // 3. Create 4 Distinct Warehouses with full Zone Topologies
  const warehouse1 = await prisma.warehouse.create({
    data: {
      name: 'Central Grocery Hub - North',
      location: 'New York, NY',
      capacity: 50000,
      status: WarehouseStatus.ACTIVE,
      isActive: true,
      zones: {
        create: [
          { name: 'Receiving Dock A', code: 'RCV-01', type: ZoneType.RECEIVING, capacity: 6000 },
          { name: 'Cold Storage Picking', code: 'PCK-01', type: ZoneType.PICKING, capacity: 15000 },
          { name: 'Ambient Dry Picking Zone', code: 'PCK-02', type: ZoneType.PICKING, capacity: 12000 },
          { name: 'Automated Packing Station 1', code: 'PAK-01', type: ZoneType.PACKING, capacity: 10000 },
          { name: 'QA Express Inspection Lab', code: 'QA-01', type: ZoneType.QUALITY_CHECK, capacity: 5000 },
          { name: 'Dispatch Bay 1-4', code: 'DSP-01', type: ZoneType.DISPATCH, capacity: 15000 },
        ],
      },
    },
  });

  const warehouse2 = await prisma.warehouse.create({
    data: {
      name: 'Metro Fulfillment Hub - South',
      location: 'Austin, TX',
      capacity: 38000,
      status: WarehouseStatus.ACTIVE,
      isActive: true,
      zones: {
        create: [
          { name: 'Receiving Dock South', code: 'RCV-02', type: ZoneType.RECEIVING, capacity: 4500 },
          { name: 'High-Density Goods Picking', code: 'PCK-03', type: ZoneType.PICKING, capacity: 14000 },
          { name: 'Heavy Pack Bay Beta', code: 'PAK-02', type: ZoneType.PACKING, capacity: 9000 },
          { name: 'Secondary QA Audit Bench', code: 'QA-02', type: ZoneType.QUALITY_CHECK, capacity: 4000 },
          { name: 'Dispatch Bay 5-8', code: 'DSP-02', type: ZoneType.DISPATCH, capacity: 12000 },
        ],
      },
    },
  });

  const warehouse3 = await prisma.warehouse.create({
    data: {
      name: 'Pacific Coast Distribution Bay',
      location: 'Seattle, WA',
      capacity: 42000,
      status: WarehouseStatus.ACTIVE,
      isActive: true,
      zones: {
        create: [
          { name: 'Intake Port Gate', code: 'RCV-03', type: ZoneType.RECEIVING, capacity: 5000 },
          { name: 'Robotic Picking Matrix', code: 'PCK-04', type: ZoneType.PICKING, capacity: 16000 },
          { name: 'Express Bubble-Wrap Bay', code: 'PAK-03', type: ZoneType.PACKING, capacity: 11000 },
          { name: 'Dispatch Loading Bay 9-12', code: 'DSP-03', type: ZoneType.DISPATCH, capacity: 14000 },
        ],
      },
    },
  });

  const warehouse4 = await prisma.warehouse.create({
    data: {
      name: 'Midwest Cold-Chain Facility',
      location: 'Chicago, IL',
      capacity: 28000,
      status: WarehouseStatus.MAINTENANCE,
      isActive: false,
      zones: {
        create: [
          { name: 'Cold Intake Dock', code: 'RCV-04', type: ZoneType.RECEIVING, capacity: 3500 },
          { name: 'Deep Freeze Picking Bay', code: 'PCK-05', type: ZoneType.PICKING, capacity: 10000 },
          { name: 'Insulated Packing Line', code: 'PAK-04', type: ZoneType.PACKING, capacity: 7000 },
        ],
      },
    },
  });

  console.log(`✓ Seeded 4 Warehouses with 18 specialized Zone Topologies.`);

  // 4. Seed 26 Realistic Orders with multi-stage timelines & varied risk factors
  const sampleOrders = [
    // STAGE 1: ORDER_RECEIVED (Fresh & Normal)
    {
      customerId: 'CUST-1001',
      warehouse: 'Central Grocery Hub - North',
      assignedEmployee: 'Marcus Vance',
      currentStage: Stage.ORDER_RECEIVED,
      processingTime: 2,
      riskScore: 15,
      slaStatus: SLAStatus.ON_TIME,
      stages: [{ stage: Stage.ORDER_RECEIVED, duration: 2 }],
    },
    {
      customerId: 'CUST-1002',
      warehouse: 'Metro Fulfillment Hub - South',
      assignedEmployee: 'Elena Rostova',
      currentStage: Stage.ORDER_RECEIVED,
      processingTime: 4,
      riskScore: 22,
      slaStatus: SLAStatus.ON_TIME,
      stages: [{ stage: Stage.ORDER_RECEIVED, duration: 4 }],
    },
    {
      customerId: 'CUST-1003',
      warehouse: 'Pacific Coast Distribution Bay',
      assignedEmployee: 'David Chen',
      currentStage: Stage.ORDER_RECEIVED,
      processingTime: 3,
      riskScore: 18,
      slaStatus: SLAStatus.ON_TIME,
      stages: [{ stage: Stage.ORDER_RECEIVED, duration: 3 }],
    },
    {
      customerId: 'CUST-1004',
      warehouse: 'Central Grocery Hub - North',
      assignedEmployee: 'Amina Diallo',
      currentStage: Stage.ORDER_RECEIVED,
      processingTime: 6,
      riskScore: 35,
      slaStatus: SLAStatus.ON_TIME,
      stages: [{ stage: Stage.ORDER_RECEIVED, duration: 6 }],
    },

    // STAGE 2: PICKING (Including High Risk Cases for Live Demo)
    {
      customerId: 'CUST-2001 (Priority Grocery)',
      warehouse: 'Central Grocery Hub - North',
      assignedEmployee: 'Alex Rivera (Picker)',
      currentStage: Stage.PICKING,
      processingTime: 18,
      riskScore: 92, // HIGH RISK
      slaStatus: SLAStatus.AT_RISK,
      stages: [
        { stage: Stage.ORDER_RECEIVED, duration: 4 },
        { stage: Stage.PICKING, duration: 14 },
      ],
    },
    {
      customerId: 'CUST-2002',
      warehouse: 'Metro Fulfillment Hub - South',
      assignedEmployee: 'James Thornton',
      currentStage: Stage.PICKING,
      processingTime: 7,
      riskScore: 28,
      slaStatus: SLAStatus.ON_TIME,
      stages: [
        { stage: Stage.ORDER_RECEIVED, duration: 3 },
        { stage: Stage.PICKING, duration: 4 },
      ],
    },
    {
      customerId: 'CUST-2003 (Bulk 18 SKUs)',
      warehouse: 'Pacific Coast Distribution Bay',
      assignedEmployee: 'Sophia Zhang',
      currentStage: Stage.PICKING,
      processingTime: 15,
      riskScore: 84, // HIGH RISK
      slaStatus: SLAStatus.AT_RISK,
      stages: [
        { stage: Stage.ORDER_RECEIVED, duration: 3 },
        { stage: Stage.PICKING, duration: 12 },
      ],
    },
    {
      customerId: 'CUST-2004',
      warehouse: 'Central Grocery Hub - North',
      assignedEmployee: 'Liam Gallagher',
      currentStage: Stage.PICKING,
      processingTime: 5,
      riskScore: 20,
      slaStatus: SLAStatus.ON_TIME,
      stages: [
        { stage: Stage.ORDER_RECEIVED, duration: 2 },
        { stage: Stage.PICKING, duration: 3 },
      ],
    },
    {
      customerId: 'CUST-2005',
      warehouse: 'Metro Fulfillment Hub - South',
      assignedEmployee: 'Carlos Gomez',
      currentStage: Stage.PICKING,
      processingTime: 8,
      riskScore: 32,
      slaStatus: SLAStatus.ON_TIME,
      stages: [
        { stage: Stage.ORDER_RECEIVED, duration: 4 },
        { stage: Stage.PICKING, duration: 4 },
      ],
    },

    // STAGE 3: PACKING (With Packing Bottleneck Scenarios)
    {
      customerId: 'CUST-3001 (Glassware Fragile)',
      warehouse: 'Central Grocery Hub - North',
      assignedEmployee: 'Rachel Green',
      currentStage: Stage.PACKING,
      processingTime: 23,
      riskScore: 96, // CRITICAL RISK
      slaStatus: SLAStatus.BREACHED,
      stages: [
        { stage: Stage.ORDER_RECEIVED, duration: 3 },
        { stage: Stage.PICKING, duration: 8 },
        { stage: Stage.PACKING, duration: 12 },
      ],
    },
    {
      customerId: 'CUST-3002',
      warehouse: 'Metro Fulfillment Hub - South',
      assignedEmployee: 'Lucas Vance',
      currentStage: Stage.PACKING,
      processingTime: 11,
      riskScore: 40,
      slaStatus: SLAStatus.AT_RISK,
      stages: [
        { stage: Stage.ORDER_RECEIVED, duration: 3 },
        { stage: Stage.PICKING, duration: 4 },
        { stage: Stage.PACKING, duration: 4 },
      ],
    },
    {
      customerId: 'CUST-3003',
      warehouse: 'Pacific Coast Distribution Bay',
      assignedEmployee: 'Emma Watson',
      currentStage: Stage.PACKING,
      processingTime: 9,
      riskScore: 25,
      slaStatus: SLAStatus.ON_TIME,
      stages: [
        { stage: Stage.ORDER_RECEIVED, duration: 2 },
        { stage: Stage.PICKING, duration: 4 },
        { stage: Stage.PACKING, duration: 3 },
      ],
    },
    {
      customerId: 'CUST-3004',
      warehouse: 'Central Grocery Hub - North',
      assignedEmployee: 'Noah Scott',
      currentStage: Stage.PACKING,
      processingTime: 14,
      riskScore: 68, // ELEVATED
      slaStatus: SLAStatus.AT_RISK,
      stages: [
        { stage: Stage.ORDER_RECEIVED, duration: 4 },
        { stage: Stage.PICKING, duration: 5 },
        { stage: Stage.PACKING, duration: 5 },
      ],
    },

    // STAGE 4: QUALITY_CHECK (QA Inspection Queue)
    {
      customerId: 'CUST-4001',
      warehouse: 'Central Grocery Hub - North',
      assignedEmployee: 'Dr. Emily Watson (QA)',
      currentStage: Stage.QUALITY_CHECK,
      processingTime: 16,
      riskScore: 55,
      slaStatus: SLAStatus.AT_RISK,
      stages: [
        { stage: Stage.ORDER_RECEIVED, duration: 3 },
        { stage: Stage.PICKING, duration: 5 },
        { stage: Stage.PACKING, duration: 4 },
        { stage: Stage.QUALITY_CHECK, duration: 4 },
      ],
    },
    {
      customerId: 'CUST-4002',
      warehouse: 'Metro Fulfillment Hub - South',
      assignedEmployee: 'Amina Diallo (QA)',
      currentStage: Stage.QUALITY_CHECK,
      processingTime: 12,
      riskScore: 30,
      slaStatus: SLAStatus.ON_TIME,
      stages: [
        { stage: Stage.ORDER_RECEIVED, duration: 2 },
        { stage: Stage.PICKING, duration: 4 },
        { stage: Stage.PACKING, duration: 3 },
        { stage: Stage.QUALITY_CHECK, duration: 3 },
      ],
    },
    {
      customerId: 'CUST-4003 (Special Handling Audit)',
      warehouse: 'Pacific Coast Distribution Bay',
      assignedEmployee: 'Liam Takahashi (QA)',
      currentStage: Stage.QUALITY_CHECK,
      processingTime: 25,
      riskScore: 88, // HIGH RISK
      slaStatus: SLAStatus.BREACHED,
      stages: [
        { stage: Stage.ORDER_RECEIVED, duration: 4 },
        { stage: Stage.PICKING, duration: 9 },
        { stage: Stage.PACKING, duration: 6 },
        { stage: Stage.QUALITY_CHECK, duration: 6 },
      ],
    },

    // STAGE 5: DISPATCH (Loading Bay Outflow)
    {
      customerId: 'CUST-5001',
      warehouse: 'Central Grocery Hub - North',
      assignedEmployee: 'Tom Bradley (Dispatch)',
      currentStage: Stage.DISPATCH,
      processingTime: 15,
      riskScore: 25,
      slaStatus: SLAStatus.ON_TIME,
      stages: [
        { stage: Stage.ORDER_RECEIVED, duration: 2 },
        { stage: Stage.PICKING, duration: 4 },
        { stage: Stage.PACKING, duration: 4 },
        { stage: Stage.QUALITY_CHECK, duration: 3 },
        { stage: Stage.DISPATCH, duration: 2 },
      ],
    },
    {
      customerId: 'CUST-5002',
      warehouse: 'Metro Fulfillment Hub - South',
      assignedEmployee: 'Sarah Jenkins',
      currentStage: Stage.DISPATCH,
      processingTime: 17,
      riskScore: 35,
      slaStatus: SLAStatus.ON_TIME,
      stages: [
        { stage: Stage.ORDER_RECEIVED, duration: 3 },
        { stage: Stage.PICKING, duration: 5 },
        { stage: Stage.PACKING, duration: 4 },
        { stage: Stage.QUALITY_CHECK, duration: 3 },
        { stage: Stage.DISPATCH, duration: 2 },
      ],
    },
    {
      customerId: 'CUST-5003',
      warehouse: 'Pacific Coast Distribution Bay',
      assignedEmployee: 'Kevin Miller',
      currentStage: Stage.DISPATCH,
      processingTime: 14,
      riskScore: 20,
      slaStatus: SLAStatus.ON_TIME,
      stages: [
        { stage: Stage.ORDER_RECEIVED, duration: 2 },
        { stage: Stage.PICKING, duration: 4 },
        { stage: Stage.PACKING, duration: 3 },
        { stage: Stage.QUALITY_CHECK, duration: 3 },
        { stage: Stage.DISPATCH, duration: 2 },
      ],
    },

    // STAGE 6: DELIVERY (Completed Orders with Full 6-Stage Audit Trail)
    {
      customerId: 'CUST-6001',
      warehouse: 'Central Grocery Hub - North',
      assignedEmployee: 'Marcus Vance',
      currentStage: Stage.DELIVERY,
      processingTime: 22,
      riskScore: 10,
      slaStatus: SLAStatus.ON_TIME,
      stages: [
        { stage: Stage.ORDER_RECEIVED, duration: 3 },
        { stage: Stage.PICKING, duration: 5 },
        { stage: Stage.PACKING, duration: 4 },
        { stage: Stage.QUALITY_CHECK, duration: 3 },
        { stage: Stage.DISPATCH, duration: 2 },
        { stage: Stage.DELIVERY, duration: 5 },
      ],
    },
    {
      customerId: 'CUST-6002 (Express Customer)',
      warehouse: 'Central Grocery Hub - North',
      assignedEmployee: 'Elena Rostova',
      currentStage: Stage.DELIVERY,
      processingTime: 28,
      riskScore: 15,
      slaStatus: SLAStatus.BREACHED,
      stages: [
        { stage: Stage.ORDER_RECEIVED, duration: 4 },
        { stage: Stage.PICKING, duration: 9 },
        { stage: Stage.PACKING, duration: 6 },
        { stage: Stage.QUALITY_CHECK, duration: 3 },
        { stage: Stage.DISPATCH, duration: 2 },
        { stage: Stage.DELIVERY, duration: 4 },
      ],
    },
    {
      customerId: 'CUST-6003',
      warehouse: 'Metro Fulfillment Hub - South',
      assignedEmployee: 'David Chen',
      currentStage: Stage.DELIVERY,
      processingTime: 19,
      riskScore: 12,
      slaStatus: SLAStatus.ON_TIME,
      stages: [
        { stage: Stage.ORDER_RECEIVED, duration: 2 },
        { stage: Stage.PICKING, duration: 4 },
        { stage: Stage.PACKING, duration: 4 },
        { stage: Stage.QUALITY_CHECK, duration: 3 },
        { stage: Stage.DISPATCH, duration: 2 },
        { stage: Stage.DELIVERY, duration: 4 },
      ],
    },
    {
      customerId: 'CUST-6004',
      warehouse: 'Pacific Coast Distribution Bay',
      assignedEmployee: 'Sophia Zhang',
      currentStage: Stage.DELIVERY,
      processingTime: 21,
      riskScore: 14,
      slaStatus: SLAStatus.ON_TIME,
      stages: [
        { stage: Stage.ORDER_RECEIVED, duration: 3 },
        { stage: Stage.PICKING, duration: 5 },
        { stage: Stage.PACKING, duration: 4 },
        { stage: Stage.QUALITY_CHECK, duration: 3 },
        { stage: Stage.DISPATCH, duration: 2 },
        { stage: Stage.DELIVERY, duration: 4 },
      ],
    },
    {
      customerId: 'CUST-6005',
      warehouse: 'Central Grocery Hub - North',
      assignedEmployee: 'Alex Rivera',
      currentStage: Stage.DELIVERY,
      processingTime: 26,
      riskScore: 18,
      slaStatus: SLAStatus.BREACHED,
      stages: [
        { stage: Stage.ORDER_RECEIVED, duration: 3 },
        { stage: Stage.PICKING, duration: 8 },
        { stage: Stage.PACKING, duration: 6 },
        { stage: Stage.QUALITY_CHECK, duration: 4 },
        { stage: Stage.DISPATCH, duration: 2 },
        { stage: Stage.DELIVERY, duration: 3 },
      ],
    },
  ];

  const createdOrders = [];
  const baseTime = new Date(Date.now() - 4 * 3600 * 1000); // 4 hours ago

  for (let i = 0; i < sampleOrders.length; i++) {
    const o = sampleOrders[i];
    const orderCreatedAt = new Date(baseTime.getTime() + i * 8 * 60 * 1000);

    const createdOrder = await prisma.order.create({
      data: {
        customerId: o.customerId,
        warehouse: o.warehouse,
        assignedEmployee: o.assignedEmployee,
        currentStage: o.currentStage,
        stageTimestamp: new Date(),
        processingTime: o.processingTime,
        riskScore: o.riskScore,
        slaStatus: o.slaStatus,
        createdAt: orderCreatedAt,
      },
    });

    createdOrders.push(createdOrder);

    // Create realistic sequential stage logs
    let accumulatedTime = orderCreatedAt.getTime();
    for (const stg of o.stages) {
      accumulatedTime += stg.duration * 60 * 1000;
      await prisma.stageLogs.create({
        data: {
          orderId: createdOrder.id,
          stage: stg.stage,
          changedAt: new Date(accumulatedTime),
          processingTime: stg.duration,
        },
      });
    }
  }
  console.log(`✓ Seeded ${createdOrders.length} Multi-Stage Orders with StageLogs.`);

  // 5. Seed 12+ Realistic Customer Complaints linking to Orders for RCA Demo
  const complaintsData = [
    {
      orderIdx: 19, // CUST-6001
      type: ComplaintType.DAMAGED_ITEM,
      severity: ComplaintSeverity.CRITICAL,
      status: ComplaintStatus.OPEN,
      notes: 'Olive oil bottle shattered inside packing box. Cardboard was soaked with oil.',
      rootCause: 'Inadequate bubble cushioning during Packing Station Alpha handling',
      deliveryExecutive: 'FastCourier Express - Driver #42',
      warehouse: 'Central Grocery Hub - North',
    },
    {
      orderIdx: 20, // CUST-6002
      type: ComplaintType.WRONG_ITEM,
      severity: ComplaintSeverity.HIGH,
      status: ComplaintStatus.INVESTIGATING,
      notes: 'Customer ordered Organic Almond Milk 1L, received Skimmed Dairy Milk 1L.',
      rootCause: 'Barcode bin mismatch in Ambient Dry Picking Zone (PCK-02)',
      deliveryExecutive: 'Metro Logistics Bay - Driver #18',
      warehouse: 'Central Grocery Hub - North',
    },
    {
      orderIdx: 21, // CUST-6003
      type: ComplaintType.MISSING_ITEM,
      severity: ComplaintSeverity.MEDIUM,
      status: ComplaintStatus.OPEN,
      notes: 'Order missing 2 cans of Italian peeled tomatoes from 6-item grocery batch.',
      rootCause: 'SKU count omitted during multi-batch picking consolidation',
      deliveryExecutive: 'South Bay Direct - Driver #8',
      warehouse: 'Metro Fulfillment Hub - South',
    },
    {
      orderIdx: 22, // CUST-6004
      type: ComplaintType.LATE_DELIVERY,
      severity: ComplaintSeverity.HIGH,
      status: ComplaintStatus.RESOLVED,
      notes: 'Customer SLA promise of 2-hour delivery was breached by 45 minutes.',
      rootCause: 'Dispatch queue congestion at Loading Bay 1-4 during peak shift change',
      deliveryExecutive: 'RapidPrime Delivery - Driver #91',
      warehouse: 'Pacific Coast Distribution Bay',
    },
    {
      orderIdx: 23, // CUST-6005
      type: ComplaintType.DAMAGED_ITEM,
      severity: ComplaintSeverity.HIGH,
      status: ComplaintStatus.OPEN,
      notes: 'Crushed cereal packaging and torn outer plastic wrap.',
      rootCause: 'Heavy cargo stacked on top of fragile goods during packing assembly',
      deliveryExecutive: 'North Express Carrier',
      warehouse: 'Central Grocery Hub - North',
    },
    {
      orderIdx: 9, // CUST-3001
      type: ComplaintType.DAMAGED_ITEM,
      severity: ComplaintSeverity.CRITICAL,
      status: ComplaintStatus.INVESTIGATING,
      notes: 'Fragile glassware packaging opened with cracked container base.',
      rootCause: 'Lack of corner edge protectors on fragile consignment at Packing Station Beta',
      deliveryExecutive: 'Austin Courier Fleet - Driver #12',
      warehouse: 'Central Grocery Hub - North',
    },
    {
      orderIdx: 6, // CUST-2003
      type: ComplaintType.WRONG_ITEM,
      severity: ComplaintSeverity.MEDIUM,
      status: ComplaintStatus.OPEN,
      notes: 'Received Gluten-Free pasta instead of Traditional Durum Wheat pasta.',
      rootCause: 'Bin labeling ambiguity in High-Density Picking Zone',
      deliveryExecutive: 'Pacific Line Haul',
      warehouse: 'Pacific Coast Distribution Bay',
    },
    {
      orderIdx: 15, // CUST-4003
      type: ComplaintType.LATE_DELIVERY,
      severity: ComplaintSeverity.CRITICAL,
      status: ComplaintStatus.INVESTIGATING,
      notes: 'Order arrived past the 4-hour guaranteed same-day delivery window.',
      rootCause: 'Excessive audit inspection hold time in QA Express Zone',
      deliveryExecutive: 'Prime Route #104',
      warehouse: 'Pacific Coast Distribution Bay',
    },
  ];

  for (const c of complaintsData) {
    const targetOrder = createdOrders[c.orderIdx] || createdOrders[0];
    await prisma.complaint.create({
      data: {
        orderId: targetOrder.id,
        warehouse: c.warehouse,
        complaintType: c.type,
        severity: c.severity,
        status: c.status,
        notes: c.notes,
        rootCause: c.rootCause,
        deliveryExecutive: c.deliveryExecutive,
      },
    });
  }

  console.log(`✓ Seeded ${complaintsData.length} Realistic Post-Delivery Complaints for RCA demo.`);
  console.log('🎉 FlowLens Presentation Database successfully populated with 20+ rich scenario records!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
