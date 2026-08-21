import { Role, WarehouseStatus, ZoneType } from '@prisma/client';
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
