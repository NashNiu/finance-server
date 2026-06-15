import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRecordDto } from './dto/create-record.dto';
import { UpdateRecordDto } from './dto/update-record.dto';
import { QueryRecordDto } from './dto/query-record.dto';

// Returns [start, end) covering the given YYYY-MM in local time.
export function monthRange(month: string): { gte: Date; lt: Date } {
  const [y, m] = month.split('-').map(Number);
  return { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) };
}

@Injectable()
export class RecordsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: number, q: QueryRecordDto) {
    const where: Prisma.RecordWhereInput = { userId };
    if (q.month) where.recordDate = monthRange(q.month);
    if (q.type) where.type = q.type;
    if (q.categoryId) where.categoryId = q.categoryId;

    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 50;
    const [items, total] = await Promise.all([
      this.prisma.record.findMany({
        where,
        include: { category: true },
        orderBy: [{ recordDate: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.record.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  create(userId: number, dto: CreateRecordDto) {
    return this.prisma.record.create({
      data: {
        userId,
        categoryId: dto.categoryId,
        type: dto.type,
        amount: dto.amount,
        note: dto.note,
        recordDate: new Date(dto.recordDate),
      },
    });
  }

  private async ownOrThrow(userId: number, id: number) {
    const rec = await this.prisma.record.findUnique({ where: { id } });
    if (!rec) throw new NotFoundException('record not found');
    if (rec.userId !== userId) throw new ForbiddenException('not your record');
    return rec;
  }

  async update(userId: number, id: number, dto: UpdateRecordDto) {
    await this.ownOrThrow(userId, id);
    return this.prisma.record.update({
      where: { id },
      data: {
        ...dto,
        recordDate: dto.recordDate ? new Date(dto.recordDate) : undefined,
      },
    });
  }

  async remove(userId: number, id: number) {
    await this.ownOrThrow(userId, id);
    await this.prisma.record.delete({ where: { id } });
    return { id };
  }
}
