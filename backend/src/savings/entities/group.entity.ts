import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { GroupMember } from './group-member.entity';

/**
 * A group savings pool projected from the vault contract's `group_created`,
 * `group_split_settled`, and (via `GroupMember`) `group_join`/
 * `group_set_shares` events.
 */
@Entity('groups')
export class Group {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** The contract's identifier for this group (from event data). */
  @Column({ type: 'varchar', unique: true })
  on_chain_id: string;

  /** Stellar account address of the group creator. */
  @Column({ type: 'varchar', nullable: true })
  creator: string | null;

  @Column({ type: 'varchar', nullable: true })
  name: string | null;

  /** Total pooled balance, in stroops, kept as a string to avoid precision loss. */
  @Column({ type: 'varchar', default: '0' })
  balance: string;

  /** Whether the group is still accepting new members / open for contribution. */
  @Column({ type: 'boolean', default: true })
  open: boolean;

  @Column({ type: 'boolean', default: false })
  settled: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  settled_at: Date | null;

  @OneToMany(() => GroupMember, (member) => member.group)
  members: GroupMember[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
