import { createContext, useContext } from 'react';
import type { useWallet } from '../hooks/useWallet';

export type WalletContextType = ReturnType<typeof useWallet>;

export const WalletContext = createContext<WalletContextType | null>(null);

export function useWalletContext() {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    throw new Error('useWalletContext must be used within WalletContext.Provider');
  }
  return ctx;
}
