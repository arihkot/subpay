import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useWalletContext } from '../lib/WalletContext';
import { CONTRACT_ID, stellarExpertTxUrl } from '../lib/contract';
import {
  listSubscriptions,
  getSubscription,
  getPlan,
  cancelSubscription,
  fundVault,
  stroopsToXlm,
  xlmToStroops,
} from '../lib/subpayClient';
import type { SubPayPlan, SubPaySubscription } from '../lib/subpayClient';

interface SubDisplay {
  id: number;
  planName: string;
  planId: number;
  amountStroops: string;
  amountXlm: string;
  periodDays: number;
  nextDue: number;
  vaultBalanceStroops: string;
  vaultBalanceXlm: string;
  active: boolean;
  token: string;
  txHash?: string;
}

const MOCK_SUBS: SubDisplay[] = [
  {
    id: 0,
    planName: 'Netflix',
    planId: 0,
    amountStroops: '15000000',
    amountXlm: '1.5000000',
    periodDays: 30,
    nextDue: Date.now() / 1000 + 86400 * 7,
    vaultBalanceStroops: '45000000',
    vaultBalanceXlm: '4.5000000',
    active: true,
    token: 'n/a',
    txHash: 'abc123def456',
  },
  {
    id: 1,
    planName: 'Gym Membership',
    planId: 1,
    amountStroops: '50000000',
    amountXlm: '5.0000000',
    periodDays: 30,
    nextDue: Date.now() / 1000 + 86400 * 14,
    vaultBalanceStroops: '100000000',
    vaultBalanceXlm: '10.0000000',
    active: true,
    token: 'n/a',
    txHash: 'def789ghi012',
  },
  {
    id: 2,
    planName: 'SaaS Pro',
    planId: 2,
    amountStroops: '99000000',
    amountXlm: '9.9000000',
    periodDays: 30,
    nextDue: Date.now() / 1000 - 86400 * 2,
    vaultBalanceStroops: '50000000',
    vaultBalanceXlm: '5.0000000',
    active: false,
    token: 'n/a',
    txHash: 'ghi345jkl678',
  },
];

export default function Dashboard() {
  const { connected, isTestnet, publicKey } = useWalletContext();
  const [subscriptions, setSubscriptions] = useState<SubDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [fundModal, setFundModal] = useState<{ subId: number; planName: string } | null>(null);
  const [fundAmount, setFundAmount] = useState('');
  const [fundLoading, setFundLoading] = useState(false);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const fetchSubscriptions = useCallback(async () => {
    if (!connected || !isTestnet || !publicKey) {
      setLoading(false);
      return;
    }

    setError(null);
    try {
      if (!CONTRACT_ID) {
        setSubscriptions(MOCK_SUBS);
        setLoading(false);
        return;
      }

      const subIds = await listSubscriptions(publicKey, publicKey);
      const displaySubs: SubDisplay[] = [];

      for (const subId of subIds) {
        const sub: SubPaySubscription = await getSubscription(subId, publicKey);
        let planName = `Plan #${sub.plan_id}`;
        let period = 2592000;
        let token = '';

        try {
          const plan: SubPayPlan = await getPlan(sub.plan_id, publicKey);
          planName = plan.name;
          period = plan.period;
          token = plan.token;
        } catch {
          // plan may not exist anymore
        }

        displaySubs.push({
          id: sub.id,
          planName,
          planId: sub.plan_id,
          amountStroops: '',
          amountXlm: '',
          periodDays: Math.floor(period / 86400),
          nextDue: sub.next_due,
          vaultBalanceStroops: sub.vault_balance,
          vaultBalanceXlm: stroopsToXlm(sub.vault_balance),
          active: sub.active,
          token,
        });
      }

      // Get amounts from plans
      for (const sub of displaySubs) {
        try {
          const plan = await getPlan(sub.planId, publicKey);
          sub.amountStroops = plan.amount;
          sub.amountXlm = stroopsToXlm(plan.amount);
          sub.planName = plan.name;
          sub.periodDays = Math.floor(plan.period / 86400);
          sub.token = plan.token;
        } catch {
          // keep defaults
        }
      }

      setSubscriptions(displaySubs);
    } catch (err) {
      console.error('Failed to fetch subscriptions:', err);
      setError('Failed to load subscriptions from contract. Showing demo data.');
      setSubscriptions(MOCK_SUBS);
    }
    setLoading(false);
  }, [connected, isTestnet, publicKey]);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  const handleCancel = async (sub: SubDisplay) => {
    if (!publicKey || !CONTRACT_ID) return;
    setCancellingId(sub.id);
    setActionMsg(null);
    try {
      const { hash } = await cancelSubscription(
        publicKey,
        sub.id,
        publicKey,
        async (xdr) => {
          const freighter = window.freighterApi;
          if (!freighter) throw new Error('Freighter not installed');
          const result = await freighter.signTransaction(xdr, {
            networkPassphrase: 'Test SDF Network ; September 2015',
            accountToSign: publicKey,
          });
          return result.signedTxXdr;
        },
      );
      setActionMsg(`Cancelled! Tx: ${hash.slice(0, 12)}...`);
      fetchSubscriptions();
    } catch (err) {
      setActionMsg(`Cancel failed: ${(err as Error).message}`);
    }
    setCancellingId(null);
  };

  const handleFund = async () => {
    if (!publicKey || !fundModal || !CONTRACT_ID) return;
    const amount = parseFloat(fundAmount);
    if (isNaN(amount) || amount <= 0) return;

    setFundLoading(true);
    setActionMsg(null);
    try {
      const { hash } = await fundVault(
        publicKey,
        fundModal.subId,
        xlmToStroops(amount),
        publicKey,
        async (xdr) => {
          const freighter = window.freighterApi;
          if (!freighter) throw new Error('Freighter not installed');
          const result = await freighter.signTransaction(xdr, {
            networkPassphrase: 'Test SDF Network ; September 2015',
            accountToSign: publicKey,
          });
          return result.signedTxXdr;
        },
      );
      setActionMsg(`Funded! Tx: ${hash.slice(0, 12)}...`);
      setFundModal(null);
      setFundAmount('');
      fetchSubscriptions();
    } catch (err) {
      setActionMsg(`Fund failed: ${(err as Error).message}`);
    }
    setFundLoading(false);
  };

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
  const totalSpend = subscriptions.reduce(
    (acc, s) => acc + parseFloat(s.amountXlm || '0'),
    0,
  );

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

      {error && (
        <div className="bg-yellow-900/20 border border-yellow-800 rounded-xl p-4 text-sm text-yellow-400">
          {error}
        </div>
      )}

      {actionMsg && (
        <div className="bg-green-900/20 border border-green-800 rounded-xl p-4 text-sm text-green-400">
          {actionMsg}
        </div>
      )}

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
              ? `${Math.ceil(Math.max(0, (activeSubs[0].nextDue - Date.now() / 1000) / 86400))}d`
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
                      <td className="p-4 text-sm">{sub.amountXlm || '—'} XLM</td>
                      <td className="p-4 text-sm">
                        {sub.nextDue > Date.now() / 1000
                          ? `${Math.ceil((sub.nextDue - Date.now() / 1000) / 86400)} days`
                          : 'Overdue'}
                      </td>
                      <td className="p-4 text-sm">{sub.vaultBalanceXlm || '0'} XLM</td>
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
                          {sub.active && CONTRACT_ID && (
                            <button
                              onClick={() => setFundModal({ subId: sub.id, planName: sub.planName })}
                              className="text-xs px-3 py-1.5 rounded-lg bg-stellar-600 text-white hover:bg-stellar-500 transition-colors min-h-[44px] min-w-[44px]"
                            >
                              Fund
                            </button>
                          )}
                          {sub.active && CONTRACT_ID && (
                            <button
                              onClick={() => handleCancel(sub)}
                              disabled={cancellingId === sub.id}
                              className="text-xs px-3 py-1.5 rounded-lg bg-red-900/50 text-red-400 hover:bg-red-900/70 transition-colors border border-red-800 min-h-[44px] min-w-[44px] disabled:opacity-50"
                            >
                              {cancellingId === sub.id ? '...' : 'Cancel'}
                            </button>
                          )}
                          {sub.txHash && (
                            <a
                              href={stellarExpertTxUrl(sub.txHash)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs px-3 py-1.5 rounded-lg bg-gray-800 text-gray-400 hover:text-white transition-colors border border-gray-700 min-h-[44px] min-w-[44px] flex items-center"
                            >
                              {sub.txHash.length > 15 ? 'Tx' : ''} ↗
                            </a>
                          )}
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
                      <span className="text-white">{sub.amountXlm || '—'} XLM</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Vault:</span>{' '}
                      <span className="text-white">{sub.vaultBalanceXlm || '0'} XLM</span>
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
                    {sub.active && CONTRACT_ID && (
                      <button
                        onClick={() => setFundModal({ subId: sub.id, planName: sub.planName })}
                        className="text-xs px-3 py-1.5 rounded-lg bg-stellar-600 text-white hover:bg-stellar-500 transition-colors min-h-[44px] min-w-[44px]"
                      >
                        Fund
                      </button>
                    )}
                    {sub.active && CONTRACT_ID && (
                      <button
                        onClick={() => handleCancel(sub)}
                        disabled={cancellingId === sub.id}
                        className="text-xs px-3 py-1.5 rounded-lg bg-red-900/50 text-red-400 hover:bg-red-900/70 transition-colors border border-red-800 min-h-[44px] min-w-[44px] disabled:opacity-50"
                      >
                        {cancellingId === sub.id ? '...' : 'Cancel'}
                      </button>
                    )}
                    {sub.txHash && (
                      <a
                        href={stellarExpertTxUrl(sub.txHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs px-3 py-1.5 rounded-lg bg-gray-800 text-gray-400 hover:text-white transition-colors border border-gray-700 min-h-[44px] min-w-[44px] inline-flex items-center"
                      >
                        Tx ↗
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Fund Modal */}
      {fundModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-sm mx-4 space-y-4">
            <h3 className="font-semibold text-lg">Fund Vault — {fundModal.planName}</h3>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Amount (XLM)</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={fundAmount}
                onChange={(e) => setFundAmount(e.target.value)}
                placeholder="e.g. 10"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-stellar-500 min-h-[44px]"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setFundModal(null);
                  setFundAmount('');
                }}
                className="flex-1 px-4 py-2.5 rounded-lg bg-gray-800 text-gray-400 hover:text-white transition-colors text-sm min-h-[44px]"
              >
                Cancel
              </button>
              <button
                onClick={handleFund}
                disabled={fundLoading || !fundAmount}
                className="flex-1 px-4 py-2.5 rounded-lg bg-stellar-600 text-white hover:bg-stellar-500 transition-colors text-sm font-medium min-h-[44px] disabled:opacity-50"
              >
                {fundLoading ? 'Funding...' : 'Fund'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
