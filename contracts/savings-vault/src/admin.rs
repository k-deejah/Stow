//! Initialization and admin configuration.

use soroban_sdk::{Address, Env};

use crate::error::Error;
use crate::events::{EVENT_SCHEMA_VERSION, TOPIC_ADMIN_SET, TOPIC_INIT};
use crate::storage::extend_instance_ttl;
use crate::types::DataKey;

/// Initialize the vault.
///
/// - Stores `admin` and the `token` (SEP-41, e.g. USDC) address.
/// - Seeds id counters.
/// - Must be callable exactly once; subsequent calls -> `Error::AlreadyInitialized`.
///
/// Acceptance: after init, `token()` and `admin()` return the given values.
pub fn initialize(env: &Env, admin: Address, token: Address) -> Result<(), Error> {
    extend_instance_ttl(env);

    if env.storage().instance().has(&DataKey::Admin) {
        return Err(Error::AlreadyInitialized);
    }

    env.storage().instance().set(&DataKey::Admin, &admin);
    env.storage().instance().set(&DataKey::Token, &token);
    env.storage().instance().set(&DataKey::NextLockedId, &0u64);
    env.storage().instance().set(&DataKey::NextGoalId, &0u64);
    env.storage().instance().set(&DataKey::NextGroupId, &0u64);
    env.storage().instance().set(&DataKey::Paused, &false);

    env.events().publish(
        (TOPIC_INIT,),
        (admin, token, EVENT_SCHEMA_VERSION),
    );

    Ok(())
}

/// Return the configured token address, or `Error::NotInitialized`.
pub fn token(env: &Env) -> Result<Address, Error> {
    env.storage()
        .instance()
        .get(&DataKey::Token)
        .ok_or(Error::NotInitialized)
}

/// Return the configured admin address, or `Error::NotInitialized`.
pub fn admin(env: &Env) -> Result<Address, Error> {
    env.storage()
        .instance()
        .get(&DataKey::Admin)
        .ok_or(Error::NotInitialized)
}

/// Rotate the admin. Requires `require_auth` from the current admin.
pub fn set_admin(env: &Env, new_admin: Address) -> Result<(), Error> {
    extend_instance_ttl(env);

    let current_admin = admin(env)?;
    current_admin.require_auth();

    env.storage().instance().set(&DataKey::Admin, &new_admin);

    env.events()
        .publish((TOPIC_ADMIN_SET,), (current_admin, new_admin));

    Ok(())
}

/// Set the emergency-pause flag. Admin-only.
///
/// While paused, mutating entrypoints reject with `Error::Paused`; reads
/// remain available.
pub fn set_paused(env: &Env, caller: Address, paused: bool) -> Result<(), Error> {
    extend_instance_ttl(env);

    let current_admin = admin(env)?;
    caller.require_auth();
    if caller != current_admin {
        return Err(Error::Unauthorized);
    }

    env.storage().instance().set(&DataKey::Paused, &paused);

    Ok(())
}

/// Whether the contract is currently paused. Defaults to `false` if unset.
pub fn is_paused(env: &Env) -> bool {
    env.storage()
        .instance()
        .get(&DataKey::Paused)
        .unwrap_or(false)
}

/// Guard for mutating entrypoints: returns `Error::Paused` while paused.
pub fn require_not_paused(env: &Env) -> Result<(), Error> {
    if is_paused(env) {
        return Err(Error::Paused);
    }
    Ok(())
}
