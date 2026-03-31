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
      phone: '+1 (555) 123-4567',
      shop_id: 1
    });
    expect(result).toBe(1);
    expect(mockRepo.create).toHaveBeenCalled();
  });

  it('should throw if name is missing', async () => {
    await expect(useCase.execute({ name: '', shop_id: 1 })).rejects.toThrow('Supplier name is required');
  });

  it('should throw if shop_id is missing', async () => {
    await expect(useCase.execute({ name: 'Test' } as any)).rejects.toThrow('Shop ID is required');
  });

  it('should throw if phone format is invalid', async () => {
    await expect(useCase.execute({ 
      name: 'Test', 
      phone: 'abc',
      shop_id: 1
    })).rejects.toThrow('Invalid phone number format');
    
    await expect(useCase.execute({ 
      name: 'Test', 
      phone: '123',
      shop_id: 1
    })).rejects.toThrow('Invalid phone number format');
  });

  it('should allow valid phone formats', async () => {
    vi.mocked(mockRepo.create).mockResolvedValue(1);
    await expect(useCase.execute({ name: 'T', phone: '1234567', shop_id: 1 })).resolves.not.toThrow();
    await expect(useCase.execute({ name: 'T', phone: '555-666-7777', shop_id: 1 })).resolves.not.toThrow();
    await expect(useCase.execute({ name: 'T', phone: '(555) 000 1111', shop_id: 1 })).resolves.not.toThrow();
  });
});
