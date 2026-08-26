import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { ListGroupsDto } from './dto/list-groups.dto';
import { SavingsSummaryDto } from './dto/savings-summary.dto';
import { SavingsService } from './savings.service';

@Controller('savings')
export class SavingsController {
  constructor(private readonly savingsService: SavingsService) {}

  /**
   * GET /savings/groups?address=
   *
   * Returns the groups `address` is a current member of, each with its
   * pool balance and open/closed status.
   */
  @Get('groups')
  listGroups(@Query('address') address?: string): Promise<ListGroupsDto> {
    if (!address) {
      throw new BadRequestException('address query parameter is required');
    }
    return this.savingsService.listGroups(address);
  }

  /**
   * GET /savings/summary?address=
   *
   * Returns per-product savings totals for `address` and a grand total
   * across all tracked products.
   */
  @Get('summary')
  summary(@Query('address') address?: string): Promise<SavingsSummaryDto> {
    if (!address) {
      throw new BadRequestException('address query parameter is required');
    }
    return this.savingsService.summary(address);
  }
}
