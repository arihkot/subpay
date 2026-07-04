import { Link } from 'react-router-dom';
import { useWalletContext } from '../lib/WalletContext';

export default function Landing() {
  const { connected, isTestnet, error, connecting, connect } = useWalletContext();

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center gap-8">
      <div className="space-y-4 max-w-2xl">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight">
          Recurring Payments
          <br />
          <span className="text-stellar-400">on Stellar</span>
        </h1>
        <p className="text-lg text-gray-400 max-w-lg mx-auto">
          Decentralized subscription manager powered by Soroban smart contracts.
          Authorize capped, time-bounded subscriptions — fully on-chain and auditable.
        </p>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 text-sm text-red-400 max-w-md">
          {error}
        </div>
      )}

      {!connected ? (
        <div className="space-y-4">
          <button
            onClick={connect}
            disabled={connecting}
            className="inline-block bg-stellar-600 text-white px-8 py-3 rounded-xl text-lg font-semibold hover:bg-stellar-500 transition-all min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {connecting ? 'Connecting...' : 'Connect Freighter to Start'}
          </button>
          <p className="text-sm text-gray-600">
            Make sure Freighter is set to Stellar Testnet
          </p>
        </div>
      ) : !isTestnet ? (
        <div className="bg-red-900/20 border border-red-800 rounded-xl p-6 max-w-md">
          <h3 className="text-red-400 font-semibold text-lg mb-2">Wrong Network</h3>
          <p className="text-gray-400 text-sm">
            Please switch Freighter to <strong>Stellar Testnet</strong> to use SubPay.
          </p>
        </div>
      ) : (
        <Link
          to="/dashboard"
          className="inline-block bg-stellar-600 text-white px-8 py-3 rounded-xl text-lg font-semibold hover:bg-stellar-500 transition-all"
        >
          Go to Dashboard
        </Link>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-12 max-w-3xl w-full">
        {features.map((f) => (
          <div key={f.title} className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-left">
            <div className="text-stellar-400 text-2xl mb-3">{f.icon}</div>
            <h3 className="font-semibold text-white mb-1">{f.title}</h3>
            <p className="text-sm text-gray-500">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

const features = [
  {
    icon: '\u{1F512}',
    title: 'Allowance Model',
    desc: 'Pre-approve capped, time-bounded subscriptions — never expose your wallet.',
  },
  {
    icon: '\u{26A1}',
    title: 'Fast & Cheap',
    desc: 'Stellar testnet: ~5s finality, sub-cent fees. Perfect for recurring micropayments.',
  },
  {
    icon: '\u{1F4DC}',
    title: 'Fully On-Chain',
    desc: 'Every payment is a verifiable transaction on Stellar. Transparent and auditable.',
  },
];
