// Stellar/Soroban testnet config and contract interaction utilities

import type { rpc as SorobanRpc, Transaction } from '@stellar/stellar-sdk';

export const CONTRACT_ID = import.meta.env.VITE_CONTRACT_ID || '';

export const NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';
export const RPC_URL = 'https://soroban-testnet.stellar.org';
export const STELLAR_EXPERT_URL = 'https://stellar.expert/explorer/testnet';

export function stellarExpertTxUrl(txHash: string): string {
  return `${STELLAR_EXPERT_URL}/tx/${txHash}`;
}

export function stellarExpertContractUrl(contractId: string): string {
  return `${STELLAR_EXPERT_URL}/contract/${contractId}`;
}

export async function submitTransaction(
  signedTx: Transaction,
  rpc: SorobanRpc.Server | null,
): Promise<{ hash: string; status: string }> {
  if (!rpc) {
    throw new Error('RPC not initialized');
  }
  const result = await rpc.sendTransaction(signedTx);
  if (result.status === 'ERROR') {
    throw new Error(`Transaction failed: ${result.errorResult?.result() || 'unknown error'}`);
  }
  return { hash: result.hash, status: result.status };
}
