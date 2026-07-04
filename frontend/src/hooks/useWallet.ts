import { useState, useEffect, useCallback } from 'react';
import { rpc as SorobanRpc } from '@stellar/stellar-sdk';
import {
  isConnected,
  getAddress,
  getNetwork,
  requestAccess,
  signTransaction,
} from '@stellar/freighter-api';
import { RPC_URL, NETWORK_PASSPHRASE } from '../lib/contract';

interface WalletState {
  connected: boolean;
  publicKey: string | null;
  network: string;
  networkPassphrase: string;
  error: string | null;
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
  const [connecting, setConnecting] = useState(false);
  const [rpc, setRpc] = useState<SorobanRpc.Server | null>(null);

  const connect = useCallback(async () => {
    setConnecting(true);
    setWallet((w) => ({ ...w, error: null }));

    try {
      const access = await requestAccess();
      if (access.error) {
        setWallet((w) => ({ ...w, error: access.error }));
        setConnecting(false);
        return;
      }

      const [addrResult, netResult] = await Promise.all([
        getAddress(),
        getNetwork(),
      ]);

      if (addrResult.error) {
        setWallet((w) => ({ ...w, error: addrResult.error }));
        setConnecting(false);
        return;
      }

      const networkPassphrase = netResult.networkPassphrase;

      setWallet({
        connected: true,
        publicKey: addrResult.address,
        network: netResult.network,
        networkPassphrase,
        error: null,
      });

      setRpc(new SorobanRpc.Server(RPC_URL));
    } catch (e) {
      setWallet((w) => ({ ...w, error: (e as Error).message }));
    }
    setConnecting(false);
  }, []);

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

  const signTx = useCallback(async (xdr: string): Promise<string> => {
    const result = await signTransaction(xdr, {
      networkPassphrase: wallet.networkPassphrase || NETWORK_PASSPHRASE,
      address: wallet.publicKey || undefined,
    });
    if (result.error) {
      throw new Error(result.error);
    }
    return result.signedTxXdr;
  }, [wallet.networkPassphrase, wallet.publicKey]);

  const isTestnet = wallet.networkPassphrase === TESTNET_PASSPHRASE;

  useEffect(() => {
    let cancelled = false;
    isConnected().then((res) => {
      if (!cancelled && res.isConnected) {
        connect();
      }
    });
    return () => { cancelled = true; };
  }, [connect]);

  return {
    ...wallet,
    rpc,
    isTestnet,
    connecting,
    connect,
    disconnect,
    signTx,
  };
}
