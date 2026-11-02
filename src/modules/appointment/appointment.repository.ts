import { prisma } from '../../lib/prisma';

// Type for Prisma transaction client
type TxClient = Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

export class AppointmentRepository {
  /**
   * Acquire a PostgreSQL transaction-level advisory lock scoped by dealership ID.
   * This lock is automatically released when the transaction ends (commit or rollback).
   * Uses parameterized query to prevent SQL injection.
   */
  async acquireAdvisoryLock(tx: TxClient, dealershipId: number): Promise<void> {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${dealershipId})`;
  }

  /**
   * Find overlapping confirmed appointments for a specific technician.
   */
  async findOverlappingTechnicianAppointments(
    tx: TxClient,
    technicianId: number,
    startTime: Date,
    endTime: Date,
  ) {
    return tx.appointment.findMany({
      where: {
        technicianId,
        status: 'CONFIRMED',
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
    });
  }

  /**
   * Find overlapping confirmed appointments for a specific service bay.
   */
  async findOverlappingServiceBayAppointments(
    tx: TxClient,
    serviceBayId: number,
    startTime: Date,
    endTime: Date,
  ) {
    return tx.appointment.findMany({
      where: {
        serviceBayId,
        status: 'CONFIRMED',
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
    });
  }

  /**
   * Find qualified technicians at a dealership with no overlapping appointments.
   * Uses deterministic ordering (ascending ID) for consistent resource selection.
   */
  async findAvailableQualifiedTechnicians(
    tx: TxClient,
    dealershipId: number,
    serviceTypeId: number,
    startTime: Date,
    endTime: Date,
  ) {
    return tx.technician.findMany({
      where: {
        dealershipId,
        qualifications: {
          some: { serviceTypeId },
        },
        appointments: {
          none: {
            status: 'CONFIRMED',
            startTime: { lt: endTime },
            endTime: { gt: startTime },
          },
        },
      },
      orderBy: { id: 'asc' },
    });
  }

  /**
   * Find service bays at a dealership with no overlapping appointments.
   * Uses deterministic ordering (ascending ID) for consistent resource selection.
   */
  async findAvailableServiceBays(
    tx: TxClient,
    dealershipId: number,
    startTime: Date,
    endTime: Date,
  ) {
    return tx.serviceBay.findMany({
      where: {
        dealershipId,
        appointments: {
          none: {
            status: 'CONFIRMED',
            startTime: { lt: endTime },
            endTime: { gt: startTime },
          },
        },
      },
      orderBy: { id: 'asc' },
    });
  }

  /**
   * Create a new appointment inside a transaction.
   */
  async create(
    tx: TxClient,
    data: {
      customerId: number;
      vehicleId: number;
      dealershipId: number;
      serviceTypeId: number;
      technicianId: number;
      serviceBayId: number;
      startTime: Date;
      endTime: Date;
      status: string;
    },
  ) {
    return tx.appointment.create({
      data,
      include: {
        customer: true,
        vehicle: true,
        dealership: true,
        serviceType: true,
        technician: true,
        serviceBay: true,
      },
    });
  }

  /**
   * Find an appointment by ID with all related entities.
   */
  async findById(id: number) {
    return prisma.appointment.findUnique({
      where: { id },
      include: {
        customer: true,
        vehicle: true,
        dealership: true,
        serviceType: true,
        technician: true,
        serviceBay: true,
      },
    });
  }
}
