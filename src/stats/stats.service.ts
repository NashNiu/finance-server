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

  // Breakdown rolled up to the first-level (一级) category: amounts on
  // subcategories are summed into their parent so the donut shows e.g. 餐饮
  // rather than 午餐/晚餐 separately.
  async byCategory(userId: number, month: string, type: RecordType) {
    const grouped = await this.prisma.record.groupBy({
      by: ['categoryId'],
      where: { userId, type, recordDate: monthRange(month) },
      _sum: { amount: true },
    });
    const usedIds = grouped.map((g) => g.categoryId);
    const used = await this.prisma.category.findMany({
      where: { id: { in: usedIds } },
      select: { id: true, parentId: true },
    });
    // each used category -> its first-level id (itself if already first-level)
    const rootOf = new Map(used.map((c) => [c.id, c.parentId ?? c.id]));

    const sums = new Map<number, number>();
    for (const g of grouped) {
      const root = rootOf.get(g.categoryId) ?? g.categoryId;
      sums.set(root, (sums.get(root) ?? 0) + Number(g._sum.amount ?? 0));
    }

    const rootIds = [...sums.keys()];
    const roots = await this.prisma.category.findMany({
      where: { id: { in: rootIds } },
      select: { id: true, name: true },
    });
    const nameOf = new Map(roots.map((c) => [c.id, c.name]));

    return rootIds
      .map((id) => ({
        categoryId: id,
        name: nameOf.get(id) ?? '未知',
        amount: sums.get(id) ?? 0,
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
