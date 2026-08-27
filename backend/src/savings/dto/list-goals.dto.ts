import { ApiProperty } from '@nestjs/swagger';

/**
 * A single goal in the response of `GET /savings/goals`, projected from the
 * `Goal` read-model.
 *
 * `target_amount`/`current_amount` are kept as strings (stroops) to avoid JS
 * number precision loss on large bigint values, consistent with
 * `Balance.amount`.
 */
export class GoalListItemDto {
  @ApiProperty({ description: "The contract's identifier for this goal" })
  on_chain_id: string;

  @ApiProperty({ description: 'Stellar account address of the goal owner' })
  owner: string;

  @ApiProperty({ description: 'Goal name' })
  name: string;

  @ApiProperty({
    description: 'Target amount for this goal, in stroops',
    example: '100000000',
  })
  target_amount: string;

  @ApiProperty({
    description: 'Amount saved toward this goal so far, in stroops',
    example: '25000000',
  })
  current_amount: string;

  @ApiProperty({
    description: 'Whether the goal is still active or has been reached',
    enum: ['active', 'reached'],
  })
  status: string;
}

/**
 * Response shape for `GET /savings/goals?address=`.
 *
 * `goals` is filtered to only the goals owned by `address`, ordered
 * newest-first, and paginated via `page`/`limit`.
 */
export class ListGoalsDto {
  @ApiProperty({
    description: 'Stellar account address the goals are filtered by owner for',
  })
  address: string;

  @ApiProperty({
    description: "Page of the owner's goals with progress",
    type: [GoalListItemDto],
  })
  goals: GoalListItemDto[];

  @ApiProperty({ description: 'Total number of goals matching the filter' })
  total: number;

  @ApiProperty({ description: 'Current page (1-indexed)' })
  page: number;

  @ApiProperty({ description: 'Page size actually applied (capped at 100)' })
  limit: number;
}
