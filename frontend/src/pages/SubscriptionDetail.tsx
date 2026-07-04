import { useParams, Link } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { useWalletContext } from '../lib/WalletContext';
import { CONTRACT_ID, stellarExpertTxUrl, stellarExpertContractUrl } from '../lib/contract';
import {
  getSubscription,
  getPlan,
  cancelSubscription,
  fundVault,
  stroopsToXlm,
  xlmToStroops,
} from '../lib/subpayClient';

interface PaymentHistory {
  txHash: string;
  amount: string;
  timestamp: number;
  status: 'claimed' | 'pending' | 'failed';
}

interface SubDetail {
  id: number;
  planName: string;
  planId: number;
  amountXlm: string;
  periodLabel: string;
  nextDue: number;
  vaultBalanceXlm: string;
  active: boolean;
  created_at: number;
  token: string;
  merchant: string;
}

const DEMO_SUB: SubDetail = {
  id: 0,
  planName: 'Netflix',
  planId: 0,
  amountXlm: '1.5000000',
  periodLabel: '30 days',
  nextDue: Date.now() / 1000 + 86400 * 7,
  vaultBalanceXlm: '4.5000000',
  active: true,
  created_at: Date.now() / 1000 - 86400 * 180,
  token: 'n/a',
  merchant: 'G...XYZ',
};

const DEMO_PAYMENTS: PaymentHistory[] = [
  { txHash: 'abc123def456', amount: '1.50 XLM', timestamp: Date.now() / 1000 - 86400 * 30, status: 'claimed' },
  { txHash: 'def789ghi012', amount: '1.50 XLM', timestamp: Date.now() / 1000 - 86400 * 60, status: 'claimed' },
  { txHash: 'ghi345jkl678', amount: '1.50 XLM', timestamp: Date.now() / 1000 - 86400 * 90, status: 'claimed' },
];

export default function SubscriptionDetail() {
  const { id } = useParams<{ id: string }>();
  const { connected, publicKey } = useWalletContext();
  const [sub, setSub] = useState<SubDetail | null>(null);
  const [payments] = useState<PaymentHistory[]>(DEMO_PAYMENTS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [showFund, setShowFund] = useState(false);
  const [fundAmount, setFundAmount] = useState('');
  const [fundLoading, setFundLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const fetchSub = useCallback(async () => {
    if (!id || !publicKey) {
      setLoading(false);
      return;
    }

    setError(null);
    try {
      if (!CONTRACT_ID) {
        setSub(DEMO_SUB);
        setLoading(false);
        return;
      }

      const subId = parseInt(id, 10);
      const subData = await getSubscription(subId, publicKey);

      let planName = `Plan #${subData.plan_id}`;
      let period = 2592000;
      let amountStroops = '';
      let token = '';
      let merchant = '';

      try {
        const planData = await getPlan(subData.plan_id, publicKey);
        planName = planData.name;
        period = planData.period;
        amountStroops = planData.amount;
        token = planData.token;
        merchant = planData.merchant;
      } catch {
        // plan may not exist
      }

      setSub({
        id: subData.id,
        planName,
        planId: subData.plan_id,
        amountXlm: amountStroops ? stroopsToXlm(amountStroops) : '—',
        periodLabel: period >= 2592000 ? `${period / 2592000} days` : `${period / 86400} days`,
        nextDue: subData.next_due,
        vaultBalanceXlm: stroopsToXlm(subData.vault_balance),
        active: subData.active,
        created_at: subData.created_at,
        token,
        merchant: merchant.slice(0, 12) + '...',
      });
    } catch (err) {
      console.error('Failed to fetch subscription:', err);
      setError('Failed to load from contract. Showing demo data.');
      setSub(DEMO_SUB);
    }
    setLoading(false);
  }, [id, publicKey]);

  useEffect(() => {
    fetchSub();
  }, [fetchSub]);

  const handleCancel = async () => {
    if (!publicKey || !sub || !CONTRACT_ID) return;
    setCancelling(true);
    setActionMsg(null);
    try {
      const { hash } = await cancelSubscription(
        publicKey,
        sub.id,
        publicKey,
        async (xdr) => {
          const f = window.freighterApi;
          if (!f) throw new Error('Freighter not installed');
          const res = await f.signTransaction(xdr, {
            networkPassphrase: 'Test SDF Network ; September 2015',
            accountToSign: publicKey,
          });
          return res.signedTxXdr;
        },
      );
      setActionMsg(`Cancelled! Tx: ${hash.slice(0, 12)}...`);
      fetchSub();
    } catch (err) {
      setActionMsg(`Cancel failed: ${(err as Error).message}`);
    }
    setCancelling(false);
  };

  const handleFund = async () => {
    if (!publicKey || !sub || !CONTRACT_ID) return;
    const amount = parseFloat(fundAmount);
    if (isNaN(amount) || amount <= 0) return;
    setFundLoading(true);
    setActionMsg(null);
    try {
      const { hash } = await fundVault(
        publicKey,
        sub.id,
        xlmToStroops(amount),
        publicKey,
        async (xdr) => {
          const f = window.freighterApi;
          if (!f) throw new Error('Freighter not installed');
          const res = await f.signTransaction(xdr, {
            networkPassphrase: 'Test SDF Network ; September 2015',
            accountToSign: publicKey,
          });
          return res.signedTxXdr;
        },
      );
      setActionMsg(`Funded! Tx: ${hash.slice(0, 12)}...`);
      setShowFund(false);
      setFundAmount('');
      fetchSub();
    } catch (err) {
      setActionMsg(`Fund failed: ${(err as Error).message}`);
    }
    setFundLoading(false);
  };

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <h2 className="text-2xl font-bold">Connect Your Wallet</h2>
        <p className="text-gray-400">Connect Freighter to view subscription details.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-gray-400">Loading subscription...</p>
      </div>
    );
  }

  if (!sub) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <h2 className="text-2xl font-bold">Subscription Not Found</h2>
        <Link to="/dashboard" className="text-stellar-400 hover:underline">
          ← Back to Dashboard
        </Link>
      </div>
    );
  }

  const hasContract = CONTRACT_ID && CONTRACT_ID.length > 4;

  return (
    <div className="space-y-8">
      <Link to="/dashboard" className="text-sm text-gray-400 hover:text-white transition-colors">
        ← Back to Dashboard
      </Link>

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

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{sub.planName} Subscription</h1>
          <p className="text-gray-400 mt-1">Subscription #{id}</p>
        </div>
        <div className="flex gap-3">
          {sub.active && CONTRACT_ID && (
            <button
              onClick={() => setShowFund(true)}
              className="px-4 py-2 rounded-lg bg-stellar-600 text-white hover:bg-stellar-500 transition-colors text-sm font-medium min-h-[44px]"
            >
              Fund Vault
            </button>
          )}
          {sub.active && CONTRACT_ID && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="px-4 py-2 rounded-lg bg-red-900/50 text-red-400 hover:bg-red-900/70 transition-colors border border-red-800 text-sm font-medium min-h-[44px] disabled:opacity-50"
            >
              {cancelling ? 'Cancelling...' : 'Cancel'}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-sm text-gray-500 mb-1">Amount</p>
          <p className="text-xl font-bold text-white">{sub.amountXlm} XLM</p>
          <p className="text-xs text-gray-500">every {sub.periodLabel}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-sm text-gray-500 mb-1">Vault Balance</p>
          <p className="text-xl font-bold text-white">{sub.vaultBalanceXlm} XLM</p>
          <p className="text-xs text-gray-500">{sub.active ? 'active & funded' : 'inactive'}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-sm text-gray-500 mb-1">Next Due</p>
          <p className="text-xl font-bold text-white">
            {sub.nextDue > Date.now() / 1000
              ? `${Math.ceil((sub.nextDue - Date.now() / 1000) / 86400)} days`
              : 'Overdue'}
          </p>
          <p className="text-xs text-gray-500">
            {sub.active ? (sub.nextDue > Date.now() / 1000 ? 'on schedule' : 'can be claimed') : 'cancelled'}
          </p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-sm text-gray-500 mb-1">Total Paid</p>
          <p className="text-xl font-bold text-stellar-400">—</p>
          <p className="text-xs text-gray-500">{payments.length} recorded payments</p>
        </div>
      </div>

      {hasContract && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-sm text-gray-500 mb-2">Smart Contract</p>
          <a
            href={stellarExpertContractUrl(CONTRACT_ID)}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-sm text-stellar-400 hover:text-stellar-300 transition-colors break-all"
          >
            {CONTRACT_ID}
          </a>
          {sub.merchant && (
            <p className="text-xs text-gray-500 mt-2">Merchant: <span className="font-mono">{sub.merchant}</span></p>
          )}
        </div>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-800">
          <h2 className="font-semibold">Payment History</h2>
        </div>
        {payments.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No payments recorded yet. Fund your vault and wait for the due date.
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800 text-left text-sm text-gray-500">
                    <th className="p-4 font-medium">Transaction</th>
                    <th className="p-4 font-medium">Amount</th>
                    <th className="p-4 font-medium">Date</th>
                    <th className="p-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.txHash} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="p-4">
                        <a
                          href={stellarExpertTxUrl(p.txHash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-xs text-stellar-400 hover:text-stellar-300 transition-colors break-all"
                        >
                          {p.txHash.slice(0, 12)}...
                        </a>
                      </td>
                      <td className="p-4 text-sm">{p.amount}</td>
                      <td className="p-4 text-sm text-gray-400">
                        {new Date(p.timestamp * 1000).toLocaleDateString()}
                      </td>
                      <td className="p-4">
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            p.status === 'claimed'
                              ? 'bg-green-900/50 text-green-400 border border-green-800'
                              : p.status === 'pending'
                              ? 'bg-yellow-900/50 text-yellow-400 border border-yellow-800'
                              : 'bg-red-900/50 text-red-400 border border-red-800'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-gray-800">
              {payments.map((p) => (
                <div key={p.txHash} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{p.amount}</span>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        p.status === 'claimed'
                          ? 'bg-green-900/50 text-green-400 border border-green-800'
                          : p.status === 'pending'
                          ? 'bg-yellow-900/50 text-yellow-400 border border-yellow-800'
                          : 'bg-red-900/50 text-red-400 border border-red-800'
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{new Date(p.timestamp * 1000).toLocaleDateString()}</span>
                    <a
                      href={stellarExpertTxUrl(p.txHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-stellar-400 hover:underline font-mono"
                    >
                      {p.txHash.slice(0, 8)}...
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Fund Modal */}
      {showFund && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-sm mx-4 space-y-4">
            <h3 className="font-semibold text-lg">Fund Vault — {sub.planName}</h3>
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
                  setShowFund(false);
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
