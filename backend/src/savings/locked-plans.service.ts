import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LockedPlan } from './entities/locked-plan.entity';

export interface PaginatedLockedPlans {
  data: LockedPlan[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Read access to the `locked_plans` projection (populated elsewhere from the
 * vault contract's `locked_created`/`locked_top_up`/`locked_withdraw`
 * events).
 */
@Injectable()
export class LockedPlansService {
  constructor(
    @InjectRepository(LockedPlan)
    private readonly lockedPlanRepository: Repository<LockedPlan>,
  ) {}

  /**
   * Lists an owner's locked plans, soonest-unlocking first, paginated.
   * `limit` is capped at 100 to bound query cost, matching the convention
   * used by `NotificationsService.findAllForUser`.
   */
  async listByOwner(
    owner: string,
    page = 1,
    limit = 20,
  ): Promise<PaginatedLockedPlans> {
    const take = Math.min(limit, 100);
    const skip = (page - 1) * take;

    const [data, total] = await this.lockedPlanRepository.findAndCount({
      where: { owner },
      order: { unlock_at: 'ASC' },
      skip,
      take,
    });

    return { data, total, page, limit: take };
  }
}
