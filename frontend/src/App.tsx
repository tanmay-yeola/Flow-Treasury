import React, { useState } from 'react';
import { Web3Provider } from './context/Web3Context';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './pages/Dashboard';
import { Budgets } from './pages/Budgets';
import { MakePayment } from './pages/MakePayment';
import { Approvals } from './pages/Approvals';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState('dashboard');

  return (
    <Web3Provider>
      <div className="flex min-h-screen bg-[#080C14] text-slate-100 selection:bg-sky-500 selection:text-white">
        {/* Persistent Left Sidebar */}
        <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Persistent Top Header */}
          <Header />

          {/* Dynamic Page Views */}
          <main className="flex-1 p-8 max-w-7xl w-full mx-auto">
            {currentTab === 'dashboard' && <Dashboard setCurrentTab={setCurrentTab} />}
            {currentTab === 'budgets' && <Budgets />}
            {currentTab === 'payment' && <MakePayment setCurrentTab={setCurrentTab} />}
            {currentTab === 'approvals' && <Approvals />}
          </main>
        </div>
      </div>
    </Web3Provider>
  );
};

export default App;
