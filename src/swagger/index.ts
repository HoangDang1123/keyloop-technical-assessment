import swaggerUi from 'swagger-ui-express';
import { Router } from 'express';

const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Keyloop Unified Service Scheduler API',
    description: 'RESTful API for vehicle service appointment scheduling',
    version: '1.0.0',
    contact: {
      name: 'Keyloop Technical Assessment',
    },
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Local development server',
    },
  ],
  paths: {
    '/health': {
      get: {
        summary: 'Health check',
        tags: ['System'],
        responses: {
          '200': {
            description: 'Service is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'object',
                      properties: {
                        status: { type: 'string', example: 'ok' },
                        timestamp: { type: 'string', format: 'date-time' },
                      },
                    },
                  },
                },
              },
            },
          },
          '503': { description: 'Database connection failed' },
        },
      },
    },
    '/api/v1/service-types': {
      get: {
        summary: 'List all service types',
        tags: ['Service Types'],
        responses: {
          '200': {
            description: 'List of service types',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/ServiceType' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/availability': {
      get: {
        summary: 'Check appointment availability',
        tags: ['Availability'],
        parameters: [
          {
            name: 'dealershipId',
            in: 'query',
            required: true,
            schema: { type: 'integer' },
            description: 'Dealership ID',
          },
          {
            name: 'serviceTypeId',
            in: 'query',
            required: true,
            schema: { type: 'integer' },
            description: 'Service Type ID',
          },
          {
            name: 'startTime',
            in: 'query',
            required: true,
            schema: { type: 'string', format: 'date-time' },
            description: 'Desired start time (ISO 8601 with timezone offset)',
            example: '2026-11-05T09:00:00+07:00',
          },
        ],
        responses: {
          '200': {
            description: 'Availability check result',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { $ref: '#/components/schemas/AvailabilityResult' },
                  },
                },
              },
            },
          },
          '404': { description: 'Dealership or service type not found' },
        },
      },
    },
    '/api/v1/appointments': {
      post: {
        summary: 'Create a new appointment',
        tags: ['Appointments'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateAppointmentRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Appointment created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { $ref: '#/components/schemas/Appointment' },
                  },
                },
              },
            },
          },
          '400': { description: 'Validation error or business rule violation' },
          '404': { description: 'Referenced entity not found' },
          '409': { description: 'No available resources for the requested time slot' },
        },
      },
    },
    '/api/v1/appointments/{id}': {
      get: {
        summary: 'Get appointment by ID',
        tags: ['Appointments'],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
            description: 'Appointment ID',
          },
        ],
        responses: {
          '200': {
            description: 'Appointment details',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { $ref: '#/components/schemas/Appointment' },
                  },
                },
              },
            },
          },
          '404': { description: 'Appointment not found' },
        },
      },
    },
  },
  components: {
    schemas: {
      ServiceType: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          description: { type: 'string', nullable: true },
          durationMinutes: { type: 'integer' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      AvailabilityResult: {
        type: 'object',
        properties: {
          available: { type: 'boolean' },
          dealershipId: { type: 'integer' },
          serviceTypeId: { type: 'integer' },
          serviceTypeName: { type: 'string' },
          durationMinutes: { type: 'integer' },
          startTime: { type: 'string', format: 'date-time' },
          endTime: { type: 'string', format: 'date-time' },
          availableTechnicians: { type: 'integer' },
          availableServiceBays: { type: 'integer' },
        },
      },
      CreateAppointmentRequest: {
        type: 'object',
        required: ['customerId', 'vehicleId', 'dealershipId', 'serviceTypeId', 'startTime'],
        properties: {
          customerId: { type: 'integer', example: 1 },
          vehicleId: { type: 'integer', example: 1 },
          dealershipId: { type: 'integer', example: 1 },
          serviceTypeId: { type: 'integer', example: 1 },
          startTime: {
            type: 'string',
            format: 'date-time',
            example: '2026-11-05T09:00:00+07:00',
          },
        },
      },
      Appointment: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          customerId: { type: 'integer' },
          vehicleId: { type: 'integer' },
          dealershipId: { type: 'integer' },
          serviceTypeId: { type: 'integer' },
          technicianId: { type: 'integer' },
          serviceBayId: { type: 'integer' },
          startTime: { type: 'string', format: 'date-time' },
          endTime: { type: 'string', format: 'date-time' },
          status: { type: 'string', example: 'CONFIRMED' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          customer: { type: 'object' },
          vehicle: { type: 'object' },
          dealership: { type: 'object' },
          serviceType: { $ref: '#/components/schemas/ServiceType' },
          technician: { type: 'object' },
          serviceBay: { type: 'object' },
        },
      },
    },
  },
};

const router = Router();
router.use('/', swaggerUi.serve);
router.get('/', swaggerUi.setup(openApiSpec, { customSiteTitle: 'Keyloop Scheduler API Docs' }));

export { router as swaggerRouter, openApiSpec };
