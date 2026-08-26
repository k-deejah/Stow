import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * A group savings pool projected from the vault contract's `group_created`
 * and `group_split_settled` events.
 */
@Entity('groups')
export class Group {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** The contract's identifier for this group (from event data). */
  @Column({ type: 'varchar', unique: true })
  on_chain_id: string;

  /** Total pooled balance, in stroops, kept as a string to avoid precision loss. */
  @Column({ type: 'varchar', default: '0' })
  balance: string;

  @Column({ type: 'boolean', default: false })
  settled: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  settled_at: Date | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
