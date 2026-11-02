import { PrismaClient } from '@prisma/client';
import { prisma } from '../../lib/prisma';

export class AvailabilityRepository {
  /**
   * Find qualified technicians at a dealership who have no overlapping appointments.
   */
  async findAvailableTechnicians(
    dealershipId: number,
    serviceTypeId: number,
    startTime: Date,
    endTime: Date,
    client: PrismaClient | Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'> = prisma,
  ) {
    return client.technician.findMany({
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
   */
  async findAvailableServiceBays(
    dealershipId: number,
    startTime: Date,
    endTime: Date,
    client: PrismaClient | Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'> = prisma,
  ) {
    return client.serviceBay.findMany({
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
}
