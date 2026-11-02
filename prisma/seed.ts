import { PrismaClient } from '@prisma/client';

const defaultPrisma = new PrismaClient();

/**
 * Non-destructive, idempotent domain reference seeding.
 * Preserves all existing records across all eight tables.
 */
export async function seedDatabase(prisma: PrismaClient = defaultPrisma) {
  console.log('🌱 Seeding database (non-destructive)...');

  // --- 1. Service Types ---
  async function getOrCreateServiceType(name: string, description: string, durationMinutes: number) {
    const existing = await prisma.serviceType.findFirst({ where: { name } });
    if (existing) return existing;
    return prisma.serviceType.create({
      data: { name, description, durationMinutes },
    });
  }

  const oilChange = await getOrCreateServiceType('Oil Change', 'Standard oil and filter change', 30);
  const brakeInspection = await getOrCreateServiceType('Brake Inspection', 'Full brake system inspection and adjustment', 60);
  const fullService = await getOrCreateServiceType('Full Service', 'Comprehensive vehicle service and inspection', 120);
  const tireRotation = await getOrCreateServiceType('Tire Rotation', 'Rotate and balance all four tires', 45);

  // --- 2. Customers ---
  const customer1 = await prisma.customer.upsert({
    where: { email: 'alice.johnson@example.com' },
    update: { name: 'Alice Johnson', phone: '+1-555-0101' },
    create: {
      name: 'Alice Johnson',
      email: 'alice.johnson@example.com',
      phone: '+1-555-0101',
    },
  });

  const customer2 = await prisma.customer.upsert({
    where: { email: 'bob.smith@example.com' },
    update: { name: 'Bob Smith', phone: '+1-555-0102' },
    create: {
      name: 'Bob Smith',
      email: 'bob.smith@example.com',
      phone: '+1-555-0102',
    },
  });

  // --- 3. Vehicles ---
  const vehicle1 = await prisma.vehicle.upsert({
    where: { vin: 'JTDKN3DU5A0000001' },
    update: { customerId: customer1.id, make: 'Toyota', model: 'Camry', year: 2022, licensePlate: 'ABC-1234' },
    create: {
      customerId: customer1.id,
      make: 'Toyota',
      model: 'Camry',
      year: 2022,
      vin: 'JTDKN3DU5A0000001',
      licensePlate: 'ABC-1234',
    },
  });

  const vehicle2 = await prisma.vehicle.upsert({
    where: { vin: '2HGFC2F59MH000002' },
    update: { customerId: customer1.id, make: 'Honda', model: 'Civic', year: 2023, licensePlate: 'DEF-5678' },
    create: {
      customerId: customer1.id,
      make: 'Honda',
      model: 'Civic',
      year: 2023,
      vin: '2HGFC2F59MH000002',
      licensePlate: 'DEF-5678',
    },
  });

  const vehicle3 = await prisma.vehicle.upsert({
    where: { vin: '1FTEW1EG5JFA00003' },
    update: { customerId: customer2.id, make: 'Ford', model: 'F-150', year: 2024, licensePlate: 'GHI-9012' },
    create: {
      customerId: customer2.id,
      make: 'Ford',
      model: 'F-150',
      year: 2024,
      vin: '1FTEW1EG5JFA00003',
      licensePlate: 'GHI-9012',
    },
  });

  // --- 4. Dealerships ---
  async function getOrCreateDealership(name: string, address: string) {
    const existing = await prisma.dealership.findFirst({ where: { name } });
    if (existing) return existing;
    return prisma.dealership.create({
      data: { name, address },
    });
  }

  const dealership1 = await getOrCreateDealership('Downtown Auto Center', '123 Main Street, Springfield, IL');
  const dealership2 = await getOrCreateDealership('Westside Motors', '456 Oak Avenue, Springfield, IL');

  // --- 5. Technicians ---
  async function getOrCreateTechnician(dealershipId: number, name: string) {
    const existing = await prisma.technician.findFirst({ where: { dealershipId, name } });
    if (existing) return existing;
    return prisma.technician.create({
      data: { dealershipId, name },
    });
  }

  const tech1 = await getOrCreateTechnician(dealership1.id, 'Charlie Brown');
  const tech2 = await getOrCreateTechnician(dealership1.id, 'Diana Prince');
  const tech3 = await getOrCreateTechnician(dealership1.id, 'Edward Norton');
  const tech4 = await getOrCreateTechnician(dealership2.id, 'Frank Castle');

  // --- 6. Technician Qualifications ---
  async function ensureQualification(technicianId: number, serviceTypeId: number) {
    await prisma.technicianQualification.upsert({
      where: {
        technicianId_serviceTypeId: { technicianId, serviceTypeId },
      },
      update: {},
      create: { technicianId, serviceTypeId },
    });
  }

  // Tech1 (Charlie): Oil Change, Tire Rotation
  await ensureQualification(tech1.id, oilChange.id);
  await ensureQualification(tech1.id, tireRotation.id);

  // Tech2 (Diana): Oil Change, Brake Inspection, Full Service
  await ensureQualification(tech2.id, oilChange.id);
  await ensureQualification(tech2.id, brakeInspection.id);
  await ensureQualification(tech2.id, fullService.id);

  // Tech3 (Edward): Brake Inspection only
  await ensureQualification(tech3.id, brakeInspection.id);

  // Tech4 (Frank, Dealership 2): Oil Change, Brake Inspection
  await ensureQualification(tech4.id, oilChange.id);
  await ensureQualification(tech4.id, brakeInspection.id);

  // --- 7. Service Bays ---
  async function getOrCreateServiceBay(dealershipId: number, name: string) {
    const existing = await prisma.serviceBay.findFirst({ where: { dealershipId, name } });
    if (existing) return existing;
    return prisma.serviceBay.create({
      data: { dealershipId, name },
    });
  }

  const bayA = await getOrCreateServiceBay(dealership1.id, 'Bay A');
  await getOrCreateServiceBay(dealership1.id, 'Bay B');
  await getOrCreateServiceBay(dealership2.id, 'Bay C');

  // --- 8. Baseline Appointment Fixture ---
  const existingStart = new Date('2026-11-05T10:00:00.000Z');
  const existingEnd = new Date('2026-11-05T11:00:00.000Z');

  let existingAppointment = await prisma.appointment.findFirst({
    where: {
      dealershipId: dealership1.id,
      startTime: existingStart,
      endTime: existingEnd,
    },
  });

  if (!existingAppointment) {
    existingAppointment = await prisma.appointment.create({
      data: {
        customerId: customer1.id,
        vehicleId: vehicle1.id,
        dealershipId: dealership1.id,
        serviceTypeId: brakeInspection.id,
        technicianId: tech2.id,
        serviceBayId: bayA.id,
        startTime: existingStart,
        endTime: existingEnd,
        status: 'CONFIRMED',
      },
    });
  }

  console.log('🎉 Seed completed successfully (idempotent, no tables truncated)!');

  return {
    serviceTypes: { oilChange, brakeInspection, fullService, tireRotation },
    customers: { customer1, customer2 },
    vehicles: { vehicle1, vehicle2, vehicle3 },
    dealerships: { dealership1, dealership2 },
    technicians: { tech1, tech2, tech3, tech4 },
    serviceBays: { bayA },
    existingAppointment,
  };
}

// Auto-run if executed directly via CLI
if (require.main === module || !process.env.VITEST) {
  seedDatabase(defaultPrisma)
    .then(async () => {
      await defaultPrisma.$disconnect();
    })
    .catch(async (e) => {
      console.error('❌ Seed failed:', e);
      await defaultPrisma.$disconnect();
      process.exit(1);
    });
}
