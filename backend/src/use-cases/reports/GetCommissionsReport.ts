import { ISaleRepository } from '../../repositories/sale-repository.interface.js';
import { IBarberRepository } from '../../repositories/barber-repository.interface.js';
import { IExpenseRepository } from '../../repositories/expense-repository.interface.js';

export interface GetCommissionsReportRequest {
  startDate: string;
  endDate: string;
  shop_id: number;
  barber_id?: number;
  isBarber?: boolean;
}

export class GetCommissionsReport {
  constructor(
    private saleRepo: ISaleRepository,
    private barberRepo: IBarberRepository,
    private expenseRepo: IExpenseRepository
  ) {}

  async execute(request: GetCommissionsReportRequest) {
    const { startDate, endDate, shop_id, barber_id, isBarber } = request;

    const revenueData = await this.saleRepo.findInRange(startDate, endDate, shop_id, isBarber ? barber_id : undefined);
    const commissions = await this.barberRepo.getCommissions(startDate, endDate, shop_id, isBarber ? barber_id : undefined);
    const expenseTotal = isBarber ? 0 : await this.expenseRepo.getTotalInRange(startDate, endDate, shop_id);

    return {
      startDate,
      endDate,
      revenue: revenueData?.total || 0,
      tips: revenueData?.tips || 0,
      expenses: expenseTotal || 0,
      commissions
    };
  }
}
