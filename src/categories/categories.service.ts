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

  async create(userId: number, dto: CreateCategoryDto) {
    // Creating a subcategory: validate the parent exists, matches the type,
    // is itself a first-level category, and is visible to this user.
    if (dto.parentId != null) {
      const parent = await this.prisma.category.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent) throw new NotFoundException('parent category not found');
      if (parent.parentId !== null)
        throw new ConflictException('cannot nest under a subcategory');
      if (parent.type !== dto.type)
        throw new ConflictException('parent type mismatch');
      if (parent.userId !== null && parent.userId !== userId)
        throw new ForbiddenException('cannot use this parent category');
    }
    return this.prisma.category.create({
      data: {
        name: dto.name,
        icon: dto.icon,
        type: dto.type,
        parentId: dto.parentId ?? null,
        userId,
        sortOrder: 99,
      },
    });
  }

  async remove(userId: number, id: number) {
    const cat = await this.prisma.category.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException('category not found');
    if (cat.userId !== userId)
      throw new ForbiddenException('cannot delete this category');
    const childCount = await this.prisma.category.count({
      where: { parentId: id },
    });
    if (childCount > 0)
      throw new ConflictException('delete subcategories first');
    const usage = await this.prisma.record.count({ where: { categoryId: id } });
    if (usage > 0)
      throw new ConflictException('category is in use by records');
    await this.prisma.category.delete({ where: { id } });
    return { id };
  }
}
