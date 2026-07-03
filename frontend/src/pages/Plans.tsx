import { useState } from 'react';
import { useWalletContext } from '../lib/WalletContext';

interface PlanDisplay {
  id: string;
  name: string;
  merchant: string;
  amount: string;
  period: string;
  active: boolean;
}

const DEMO_PLANS: PlanDisplay[] = [
  { id: '0', name: 'Netflix', merchant: 'G...XYZ', amount: '15.00 XLM', period: '30 days', active: true },
  { id: '1', name: 'Gym Membership', merchant: 'G...ABC', amount: '50.00 XLM', period: '30 days', active: true },
  { id: '2', name: 'SaaS Pro', merchant: 'G...DEF', amount: '99.00 XLM', period: '30 days', active: true },
  { id: '3', name: 'Newsletter', merchant: 'G...GHI', amount: '5.00 XLM', period: '7 days', active: true },
  { id: '4', name: 'Cloud Storage', merchant: 'G...JKL', amount: '10.00 XLM', period: '1 day', active: false },
];

export default function Plans() {
  const { connected, isTestnet } = useWalletContext();
  const [showCreate, setShowCreate] = useState(false);
  const [plans] = useState<PlanDisplay[]>(DEMO_PLANS);

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <h2 className="text-2xl font-bold">Connect Your Wallet</h2>
        <p className="text-gray-400">Connect Freighter to browse subscription plans.</p>
      </div>
    );
  }

  if (!isTestnet) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <div className="bg-red-900/20 border border-red-800 rounded-xl p-6 text-center">
          <h2 className="text-red-400 font-semibold text-xl mb-2">Wrong Network</h2>
          <p className="text-gray-400">Please switch Freighter to Stellar Testnet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Browse Plans</h1>
          <p className="text-gray-400 mt-1">Discover and subscribe to recurring payment plans</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 rounded-lg bg-stellar-600 text-white hover:bg-stellar-500 transition-colors text-sm font-medium min-h-[44px]"
        >
          {showCreate ? 'Cancel' : 'Create Plan'}
        </button>
      </div>

      {showCreate && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
          <h3 className="font-semibold text-lg">Create a New Plan</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Plan Name</label>
              <input
                type="text"
                placeholder="e.g. Netflix"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-stellar-500 min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Token</label>
              <input
                type="text"
                placeholder="Token contract address"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-stellar-500 min-h-[44px] font-mono"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Amount (stroops)</label>
              <input
                type="number"
                placeholder="e.g. 150000000"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-stellar-500 min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Period (seconds)</label>
              <input
                type="number"
                placeholder="e.g. 2592000 (30 days)"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-stellar-500 min-h-[44px]"
              />
            </div>
          </div>
          <button className="px-6 py-2.5 rounded-lg bg-stellar-600 text-white hover:bg-stellar-500 transition-colors text-sm font-semibold min-h-[44px]">
            Deploy Plan
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3 hover:border-gray-700 transition-colors"
          >
            <div className="flex items-start justify-between">
              <h3 className="font-semibold text-lg">{plan.name}</h3>
              {plan.active ? (
                <span className="text-xs px-2 py-1 rounded-full bg-green-900/50 text-green-400 border border-green-800">
                  Active
                </span>
              ) : (
                <span className="text-xs px-2 py-1 rounded-full bg-gray-800 text-gray-400 border border-gray-700">
                  Inactive
                </span>
              )}
            </div>
            <div className="text-2xl font-bold text-stellar-400">
              {plan.amount.split(' ')[0]} <span className="text-sm font-normal text-gray-500">XLM/{plan.period}</span>
            </div>
            <p className="text-xs text-gray-500">
              Merchant: <span className="font-mono">{plan.merchant}</span>
            </p>
            {plan.active && (
              <button
                onClick={() => {
                  // Subscribe action
                }}
                className="w-full px-4 py-2.5 rounded-lg bg-stellar-600 text-white hover:bg-stellar-500 transition-colors text-sm font-medium min-h-[44px]"
              >
                Subscribe
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
