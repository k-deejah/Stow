import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * A locked savings plan projected from the vault contract's
 * `locked_created`, `locked_top_up`, and `locked_withdraw` events.
 */
@Entity('locked_plans')
@Index(['owner'])
@Index(['unlock_at'])
export class LockedPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** The contract's identifier for this plan (from event data). */
  @Column({ type: 'varchar', unique: true })
  on_chain_id: string;

  /** Stellar account address of the plan owner. */
  @Column({ type: 'varchar' })
  owner: string;

  /** Stroop amount, kept as a string to avoid JS number precision loss. */
  @Column({ type: 'varchar', default: '0' })
  balance: string;

  @Column({ type: 'timestamptz' })
  unlock_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
