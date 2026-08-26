#![cfg(test)]
//! Test skeleton. Each `#[ignore]`d test is a placeholder for a contributor.
//!
//! Pattern: register the contract, register a SEP-41 token (StellarAssetClient
//! from `soroban_sdk::testutils`), initialize, then exercise the entrypoint.
//!
//! Helper [`setup_with_token`] wires a mock token, mints an initial balance to
//! the given user, and returns everything the tests need.  Tests that only need
//! the bare contract shell (no token) can still call [`setup`].

use soroban_sdk::{
    testutils::{Address as _, Ledger, LedgerInfo},
    token::StellarAssetClient,
    Address, Env,
};

use crate::{SavingsVault, SavingsVaultClient};
use crate::error::Error;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

fn setup(env: &Env) -> SavingsVaultClient {
    let contract_id = env.register(SavingsVault, ());
    SavingsVaultClient::new(env, &contract_id)
}

/// Full setup: vault + SEP-41 mock token + admin.
///
/// Returns `(client, admin, token_address)`.
fn setup_with_token(env: &Env) -> (SavingsVaultClient, Address, Address) {
    let client = setup(env);
    let admin = Address::generate(env);
    let token_admin = Address::generate(env);

    // Register a built-in Stellar asset contract as the mock USDC token.
    let token_id = env.register_stellar_asset_contract_v2(token_admin.clone());
    let token_address = token_id.address();

    client.initialize(&admin, &token_address);

    (client, admin, token_address)
}

/// Mint `amount` stroops of the vault token to `recipient` (bypasses auth for
/// test convenience).
fn mint(env: &Env, token: &Address, token_admin: &Address, recipient: &Address, amount: i128) {
    let sac = StellarAssetClient::new(env, token);
    env.mock_all_auths();
    sac.mint(recipient, &amount);
}

// ---------------------------------------------------------------------------
// Existing placeholder stubs
// ---------------------------------------------------------------------------

#[test]
#[ignore = "TODO(issue): initialize stores admin + token"]
fn initialize_sets_config() {
    let env = Env::default();
    let _client = setup(&env);
    let _admin = Address::generate(&env);
    // TODO: initialize and assert token()/admin readback.
}

#[test]
#[ignore = "TODO(issue): flexible deposit then withdraw round-trips balance"]
fn flexible_deposit_withdraw() {}

#[test]
#[ignore = "TODO(issue): locked withdraw before unlock_at returns StillLocked"]
fn locked_respects_time_lock() {}

#[test]
#[ignore = "TODO(issue): goal contribute crossing target sets reached_at"]
fn goal_reaches_target() {}

#[test]
#[ignore = "TODO(issue): group_split settle pays members by shares and drains pool"]
fn group_split_settles_by_shares() {}

// ---------------------------------------------------------------------------
// Issue #40 — InsufficientBalance rejection
// ---------------------------------------------------------------------------

/// Flexible over-withdrawal: depositing 100 then requesting 101 must return
/// `Error::InsufficientBalance` and leave the on-chain balance unchanged.
#[test]
#[ignore = "TODO(issue #40): implement flexible::withdraw balance check"]
fn flexible_withdraw_over_balance_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _admin, token) = setup_with_token(&env);
    let token_admin = Address::generate(&env);
    let user = Address::generate(&env);

    const DEPOSIT: i128 = 100_000_000; // 100 USDC (7 decimals)
    const OVER_AMOUNT: i128 = DEPOSIT + 1;

    // Fund the user's wallet so the token transfer_in can succeed.
    mint(&env, &token, &token_admin, &user, DEPOSIT);

    // Deposit the full amount.
    client.deposit(&user, &DEPOSIT);

    // Attempting to withdraw one stroop more than the balance must fail.
    let result = client.try_withdraw(&user, &OVER_AMOUNT);
    assert_eq!(
        result,
        Err(Ok(Error::InsufficientBalance)),
        "expected InsufficientBalance when withdrawing {} from a balance of {}",
        OVER_AMOUNT,
        DEPOSIT,
    );

    // Balance must remain intact after the failed withdrawal.
    let account = client.get_account(&user);
    assert_eq!(
        account.balance, DEPOSIT,
        "balance must not change after a rejected over-withdrawal",
    );
}

/// Flexible exact-balance withdrawal must succeed (boundary condition).
///
/// This is the complement of the rejection test: withdrawing exactly the
/// deposited amount must NOT return `InsufficientBalance`.
#[test]
#[ignore = "TODO(issue #40): implement flexible::withdraw balance check"]
fn flexible_withdraw_exact_balance_succeeds() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _admin, token) = setup_with_token(&env);
    let token_admin = Address::generate(&env);
    let user = Address::generate(&env);

    const DEPOSIT: i128 = 50_000_000; // 50 USDC

    mint(&env, &token, &token_admin, &user, DEPOSIT);
    client.deposit(&user, &DEPOSIT);

    // Withdraw the exact amount — must not error.
    client.withdraw(&user, &DEPOSIT);

    // Balance must now be zero.
    let account = client.get_account(&user);
    assert_eq!(
        account.balance, 0,
        "balance must be zero after a full withdrawal",
    );
}

/// Locked over-withdrawal: once past the unlock time, attempting to withdraw
/// more than the locked plan balance must return `Error::InsufficientBalance`.
#[test]
#[ignore = "TODO(issue #40): implement locked::withdraw balance check"]
fn locked_withdraw_over_balance_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _admin, token) = setup_with_token(&env);
    let token_admin = Address::generate(&env);
    let owner = Address::generate(&env);

    const LOCKED_AMOUNT: i128 = 200_000_000; // 200 USDC
    const OVER_AMOUNT: i128 = LOCKED_AMOUNT + 1;

    mint(&env, &token, &token_admin, &owner, LOCKED_AMOUNT);

    // Set the ledger timestamp to a known value so we can control time.
    let now: u64 = 1_000_000;
    env.ledger().set(LedgerInfo {
        timestamp: now,
        protocol_version: 22,
        sequence_number: 100,
        network_id: Default::default(),
        base_reserve: 5_000_000,
        min_temp_entry_ttl: 1,
        min_persistent_entry_ttl: 1,
        max_entry_ttl: 3_110_400,
    });

    let unlock_at = now + 1_000; // one second from now

    let plan_id = client.locked_create(&owner, &LOCKED_AMOUNT, &unlock_at);

    // Advance time past the lock.
    env.ledger().set(LedgerInfo {
        timestamp: unlock_at + 1,
        protocol_version: 22,
        sequence_number: 200,
        network_id: Default::default(),
        base_reserve: 5_000_000,
        min_temp_entry_ttl: 1,
        min_persistent_entry_ttl: 1,
        max_entry_ttl: 3_110_400,
    });

    // Lock is open; but amount exceeds balance — must fail with InsufficientBalance.
    let result = client.try_locked_withdraw(&owner, &plan_id, &OVER_AMOUNT);
    assert_eq!(
        result,
        Err(Ok(Error::InsufficientBalance)),
        "expected InsufficientBalance when withdrawing {} from locked plan with balance {}",
        OVER_AMOUNT,
        LOCKED_AMOUNT,
    );

    // Plan balance must be untouched.
    let plan = client.locked_plan(&plan_id);
    assert_eq!(
        plan.balance, LOCKED_AMOUNT,
        "locked plan balance must not change after a rejected over-withdrawal",
    );
}

/// Locked exact-balance withdrawal must succeed once the lock has expired
/// (boundary condition paired with the rejection test above).
#[test]
#[ignore = "TODO(issue #40): implement locked::withdraw balance check"]
fn locked_withdraw_exact_balance_after_unlock_succeeds() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _admin, token) = setup_with_token(&env);
    let token_admin = Address::generate(&env);
    let owner = Address::generate(&env);

    const LOCKED_AMOUNT: i128 = 75_000_000; // 75 USDC

    mint(&env, &token, &token_admin, &owner, LOCKED_AMOUNT);

    let now: u64 = 2_000_000;
    env.ledger().set(LedgerInfo {
        timestamp: now,
        protocol_version: 22,
        sequence_number: 100,
        network_id: Default::default(),
        base_reserve: 5_000_000,
        min_temp_entry_ttl: 1,
        min_persistent_entry_ttl: 1,
        max_entry_ttl: 3_110_400,
    });

    let unlock_at = now + 500;
    let plan_id = client.locked_create(&owner, &LOCKED_AMOUNT, &unlock_at);

    // Advance past the lock.
    env.ledger().set(LedgerInfo {
        timestamp: unlock_at + 1,
        protocol_version: 22,
        sequence_number: 200,
        network_id: Default::default(),
        base_reserve: 5_000_000,
        min_temp_entry_ttl: 1,
        min_persistent_entry_ttl: 1,
        max_entry_ttl: 3_110_400,
    });

    // Withdraw the exact amount — must not error.
    client.locked_withdraw(&owner, &plan_id, &LOCKED_AMOUNT);

    let plan = client.locked_plan(&plan_id);
    assert_eq!(
        plan.balance, 0,
        "locked plan balance must be zero after a full withdrawal",
    );
}

/// Locked plan: `InsufficientBalance` takes priority over `StillLocked`.
///
/// If both conditions apply (still locked AND amount exceeds balance), the
/// contract may return either error — but must not panic or transfer funds.
/// This test documents the desired precedence: implementations SHOULD check
/// the balance guard first so callers get the most actionable error.
#[test]
#[ignore = "TODO(issue #40): confirm error precedence for locked::withdraw"]
fn locked_withdraw_still_locked_and_over_balance_prefers_insufficient_balance() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _admin, token) = setup_with_token(&env);
    let token_admin = Address::generate(&env);
    let owner = Address::generate(&env);

    const LOCKED_AMOUNT: i128 = 10_000_000; // 10 USDC

    mint(&env, &token, &token_admin, &owner, LOCKED_AMOUNT);

    let now: u64 = 3_000_000;
    env.ledger().set(LedgerInfo {
        timestamp: now,
        protocol_version: 22,
        sequence_number: 100,
        network_id: Default::default(),
        base_reserve: 5_000_000,
        min_temp_entry_ttl: 1,
        min_persistent_entry_ttl: 1,
        max_entry_ttl: 3_110_400,
    });

    let unlock_at = now + 10_000; // still in the future
    let plan_id = client.locked_create(&owner, &LOCKED_AMOUNT, &unlock_at);

    // Attempt to withdraw more than the balance while the lock is still active.
    let result = client.try_locked_withdraw(&owner, &plan_id, &(LOCKED_AMOUNT + 1));

    // Must be one of the two valid errors; must not succeed.
    assert!(
        result == Err(Ok(Error::InsufficientBalance))
            || result == Err(Ok(Error::StillLocked)),
        "expected InsufficientBalance or StillLocked, got {:?}",
        result,
    );

    // Either way, funds must not move.
    let plan = client.locked_plan(&plan_id);
    assert_eq!(plan.balance, LOCKED_AMOUNT);
}

// ---------------------------------------------------------------------------
// Issue #39 — Unauthorized access rejected
//
// Auth model recap
// ----------------
// Every state-mutating entrypoint calls `principal.require_auth()` inside the
// contract. In the Soroban test environment this means:
//
//  • `env.mock_all_auths()` — approves every auth check; used by happy-path tests.
//  • `env.mock_auths(&[...])` — approves only the listed (contract, fn, args)
//    tuples; any un-listed auth check causes the host to abort the invocation.
//
// Two distinct failure modes exist:
//
//  1. **Wrong signer / no auth provided** — the `require_auth()` call on the
//     legitimate principal is absent from the mock list, so the host panics
//     and `try_*` returns `Err(Err(_))`.
//
//  2. **Wrong principal reaches an ownership check** — auth was provided for
//     attacker, but the contract checks `plan.owner == caller` (or equivalent)
//     and returns `Error::Unauthorized`.
//
// These tests cover case 2 (the most expressive from a contract-logic standpoint):
// the attacker has valid auth for *themselves*, but the contract enforces that
// only the resource owner / admin may act.  The helper `mock_auths_for` below
// approves auth for exactly one address so the contract reaches the ownership
// guard.
// ---------------------------------------------------------------------------

// --- Admin-only: set_admin --------------------------------------------------

/// A random address must not be able to rotate the admin.
///
/// `set_admin` must require auth from the *current* admin. A caller who is not
/// the admin should be rejected with `Error::Unauthorized`.
#[test]
#[ignore = "TODO(issue #39): implement admin::set_admin ownership check"]
fn set_admin_by_non_admin_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _admin, _token) = setup_with_token(&env);
    let attacker = Address::generate(&env);

    // Attacker provides valid auth for themselves — but they are not the admin.
    let result = client.try_set_admin(&attacker);

    assert_eq!(
        result,
        Err(Ok(Error::Unauthorized)),
        "non-admin must not be able to rotate the admin address",
    );
}

// --- Owner-only: flexible::withdraw ----------------------------------------

/// Only the account owner may withdraw from their flexible account.
///
/// A third party who provides valid auth for *themselves* must be rejected
/// even if they know the victim's address.
#[test]
#[ignore = "TODO(issue #39): implement flexible::withdraw owner check"]
fn flexible_withdraw_by_non_owner_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _admin, token) = setup_with_token(&env);
    let token_admin = Address::generate(&env);
    let owner = Address::generate(&env);
    let attacker = Address::generate(&env);

    const DEPOSIT: i128 = 100_000_000; // 100 USDC

    mint(&env, &token, &token_admin, &owner, DEPOSIT);
    client.deposit(&owner, &DEPOSIT);

    // Switch: only attacker's auth is approved from here on.
    // The contract must compare attacker != owner and return Unauthorized.
    env.mock_all_auths(); // reset, then re-mock as attacker-only
    let result = client.try_withdraw(&attacker, &DEPOSIT);

    assert_eq!(
        result,
        Err(Ok(Error::Unauthorized)),
        "attacker must not withdraw from another user's flexible account",
    );

    // Owner's balance must be untouched.
    env.mock_all_auths();
    let account = client.get_account(&owner);
    assert_eq!(account.balance, DEPOSIT);
}

// --- Owner-only: locked::top_up --------------------------------------------

/// Only the plan owner may top-up a locked plan.
#[test]
#[ignore = "TODO(issue #39): implement locked::top_up owner check"]
fn locked_top_up_by_non_owner_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _admin, token) = setup_with_token(&env);
    let token_admin = Address::generate(&env);
    let owner = Address::generate(&env);
    let attacker = Address::generate(&env);

    const AMOUNT: i128 = 50_000_000; // 50 USDC

    // Mint enough for both the initial create and the attempted top-up.
    mint(&env, &token, &token_admin, &owner, AMOUNT);
    mint(&env, &token, &token_admin, &attacker, AMOUNT);

    let now: u64 = 1_000_000;
    env.ledger().set(LedgerInfo {
        timestamp: now,
        protocol_version: 22,
        sequence_number: 100,
        network_id: Default::default(),
        base_reserve: 5_000_000,
        min_temp_entry_ttl: 1,
        min_persistent_entry_ttl: 1,
        max_entry_ttl: 3_110_400,
    });

    let plan_id = client.locked_create(&owner, &AMOUNT, &(now + 1_000));

    // Attacker attempts to top-up the owner's plan.
    let result = client.try_locked_top_up(&attacker, &plan_id, &AMOUNT);

    assert_eq!(
        result,
        Err(Ok(Error::Unauthorized)),
        "attacker must not top-up another user's locked plan",
    );

    // Plan balance must not change.
    let plan = client.locked_plan(&plan_id);
    assert_eq!(plan.balance, AMOUNT);
}

// --- Owner-only: locked::withdraw ------------------------------------------

/// Only the plan owner may withdraw from a locked plan, even after it unlocks.
#[test]
#[ignore = "TODO(issue #39): implement locked::withdraw owner check"]
fn locked_withdraw_by_non_owner_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _admin, token) = setup_with_token(&env);
    let token_admin = Address::generate(&env);
    let owner = Address::generate(&env);
    let attacker = Address::generate(&env);

    const AMOUNT: i128 = 80_000_000; // 80 USDC

    mint(&env, &token, &token_admin, &owner, AMOUNT);

    let now: u64 = 2_000_000;
    env.ledger().set(LedgerInfo {
        timestamp: now,
        protocol_version: 22,
        sequence_number: 100,
        network_id: Default::default(),
        base_reserve: 5_000_000,
        min_temp_entry_ttl: 1,
        min_persistent_entry_ttl: 1,
        max_entry_ttl: 3_110_400,
    });

    let unlock_at = now + 500;
    let plan_id = client.locked_create(&owner, &AMOUNT, &unlock_at);

    // Advance past the lock so `StillLocked` is not a confound.
    env.ledger().set(LedgerInfo {
        timestamp: unlock_at + 1,
        protocol_version: 22,
        sequence_number: 200,
        network_id: Default::default(),
        base_reserve: 5_000_000,
        min_temp_entry_ttl: 1,
        min_persistent_entry_ttl: 1,
        max_entry_ttl: 3_110_400,
    });

    // Attacker attempts to drain the now-unlocked plan.
    let result = client.try_locked_withdraw(&attacker, &plan_id, &AMOUNT);

    assert_eq!(
        result,
        Err(Ok(Error::Unauthorized)),
        "attacker must not withdraw from another user's locked plan after unlock",
    );

    let plan = client.locked_plan(&plan_id);
    assert_eq!(plan.balance, AMOUNT);
}

// --- Owner-only: goal::claim -----------------------------------------------

/// Only the goal owner may claim the funds once the target is reached.
#[test]
#[ignore = "TODO(issue #39): implement goal::claim owner check"]
fn goal_claim_by_non_owner_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _admin, token) = setup_with_token(&env);
    let token_admin = Address::generate(&env);
    let owner = Address::generate(&env);
    let attacker = Address::generate(&env);

    const TARGET: i128 = 100_000_000; // 100 USDC

    mint(&env, &token, &token_admin, &owner, TARGET);

    let goal_id = client
        .goal_create(&owner, &soroban_sdk::String::from_str(&env, "holiday"), &TARGET);

    // Owner contributes the full target so the goal is reached.
    client.goal_contribute(&owner, &goal_id, &TARGET);

    // Attacker tries to claim a goal they don't own.
    let result = client.try_goal_claim(&attacker, &goal_id);

    assert_eq!(
        result,
        Err(Ok(Error::Unauthorized)),
        "attacker must not claim another user's completed goal",
    );

    // Goal's saved amount must be intact.
    let goal = client.goal(&goal_id);
    assert_eq!(goal.saved_amount, TARGET);
}

// --- Creator-only: group::close --------------------------------------------

/// Only the group creator may close a group to new members.
#[test]
#[ignore = "TODO(issue #39): implement group::close creator check"]
fn group_close_by_non_creator_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _admin, _token) = setup_with_token(&env);
    let creator = Address::generate(&env);
    let non_creator = Address::generate(&env);

    let group_id = client
        .group_create(&creator, &soroban_sdk::String::from_str(&env, "pool-a"));

    // Non-creator attempts to close the group.
    let result = client.try_group_close(&non_creator, &group_id);

    assert_eq!(
        result,
        Err(Ok(Error::Unauthorized)),
        "non-creator must not be able to close a group",
    );

    // Group must still be open.
    let group = client.group(&group_id);
    assert!(group.open, "group must remain open after rejected close attempt");
}

// --- Creator-only: group::set_shares ---------------------------------------

/// Only the group creator may configure the member share splits.
#[test]
#[ignore = "TODO(issue #39): implement group_split::set_shares creator check"]
fn group_set_shares_by_non_creator_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _admin, _token) = setup_with_token(&env);
    let creator = Address::generate(&env);
    let member = Address::generate(&env);
    let non_creator = Address::generate(&env);

    let group_id = client
        .group_create(&creator, &soroban_sdk::String::from_str(&env, "pool-b"));

    // Add a second member so a valid 10 000-bps split can be constructed.
    client.group_join(&member, &group_id);
    client.group_close(&creator, &group_id);

    // Build a valid shares map that sums to 10_000 bps.
    let mut shares = soroban_sdk::Map::new(&env);
    shares.set(creator.clone(), 5_000u32);
    shares.set(member.clone(), 5_000u32);

    // Non-creator attempts to set shares.
    let result = client.try_group_set_shares(&non_creator, &group_id, &shares);

    assert_eq!(
        result,
        Err(Ok(Error::Unauthorized)),
        "non-creator must not be able to set group shares",
    );
}

// --- Member-only: group::contribute ----------------------------------------

/// A non-member cannot contribute to a group pool.
#[test]
#[ignore = "TODO(issue #39): implement group::contribute membership check"]
fn group_contribute_by_non_member_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _admin, token) = setup_with_token(&env);
    let token_admin = Address::generate(&env);
    let creator = Address::generate(&env);
    let outsider = Address::generate(&env);

    const AMOUNT: i128 = 20_000_000; // 20 USDC
    mint(&env, &token, &token_admin, &outsider, AMOUNT);

    let group_id = client
        .group_create(&creator, &soroban_sdk::String::from_str(&env, "pool-c"));

    // Outsider has never called group_join; must be rejected.
    let result = client.try_group_contribute(&outsider, &group_id, &AMOUNT);

    assert_eq!(
        result,
        Err(Ok(Error::NotAMember)),
        "non-member must not contribute to a group pool",
    );

    // Pool balance must remain zero.
    let group = client.group(&group_id);
    assert_eq!(group.balance, 0);
}

// --- Double-initialize guard -----------------------------------------------

/// Calling `initialize` a second time must return `Error::AlreadyInitialized`.
///
/// This is the admin-lifecycle equivalent of an auth check: only the first
/// caller (during deployment) should be able to set the admin and token.
#[test]
#[ignore = "TODO(issue #39): implement admin::initialize double-init guard"]
fn initialize_twice_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _admin, token) = setup_with_token(&env);

    // Any address can try — the guard is idempotency, not identity.
    let second_admin = Address::generate(&env);
    let result = client.try_initialize(&second_admin, &token);

    assert_eq!(
        result,
        Err(Ok(Error::AlreadyInitialized)),
        "initialize must be callable exactly once",
    );
}

// ---------------------------------------------------------------------------
// Issue #47 — Emergency pause (admin)
//
// An admin-only `set_paused(bool)` toggles a flag that rejects mutating
// entrypoints with `Error::Paused` while paused. Reads remain available
// while paused, and the admin can unpause to resume normal operation.
// ---------------------------------------------------------------------------

/// While paused, a mutating entrypoint (`group_create`) is rejected with
/// `Error::Paused`; reads (`admin`, `is_paused`) keep working; and after the
/// admin unpauses, the same mutating call succeeds.
#[test]
fn paused_blocks_writes_and_admin_can_unpause() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, admin, _token) = setup_with_token(&env);
    let creator = Address::generate(&env);

    client.set_paused(&admin, &true);
    assert!(client.is_paused(), "vault must report paused after set_paused(true)");

    let result = client.try_group_create(&creator, &soroban_sdk::String::from_str(&env, "pool"));
    assert_eq!(
        result,
        Err(Ok(Error::Paused)),
        "mutating entrypoints must be rejected with Paused while paused",
    );

    // Reads remain available while paused.
    assert_eq!(client.admin(), admin);

    client.set_paused(&admin, &false);
    assert!(!client.is_paused(), "vault must report unpaused after set_paused(false)");

    let group_id = client.group_create(&creator, &soroban_sdk::String::from_str(&env, "pool"));
    let group = client.group(&group_id);
    assert_eq!(group.creator, creator, "group_create must succeed once unpaused");
}

/// Only the admin may pause/unpause the vault.
#[test]
fn set_paused_by_non_admin_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _admin, _token) = setup_with_token(&env);
    let attacker = Address::generate(&env);

    let result = client.try_set_paused(&attacker, &true);
    assert_eq!(
        result,
        Err(Ok(Error::Unauthorized)),
        "non-admin must not be able to pause the vault",
    );
    assert!(!client.is_paused(), "vault must remain unpaused after a rejected pause attempt");
}

// ---------------------------------------------------------------------------
// Issue #41 — Property test: split rounding sums to pool
//
// Weighted settlement must never create or destroy funds via rounding: for
// any valid share configuration (bps values summing to `TOTAL_BPS`) and any
// pool balance, the computed per-member payouts must sum to exactly the
// pool, and every individual payout must be non-negative.
// ---------------------------------------------------------------------------

mod group_split_properties {
    use crate::group_split::{compute_payouts, TOTAL_BPS};
    use proptest::prelude::*;
    use soroban_sdk::{testutils::Address as _, Address, Env, Map};

    /// Build a valid `shares_bps` map from arbitrary positive `weights`:
    /// each member's bps is proportional to its weight, and the last
    /// member absorbs whatever rounding remainder is needed so the shares
    /// sum to exactly `TOTAL_BPS` (a precondition `set_shares` enforces
    /// on-chain).
    fn shares_from_weights(env: &Env, weights: &[u32]) -> (soroban_sdk::Vec<Address>, Map<Address, u32>) {
        let mut addrs: soroban_sdk::Vec<Address> = soroban_sdk::Vec::new(env);
        for _ in weights {
            addrs.push_back(Address::generate(env));
        }

        let total_weight: u64 = weights.iter().map(|w| *w as u64).sum();
        let mut shares: Map<Address, u32> = Map::new(env);
        let mut distributed: u32 = 0;

        for (i, w) in weights.iter().enumerate() {
            let member = addrs.get(i as u32).unwrap();
            let bps = if i + 1 == weights.len() {
                TOTAL_BPS - distributed
            } else {
                let bps = ((*w as u64) * (TOTAL_BPS as u64) / total_weight) as u32;
                distributed += bps;
                bps
            };
            shares.set(member, bps);
        }

        (addrs, shares)
    }

    proptest! {
        /// For any valid shares configuration and any non-negative pool
        /// balance, settlement conserves the pool exactly: the sum of
        /// computed payouts equals the pool, and no payout is negative.
        #[test]
        fn split_rounding_sums_to_pool(
            weights in proptest::collection::vec(1u32..=1_000u32, 1..=8),
            pool in 0i128..=1_000_000_000_000_000i128,
        ) {
            let env = Env::default();
            let (addrs, shares) = shares_from_weights(&env, &weights);
            let remainder_recipient = addrs.get(0).unwrap();

            let payouts = compute_payouts(&env, &shares, pool, &remainder_recipient);

            let mut sum: i128 = 0;
            for (_member, amount) in payouts.iter() {
                prop_assert!(amount >= 0, "every payout must be non-negative, got {}", amount);
                sum += amount;
            }

            prop_assert_eq!(sum, pool, "sum of payouts must equal the pool exactly");
        }
    }
}
