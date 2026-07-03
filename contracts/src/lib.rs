#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, token, Address, Env, Symbol, Vec,
};

#[derive(Clone, Debug)]
#[contracttype]
pub enum DataKey {
    Admin,
    PlanCount,
    Plan(u64),
    SubCount,
    Sub(u64),
    SubList(Address),
}

#[derive(Clone, Debug, PartialEq)]
#[contracttype]
pub struct Plan {
    pub id: u64,
    pub merchant: Address,
    pub token: Address,
    pub amount: i128,
    pub period: u64,
    pub name: Symbol,
    pub active: bool,
}

#[derive(Clone, Debug, PartialEq)]
#[contracttype]
pub struct Subscription {
    pub id: u64,
    pub subscriber: Address,
    pub plan_id: u64,
    pub vault_balance: i128,
    pub next_due: u64,
    pub active: bool,
    pub created_at: u64,
}

#[contract]
pub struct SubPay;

#[contractimpl]
impl SubPay {
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("Already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::PlanCount, &0u64);
        env.storage().instance().set(&DataKey::SubCount, &0u64);
    }

    pub fn create_plan(
        env: Env,
        merchant: Address,
        token: Address,
        amount: i128,
        period: u64,
        name: Symbol,
    ) -> u64 {
        merchant.require_auth();
        require_admin_initialized(&env);

        let mut plan_count: u64 = env
            .storage()
            .instance()
            .get(&DataKey::PlanCount)
            .unwrap_or(0);
        let plan_id = plan_count;
        plan_count += 1;

        let plan = Plan {
            id: plan_id,
            merchant,
            token,
            amount,
            period,
            name,
            active: true,
        };

        env.storage().instance().set(&DataKey::Plan(plan_id), &plan);
        env.storage()
            .instance()
            .set(&DataKey::PlanCount, &plan_count);

        env.events().publish(
            (symbol_short!("plan_new"),),
            (plan_id, plan.merchant.clone(), plan.amount, plan.period),
        );

        plan_id
    }

    pub fn subscribe(env: Env, subscriber: Address, plan_id: u64) -> u64 {
        subscriber.require_auth();
        require_admin_initialized(&env);

        let plan: Plan = env
            .storage()
            .instance()
            .get(&DataKey::Plan(plan_id))
            .unwrap_or_else(|| panic!("Plan not found"));

        if !plan.active {
            panic!("Plan is not active");
        }

        let mut sub_count: u64 = env
            .storage()
            .instance()
            .get(&DataKey::SubCount)
            .unwrap_or(0);
        let sub_id = sub_count;
        sub_count += 1;

        let ledger_ts = env.ledger().timestamp();

        let sub = Subscription {
            id: sub_id,
            subscriber: subscriber.clone(),
            plan_id,
            vault_balance: 0,
            next_due: ledger_ts + plan.period,
            active: true,
            created_at: ledger_ts,
        };

        env.storage().instance().set(&DataKey::Sub(sub_id), &sub);
        env.storage().instance().set(&DataKey::SubCount, &sub_count);

        let mut sub_list: Vec<u64> = env
            .storage()
            .instance()
            .get(&DataKey::SubList(subscriber.clone()))
            .unwrap_or(Vec::new(&env));
        sub_list.push_back(sub_id);
        env.storage()
            .instance()
            .set(&DataKey::SubList(subscriber.clone()), &sub_list);

        env.events().publish(
            (symbol_short!("sub_new"),),
            (sub_id, subscriber, plan_id, sub.next_due),
        );

        sub_id
    }

    pub fn fund_vault(env: Env, subscriber: Address, sub_id: u64, amount: i128) {
        subscriber.require_auth();

        let mut sub: Subscription = env
            .storage()
            .instance()
            .get(&DataKey::Sub(sub_id))
            .unwrap_or_else(|| panic!("Subscription not found"));

        if sub.subscriber != subscriber {
            panic!("Not your subscription");
        }
        if !sub.active {
            panic!("Subscription is not active");
        }
        if amount <= 0 {
            panic!("Amount must be positive");
        }

        let plan: Plan = env
            .storage()
            .instance()
            .get(&DataKey::Plan(sub.plan_id))
            .unwrap_or_else(|| panic!("Plan not found"));

        let token_client = token::Client::new(&env, &plan.token);
        token_client.transfer(&subscriber, &env.current_contract_address(), &amount);

        sub.vault_balance += amount;
        env.storage().instance().set(&DataKey::Sub(sub_id), &sub);

        env.events().publish(
            (symbol_short!("funded"),),
            (sub_id, subscriber, amount, sub.vault_balance),
        );
    }

    pub fn claim_payment(env: Env, caller: Address, sub_id: u64) {
        caller.require_auth();

        let mut sub: Subscription = env
            .storage()
            .instance()
            .get(&DataKey::Sub(sub_id))
            .unwrap_or_else(|| panic!("Subscription not found"));

        if !sub.active {
            panic!("Subscription is not active");
        }

        let plan: Plan = env
            .storage()
            .instance()
            .get(&DataKey::Plan(sub.plan_id))
            .unwrap_or_else(|| panic!("Plan not found"));

        let now = env.ledger().timestamp();

        if now < sub.next_due {
            panic!("Payment is not yet due");
        }

        if sub.vault_balance < plan.amount {
            panic!("Insufficient vault balance");
        }

        sub.vault_balance -= plan.amount;
        sub.next_due += plan.period;
        env.storage().instance().set(&DataKey::Sub(sub_id), &sub);

        let token_client = token::Client::new(&env, &plan.token);
        token_client.transfer(
            &env.current_contract_address(),
            &plan.merchant,
            &plan.amount,
        );

        env.events().publish(
            (symbol_short!("claimed"),),
            (
                sub_id,
                sub.subscriber.clone(),
                plan.merchant.clone(),
                plan.amount,
                sub.next_due,
            ),
        );
    }

    pub fn cancel_subscription(env: Env, subscriber: Address, sub_id: u64) {
        subscriber.require_auth();

        let mut sub: Subscription = env
            .storage()
            .instance()
            .get(&DataKey::Sub(sub_id))
            .unwrap_or_else(|| panic!("Subscription not found"));

        if sub.subscriber != subscriber {
            panic!("Not your subscription");
        }
        if !sub.active {
            panic!("Subscription already cancelled");
        }

        sub.active = false;
        let refund_amount = sub.vault_balance;
        sub.vault_balance = 0;
        env.storage().instance().set(&DataKey::Sub(sub_id), &sub);

        if refund_amount > 0 {
            let plan: Plan = env
                .storage()
                .instance()
                .get(&DataKey::Plan(sub.plan_id))
                .unwrap_or_else(|| panic!("Plan not found"));

            let token_client = token::Client::new(&env, &plan.token);
            token_client.transfer(&env.current_contract_address(), &subscriber, &refund_amount);
        }

        env.events().publish(
            (symbol_short!("cancelled"),),
            (sub_id, subscriber, refund_amount),
        );
    }

    pub fn get_plan(env: Env, plan_id: u64) -> Plan {
        env.storage()
            .instance()
            .get(&DataKey::Plan(plan_id))
            .unwrap_or_else(|| panic!("Plan not found"))
    }

    pub fn get_subscription(env: Env, sub_id: u64) -> Subscription {
        env.storage()
            .instance()
            .get(&DataKey::Sub(sub_id))
            .unwrap_or_else(|| panic!("Subscription not found"))
    }

    pub fn list_subscriptions(env: Env, subscriber: Address) -> Vec<u64> {
        env.storage()
            .instance()
            .get(&DataKey::SubList(subscriber))
            .unwrap_or(Vec::new(&env))
    }

    pub fn get_plan_count(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::PlanCount)
            .unwrap_or(0)
    }

    pub fn get_sub_count(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::SubCount)
            .unwrap_or(0)
    }
}

fn require_admin_initialized(env: &Env) {
    if !env.storage().instance().has(&DataKey::Admin) {
        panic!("Contract not initialized");
    }
}
