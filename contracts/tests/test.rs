#![cfg(test)]

use soroban_sdk::{
    testutils::{Address as _, Ledger, LedgerInfo},
    token, Address, Env, Symbol,
};
use subpay::{SubPay, SubPayClient};

fn create_token_contract(e: &Env, admin: &Address) -> Address {
    let contract_id = e.register_stellar_asset_contract_v2(admin.clone());
    contract_id.address()
}

fn mint_tokens(e: &Env, token: &Address, _admin: &Address, to: &Address, amount: &i128) {
    let sac = token::StellarAssetClient::new(e, token);
    sac.mint(to, amount);
}

fn setup_contract(env: &Env) -> (SubPayClient<'_>, Address, Address) {
    let admin = Address::generate(&env);
    let contract_id = env.register(SubPay, ());
    let client = SubPayClient::new(&env, &contract_id);
    client.initialize(&admin);
    (client, contract_id, admin)
}

#[test]
fn test_initialize() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let contract_id = env.register(SubPay, ());
    let client = SubPayClient::new(&env, &contract_id);

    client.initialize(&admin);
    assert_eq!(client.get_plan_count(), 0u64);
    assert_eq!(client.get_sub_count(), 0u64);
}

#[test]
#[should_panic(expected = "Already initialized")]
fn test_initialize_twice_fails() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let contract_id = env.register(SubPay, ());
    let client = SubPayClient::new(&env, &contract_id);
    client.initialize(&admin);
    client.initialize(&admin);
}

#[test]
fn test_create_plan() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, _contract_id, _admin) = setup_contract(&env);

    let merchant = Address::generate(&env);
    let token = create_token_contract(&env, &merchant);
    let amount: i128 = 10_0000000;
    let period: u64 = 2592000;

    let plan_id = client.create_plan(
        &merchant,
        &token,
        &amount,
        &period,
        &Symbol::new(&env, "Netflix"),
    );

    assert_eq!(plan_id, 0u64);
    assert_eq!(client.get_plan_count(), 1u64);

    let plan = client.get_plan(&plan_id);
    assert_eq!(plan.id, 0u64);
    assert_eq!(plan.merchant, merchant);
    assert_eq!(plan.amount, amount);
    assert_eq!(plan.period, period);
    assert!(plan.active);
}

#[test]
fn test_subscribe_and_fund() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, _contract_id, _admin) = setup_contract(&env);

    let merchant = Address::generate(&env);
    let subscriber = Address::generate(&env);
    let token = create_token_contract(&env, &merchant);

    let plan_id = client.create_plan(
        &merchant,
        &token,
        &10_0000000i128,
        &2592000u64,
        &Symbol::new(&env, "Gym"),
    );

    let sub_id = client.subscribe(&subscriber, &plan_id);
    assert_eq!(sub_id, 0u64);

    let sub = client.get_subscription(&sub_id);
    assert_eq!(sub.subscriber, subscriber);
    assert_eq!(sub.plan_id, plan_id);
    assert_eq!(sub.vault_balance, 0i128);
    assert!(sub.active);

    mint_tokens(&env, &token, &merchant, &subscriber, &100_0000000i128);

    client.fund_vault(&subscriber, &sub_id, &30_0000000i128);

    let sub = client.get_subscription(&sub_id);
    assert_eq!(sub.vault_balance, 30_0000000i128);
}

#[test]
fn test_claim_before_due_fails() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, _contract_id, _admin) = setup_contract(&env);

    let merchant = Address::generate(&env);
    let subscriber = Address::generate(&env);
    let token = create_token_contract(&env, &merchant);

    let plan_id = client.create_plan(
        &merchant,
        &token,
        &10_0000000i128,
        &2592000u64,
        &Symbol::new(&env, "SaaS"),
    );

    let sub_id = client.subscribe(&subscriber, &plan_id);
    mint_tokens(&env, &token, &merchant, &subscriber, &100_0000000i128);
    client.fund_vault(&subscriber, &sub_id, &50_0000000i128);

    let result = client.try_claim_payment(&merchant, &sub_id);
    assert!(result.is_err());
}

#[test]
fn test_claim_transfers_and_advances() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, _contract_id, _admin) = setup_contract(&env);

    let merchant = Address::generate(&env);
    let subscriber = Address::generate(&env);
    let token = create_token_contract(&env, &merchant);

    let period: u64 = 2592000;
    let amount: i128 = 10_0000000;

    let plan_id = client.create_plan(
        &merchant,
        &token,
        &amount,
        &period,
        &Symbol::new(&env, "Pro"),
    );

    let sub_id = client.subscribe(&subscriber, &plan_id);
    mint_tokens(&env, &token, &merchant, &subscriber, &100_0000000i128);
    client.fund_vault(&subscriber, &sub_id, &50_0000000i128);

    let sub = client.get_subscription(&sub_id);
    let original_next_due = sub.next_due;

    env.ledger().set(LedgerInfo {
        timestamp: original_next_due + 1,
        protocol_version: 22,
        sequence_number: 100,
        network_id: Default::default(),
        base_reserve: 10,
        min_temp_entry_ttl: 16,
        min_persistent_entry_ttl: 4096,
        max_entry_ttl: 6312000,
    });

    client.claim_payment(&merchant, &sub_id);

    let sub = client.get_subscription(&sub_id);
    assert_eq!(sub.vault_balance, 40_0000000i128);
    assert_eq!(sub.next_due, original_next_due + period);
}

#[test]
fn test_cancel_refunds_vault() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, _contract_id, _admin) = setup_contract(&env);

    let merchant = Address::generate(&env);
    let subscriber = Address::generate(&env);
    let token = create_token_contract(&env, &merchant);

    let plan_id = client.create_plan(
        &merchant,
        &token,
        &10_0000000i128,
        &2592000u64,
        &Symbol::new(&env, "Newsletter"),
    );

    let sub_id = client.subscribe(&subscriber, &plan_id);
    mint_tokens(&env, &token, &merchant, &subscriber, &100_0000000i128);
    client.fund_vault(&subscriber, &sub_id, &30_0000000i128);

    client.cancel_subscription(&subscriber, &sub_id);

    let sub = client.get_subscription(&sub_id);
    assert!(!sub.active);
    assert_eq!(sub.vault_balance, 0i128);
}

#[test]
fn test_claim_insufficient_vault_fails() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, _contract_id, _admin) = setup_contract(&env);

    let merchant = Address::generate(&env);
    let subscriber = Address::generate(&env);
    let token = create_token_contract(&env, &merchant);

    let amount: i128 = 10_0000000;
    let period: u64 = 2592000;

    let plan_id = client.create_plan(
        &merchant,
        &token,
        &amount,
        &period,
        &Symbol::new(&env, "Budget"),
    );

    let sub_id = client.subscribe(&subscriber, &plan_id);
    mint_tokens(&env, &token, &merchant, &subscriber, &100_0000000i128);
    client.fund_vault(&subscriber, &sub_id, &5_0000000i128);

    let sub = client.get_subscription(&sub_id);
    let next_due = sub.next_due;

    env.ledger().set(LedgerInfo {
        timestamp: next_due + 1,
        protocol_version: 22,
        sequence_number: 100,
        network_id: Default::default(),
        base_reserve: 10,
        min_temp_entry_ttl: 16,
        min_persistent_entry_ttl: 4096,
        max_entry_ttl: 6312000,
    });

    let result = client.try_claim_payment(&merchant, &sub_id);
    assert!(result.is_err());
}

#[test]
fn test_list_subscriptions() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, _contract_id, _admin) = setup_contract(&env);

    let merchant = Address::generate(&env);
    let subscriber = Address::generate(&env);
    let token = create_token_contract(&env, &merchant);

    let plan1 = client.create_plan(
        &merchant,
        &token,
        &5_0000000i128,
        &86400u64,
        &Symbol::new(&env, "Daily"),
    );

    let plan2 = client.create_plan(
        &merchant,
        &token,
        &15_0000000i128,
        &604800u64,
        &Symbol::new(&env, "Weekly"),
    );

    let sub1 = client.subscribe(&subscriber, &plan1);
    let sub2 = client.subscribe(&subscriber, &plan2);

    let subs = client.list_subscriptions(&subscriber);
    assert_eq!(subs.len(), 2);
    assert!(subs.contains(sub1));
    assert!(subs.contains(sub2));
}
