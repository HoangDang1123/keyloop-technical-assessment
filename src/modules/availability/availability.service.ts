import { AvailabilityRepository } from './availability.repository';
import { ServiceTypeService } from '../service-type/serviceType.service';
import { NotFoundError } from '../../lib/errors';
import { prisma } from '../../lib/prisma';

export class AvailabilityService {
  constructor(
    private readonly repository = new AvailabilityRepository(),
    private readonly serviceTypeService = new ServiceTypeService(),
  ) {}

  async checkAvailability(dealershipId: number, serviceTypeId: number, startTimeISO: string) {
    // Validate dealership exists
    const dealership = await prisma.dealership.findUnique({ where: { id: dealershipId } });
    if (!dealership) {
      throw new NotFoundError(`Dealership with id ${dealershipId} not found`);
    }

    // Validate service type and get duration
    const serviceType = await this.serviceTypeService.getById(serviceTypeId);

    const startTime = new Date(startTimeISO);
    const endTime = new Date(startTime.getTime() + serviceType.durationMinutes * 60 * 1000);

    const [technicians, serviceBays] = await Promise.all([
      this.repository.findAvailableTechnicians(dealershipId, serviceTypeId, startTime, endTime),
      this.repository.findAvailableServiceBays(dealershipId, startTime, endTime),
    ]);

    return {
      available: technicians.length > 0 && serviceBays.length > 0,
      dealershipId,
      serviceTypeId,
      serviceTypeName: serviceType.name,
      durationMinutes: serviceType.durationMinutes,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      availableTechnicians: technicians.length,
      availableServiceBays: serviceBays.length,
    };
  }
}
