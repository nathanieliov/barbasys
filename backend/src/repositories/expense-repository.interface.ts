export interface IExpenseRepository {
  getTotalInRange(startDate: string, endDate: string, shopId: number): Promise<number>;
}
