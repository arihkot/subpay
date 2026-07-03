import { useParams, Link } from 'react-router-dom';
import { useState } from 'react';
import { useWalletContext } from '../lib/WalletContext';
import { CONTRACT_ID, stellarExpertTxUrl, stellarExpertContractUrl } from '../lib/contract';

interface PaymentHistory {
  txHash: string;
  amount: string;
  timestamp: number;
  status: 'claimed' | 'pending' | 'failed';
}

export default function SubscriptionDetail() {
  const { id } = useParams<{ id: string }>();
  const { connected } = useWalletContext();
  const [payments] = useState<PaymentHistory[]>([
    { txHash: 'abc123def456', amount: '15.00 XLM', timestamp: Date.now() / 1000 - 86400 * 30, status: 'claimed' },
    { txHash: 'def789ghi012', amount: '15.00 XLM', timestamp: Date.now() / 1000 - 86400 * 60, status: 'claimed' },
    { txHash: 'ghi345jkl678', amount: '15.00 XLM', timestamp: Date.now() / 1000 - 86400 * 90, status: 'claimed' },
  ]);

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <h2 className="text-2xl font-bold">Connect Your Wallet</h2>
        <p className="text-gray-400">Connect Freighter to view subscription details.</p>
      </div>
    );
  }

  const hasContract = CONTRACT_ID && CONTRACT_ID.length > 4;

  return (
    <div className="space-y-8">
      <Link to="/dashboard" className="text-sm text-gray-400 hover:text-white transition-colors">
        ← Back to Dashboard
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Netflix Subscription</h1>
          <p className="text-gray-400 mt-1">Subscription #{id}</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 rounded-lg bg-stellar-600 text-white hover:bg-stellar-500 transition-colors text-sm font-medium min-h-[44px]">
            Fund Vault
          </button>
          <button className="px-4 py-2 rounded-lg bg-red-900/50 text-red-400 hover:bg-red-900/70 transition-colors border border-red-800 text-sm font-medium min-h-[44px]">
            Cancel
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-sm text-gray-500 mb-1">Amount</p>
          <p className="text-xl font-bold text-white">15.00 XLM</p>
          <p className="text-xs text-gray-500">every 30 days</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-sm text-gray-500 mb-1">Vault Balance</p>
          <p className="text-xl font-bold text-white">45.00 XLM</p>
          <p className="text-xs text-gray-500">3 payments covered</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-sm text-gray-500 mb-1">Next Due</p>
          <p className="text-xl font-bold text-white">7 days</p>
          <p className="text-xs text-gray-500">active & funded</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-sm text-gray-500 mb-1">Total Paid</p>
          <p className="text-xl font-bold text-stellar-400">45.00 XLM</p>
          <p className="text-xs text-gray-500">3 payments</p>
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
        </div>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-800">
          <h2 className="font-semibold">Payment History</h2>
        </div>
        {payments.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No payments yet.
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
    </div>
  );
}
