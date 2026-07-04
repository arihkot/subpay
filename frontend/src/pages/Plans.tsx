import { useState, useEffect, useCallback } from 'react';
import { useWalletContext } from '../lib/WalletContext';
import { CONTRACT_ID } from '../lib/contract';
import {
  getPlanCount,
  getPlan,
  createPlan,
  subscribe,
  stroopsToXlm,
  xlmToStroops,
} from '../lib/subpayClient';

interface PlanDisplay {
  id: number;
  name: string;
  merchant: string;
  token: string;
  amountStroops: string;
  amountXlm: string;
  period: number;
  periodLabel: string;
  active: boolean;
}

const DEMO_PLANS: PlanDisplay[] = [
  { id: 0, name: 'Netflix', merchant: 'G...XYZ', token: '', amountStroops: '15000000', amountXlm: '1.5000000', period: 2592000, periodLabel: '30 days', active: true },
  { id: 1, name: 'Gym Membership', merchant: 'G...ABC', token: '', amountStroops: '50000000', amountXlm: '5.0000000', period: 2592000, periodLabel: '30 days', active: true },
  { id: 2, name: 'SaaS Pro', merchant: 'G...DEF', token: '', amountStroops: '99000000', amountXlm: '9.9000000', period: 2592000, periodLabel: '30 days', active: true },
  { id: 3, name: 'Newsletter', merchant: 'G...GHI', token: '', amountStroops: '5000000', amountXlm: '0.5000000', period: 604800, periodLabel: '7 days', active: true },
  { id: 4, name: 'Cloud Storage', merchant: 'G...JKL', token: '', amountStroops: '10000000', amountXlm: '1.0000000', period: 86400, periodLabel: '1 day', active: false },
];

function periodToLabel(seconds: number): string {
  if (seconds >= 2592000) return `${seconds / 2592000} days`;
  if (seconds >= 604800) return `${seconds / 604800} weeks`;
  if (seconds >= 86400) return `${seconds / 86400} days`;
  if (seconds >= 3600) return `${seconds / 3600} hours`;
  return `${seconds}s`;
}

export default function Plans() {
  const { connected, isTestnet, publicKey, signTx } = useWalletContext();
  const [showCreate, setShowCreate] = useState(false);
  const [plans, setPlans] = useState<PlanDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [subscribingId, setSubscribingId] = useState<number | null>(null);

  const [createName, setCreateName] = useState('');
  const [createToken, setCreateToken] = useState('');
  const [createAmount, setCreateAmount] = useState('');
  const [createPeriod, setCreatePeriod] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  const fetchPlans = useCallback(async () => {
    if (!connected || !isTestnet || !publicKey) {
      setLoading(false);
      return;
    }

    setError(null);
    try {
      if (!CONTRACT_ID) {
        setPlans(DEMO_PLANS);
        setLoading(false);
        return;
      }

      const count = await getPlanCount(publicKey);
      const fetched: PlanDisplay[] = [];

      for (let i = 0; i < count; i++) {
        try {
          const plan = await getPlan(i, publicKey);
          fetched.push({
            id: plan.id,
            name: plan.name,
            merchant: plan.merchant.slice(0, 8) + '...',
            token: plan.token,
            amountStroops: plan.amount,
            amountXlm: stroopsToXlm(plan.amount),
            period: plan.period,
            periodLabel: periodToLabel(plan.period),
            active: plan.active,
          });
        } catch {
          // plan may have been created and then... we skip
        }
      }

      setPlans(fetched.length > 0 ? fetched : DEMO_PLANS);
    } catch (err) {
      console.error('Failed to fetch plans:', err);
      setError('Failed to load plans from contract. Showing demo data.');
      setPlans(DEMO_PLANS);
    }
    setLoading(false);
  }, [connected, isTestnet, publicKey]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const handleCreatePlan = async () => {
    if (!publicKey || !CONTRACT_ID || !createName || !createToken || !createAmount || !createPeriod) return;
    setCreateLoading(true);
    setActionMsg(null);
    try {
      const amountStroops = xlmToStroops(parseFloat(createAmount));
      const { hash } = await createPlan(
        publicKey,
        createToken,
        amountStroops,
        parseInt(createPeriod, 10),
        createName,
        publicKey,
        signTx,
      );
      setActionMsg(`Plan created! Tx: ${hash.slice(0, 12)}...`);
      setCreateName('');
      setCreateToken('');
      setCreateAmount('');
      setCreatePeriod('');
      setShowCreate(false);
      fetchPlans();
    } catch (err) {
      setActionMsg(`Create failed: ${(err as Error).message}`);
    }
    setCreateLoading(false);
  };

  const handleSubscribe = async (plan: PlanDisplay) => {
    if (!publicKey || !CONTRACT_ID) return;
    setSubscribingId(plan.id);
    setActionMsg(null);
    try {
      const { hash } = await subscribe(
        publicKey,
        plan.id,
        publicKey,
        signTx,
      );
      setActionMsg(`Subscribed! Tx: ${hash.slice(0, 12)}...`);
    } catch (err) {
      setActionMsg(`Subscribe failed: ${(err as Error).message}`);
    }
    setSubscribingId(null);
  };

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-gray-400">Loading plans...</p>
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
        {CONTRACT_ID && (
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="px-4 py-2 rounded-lg bg-stellar-600 text-white hover:bg-stellar-500 transition-colors text-sm font-medium min-h-[44px]"
          >
            {showCreate ? 'Cancel' : 'Create Plan'}
          </button>
        )}
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

      {showCreate && CONTRACT_ID && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
          <h3 className="font-semibold text-lg">Create a New Plan</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Plan Name</label>
              <input
                type="text"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="e.g. Netflix"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-stellar-500 min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Token Contract Address</label>
              <input
                type="text"
                value={createToken}
                onChange={(e) => setCreateToken(e.target.value)}
                placeholder="C... token address"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-stellar-500 min-h-[44px] font-mono"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Amount (XLM per period)</label>
              <input
                type="number"
                step="0.1"
                value={createAmount}
                onChange={(e) => setCreateAmount(e.target.value)}
                placeholder="e.g. 10"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-stellar-500 min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Period (seconds)</label>
              <input
                type="number"
                value={createPeriod}
                onChange={(e) => setCreatePeriod(e.target.value)}
                placeholder="e.g. 2592000 (30 days)"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-stellar-500 min-h-[44px]"
              />
            </div>
          </div>
          <button
            onClick={handleCreatePlan}
            disabled={createLoading || !createName || !createToken || !createAmount || !createPeriod}
            className="px-6 py-2.5 rounded-lg bg-stellar-600 text-white hover:bg-stellar-500 transition-colors text-sm font-semibold min-h-[44px] disabled:opacity-50"
          >
            {createLoading ? 'Deploying...' : 'Deploy Plan'}
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
              {plan.amountXlm || plan.amountStroops}{' '}
              <span className="text-sm font-normal text-gray-500">XLM/{plan.periodLabel}</span>
            </div>
            <p className="text-xs text-gray-500">
              Merchant: <span className="font-mono">{plan.merchant}</span>
            </p>
            {plan.active && CONTRACT_ID && (
              <button
                onClick={() => handleSubscribe(plan)}
                disabled={subscribingId === plan.id}
                className="w-full px-4 py-2.5 rounded-lg bg-stellar-600 text-white hover:bg-stellar-500 transition-colors text-sm font-medium min-h-[44px] disabled:opacity-50"
              >
                {subscribingId === plan.id ? 'Subscribing...' : 'Subscribe'}
              </button>
            )}
          </div>
        ))}
        {plans.length === 0 && !loading && (
          <div className="col-span-full text-center text-gray-500 py-12">
            No plans available yet.
          </div>
        )}
      </div>
    </div>
  );
}
