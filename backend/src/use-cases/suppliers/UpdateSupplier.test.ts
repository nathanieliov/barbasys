import { describe, it, expect, vi } from 'vitest';
import { UpdateSupplier } from './UpdateSupplier.js';
import { ISupplierRepository } from '../../repositories/supplier-repository.interface.js';

describe('UpdateSupplier Use Case', () => {
  const mockRepo = {
    update: vi.fn(),
    findById: vi.fn()
  } as unknown as ISupplierRepository;

  const useCase = new UpdateSupplier(mockRepo);

  it('should update a supplier with valid data', async () => {
    vi.mocked(mockRepo.update).mockResolvedValue();
    await useCase.execute({
      id: 1,
      name: 'Updated Name',
      phone: '1234567890'
    });
    expect(mockRepo.update).toHaveBeenCalled();
  });

  it('should throw if phone format is invalid', async () => {
    await expect(useCase.execute({ 
      id: 1, 
      phone: 'abc' 
    })).rejects.toThrow('Invalid phone number format');
  });
});
