//! Group-split savings — a shared pool settled back to members by agreed shares.
//!
//! Shares are expressed in basis points (bps) and must sum to 10_000.

use soroban_sdk::{token, Address, Env, Map};

use crate::admin::require_not_paused;
use crate::error::Error;
use crate::events::{TOPIC_GROUP_SHARES_SET, TOPIC_GROUP_SPLIT_SETTLED};
use crate::storage::extend_instance_ttl;
use crate::types::DataKey;

pub const TOTAL_BPS: u32 = 10_000;

/// Compute each member's payout for a `pool` split by `shares_bps`.
///
/// Each member's raw share is `pool * bps / TOTAL_BPS` (floor division). The
/// leftover from rounding down (always `>= 0`) is assigned entirely to
/// `remainder_recipient` so the sum of payouts always equals `pool` exactly.
pub fn compute_payouts(
    env: &Env,
    shares_bps: &Map<Address, u32>,
    pool: i128,
    remainder_recipient: &Address,
) -> Map<Address, i128> {
    let mut payouts: Map<Address, i128> = Map::new(env);
    let mut distributed: i128 = 0;

    for (member, bps) in shares_bps.iter() {
        let amount = pool * (bps as i128) / (TOTAL_BPS as i128);
        distributed += amount;
        payouts.set(member, amount);
    }

    let remainder = pool - distributed;
    if remainder != 0 {
        let current = payouts.get(remainder_recipient.clone()).unwrap_or(0);
        payouts.set(remainder_recipient.clone(), current + remainder);
    }

    payouts
}

/// Set the per-member split for a group. Creator-only, group must be closed.
///
/// Errors:
/// - `InvalidShares` if the bps values do not sum to exactly `TOTAL_BPS`,
///   or if any key is not a group member.
pub fn set_shares(
    env: &Env,
    creator: Address,
    group_id: u64,
    shares_bps: Map<Address, u32>,
) -> Result<(), Error> {
    extend_instance_ttl(env);
    require_not_paused(env)?;
    creator.require_auth();

    let mut group: crate::types::Group = env
        .storage()
        .persistent()
        .get(&DataKey::Group(group_id))
        .ok_or(Error::NotFound)?;

    if group.creator != creator {
        return Err(Error::Unauthorized);
    }

    if group.open {
        return Err(Error::GroupClosed);
    }

    let mut total: u32 = 0;
    for (member, bps) in shares_bps.iter() {
        if !group.members.iter().any(|m| m == member) {
            return Err(Error::InvalidShares);
        }
        total = total.checked_add(bps).ok_or(Error::InvalidShares)?;
    }

    if total != TOTAL_BPS {
        return Err(Error::InvalidShares);
    }

    group.shares_bps = shares_bps;

    env.storage()
        .persistent()
        .set(&DataKey::Group(group_id), &group);

    env.events()
        .publish((TOPIC_GROUP_SHARES_SET,), (group_id, creator));

    Ok(())
}

/// Settle the pool: transfer each member `balance * shares_bps / TOTAL_BPS`.
///
/// - Deterministic and fully drains the pool: any rounding remainder is
///   assigned to the group creator.
/// - Errors `InvalidShares` if shares were never configured.
pub fn settle(env: &Env, _caller: Address, group_id: u64) -> Result<(), Error> {
    extend_instance_ttl(env);
    require_not_paused(env)?;

    let mut group: crate::types::Group = env
        .storage()
        .persistent()
        .get(&DataKey::Group(group_id))
        .ok_or(Error::NotFound)?;

    if group.shares_bps.is_empty() {
        return Err(Error::InvalidShares);
    }

    let token_address: Address = env
        .storage()
        .instance()
        .get(&DataKey::Token)
        .ok_or(Error::NotInitialized)?;

    let token_client = token::Client::new(env, &token_address);
    let contract_address = env.current_contract_address();

    let payouts = compute_payouts(env, &group.shares_bps, group.balance, &group.creator);

    for (member, amount) in payouts.iter() {
        if amount > 0 {
            token_client.transfer(&contract_address, &member, &amount);
        }
        env.events()
            .publish((TOPIC_GROUP_SPLIT_SETTLED,), (group_id, member, amount));
    }

    group.balance = 0;

    env.storage()
        .persistent()
        .set(&DataKey::Group(group_id), &group);

    Ok(())
}
