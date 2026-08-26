//! Goal-based savings — save toward a target with automated milestones.

use soroban_sdk::{Address, Env, String};

use crate::error::Error;
use crate::events::TOPIC_GOAL_CREATED;
use crate::storage::extend_instance_ttl;
use crate::types::{DataKey, Goal};

/// Create a savings goal with a `target_amount`.
///
/// - `owner.require_auth()`.
/// - Errors `InvalidAmount` if `target_amount <= 0`.
/// - Returns the new goal id.
pub fn create(env: &Env, owner: Address, name: String, target_amount: i128) -> Result<u64, Error> {
    extend_instance_ttl(env);
    owner.require_auth();

    if target_amount <= 0 {
        return Err(Error::InvalidAmount);
    }

    // Allocate a new goal id.
    let id = next_goal_id(env);

    let goal = Goal {
        id,
        owner: owner.clone(),
        name: name.clone(),
        target_amount,
        saved_amount: 0,
        created_at: env.ledger().timestamp(),
        reached_at: None,
    };

    env.storage().persistent().set(&DataKey::Goal(id), &goal);

    env.events()
        .publish((TOPIC_GOAL_CREATED,), (id, owner, name, target_amount));

    Ok(id)
}

/// Contribute `amount` toward a goal. When cumulative `saved_amount` first
/// reaches `target_amount`, set `reached_at` and emit a `goal_reached` event.
pub fn contribute(_env: &Env, _from: Address, _goal_id: u64, _amount: i128) -> Result<(), Error> {
    // TODO(issue): auth, transfer_in, increment saved_amount, milestone check, events.
    unimplemented!("goal::contribute")
}

/// Withdraw funds from a reached goal back to the owner.
///
/// Errors `GoalNotReached` if the target has not been met yet.
pub fn claim(_env: &Env, _owner: Address, _goal_id: u64) -> Result<(), Error> {
    // TODO(issue): owner check, reached check, transfer_out full balance, close goal.
    unimplemented!("goal::claim")
}

pub fn get_goal(_env: &Env, _goal_id: u64) -> Result<Goal, Error> {
    unimplemented!("goal::get_goal")
}

/// Helper to allocate the next goal id.
fn next_goal_id(env: &Env) -> u64 {
    let key = DataKey::NextGoalId;
    let current: u64 = env.storage().instance().get(&key).unwrap_or(0);
    let next = current + 1;
    env.storage().instance().set(&key, &next);
    next
}
