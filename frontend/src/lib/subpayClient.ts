import {
  Contract,
  nativeToScVal,
  scValToNative,
  Address,
  TransactionBuilder,
  Account,
  rpc as SorobanRpc,
  Transaction,
} from '@stellar/stellar-sdk';
import {
  CONTRACT_ID,
  NETWORK_PASSPHRASE,
  RPC_URL,
} from './contract';

const STROOP = 10_000_000n;

function scvU64(val: number | bigint) {
  return nativeToScVal(BigInt(val), { type: 'u64' });
}

function scvI128(val: bigint) {
  return nativeToScVal(val, { type: 'i128' });
}

function scvAddress(val: string) {
  return new Address(val).toScVal();
}

function scvSymbol(val: string) {
  return nativeToScVal(val, { type: 'symbol' });
}

function buildTxBuilder(
  sourcePublicKey: string,
  op: ReturnType<Contract['call']>,
) {
  const account = new Account(sourcePublicKey, '0');
  return new TransactionBuilder(account, {
    fee: '100000',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(op)
    .setTimeout(300);
}

const serverCache = new Map<string, SorobanRpc.Server>();

function getServer(): SorobanRpc.Server {
  const key = RPC_URL;
  if (!serverCache.has(key)) {
    serverCache.set(key, new SorobanRpc.Server(RPC_URL));
  }
  return serverCache.get(key)!;
}

export interface SubPayPlan {
  id: number;
  merchant: string;
  token: string;
  amount: string;
  period: number;
  name: string;
  active: boolean;
}

export interface SubPaySubscription {
  id: number;
  subscriber: string;
  plan_id: number;
  vault_balance: string;
  next_due: number;
  active: boolean;
  created_at: number;
}

export interface ContractCallResult {
  hash: string;
  result: unknown;
}

export function stroopsToXlm(stroops: string | bigint): string {
  const val = typeof stroops === 'string' ? BigInt(stroops) : stroops;
  return (Number(val) / Number(STROOP)).toFixed(7);
}

export function xlmToStroops(xlm: number): bigint {
  return BigInt(Math.floor(xlm * Number(STROOP)));
}

export function getContract(): Contract {
  if (!CONTRACT_ID) {
    throw new Error('VITE_CONTRACT_ID not configured');
  }
  return new Contract(CONTRACT_ID);
}

export async function simulateRead<T = unknown>(
  method: string,
  args: ReturnType<typeof nativeToScVal>[],
  sourcePublicKey: string,
): Promise<T> {
  const contract = getContract();
  const op = contract.call(method, ...args);
  const txBuilder = buildTxBuilder(sourcePublicKey, op);
  const tx = txBuilder.build();
  const rpc = getServer();
  const simResult = await rpc.simulateTransaction(tx);

  if ('error' in simResult) {
    throw new Error(`Simulation failed for ${method}: ${simResult.error}`);
  }

  if (!simResult.result) {
    throw new Error(`Simulation failed for ${method}: no result`);
  }

  return scValToNative(simResult.result.retval) as T;
}

export async function simulateAndSend(
  method: string,
  args: ReturnType<typeof nativeToScVal>[],
  sourcePublicKey: string,
  signTransaction: (xdr: string) => Promise<string>,
): Promise<ContractCallResult> {
  const contract = getContract();
  const op = contract.call(method, ...args);
  const rpc = getServer();

  let account: Account;
  try {
    account = await rpc.getAccount(sourcePublicKey);
  } catch {
    account = new Account(sourcePublicKey, '0');
  }

  const txBuilder = new TransactionBuilder(account, {
    fee: '100000',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(op)
    .setTimeout(300);

  const tx = txBuilder.build();
  const prepared = await rpc.prepareTransaction(tx);
  const signedXdr = await signTransaction(prepared.toXDR());
  const signedTx = TransactionBuilder.fromXDR(
    signedXdr,
    NETWORK_PASSPHRASE,
  ) as Transaction;
  const sendResult = await rpc.sendTransaction(signedTx);

  if (sendResult.status === 'ERROR') {
    throw new Error('Transaction submission failed');
  }

  return { hash: sendResult.hash, result: null };
}

export async function getPlanCount(sourcePublicKey: string): Promise<number> {
  return simulateRead<number>('get_plan_count', [], sourcePublicKey);
}

export async function getPlan(
  planId: number,
  sourcePublicKey: string,
): Promise<SubPayPlan> {
  const raw = await simulateRead<Record<string, unknown>>(
    'get_plan',
    [scvU64(planId)],
    sourcePublicKey,
  );
  return {
    id: Number(raw.id),
    merchant: typeof raw.merchant === 'string' ? raw.merchant : Address.fromScVal(raw.merchant as never).toString(),
    token: typeof raw.token === 'string' ? raw.token : Address.fromScVal(raw.token as never).toString(),
    amount: String(raw.amount),
    period: Number(raw.period),
    name: String(raw.name),
    active: Boolean(raw.active),
  };
}

export async function getSubCount(sourcePublicKey: string): Promise<number> {
  return simulateRead<number>('get_sub_count', [], sourcePublicKey);
}

export async function getSubscription(
  subId: number,
  sourcePublicKey: string,
): Promise<SubPaySubscription> {
  const raw = await simulateRead<Record<string, unknown>>(
    'get_subscription',
    [scvU64(subId)],
    sourcePublicKey,
  );
  return {
    id: Number(raw.id),
    subscriber: typeof raw.subscriber === 'string' ? raw.subscriber : Address.fromScVal(raw.subscriber as never).toString(),
    plan_id: Number(raw.plan_id),
    vault_balance: String(raw.vault_balance),
    next_due: Number(raw.next_due),
    active: Boolean(raw.active),
    created_at: Number(raw.created_at),
  };
}

export async function listSubscriptions(
  subscriber: string,
  sourcePublicKey: string,
): Promise<number[]> {
  const raw = await simulateRead<unknown[]>(
    'list_subscriptions',
    [scvAddress(subscriber)],
    sourcePublicKey,
  );
  return Array.isArray(raw) ? raw.map((id: unknown) => Number(id)) : [];
}

export async function createPlan(
  merchant: string,
  token: string,
  amount: bigint,
  period: number,
  name: string,
  sourcePublicKey: string,
  signTransaction: (xdr: string) => Promise<string>,
): Promise<ContractCallResult> {
  return simulateAndSend(
    'create_plan',
    [scvAddress(merchant), scvAddress(token), scvI128(amount), scvU64(period), scvSymbol(name)],
    sourcePublicKey,
    signTransaction,
  );
}

export async function subscribe(
  subscriber: string,
  planId: number,
  sourcePublicKey: string,
  signTransaction: (xdr: string) => Promise<string>,
): Promise<ContractCallResult> {
  return simulateAndSend(
    'subscribe',
    [scvAddress(subscriber), scvU64(planId)],
    sourcePublicKey,
    signTransaction,
  );
}

export async function fundVault(
  subscriber: string,
  subId: number,
  amount: bigint,
  sourcePublicKey: string,
  signTransaction: (xdr: string) => Promise<string>,
): Promise<ContractCallResult> {
  return simulateAndSend(
    'fund_vault',
    [scvAddress(subscriber), scvU64(subId), scvI128(amount)],
    sourcePublicKey,
    signTransaction,
  );
}

export async function claimPayment(
  caller: string,
  subId: number,
  sourcePublicKey: string,
  signTransaction: (xdr: string) => Promise<string>,
): Promise<ContractCallResult> {
  return simulateAndSend(
    'claim_payment',
    [scvAddress(caller), scvU64(subId)],
    sourcePublicKey,
    signTransaction,
  );
}

export async function cancelSubscription(
  subscriber: string,
  subId: number,
  sourcePublicKey: string,
  signTransaction: (xdr: string) => Promise<string>,
): Promise<ContractCallResult> {
  return simulateAndSend(
    'cancel_subscription',
    [scvAddress(subscriber), scvU64(subId)],
    sourcePublicKey,
    signTransaction,
  );
}
