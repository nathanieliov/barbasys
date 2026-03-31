import { describe, it, expect, vi } from 'vitest';
import { DeleteSupplier } from './DeleteSupplier.js';
import { ISupplierRepository } from '../../repositories/supplier-repository.interface.js';

describe('DeleteSupplier Use Case', () => {
  const mockRepo = {
    delete: vi.fn(),
    findById: vi.fn()
  } as unknown as ISupplierRepository;

  const useCase = new DeleteSupplier(mockRepo);

  it('should delete a supplier', async () => {
    vi.mocked(mockRepo.findById).mockResolvedValue({ id: 1 } as any);
    vi.mocked(mockRepo.delete).mockResolvedValue();
    await useCase.execute(1);
    expect(mockRepo.delete).toHaveBeenCalledWith(1);
  });

  it('should throw if supplier not found', async () => {
    vi.mocked(mockRepo.findById).mockResolvedValue(null);
    await expect(useCase.execute(999)).rejects.toThrow('Supplier not found');
  });
});
