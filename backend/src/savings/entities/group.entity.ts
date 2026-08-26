import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * A group savings pool projected from the vault contract's `group_created`,
 * `group_joined`, `group_contribution`, and `group_closed` events.
 *
 * `members` is a Postgres `text[]` of Stellar account addresses so
 * membership can be queried with `WHERE :address = ANY(members)`. The
 * migration creates a GIN index on this column (a plain btree `@Index`
 * here would not support that access pattern efficiently).
 */
@Entity('groups')
export class Group {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** The contract's identifier for this group (from event data). */
  @Column({ type: 'varchar', unique: true })
  on_chain_id: string;

  /** Stellar account address of the group creator. */
  @Column({ type: 'varchar' })
  creator: string;

  @Column({ type: 'varchar' })
  name: string;

  /** Stellar account addresses of current group members. */
  @Column({ type: 'text', array: true, default: () => "'{}'::text[]" })
  members: string[];

  /** Pooled balance, in stroops (kept as a string to avoid JS precision loss). */
  @Column({ type: 'varchar', default: '0' })
  balance: string;

  /** Whether the group is still accepting new members. */
  @Column({ type: 'boolean', default: true })
  open: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
