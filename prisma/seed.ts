import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // --- Service Types ---
  const oilChange = await prisma.serviceType.create({
    data: {
      name: 'Oil Change',
      description: 'Standard oil and filter change',
      durationMinutes: 30,
    },
  });

  const brakeInspection = await prisma.serviceType.create({
    data: {
      name: 'Brake Inspection',
      description: 'Full brake system inspection and adjustment',
      durationMinutes: 60,
    },
  });

  const fullService = await prisma.serviceType.create({
    data: {
      name: 'Full Service',
      description: 'Comprehensive vehicle service and inspection',
      durationMinutes: 120,
    },
  });

  const tireRotation = await prisma.serviceType.create({
    data: {
      name: 'Tire Rotation',
      description: 'Rotate and balance all four tires',
      durationMinutes: 45,
    },
  });

  console.log(`  ✅ Created ${4} service types`);

  // --- Customers ---
  const customer1 = await prisma.customer.create({
    data: {
      name: 'Alice Johnson',
      email: 'alice.johnson@example.com',
      phone: '+1-555-0101',
    },
  });

  const customer2 = await prisma.customer.create({
    data: {
      name: 'Bob Smith',
      email: 'bob.smith@example.com',
      phone: '+1-555-0102',
    },
  });

  console.log(`  ✅ Created ${2} customers`);

  // --- Vehicles ---
  const vehicle1 = await prisma.vehicle.create({
    data: {
      customerId: customer1.id,
      make: 'Toyota',
      model: 'Camry',
      year: 2022,
      vin: 'JTDKN3DU5A0000001',
      licensePlate: 'ABC-1234',
    },
  });

  const vehicle2 = await prisma.vehicle.create({
    data: {
      customerId: customer1.id,
      make: 'Honda',
      model: 'Civic',
      year: 2023,
      vin: '2HGFC2F59MH000002',
      licensePlate: 'DEF-5678',
    },
  });

  const vehicle3 = await prisma.vehicle.create({
    data: {
      customerId: customer2.id,
      make: 'Ford',
      model: 'F-150',
      year: 2024,
      vin: '1FTEW1EG5JFA00003',
      licensePlate: 'GHI-9012',
    },
  });

  console.log(`  ✅ Created ${3} vehicles`);

  // --- Dealerships ---
  const dealership1 = await prisma.dealership.create({
    data: {
      name: 'Downtown Auto Center',
      address: '123 Main Street, Springfield, IL',
    },
  });

  const dealership2 = await prisma.dealership.create({
    data: {
      name: 'Westside Motors',
      address: '456 Oak Avenue, Springfield, IL',
    },
  });

  console.log(`  ✅ Created ${2} dealerships`);

  // --- Technicians ---
  // Dealership 1: 3 technicians with varied qualifications
  const tech1 = await prisma.technician.create({
    data: {
      dealershipId: dealership1.id,
      name: 'Charlie Brown',
    },
  });

  const tech2 = await prisma.technician.create({
    data: {
      dealershipId: dealership1.id,
      name: 'Diana Prince',
    },
  });

  const tech3 = await prisma.technician.create({
    data: {
      dealershipId: dealership1.id,
      name: 'Edward Norton',
    },
  });

  // Dealership 2: 1 technician (for concurrency testing — limited resources)
  const tech4 = await prisma.technician.create({
    data: {
      dealershipId: dealership2.id,
      name: 'Frank Castle',
    },
  });

  console.log(`  ✅ Created ${4} technicians`);

  // --- Technician Qualifications ---
  // Tech1 (Charlie): Oil Change, Tire Rotation
  await prisma.technicianQualification.createMany({
    data: [
      { technicianId: tech1.id, serviceTypeId: oilChange.id },
      { technicianId: tech1.id, serviceTypeId: tireRotation.id },
    ],
  });

  // Tech2 (Diana): Oil Change, Brake Inspection, Full Service
  await prisma.technicianQualification.createMany({
    data: [
      { technicianId: tech2.id, serviceTypeId: oilChange.id },
      { technicianId: tech2.id, serviceTypeId: brakeInspection.id },
      { technicianId: tech2.id, serviceTypeId: fullService.id },
    ],
  });

  // Tech3 (Edward): Brake Inspection only (for qualification mismatch tests)
  await prisma.technicianQualification.createMany({
    data: [
      { technicianId: tech3.id, serviceTypeId: brakeInspection.id },
    ],
  });

  // Tech4 (Frank, Dealership 2): Oil Change, Brake Inspection
  await prisma.technicianQualification.createMany({
    data: [
      { technicianId: tech4.id, serviceTypeId: oilChange.id },
      { technicianId: tech4.id, serviceTypeId: brakeInspection.id },
    ],
  });

  console.log(`  ✅ Created technician qualifications`);

  // --- Service Bays ---
  // Dealership 1: 2 service bays
  await prisma.serviceBay.create({
    data: { dealershipId: dealership1.id, name: 'Bay A' },
  });

  await prisma.serviceBay.create({
    data: { dealershipId: dealership1.id, name: 'Bay B' },
  });

  // Dealership 2: 1 service bay (for concurrency testing — limited resources)
  await prisma.serviceBay.create({
    data: { dealershipId: dealership2.id, name: 'Bay C' },
  });

  console.log(`  ✅ Created ${3} service bays`);

  // --- Pre-existing Appointments (for conflict testing) ---
  // An existing appointment at Dealership 1 to test partial/full overlap
  const existingStart = new Date('2026-11-05T10:00:00.000Z');
  const existingEnd = new Date('2026-11-05T11:00:00.000Z'); // 60-minute brake inspection

  await prisma.appointment.create({
    data: {
      customerId: customer1.id,
      vehicleId: vehicle1.id,
      dealershipId: dealership1.id,
      serviceTypeId: brakeInspection.id,
      technicianId: tech2.id,
      serviceBayId: 1, // Bay A
      startTime: existingStart,
      endTime: existingEnd,
      status: 'CONFIRMED',
    },
  });

  console.log(`  ✅ Created 1 pre-existing appointment (2026-11-05T10:00-11:00Z at Dealership 1)`);

  console.log('');
  console.log('🎉 Seed completed successfully!');
  console.log('');
  console.log('Summary:');
  console.log('  - Service Types: Oil Change (30m), Brake Inspection (60m), Full Service (120m), Tire Rotation (45m)');
  console.log('  - Customers: Alice (vehicles 1,2), Bob (vehicle 3)');
  console.log('  - Dealership 1 (Downtown): 3 technicians, 2 bays');
  console.log('  - Dealership 2 (Westside): 1 technician, 1 bay (concurrency test scenario)');
  console.log('  - Existing appointment: Brake Inspection at Dealership 1, 10:00-11:00 UTC on 2026-11-05');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
