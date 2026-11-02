import { prisma } from '../../lib/prisma';

export class ServiceTypeRepository {
  async findAll() {
    return prisma.serviceType.findMany({
      orderBy: { id: 'asc' },
    });
  }

  async findById(id: number) {
    return prisma.serviceType.findUnique({ where: { id } });
  }
}
