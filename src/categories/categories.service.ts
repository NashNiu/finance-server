import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  // System defaults (userId null) + this user's custom categories.
  findAll(userId: number) {
    return this.prisma.category.findMany({
      where: { OR: [{ userId: null }, { userId }] },
      orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }, { id: 'asc' }],
    });
  }

  create(userId: number, dto: CreateCategoryDto) {
    return this.prisma.category.create({
      data: { ...dto, userId, sortOrder: 99 },
    });
  }

  async remove(userId: number, id: number) {
    const cat = await this.prisma.category.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException('category not found');
    if (cat.userId !== userId)
      throw new ForbiddenException('cannot delete this category');
    const usage = await this.prisma.record.count({ where: { categoryId: id } });
    if (usage > 0)
      throw new ConflictException('category is in use by records');
    await this.prisma.category.delete({ where: { id } });
    return { id };
  }
}
