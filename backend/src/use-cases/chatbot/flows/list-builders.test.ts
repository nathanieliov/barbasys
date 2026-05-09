import { describe, it, expect } from 'vitest';
import { buildBarberList, buildServiceList, buildDateList, buildSlotList } from './list-builders.js';
import type { Barber } from '../../../domain/entities.js';

describe('List Builders', () => {
  describe('buildBarberList', () => {
    it('formats barbers into WA list format', () => {
      const barbers: Barber[] = [
        { id: 1, name: 'Carlos', fullname: 'Carlos Mendez', shop_id: 1, is_active: 1, payment_model: 'COMMISSION', service_commission_rate: 0.2, product_commission_rate: 0.15, fixed_amount: null, fixed_period: null },
        { id: 2, name: 'Juan', fullname: 'Juan Garcia', shop_id: 1, is_active: 1, payment_model: 'COMMISSION', service_commission_rate: 0.2, product_commission_rate: 0.15, fixed_amount: null, fixed_period: null },
      ];

      const result = buildBarberList(barbers);

      expect(result.items).toHaveLength(2);
      expect(result.items[0]).toEqual({ id: '1', title: 'Carlos Mendez' });
      expect(result.items[1]).toEqual({ id: '2', title: 'Juan Garcia' });
    });
  });

  describe('buildServiceList', () => {
    it('formats services with price and duration', () => {
      const services = [
        { id: 1, name: 'Haircut', price: 25, duration_minutes: 30, description: 'Basic haircut', shop_id: 1, is_active: 1 },
        { id: 2, name: 'Beard Trim', price: 20, duration_minutes: 20, description: 'Trim', shop_id: 1, is_active: 1 },
      ];

      const result = buildServiceList(services, 'en');

      expect(result.items).toHaveLength(2);
      expect(result.items[0].title).toContain('Haircut');
      expect(result.items[0].title).toContain('$25');
      expect(result.items[0].title).toContain('30');
    });

    it('uses Spanish labels for Spanish language', () => {
      const services = [
        { id: 1, name: 'Corte', price: 25, duration_minutes: 30, description: 'Corte básico', shop_id: 1, is_active: 1 },
      ];

      const result = buildServiceList(services, 'es');

      expect(result.header).toContain('Servicio');
    });
  });

  describe('buildDateList', () => {
    it('formats dates for next 7 days', () => {
      const result = buildDateList('en');

      expect(result.items).toHaveLength(7);
      expect(result.items[0].id).toBeDefined();
      expect(result.items[0].title).toBeDefined();
    });

    it('uses Spanish labels', () => {
      const result = buildDateList('es');

      expect(result.header).toContain('Fecha');
    });
  });

  describe('buildSlotList', () => {
    it('formats time slots', () => {
      const slots = ['09:00', '10:00', '14:00', '15:00'];

      const result = buildSlotList(slots, 'en');

      expect(result.items).toHaveLength(4);
      expect(result.items[0]).toEqual({ id: '09:00', title: '9:00 AM' });
      expect(result.items[2]).toEqual({ id: '14:00', title: '2:00 PM' });
    });

    it('uses 24-hour format in Spanish', () => {
      const slots = ['09:00', '14:00'];

      const result = buildSlotList(slots, 'es');

      expect(result.items[0]).toEqual({ id: '09:00', title: '09:00' });
      expect(result.items[1]).toEqual({ id: '14:00', title: '14:00' });
    });
  });
});
