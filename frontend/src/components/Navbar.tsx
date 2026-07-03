import { Link, useLocation } from 'react-router-dom';
import { useWalletContext } from '../lib/WalletContext';

export default function Navbar() {
  const { connected, publicKey, isTestnet, connect, disconnect } = useWalletContext();
  const location = useLocation();

  const navLinks = connected
    ? [
        { to: '/dashboard', label: 'Dashboard' },
        { to: '/plans', label: 'Plans' },
      ]
    : [];

  return (
    <nav className="border-b border-gray-800 bg-gray-900/50 backdrop-blur sticky top-0 z-50">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link to="/" className="text-xl font-bold text-stellar-400 tracking-tight">
              SubPay
            </Link>
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`text-sm font-medium transition-colors ${
                  location.pathname === link.to
                    ? 'text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-4">
            {connected && (
              <div className="hidden sm:flex items-center gap-3">
                {isTestnet ? (
                  <span className="text-xs px-2 py-1 rounded-full bg-green-900/50 text-green-400 border border-green-800">
                    TESTNET
                  </span>
                ) : (
                  <span className="text-xs px-2 py-1 rounded-full bg-red-900/50 text-red-400 border border-red-800">
                    Wrong Network
                  </span>
                )}
                <span className="text-sm text-gray-400 font-mono">
                  {publicKey?.slice(0, 6)}...{publicKey?.slice(-4)}
                </span>
              </div>
            )}
            <button
              onClick={connected ? disconnect : connect}
              className={`text-sm font-medium px-4 py-2 rounded-lg transition-all min-h-[44px] min-w-[44px] ${
                connected
                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
                  : 'bg-stellar-600 text-white hover:bg-stellar-500'
              }`}
            >
              {connected ? 'Disconnect' : 'Connect Freighter'}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
