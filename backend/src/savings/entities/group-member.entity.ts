import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { Group } from './group.entity';

/**
 * A single member's participation in a `Group`, projected from the vault
 * contract's `group_join` and `group_set_shares` events.
 *
 * `share_bps` mirrors the contract's `Group.shares_bps` map: a member's
 * split in basis points for group-split payout (must sum to 10_000 across
 * a group's members once set; `0` for an equal-split group that hasn't
 * called `group_set_shares`).
 */
@Entity('group_members')
@Unique(['group', 'address'])
export class GroupMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Group, (group) => group.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'group_id' })
  group: Group;

  @Column({ type: 'uuid' })
  group_id: string;

  /** Stellar account address of the member. */
  @Index()
  @Column({ type: 'varchar' })
  address: string;

  /** Basis-point share for group-split payout (0–10000). */
  @Column({ type: 'integer', default: 0 })
  share_bps: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
