import { describe, it, expect, vi } from 'vitest';
import { CreateSupplier } from './CreateSupplier.js';
import { ISupplierRepository } from '../../repositories/supplier-repository.interface.js';

describe('CreateSupplier Use Case', () => {
  const mockRepo = {
    create: vi.fn()
  } as unknown as ISupplierRepository;

  const useCase = new CreateSupplier(mockRepo);

  it('should create a supplier with valid data', async () => {
    vi.mocked(mockRepo.create).mockResolvedValue(1);
    const result = await useCase.execute({
      name: 'Test Supplier',
      phone: '+1 (555) 123-4567'
    });
    expect(result).toBe(1);
    expect(mockRepo.create).toHaveBeenCalled();
  });

  it('should throw if name is missing', async () => {
    await expect(useCase.execute({ name: '' })).rejects.toThrow('Supplier name is required');
  });

  it('should throw if phone format is invalid', async () => {
    await expect(useCase.execute({ 
      name: 'Test', 
      phone: 'abc' 
    })).rejects.toThrow('Invalid phone number format');
    
    await expect(useCase.execute({ 
      name: 'Test', 
      phone: '123' 
    })).rejects.toThrow('Invalid phone number format');
  });

  it('should allow valid phone formats', async () => {
    vi.mocked(mockRepo.create).mockResolvedValue(1);
    await expect(useCase.execute({ name: 'T', phone: '1234567' })).resolves.not.toThrow();
    await expect(useCase.execute({ name: 'T', phone: '555-666-7777' })).resolves.not.toThrow();
    await expect(useCase.execute({ name: 'T', phone: '(555) 000 1111' })).resolves.not.toThrow();
  });
});
