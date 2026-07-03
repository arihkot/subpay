import { stellarExpertContractUrl } from '../lib/contract';
import { CONTRACT_ID } from '../lib/contract';

export default function Footer() {
  const hasContract = CONTRACT_ID && CONTRACT_ID.length > 4;

  return (
    <footer className="border-t border-gray-800 bg-gray-900/30 mt-auto">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-4">
            <span className="text-stellar-400 font-medium">SubPay</span>
            <span>Decentralized recurring payments on Stellar</span>
          </div>
          <div className="font-mono text-xs">
            {hasContract ? (
              <a
                href={stellarExpertContractUrl(CONTRACT_ID)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-stellar-400 hover:text-stellar-300 transition-colors break-all"
              >
                {CONTRACT_ID}
              </a>
            ) : (
              <span className="text-gray-600">Contract not deployed</span>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
