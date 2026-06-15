import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';

@UseGuards(JwtAuthGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private service: CategoriesService) {}

  @Get()
  findAll(@CurrentUser() user: { id: number }) {
    return this.service.findAll(user.id);
  }

  @Post()
  create(
    @CurrentUser() user: { id: number },
    @Body() dto: CreateCategoryDto,
  ) {
    return this.service.create(user.id, dto);
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.remove(user.id, id);
  }
}
