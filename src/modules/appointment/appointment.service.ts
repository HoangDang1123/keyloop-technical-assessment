import { AppointmentRepository } from './appointment.repository';
import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';
import {
  BadRequestError,
  NotFoundError,
  ConflictError,
} from '../../lib/errors';
import { CreateAppointmentInput } from './appointment.schema';

export class AppointmentService {
  constructor(private readonly repository = new AppointmentRepository()) {}

  /**
   * Create a new appointment with full concurrency protection.
   *
   * Steps:
   * 1. Begin a database transaction
   * 2. Acquire a dealership-scoped advisory lock
   * 3. Validate all entities and business rules
   * 4. Find available qualified technician and service bay
   * 5. Create the appointment
   * 6. Commit on success / rollback on failure
   */
  async createAppointment(input: CreateAppointmentInput, requestId?: string) {
    const { customerId, vehicleId, dealershipId, serviceTypeId, startTime: startTimeISO } = input;
    const startTime = new Date(startTimeISO);

    // Reject past start times
    if (startTime <= new Date()) {
      throw new BadRequestError('Appointment start time must be in the future', 'PAST_START_TIME');
    }

    // Run the entire booking process inside a serialized transaction
    const result = await prisma.$transaction(
      async (tx) => {
        // Step 1: Acquire advisory lock scoped to the dealership
        // This prevents concurrent bookings at the same dealership from racing
        await this.repository.acquireAdvisoryLock(tx, dealershipId);

        logger.info({ requestId, dealershipId }, 'Advisory lock acquired');

        // Step 2: Validate entities exist
        const [customer, vehicle, dealership, serviceType] = await Promise.all([
          tx.customer.findUnique({ where: { id: customerId } }),
          tx.vehicle.findUnique({ where: { id: vehicleId } }),
          tx.dealership.findUnique({ where: { id: dealershipId } }),
          tx.serviceType.findUnique({ where: { id: serviceTypeId } }),
        ]);

        if (!customer) throw new NotFoundError(`Customer with id ${customerId} not found`);
        if (!vehicle) throw new NotFoundError(`Vehicle with id ${vehicleId} not found`);
        if (!dealership) throw new NotFoundError(`Dealership with id ${dealershipId} not found`);
        if (!serviceType) throw new NotFoundError(`Service type with id ${serviceTypeId} not found`);

        // Step 3: Validate vehicle belongs to customer
        if (vehicle.customerId !== customerId) {
          throw new BadRequestError(
            `Vehicle ${vehicleId} does not belong to customer ${customerId}`,
            'VEHICLE_CUSTOMER_MISMATCH',
          );
        }

        // Step 4: Calculate end time
        const endTime = new Date(startTime.getTime() + serviceType.durationMinutes * 60 * 1000);

        // Step 5: Find available resources (inside the lock)
        const [availableTechnicians, availableServiceBays] = await Promise.all([
          this.repository.findAvailableQualifiedTechnicians(
            tx, dealershipId, serviceTypeId, startTime, endTime,
          ),
          this.repository.findAvailableServiceBays(
            tx, dealershipId, startTime, endTime,
          ),
        ]);

        if (availableTechnicians.length === 0) {
          throw new ConflictError(
            'No qualified technician available for the requested time slot',
            'NO_TECHNICIAN_AVAILABLE',
          );
        }

        if (availableServiceBays.length === 0) {
          throw new ConflictError(
            'No service bay available for the requested time slot',
            'NO_SERVICE_BAY_AVAILABLE',
          );
        }

        // Step 6: Select first available resources (deterministic — ascending ID)
        const selectedTechnician = availableTechnicians[0];
        const selectedServiceBay = availableServiceBays[0];

        logger.info(
          {
            requestId,
            technicianId: selectedTechnician.id,
            serviceBayId: selectedServiceBay.id,
          },
          'Resources selected for appointment',
        );

        // Step 7: Create the appointment
        const appointment = await this.repository.create(tx, {
          customerId,
          vehicleId,
          dealershipId,
          serviceTypeId,
          technicianId: selectedTechnician.id,
          serviceBayId: selectedServiceBay.id,
          startTime,
          endTime,
          status: 'CONFIRMED',
        });

        logger.info(
          { requestId, appointmentId: appointment.id },
          'Appointment created successfully',
        );

        return appointment;
      },
      {
        maxWait: 10000,  // Max time to wait for a connection from the pool
        timeout: 15000,  // Max time for the entire transaction
      },
    );

    return result;
  }

  /**
   * Get an appointment by ID.
   */
  async getAppointmentById(id: number) {
    const appointment = await this.repository.findById(id);
    if (!appointment) {
      throw new NotFoundError(`Appointment with id ${id} not found`);
    }
    return appointment;
  }
}
