import { ServiceTypeRepository } from './serviceType.repository';
import { NotFoundError } from '../../lib/errors';

export class ServiceTypeService {
  constructor(private readonly repository = new ServiceTypeRepository()) {}

  async listAll() {
    return this.repository.findAll();
  }

  async getById(id: number) {
    const serviceType = await this.repository.findById(id);
    if (!serviceType) {
      throw new NotFoundError(`Service type with id ${id} not found`);
    }
    return serviceType;
  }
}
