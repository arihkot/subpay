import { describe, it, expect, vi } from 'vitest';
import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { stellarExpertTxUrl, stellarExpertContractUrl } from '../lib/contract';
import { WalletContext } from '../lib/WalletContext';

// Helper to render with context
function renderWithContext(ui: ReactElement, walletOverrides = {}) {
  const defaultWallet = {
    connected: false,
    publicKey: null,
    network: '',
    networkPassphrase: '',
    error: null,
    rpc: null,
    isTestnet: false,
    connect: vi.fn(),
    disconnect: vi.fn(),
    freighter: undefined,
    ...walletOverrides,
  };

  return render(
    <WalletContext.Provider value={defaultWallet as any}>
      <BrowserRouter>{ui}</BrowserRouter>
    </WalletContext.Provider>
  );
}

describe('Landing page', () => {
  it('renders Connect button when wallet disconnected', () => {
    renderWithContext(<Landing />);
    expect(screen.getByText('Connect Freighter to Start')).toBeDefined();
  });

  it('shows dashboard link when connected and on testnet', () => {
    renderWithContext(<Landing />, {
      connected: true,
      isTestnet: true,
      publicKey: 'GBD...XYZ',
      networkPassphrase: 'Test SDF Network ; September 2015',
    });
    expect(screen.getByText('Go to Dashboard')).toBeDefined();
  });

  it('shows switch-network prompt on wrong network', () => {
    renderWithContext(<Landing />, {
      connected: true,
      isTestnet: false,
      publicKey: 'GBD...XYZ',
      networkPassphrase: 'Public Global Stellar Network ; September 2015',
    });
    expect(screen.getByText('Wrong Network')).toBeDefined();
  });
});

describe('Dashboard page', () => {
  it('prompts wallet connect when disconnected', () => {
    renderWithContext(<Dashboard />);
    expect(screen.getByText('Connect Your Wallet')).toBeDefined();
  });

  it('shows subscription table when connected', async () => {
    renderWithContext(<Dashboard />, {
      connected: true,
      isTestnet: true,
      publicKey: 'GBD...XYZ',
      networkPassphrase: 'Test SDF Network ; September 2015',
    });
    // Wait for mock subscriptions to load
    expect(await screen.findByText('Your Subscriptions')).toBeDefined();
    const netflixLinks = await screen.findAllByText('Netflix');
    expect(netflixLinks.length).toBeGreaterThanOrEqual(1);
  });
});

describe('Tx hash link', () => {
  it('renders correct Stellar Expert URL', () => {
    const url = stellarExpertTxUrl('abc123');
    expect(url).toBe('https://stellar.expert/explorer/testnet/tx/abc123');
  });

  it('renders correct Stellar Expert contract URL', () => {
    const url = stellarExpertContractUrl('CDEF456');
    expect(url).toBe('https://stellar.expert/explorer/testnet/contract/CDEF456');
  });
});

describe('Network guard', () => {
  it('shows wrong network message in dashboard', async () => {
    renderWithContext(<Dashboard />, {
      connected: true,
      isTestnet: false,
      publicKey: 'GBD...XYZ',
      networkPassphrase: 'Public Global Stellar Network ; September 2015',
    });
    expect(await screen.findByText('Wrong Network')).toBeDefined();
  });
});

// Import components after define to avoid hoisting issues
import Landing from '../pages/Landing';
import Dashboard from '../pages/Dashboard';
