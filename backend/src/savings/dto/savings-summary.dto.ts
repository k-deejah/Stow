import { ApiProperty } from '@nestjs/swagger';

/**
 * Aggregate totals for a single savings product, returned as part of
 * `GET /savings/summary`.
 *
 * `total` is kept as a string (stroops) to avoid JS number precision loss
 * on large bigint values, consistent with `Balance.amount` and
 * `Goal.target_amount` / `Goal.current_amount`.
 */
export class SavingsProductSummaryDto {
  @ApiProperty({
    description: 'Product identifier',
    enum: ['flexible', 'goals'],
    example: 'flexible',
  })
  product: 'flexible' | 'goals';

  @ApiProperty({
    description: 'Total balance held in this product, in stroops',
    example: '150000000',
  })
  total: string;
}

/**
 * Response shape for `GET /savings/summary?address=`.
 *
 * `total` is the grand total across all products (the sum of each
 * product summary's `total`), guaranteed to equal the sum of the
 * underlying per-product projections.
 */
export class SavingsSummaryDto {
  @ApiProperty({ description: 'Stellar account address the summary is for' })
  address: string;

  @ApiProperty({
    description: 'Per-product totals, in stroops',
    type: [SavingsProductSummaryDto],
  })
  products: SavingsProductSummaryDto[];

  @ApiProperty({
    description: 'Grand total across all products, in stroops',
    example: '650000000',
  })
  total: string;
}
