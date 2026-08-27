import { ApiProperty } from '@nestjs/swagger';

/**
 * A single locked plan in the response of `GET /savings/locked`, projected
 * from the `LockedPlan` read-model.
 *
 * `balance` is kept as a string (stroops) to avoid JS number precision loss
 * on large bigint values, consistent with `Balance.amount`.
 */
export class LockedPlanListItemDto {
  @ApiProperty({ description: "The contract's identifier for this plan" })
  on_chain_id: string;

  @ApiProperty({ description: 'Stellar account address of the plan owner' })
  owner: string;

  @ApiProperty({
    description: 'Locked balance held by this plan, in stroops',
    example: '50000000',
  })
  balance: string;

  @ApiProperty({
    description: 'When this plan unlocks',
    type: String,
    format: 'date-time',
  })
  unlock_at: Date;
}

/**
 * Response shape for `GET /savings/locked?address=`.
 *
 * `plans` is filtered to only the plans owned by `address`, ordered by
 * `unlock_at` ascending (soonest-unlocking first), and paginated via
 * `page`/`limit`.
 */
export class ListLockedDto {
  @ApiProperty({
    description: 'Stellar account address the plans are filtered by owner for',
  })
  address: string;

  @ApiProperty({
    description: "Page of the owner's locked plans, ordered by unlock_at",
    type: [LockedPlanListItemDto],
  })
  plans: LockedPlanListItemDto[];

  @ApiProperty({ description: 'Total number of plans matching the filter' })
  total: number;

  @ApiProperty({ description: 'Current page (1-indexed)' })
  page: number;

  @ApiProperty({ description: 'Page size actually applied (capped at 100)' })
  limit: number;
}
