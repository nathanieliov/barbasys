import { describe, it, expect, vi } from 'vitest';
import { ListBarbers } from './list-barbers.js';
import { DeleteBarber } from './delete-barber.js';
import { IBarberRepository } from '../repositories/barber-repository.interface.js';
import { Barber } from '../domain/entities.js';

describe('Barber CRUD Use Cases', () => {
  const mockRepo = {
    findAll: vi.fn(),
    findById: vi.fn(),
    delete: vi.fn()
  } as unknown as IBarberRepository;

  const listBarbers = new ListBarbers(mockRepo);
  const deleteBarber = new DeleteBarber(mockRepo);

  it('should list all barbers', async () => {
    const mockBarbers: Barber[] = [{ id: 1, name: 'Barber 1', fullname: 'Barber One', service_commission_rate: 0.6, product_commission_rate: 0.1, shop_id: 1, is_active: 1 }];
    vi.mocked(mockRepo.findAll).mockResolvedValue(mockBarbers);

    const result = await listBarbers.execute();
    expect(result).toEqual(mockBarbers);
    expect(mockRepo.findAll).toHaveBeenCalled();
  });

  it('should delete a barber', async () => {
    vi.mocked(mockRepo.findById).mockResolvedValue({ 
      id: 1, 
      name: 'Barber 1', 
      fullname: 'Barber One',
      service_commission_rate: 0.6, 
      product_commission_rate: 0.1, 
      shop_id: 1, 
      is_active: 1 
    });
    vi.mocked(mockRepo.delete).mockResolvedValue();

    await deleteBarber.execute(1);
    expect(mockRepo.delete).toHaveBeenCalledWith(1);
  });

  it('should throw if barber not found when deleting', async () => {
    vi.mocked(mockRepo.findById).mockResolvedValue(null);
    await expect(deleteBarber.execute(999)).rejects.toThrow('Barber not found');
  });
});
