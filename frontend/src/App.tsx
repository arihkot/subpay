import { Routes, Route } from 'react-router-dom';
import { useWallet } from './hooks/useWallet';
import { WalletContext } from './lib/WalletContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Plans from './pages/Plans';
import SubscriptionDetail from './pages/SubscriptionDetail';

export default function App() {
  const wallet = useWallet();

  return (
    <WalletContext.Provider value={wallet}>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/plans" element={<Plans />} />
            <Route path="/subscription/:id" element={<SubscriptionDetail />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </WalletContext.Provider>
  );
}
