import { describe, it, expect, vi } from 'vitest';
import { CreateService } from './create-service.js';
import { GetService } from './get-service.js';
import { ListServices } from './list-services.js';
import { UpdateService } from './update-service.js';
import { DeleteService } from './delete-service.js';
import { IServiceRepository } from '../repositories/service-repository.interface.js';
import { Service } from '../domain/entities.js';

describe('Service CRUD Use Cases', () => {
  const mockRepo = {
    findAll: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  } as unknown as IServiceRepository;

  const createService = new CreateService(mockRepo);
  const getService = new GetService(mockRepo);
  const listServices = new ListServices(mockRepo);
  const updateService = new UpdateService(mockRepo);
  const deleteService = new DeleteService(mockRepo);

  it('should create a service', async () => {
    const serviceData = { name: 'New Service', price: 50, duration_minutes: 30, shop_id: 1, is_active: 1 };
    vi.mocked(mockRepo.create).mockResolvedValue(1);

    const id = await createService.execute(serviceData);
    expect(id).toBe(1);
    expect(mockRepo.create).toHaveBeenCalledWith(serviceData);
  });

  it('should list all services', async () => {
    const mockServices: Service[] = [{ id: 1, name: 'Service 1', price: 50, duration_minutes: 30, shop_id: 1, is_active: 1 }];
    vi.mocked(mockRepo.findAll).mockResolvedValue(mockServices);

    const services = await listServices.execute();
    expect(services).toEqual(mockServices);
    expect(mockRepo.findAll).toHaveBeenCalled();
  });

  it('should get a service by id', async () => {
    const mockService: Service = { id: 1, name: 'Service 1', price: 50, duration_minutes: 30, shop_id: 1, is_active: 1 };
    vi.mocked(mockRepo.findById).mockResolvedValue(mockService);

    const service = await getService.execute(1);
    expect(service).toEqual(mockService);
  });

  it('should throw if service not found when getting', async () => {
    vi.mocked(mockRepo.findById).mockResolvedValue(null);
    await expect(getService.execute(999)).rejects.toThrow('Service not found');
  });

  it('should update a service', async () => {
    const service: Service = { id: 1, name: 'Updated', price: 60, duration_minutes: 40, shop_id: 1, is_active: 1 };
    vi.mocked(mockRepo.findById).mockResolvedValue(service);
    vi.mocked(mockRepo.update).mockResolvedValue();

    await updateService.execute(service);
    expect(mockRepo.update).toHaveBeenCalledWith(service);
  });

  it('should delete a service', async () => {
    vi.mocked(mockRepo.findById).mockResolvedValue({ 
      id: 1, 
      name: 'Service 1', 
      price: 50, 
      duration_minutes: 30, 
      shop_id: 1, 
      is_active: 1 
    });
    vi.mocked(mockRepo.delete).mockResolvedValue();

    await deleteService.execute(1);
    expect(mockRepo.delete).toHaveBeenCalledWith(1);
  });

  it('should throw error when deleting non-existent service', async () => {
    vi.mocked(mockRepo.findById).mockResolvedValue(null);
    await expect(deleteService.execute(999)).rejects.toThrow('Service not found');
  });

  it('should throw if name missing when creating', async () => {
    await expect(createService.execute({ name: '', price: 10, duration_minutes: 10 })).rejects.toThrow('Service name is required');
  });

  it('should throw if price negative when creating', async () => {
    await expect(createService.execute({ name: 'T', price: -1, duration_minutes: 10 })).rejects.toThrow('price cannot be negative');
  });

  it('should throw if duration negative when creating', async () => {
    await expect(createService.execute({ name: 'T', price: 10, duration_minutes: -1 })).rejects.toThrow('duration cannot be negative');
  });

  it('should throw if ID missing when updating', async () => {
    await expect(updateService.execute({ name: 'T', price: 10, duration_minutes: 10, shop_id: 1, is_active: 1 } as any)).rejects.toThrow('Service ID is required');
  });

  it('should throw if name missing when updating', async () => {
    await expect(updateService.execute({ id: 1, name: '', price: 10, duration_minutes: 10, shop_id: 1, is_active: 1 })).rejects.toThrow('Service name is required');
  });

  it('should throw if service not found when updating', async () => {
    vi.mocked(mockRepo.findById).mockResolvedValue(null);
    await expect(updateService.execute({ id: 999, name: 'T', price: 10, duration_minutes: 10, shop_id: 1, is_active: 1 })).rejects.toThrow('Service not found');
  });

  it('should throw if price negative when updating', async () => {
    await expect(updateService.execute({ id: 1, name: 'T', price: -1, duration_minutes: 10, shop_id: 1, is_active: 1 })).rejects.toThrow('price cannot be negative');
  });

  it('should throw if duration negative when updating', async () => {
    await expect(updateService.execute({ id: 1, name: 'T', price: 10, duration_minutes: -1, shop_id: 1, is_active: 1 })).rejects.toThrow('duration cannot be negative');
  });
});
