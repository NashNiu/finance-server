import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { RecordType } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { StatsService } from './stats.service';

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

@UseGuards(JwtAuthGuard)
@Controller('stats')
export class StatsController {
  constructor(private service: StatsService) {}

  @Get('summary')
  summary(
    @CurrentUser() user: { id: number },
    @Query('month') month?: string,
  ) {
    return this.service.summary(user.id, month || currentMonth());
  }

  @Get('by-category')
  byCategory(
    @CurrentUser() user: { id: number },
    @Query('month') month?: string,
    @Query('type') type?: RecordType,
  ) {
    return this.service.byCategory(
      user.id,
      month || currentMonth(),
      type === RecordType.INCOME ? RecordType.INCOME : RecordType.EXPENSE,
    );
  }

  @Get('trend')
  trend(
    @CurrentUser() user: { id: number },
    @Query('year') year?: string,
  ) {
    const y = year ? Number(year) : new Date().getFullYear();
    return this.service.trend(user.id, y);
  }
}
