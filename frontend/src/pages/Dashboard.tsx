import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useWalletContext } from '../lib/WalletContext';
import { stellarExpertTxUrl } from '../lib/contract';

interface SubDisplay {
  id: string;
  planName: string;
  amount: string;
  period: string;
  nextDue: number;
  vaultBalance: string;
  active: boolean;
  txHash: string;
}

export default function Dashboard() {
  const { connected, isTestnet } = useWalletContext();
  const [subscriptions, setSubscriptions] = useState<SubDisplay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!connected || !isTestnet) {
      setLoading(false);
      return;
    }

    // In production this would query the contract. For now, show demo data.
    const mockSubs: SubDisplay[] = [
      {
        id: '0',
        planName: 'Netflix',
        amount: '15.00 XLM',
        period: '30 days',
        nextDue: Date.now() / 1000 + 86400 * 7,
        vaultBalance: '45.00 XLM',
        active: true,
        txHash: 'abc123def456',
      },
      {
        id: '1',
        planName: 'Gym Membership',
        amount: '50.00 XLM',
        period: '30 days',
        nextDue: Date.now() / 1000 + 86400 * 14,
        vaultBalance: '100.00 XLM',
        active: true,
        txHash: 'def789ghi012',
      },
      {
        id: '2',
        planName: 'SaaS Pro',
        amount: '99.00 XLM',
        period: '30 days',
        nextDue: Date.now() / 1000 - 86400 * 2,
        vaultBalance: '50.00 XLM',
        active: false,
        txHash: 'ghi345jkl678',
      },
    ];

    setSubscriptions(mockSubs);
    setLoading(false);
  }, [connected, isTestnet]);

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <h2 className="text-2xl font-bold">Connect Your Wallet</h2>
        <p className="text-gray-400">Connect Freighter to view your subscriptions.</p>
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

  const activeSubs = subscriptions.filter((s) => s.active);
  const totalSpend = subscriptions.reduce((acc, s) => acc + parseFloat(s.amount), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-gray-400">Loading subscriptions...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-400 mt-1">Manage your recurring payments</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-sm text-gray-500 mb-1">Active Subscriptions</p>
          <p className="text-3xl font-bold text-white">{activeSubs.length}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-sm text-gray-500 mb-1">Monthly Spend</p>
          <p className="text-3xl font-bold text-stellar-400">{totalSpend.toFixed(2)} XLM</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-sm text-gray-500 mb-1">Next Payment Due</p>
          <p className="text-3xl font-bold text-white">
            {activeSubs.length > 0
              ? `${Math.ceil((activeSubs[0].nextDue - Date.now() / 1000) / 86400)}d`
              : '—'}
          </p>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-800">
          <h2 className="font-semibold">Your Subscriptions</h2>
        </div>
        {subscriptions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>No subscriptions yet.</p>
            <Link to="/plans" className="text-stellar-400 hover:underline mt-2 inline-block">
              Browse plans
            </Link>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800 text-left text-sm text-gray-500">
                    <th className="p-4 font-medium">Plan</th>
                    <th className="p-4 font-medium">Amount</th>
                    <th className="p-4 font-medium">Next Due</th>
                    <th className="p-4 font-medium">Vault Balance</th>
                    <th className="p-4 font-medium">Status</th>
                    <th className="p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.map((sub) => (
                    <tr key={sub.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="p-4">
                        <Link to={`/subscription/${sub.id}`} className="text-stellar-400 hover:underline font-medium">
                          {sub.planName}
                        </Link>
                      </td>
                      <td className="p-4 text-sm">{sub.amount}</td>
                      <td className="p-4 text-sm">
                        {sub.nextDue > Date.now() / 1000
                          ? `${Math.ceil((sub.nextDue - Date.now() / 1000) / 86400)} days`
                          : 'Overdue'}
                      </td>
                      <td className="p-4 text-sm">{sub.vaultBalance}</td>
                      <td className="p-4">
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            sub.active
                              ? 'bg-green-900/50 text-green-400 border border-green-800'
                              : 'bg-gray-800 text-gray-400 border border-gray-700'
                          }`}
                        >
                          {sub.active ? 'Active' : 'Cancelled'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          {sub.active && (
                            <button className="text-xs px-3 py-1.5 rounded-lg bg-stellar-600 text-white hover:bg-stellar-500 transition-colors min-h-[44px] min-w-[44px]">
                              Fund
                            </button>
                          )}
                          {sub.active && (
                            <button className="text-xs px-3 py-1.5 rounded-lg bg-red-900/50 text-red-400 hover:bg-red-900/70 transition-colors border border-red-800 min-h-[44px] min-w-[44px]">
                              Cancel
                            </button>
                          )}
                          <a
                            href={stellarExpertTxUrl(sub.txHash)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs px-3 py-1.5 rounded-lg bg-gray-800 text-gray-400 hover:text-white transition-colors border border-gray-700 min-h-[44px] min-w-[44px] flex items-center"
                          >
                            Tx ↗
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-800">
              {subscriptions.map((sub) => (
                <div key={sub.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Link to={`/subscription/${sub.id}`} className="text-stellar-400 hover:underline font-medium">
                      {sub.planName}
                    </Link>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        sub.active
                          ? 'bg-green-900/50 text-green-400 border border-green-800'
                          : 'bg-gray-800 text-gray-400 border border-gray-700'
                      }`}
                    >
                      {sub.active ? 'Active' : 'Cancelled'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">Amount:</span>{' '}
                      <span className="text-white">{sub.amount}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Vault:</span>{' '}
                      <span className="text-white">{sub.vaultBalance}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Next Due:</span>{' '}
                      <span className="text-white">
                        {sub.nextDue > Date.now() / 1000
                          ? `${Math.ceil((sub.nextDue - Date.now() / 1000) / 86400)}d`
                          : 'Overdue'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {sub.active && (
                      <button className="text-xs px-3 py-1.5 rounded-lg bg-stellar-600 text-white hover:bg-stellar-500 transition-colors min-h-[44px] min-w-[44px]">
                        Fund
                      </button>
                    )}
                    {sub.active && (
                      <button className="text-xs px-3 py-1.5 rounded-lg bg-red-900/50 text-red-400 hover:bg-red-900/70 transition-colors border border-red-800 min-h-[44px] min-w-[44px]">
                        Cancel
                      </button>
                    )}
                    <a
                      href={stellarExpertTxUrl(sub.txHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs px-3 py-1.5 rounded-lg bg-gray-800 text-gray-400 hover:text-white transition-colors border border-gray-700 min-h-[44px] min-w-[44px] inline-flex items-center"
                    >
                      Tx ↗
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
