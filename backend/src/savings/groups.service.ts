import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Group } from './entities/group.entity';
import { GroupMember } from './entities/group-member.entity';

/**
 * Projects the vault contract's group events (`group_created`,
 * `group_join`, `group_set_shares`, `group_split_settled`) into the
 * `groups`/`group_members` read-models.
 */
@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
    @InjectRepository(GroupMember)
    private readonly groupMemberRepository: Repository<GroupMember>,
  ) {}

  /** Marks a group settled and zeroes its projected balance. Idempotent. */
  async markSettled(
    onChainId: string,
  ): Promise<{ group: Group; changed: boolean }> {
    let group = await this.groupRepository.findOne({
      where: { on_chain_id: onChainId },
    });
    if (!group) {
      group = this.groupRepository.create({
        on_chain_id: onChainId,
        balance: '0',
        settled: false,
        settled_at: null,
      });
    }
    if (group.settled) {
      return { group, changed: false };
    }
    group.settled = true;
    group.settled_at = new Date();
    group.balance = '0';
    const saved = await this.groupRepository.save(group);
    return { group: saved, changed: true };
  }

  /** Creates the group read-model row on `group_created`. Idempotent. */
  async upsertCreated(params: {
    onChainId: string;
    creator: string;
    name: string;
  }): Promise<Group> {
    const existing = await this.groupRepository.findOne({
      where: { on_chain_id: params.onChainId },
    });
    if (existing) return existing;

    const group = this.groupRepository.create({
      on_chain_id: params.onChainId,
      creator: params.creator,
      name: params.name,
      balance: '0',
      open: true,
      settled: false,
      settled_at: null,
    });
    return this.groupRepository.save(group);
  }

  /**
   * Adds `address` as a member of the group on `group_join`. Idempotent:
   * joining twice leaves the existing membership row (and its
   * `share_bps`) untouched.
   */
  async addMember(onChainId: string, address: string): Promise<GroupMember> {
    const group = await this.findByOnChainId(onChainId);

    const existing = await this.groupMemberRepository.findOne({
      where: { group_id: group.id, address },
    });
    if (existing) return existing;

    const member = this.groupMemberRepository.create({
      group_id: group.id,
      address,
      share_bps: 0,
    });
    return this.groupMemberRepository.save(member);
  }

  /**
   * Applies a `group_set_shares` event: sets each listed member's
   * `share_bps`. A member not yet projected (e.g. `group_join` hasn't
   * been delivered yet) is created with the given share.
   */
  async setShares(
    onChainId: string,
    sharesBps: Record<string, number>,
  ): Promise<GroupMember[]> {
    const group = await this.findByOnChainId(onChainId);

    const results: GroupMember[] = [];
    for (const [address, shareBps] of Object.entries(sharesBps)) {
      let member = await this.groupMemberRepository.findOne({
        where: { group_id: group.id, address },
      });
      if (!member) {
        member = this.groupMemberRepository.create({
          group_id: group.id,
          address,
        });
      }
      member.share_bps = shareBps;
      results.push(await this.groupMemberRepository.save(member));
    }
    return results;
  }

  /** All members of a group, most-recently-joined first. */
  async listMembers(onChainId: string): Promise<GroupMember[]> {
    const group = await this.findByOnChainId(onChainId);
    return this.groupMemberRepository.find({
      where: { group_id: group.id },
      order: { created_at: 'DESC' },
    });
  }

  /** Groups `address` is a member of. */
  async listGroupsForAddress(address: string): Promise<Group[]> {
    const memberships = await this.groupMemberRepository.find({
      where: { address },
      relations: ['group'],
    });
    return memberships.map((m) => m.group);
  }

  private async findByOnChainId(onChainId: string): Promise<Group> {
    const group = await this.groupRepository.findOne({
      where: { on_chain_id: onChainId },
    });
    if (!group) {
      throw new NotFoundException(`Group ${onChainId} not found`);
    }
    return group;
  }
}
