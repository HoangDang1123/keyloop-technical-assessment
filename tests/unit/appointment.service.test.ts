import { describe, it, expect } from 'vitest';
import { AppointmentService } from '../../src/modules/appointment/appointment.service';
import { BadRequestError } from '../../src/lib/errors';

describe('AppointmentService (Unit)', () => {
  const service = new AppointmentService();

  it('should immediately reject appointment with start time in the past', async () => {
    const pastTimeInput = {
      customerId: 1,
      vehicleId: 1,
      dealershipId: 1,
      serviceTypeId: 1,
      startTime: '2020-01-01T00:00:00.000Z',
    };

    await expect(service.createAppointment(pastTimeInput)).rejects.toThrow(
      BadRequestError,
    );

    await expect(service.createAppointment(pastTimeInput)).rejects.toMatchObject({
      code: 'PAST_START_TIME',
      statusCode: 400,
    });
  });
});
