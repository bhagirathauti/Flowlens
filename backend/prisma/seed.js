import { Role, WarehouseStatus, ZoneType, Stage, SLAStatus } from '@prisma/client';
import bcrypt from 'bcrypt';
import { prisma } from '../src/db.js';
async function main() {
    console.log('Seeding database...');
    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.upsert({
        where: { email: 'admin@flowlens.com' },
        update: {},
        create: {
            name: 'Operations Manager',
            email: 'admin@flowlens.com',
            password: hashedPassword,
            role: Role.ADMIN,
        },
    });
    console.log('Created user:', admin.email);
    // Clear existing orders & warehouses for clean seed if rerunning
    await prisma.stageLogs.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.warehouseZone.deleteMany({});
    await prisma.warehouse.deleteMany({});
    // Create demo warehouses
    const warehouse1 = await prisma.warehouse.create({
        data: {
            name: 'Central Grocery Hub - North',
            location: 'New York, NY',
            capacity: 50000,
            status: WarehouseStatus.ACTIVE,
            isActive: true,
            zones: {
                create: [
                    { name: 'Receiving Dock A', code: 'RCV-01', type: ZoneType.RECEIVING, capacity: 5000 },
                    { name: 'Cold Storage Picking', code: 'PCK-01', type: ZoneType.PICKING, capacity: 15000 },
                    { name: 'Packing Station Alpha', code: 'PAK-01', type: ZoneType.PACKING, capacity: 10000 },
                    { name: 'QA Express Zone', code: 'QA-01', type: ZoneType.QUALITY_CHECK, capacity: 5000 },
                    { name: 'Dispatch Bay 1-4', code: 'DSP-01', type: ZoneType.DISPATCH, capacity: 15000 },
                ],
            },
        },
    });
    const warehouse2 = await prisma.warehouse.create({
        data: {
            name: 'Metro Fulfillment Hub - South',
            location: 'Austin, TX',
            capacity: 35000,
            status: WarehouseStatus.ACTIVE,
            isActive: true,
            zones: {
                create: [
                    { name: 'Receiving Dock B', code: 'RCV-02', type: ZoneType.RECEIVING, capacity: 4000 },
                    { name: 'Ambient Goods Picking', code: 'PCK-02', type: ZoneType.PICKING, capacity: 12000 },
                    { name: 'Packing Station Beta', code: 'PAK-02', type: ZoneType.PACKING, capacity: 8000 },
                    { name: 'Dispatch Bay 5-8', code: 'DSP-02', type: ZoneType.DISPATCH, capacity: 11000 },
                ],
            },
        },
    });
    console.log('Created warehouses:', warehouse1.name, warehouse2.name);
    // Seed sample orders across different stages
    const sampleOrders = [
        {
            customerId: 'CUST-9014',
            warehouse: 'Central Grocery Hub - North',
            assignedEmployee: 'Marcus Vance',
            currentStage: Stage.ORDER_RECEIVED,
            processingTime: 4,
            slaStatus: SLAStatus.ON_TIME,
            stages: [
                { stage: Stage.ORDER_RECEIVED, duration: 4 },
            ],
        },
        {
            customerId: 'CUST-8831',
            warehouse: 'Central Grocery Hub - North',
            assignedEmployee: 'Elena Rostova',
            currentStage: Stage.PICKING,
            processingTime: 8,
            slaStatus: SLAStatus.ON_TIME,
            stages: [
                { stage: Stage.ORDER_RECEIVED, duration: 3 },
                { stage: Stage.PICKING, duration: 5 },
            ],
        },
        {
            customerId: 'CUST-7219',
            warehouse: 'Metro Fulfillment Hub - South',
            assignedEmployee: 'David Chen',
            currentStage: Stage.PACKING,
            processingTime: 16,
            slaStatus: SLAStatus.AT_RISK,
            stages: [
                { stage: Stage.ORDER_RECEIVED, duration: 4 },
                { stage: Stage.PICKING, duration: 5 },
                { stage: Stage.PACKING, duration: 7 },
            ],
        },
        {
            customerId: 'CUST-6502',
            warehouse: 'Central Grocery Hub - North',
            assignedEmployee: 'Amina Diallo',
            currentStage: Stage.QUALITY_CHECK,
            processingTime: 24,
            slaStatus: SLAStatus.BREACHED,
            stages: [
                { stage: Stage.ORDER_RECEIVED, duration: 4 },
                { stage: Stage.PICKING, duration: 8 },
                { stage: Stage.PACKING, duration: 7 },
                { stage: Stage.QUALITY_CHECK, duration: 5 },
            ],
        },
        {
            customerId: 'CUST-4190',
            warehouse: 'Metro Fulfillment Hub - South',
            assignedEmployee: 'Sarah Jenkins',
            currentStage: Stage.DISPATCH,
            processingTime: 14,
            slaStatus: SLAStatus.ON_TIME,
            stages: [
                { stage: Stage.ORDER_RECEIVED, duration: 2 },
                { stage: Stage.PICKING, duration: 4 },
                { stage: Stage.PACKING, duration: 4 },
                { stage: Stage.QUALITY_CHECK, duration: 2 },
                { stage: Stage.DISPATCH, duration: 2 },
            ],
        },
        {
            customerId: 'CUST-3310',
            warehouse: 'Central Grocery Hub - North',
            assignedEmployee: 'Carlos Gomez',
            currentStage: Stage.DELIVERY,
            processingTime: 28,
            slaStatus: SLAStatus.ON_TIME,
            stages: [
                { stage: Stage.ORDER_RECEIVED, duration: 3 },
                { stage: Stage.PICKING, duration: 5 },
                { stage: Stage.PACKING, duration: 6 },
                { stage: Stage.QUALITY_CHECK, duration: 4 },
                { stage: Stage.DISPATCH, duration: 3 },
                { stage: Stage.DELIVERY, duration: 7 },
            ],
        },
    ];
    for (const ord of sampleOrders) {
        const created = await prisma.order.create({
            data: {
                customerId: ord.customerId,
                warehouse: ord.warehouse,
                assignedEmployee: ord.assignedEmployee,
                currentStage: ord.currentStage,
                processingTime: ord.processingTime,
                slaStatus: ord.slaStatus,
                history: {
                    create: ord.stages.map((s) => ({
                        stage: s.stage,
                        processingTime: s.duration,
                    })),
                },
            },
        });
        console.log(`Created sample order ${created.id} (${created.currentStage})`);
    }
    console.log('Seeding finished successfully.');
}
main()
    .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map