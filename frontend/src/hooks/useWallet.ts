import { useState, useEffect, useCallback } from 'react';
import { rpc as SorobanRpc } from '@stellar/stellar-sdk';
import { RPC_URL } from '../lib/contract';

interface WalletState {
  connected: boolean;
  publicKey: string | null;
  network: string;
  networkPassphrase: string;
  error: string | null;
}

declare global {
  interface Window {
    freighterApi?: {
      isConnected: () => Promise<{ isConnected: boolean }>;
      getPublicKey: () => Promise<string>;
      getNetwork: () => Promise<string>;
      getNetworkDetails: () => Promise<{ network: string; networkPassphrase: string }>;
      requestAccess: () => Promise<{ error?: string }>;
      signTransaction: (xdr: string, opts?: { networkPassphrase?: string; accountToSign?: string }) => Promise<{ signedTxXdr: string }>;
    };
  }
}

const TESTNET_PASSPHRASE = 'Test SDF Network ; September 2015';

export function useWallet() {
  const [wallet, setWallet] = useState<WalletState>({
    connected: false,
    publicKey: null,
    network: '',
    networkPassphrase: '',
    error: null,
  });
  const [rpc, setRpc] = useState<SorobanRpc.Server | null>(null);

  const freighter = typeof window !== 'undefined' ? window.freighterApi : undefined;

  const connect = useCallback(async () => {
    if (!freighter) {
      setWallet((w) => ({ ...w, error: 'Freighter wallet not installed. Please install the Freighter browser extension.' }));
      return;
    }

    try {
      const access = await freighter.requestAccess();
      if (access.error) {
        setWallet((w) => ({ ...w, error: access.error || null }));
        return;
      }

      const [pubKey, network, details] = await Promise.all([
        freighter.getPublicKey(),
        freighter.getNetwork(),
        freighter.getNetworkDetails(),
      ]);

      const networkPassphrase = details.networkPassphrase;

      setWallet({
        connected: true,
        publicKey: pubKey,
        network,
        networkPassphrase,
        error: null,
      });

      setRpc(new SorobanRpc.Server(RPC_URL));
    } catch (e) {
      setWallet((w) => ({ ...w, error: (e as Error).message }));
    }
  }, [freighter]);

  const disconnect = useCallback(() => {
    setWallet({
      connected: false,
      publicKey: null,
      network: '',
      networkPassphrase: '',
      error: null,
    });
    setRpc(null);
  }, []);

  const isTestnet = wallet.networkPassphrase === TESTNET_PASSPHRASE;

  // Auto-check connection on mount
  useEffect(() => {
    if (!freighter) return;
    freighter.isConnected().then((res) => {
      if (res.isConnected) {
        connect();
      }
    });
  }, [freighter, connect]);

  return {
    ...wallet,
    rpc,
    isTestnet,
    connect,
    disconnect,
    freighter,
  };
}
