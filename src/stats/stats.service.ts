import { Injectable } from '@nestjs/common';
import { RecordType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { monthRange } from '../records/records.service';

@Injectable()
export class StatsService {
  constructor(private prisma: PrismaService) {}

  async summary(userId: number, month: string) {
    const grouped = await this.prisma.record.groupBy({
      by: ['type'],
      where: { userId, recordDate: monthRange(month) },
      _sum: { amount: true },
    });
    let income = 0;
    let expense = 0;
    for (const g of grouped) {
      const val = Number(g._sum.amount ?? 0);
      if (g.type === RecordType.INCOME) income = val;
      else expense = val;
    }
    return { income, expense, balance: income - expense };
  }

  async byCategory(userId: number, month: string, type: RecordType) {
    const grouped = await this.prisma.record.groupBy({
      by: ['categoryId'],
      where: { userId, type, recordDate: monthRange(month) },
      _sum: { amount: true },
    });
    const ids = grouped.map((g) => g.categoryId);
    const cats = await this.prisma.category.findMany({
      where: { id: { in: ids } },
    });
    const nameOf = new Map(cats.map((c) => [c.id, c.name]));
    return grouped
      .map((g) => ({
        categoryId: g.categoryId,
        name: nameOf.get(g.categoryId) ?? '未知',
        amount: Number(g._sum.amount ?? 0),
      }))
      .sort((a, b) => b.amount - a.amount);
  }

  // 12 months of income & expense for the given year.
  async trend(userId: number, year: number) {
    const start = new Date(year, 0, 1);
    const end = new Date(year + 1, 0, 1);
    const records = await this.prisma.record.findMany({
      where: { userId, recordDate: { gte: start, lt: end } },
      select: { type: true, amount: true, recordDate: true },
    });
    const months = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      income: 0,
      expense: 0,
    }));
    for (const r of records) {
      const idx = r.recordDate.getMonth();
      const val = Number(r.amount);
      if (r.type === RecordType.INCOME) months[idx].income += val;
      else months[idx].expense += val;
    }
    return months;
  }
}
